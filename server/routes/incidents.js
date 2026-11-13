import express from 'express';
import { Incident } from '../models/Incident.js';
import { AuditLog } from '../models/AuditLog.js';
import { protect, authorize } from '../middleware/auth.js';
import { findNearbyMasterTicket } from '../utils/geoCluster.js';
import { calculatePriorityScore } from '../utils/priorityScorer.js';

const router = express.Router();

// @route   POST /api/incidents
// @desc    Submit a new incident (Executes Geospatial Clustering & Dynamic Priority Calculation)
router.post('/', protect, async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      coordinates, // [longitude, latitude]
      address,
      wardNumber,
      photoUrl,
      severityLevel,
      trafficDensityRating,
    } = req.body;

    if (!title || !category || !coordinates || !address || !wardNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, category, coordinates [lng, lat], address, and wardNumber',
      });
    }

    const [lng, lat] = coordinates.map(Number);
    if (isNaN(lng) || isNaN(lat)) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates format' });
    }

    const cleanCoords = [lng, lat];
    const userSeverity = severityLevel || 'MEDIUM';
    const userTraffic = Number(trafficDensityRating) || 3;

    // 1. Spatial Deduplication Search (50-meter threshold)
    const existingMaster = await findNearbyMasterTicket(cleanCoords, category, Incident, 50);

    if (existingMaster) {
      // Collapse into existing master ticket!
      existingMaster.reportCount += 1;
      if (!existingMaster.subscriberIds.includes(req.user._id)) {
        existingMaster.subscriberIds.push(req.user._id);
      }

      // Elevate severity if incoming report is higher
      const severityRank = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
      if (severityRank[userSeverity] > severityRank[existingMaster.severityLevel]) {
        existingMaster.severityLevel = userSeverity;
      }

      existingMaster.calculatedPriorityScore = calculatePriorityScore({
        severityLevel: existingMaster.severityLevel,
        reportCount: existingMaster.reportCount,
        trafficDensityRating: existingMaster.trafficDensityRating,
        createdAt: existingMaster.createdAt,
      });
      existingMaster.updatedAt = new Date();
      await existingMaster.save();

      // Create linked child ticket for provenance
      const childTicket = await Incident.create({
        title,
        category,
        description,
        location: { type: 'Point', coordinates: cleanCoords },
        address,
        wardNumber,
        photoUrl: photoUrl || existingMaster.photoUrl,
        reportedBy: req.user._id,
        isMasterTicket: false,
        parentMasterId: existingMaster._id,
        severityLevel: userSeverity,
        trafficDensityRating: userTraffic,
        status: existingMaster.status,
      });

      await AuditLog.create({
        action: 'INCIDENT_CLUSTERED',
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: req.user.role,
        entityType: 'INCIDENT',
        entityId: existingMaster._id.toString(),
        details: `Report '${title}' automatically clustered into Master Ticket #${existingMaster._id.toString().slice(-6)} (${category}) within 50m radius. Total reports: ${existingMaster.reportCount}.`,
      });

      return res.status(201).json({
        success: true,
        isClustered: true,
        message: `Your report was automatically clustered with an existing nearby master work order. You are now subscribed to live updates.`,
        incident: existingMaster,
        childTicketId: childTicket._id,
      });
    }

    // 2. No cluster match -> Create new Master Ticket
    const initialPriority = calculatePriorityScore({
      severityLevel: userSeverity,
      reportCount: 1,
      trafficDensityRating: userTraffic,
      createdAt: new Date(),
    });

    const newMaster = await Incident.create({
      title,
      category,
      description,
      location: { type: 'Point', coordinates: cleanCoords },
      address,
      wardNumber,
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
      reportedBy: req.user._id,
      isMasterTicket: true,
      reportCount: 1,
      subscriberIds: [req.user._id],
      severityLevel: userSeverity,
      trafficDensityRating: userTraffic,
      calculatedPriorityScore: initialPriority,
      status: 'REPORTED',
    });

    await AuditLog.create({
      action: 'INCIDENT_REPORTED',
      performedBy: req.user._id,
      performerName: req.user.name,
      performerRole: req.user.role,
      entityType: 'INCIDENT',
      entityId: newMaster._id.toString(),
      details: `New master incident created: ${title} (${category}, Ward ${wardNumber}). Priority Score: ${initialPriority}.`,
    });

    res.status(201).json({
      success: true,
      isClustered: false,
      message: 'New infrastructure defect logged and queued for municipal triage.',
      incident: newMaster,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/incidents
// @desc    Get incidents with filtering by status, category, ward, masterOnly
router.get('/', async (req, res) => {
  try {
    const { category, ward, status, severity, masterOnly, search } = req.query;
    const query = {};

    if (category) query.category = category;
    if (ward) query.wardNumber = Number(ward);
    if (status) query.status = status;
    if (severity) query.severityLevel = severity;
    if (masterOnly === 'true' || masterOnly === undefined) {
      query.isMasterTicket = true;
    } else if (masterOnly === 'false') {
      // return all
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const incidents = await Incident.find(query)
      .populate('reportedBy', 'name email role')
      .populate('workOrderId')
      .sort({ calculatedPriorityScore: -1, createdAt: -1 });

    res.json({
      success: true,
      count: incidents.length,
      incidents,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/incidents/:id
// @desc    Get single incident details, child tickets, and subscribers
router.get('/:id', async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('reportedBy', 'name email role')
      .populate('workOrderId');

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    // If master ticket, find all child clustered tickets
    let childReports = [];
    if (incident.isMasterTicket) {
      childReports = await Incident.find({ parentMasterId: incident._id })
        .populate('reportedBy', 'name email')
        .sort({ createdAt: -1 });
    }

    res.json({
      success: true,
      incident,
      childReports,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/incidents/:id/subscribe and /api/incidents/:id/upvote
// @desc    Citizen upvotes / subscribes to an incident
const handleEndorsement = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const userId = req.user._id;
    const isSubscribed = incident.subscriberIds.some(
      (id) => id.toString() === userId.toString()
    );

    if (isSubscribed) {
      return res.status(400).json({
        success: false,
        message: 'You have already subscribed / upvoted this incident',
      });
    }

    incident.subscriberIds.push(userId);
    incident.reportCount += 1;
    incident.calculatedPriorityScore = calculatePriorityScore({
      severityLevel: incident.severityLevel,
      reportCount: incident.reportCount,
      trafficDensityRating: incident.trafficDensityRating,
      createdAt: incident.createdAt,
    });
    await incident.save();

    await AuditLog.create({
      action: 'INCIDENT_UPVOTED',
      performedBy: req.user._id,
      performerName: req.user.name,
      performerRole: req.user.role,
      entityType: 'INCIDENT',
      entityId: incident._id.toString(),
      details: `Citizen upvoted incident #${incident._id.toString().slice(-6)}. Total subscribers: ${incident.subscriberIds.length}. New Priority: ${incident.calculatedPriorityScore}.`,
    });

    res.json({
      success: true,
      message: 'Subscribed to notifications and incident priority increased.',
      reportCount: incident.reportCount,
      subscriberCount: incident.subscriberIds.length,
      calculatedPriorityScore: incident.calculatedPriorityScore,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

router.post('/:id/subscribe', protect, handleEndorsement);
router.post('/:id/upvote', protect, handleEndorsement);

// @route   PUT /api/incidents/:id/status
// @desc    Admin updates status (TRIAGED, REJECTED, etc.)
router.put('/:id/status', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { status, severityLevel } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    if (status) incident.status = status;
    if (severityLevel) {
      incident.severityLevel = severityLevel;
      incident.calculatedPriorityScore = calculatePriorityScore({
        severityLevel,
        reportCount: incident.reportCount,
        trafficDensityRating: incident.trafficDensityRating,
        createdAt: incident.createdAt,
      });
    }

    incident.updatedAt = new Date();
    await incident.save();

    await AuditLog.create({
      action: 'INCIDENT_TRIAGED',
      performedBy: req.user._id,
      performerName: req.user.name,
      performerRole: req.user.role,
      entityType: 'INCIDENT',
      entityId: incident._id.toString(),
      details: `Incident #${incident._id.toString().slice(-6)} status updated to ${status}.`,
    });

    res.json({ success: true, incident });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

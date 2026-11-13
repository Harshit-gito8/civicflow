import express from 'express';
import { WorkOrder } from '../models/WorkOrder.js';
import { Incident } from '../models/Incident.js';
import { AuditLog } from '../models/AuditLog.js';
import { protect, authorize } from '../middleware/auth.js';
import { verifyProofOfWorkGeofence } from '../utils/geoCluster.js';

const router = express.Router();

// @route   POST /api/work-orders/dispatch
// @desc    Municipal Engineer dispatches a new Work Order with SLA timeline
router.post('/dispatch', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const {
      incidentId,
      assignedDepartment,
      assignedContractorId,
      allocatedHours,
      costEstimate,
    } = req.body;

    if (!incidentId || !assignedDepartment || !assignedContractorId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide incidentId, assignedDepartment, and assignedContractorId',
      });
    }

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const hours = Number(allocatedHours) || 48;
    const slaDeadline = new Date(Date.now() + hours * 3600 * 1000);
    const orderNumber = `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const workOrder = await WorkOrder.create({
      orderNumber,
      incidentId: incident._id,
      assignedDepartment,
      assignedContractorId,
      allocatedHours: hours,
      slaDeadline,
      slaStatus: 'ON_TRACK',
      costEstimate: costEstimate || 5000,
      stage: 'DISPATCHED',
      beforePhotoUrl: incident.photoUrl,
    });

    incident.workOrderId = workOrder._id;
    incident.status = 'WORK_ORDER_CREATED';
    incident.updatedAt = new Date();
    await incident.save();

    await AuditLog.create({
      action: 'WORK_ORDER_DISPATCHED',
      performedBy: req.user._id,
      performerName: req.user.name,
      performerRole: req.user.role,
      entityType: 'WORK_ORDER',
      entityId: orderNumber,
      details: `Work Order ${orderNumber} dispatched for Incident #${incident._id.toString().slice(-6)}. SLA: ${hours} hours. Deadline: ${slaDeadline.toLocaleDateString()}.`,
    });

    res.status(201).json({
      success: true,
      message: `Work Order ${orderNumber} created and dispatched successfully.`,
      workOrder,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/work-orders
// @desc    Get all work orders with filters
router.get('/', protect, async (req, res) => {
  try {
    const { stage, contractorId, department, slaStatus } = req.query;
    const query = {};

    // Contractors can see work orders assigned to them, or specific crew if specified, or all if requested
    if (req.user.role === 'CONTRACTOR' && !req.query.allCrews) {
      query.assignedContractorId = req.query.contractorId || req.user._id;
    } else if (contractorId) {
      query.assignedContractorId = contractorId;
    }

    if (stage) query.stage = stage;
    if (department) query.assignedDepartment = department;
    if (slaStatus) query.slaStatus = slaStatus;
    if (req.query.auditStatus) query.auditStatus = req.query.auditStatus;

    const workOrders = await WorkOrder.find(query)
      .populate('incidentId')
      .populate('assignedContractorId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: workOrders.length,
      workOrders,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/work-orders/:id
// @desc    Get single work order details
router.get('/:id', protect, async (req, res) => {
  try {
    const workOrder = await WorkOrder.findById(req.params.id)
      .populate('incidentId')
      .populate('assignedContractorId', 'name email phone department')
      .populate('auditedBy', 'name email');

    if (!workOrder) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }

    res.json({ success: true, workOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/work-orders/:id/stage
// @desc    Contractor updates stage (ACCEPTED, ON_SITE)
router.put('/:id/stage', protect, authorize('CONTRACTOR', 'ADMIN'), async (req, res) => {
  try {
    const { stage } = req.body;
    const workOrder = await WorkOrder.findById(req.params.id);

    if (!workOrder) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }

    if (!['ACCEPTED', 'ON_SITE'].includes(stage)) {
      return res.status(400).json({ success: false, message: 'Invalid stage transition' });
    }

    workOrder.stage = stage;
    workOrder.updatedAt = new Date();
    await workOrder.save();

    // If contractor arrived on site, mark incident IN_PROGRESS
    if (stage === 'ON_SITE') {
      await Incident.findByIdAndUpdate(workOrder.incidentId, { status: 'IN_PROGRESS' });
    }

    await AuditLog.create({
      action: `WORK_ORDER_${stage}`,
      performedBy: req.user._id,
      performerName: req.user.name,
      performerRole: req.user.role,
      entityType: 'WORK_ORDER',
      entityId: workOrder.orderNumber,
      details: `Work Order ${workOrder.orderNumber} stage changed to ${stage}.`,
    });

    res.json({ success: true, workOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/work-orders/:id/complete
// @desc    Contractor completes repair with Anti-Fraud Geofenced Proof-of-Work
router.post('/:id/complete', protect, authorize('CONTRACTOR', 'ADMIN'), async (req, res) => {
  try {
    const { afterPhotoUrl, contractorCoordinates, completionNotes } = req.body;

    if (!afterPhotoUrl || !contractorCoordinates || !Array.isArray(contractorCoordinates)) {
      return res.status(400).json({
        success: false,
        message: 'Completion requires an after photo URL and contractor upload GPS coordinates [lng, lat]',
      });
    }

    const workOrder = await WorkOrder.findById(req.params.id).populate('incidentId');
    if (!workOrder) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }

    const incidentCoords = workOrder.incidentId.location.coordinates;
    const [uploadLng, uploadLat] = contractorCoordinates.map(Number);
    const uploadCoords = [uploadLng, uploadLat];

    // EXECUTE GEOFENCE VALIDATION (35-meter maximum tolerance)
    const geofenceResult = verifyProofOfWorkGeofence(incidentCoords, uploadCoords, 35);

    workOrder.contractorUploadCoordinates = {
      type: 'Point',
      coordinates: uploadCoords,
    };
    workOrder.geofenceDistanceMeters = geofenceResult.distanceMeters;
    workOrder.isGeofenceVerified = geofenceResult.isVerified;

    if (!geofenceResult.isVerified) {
      // FRAUD REJECTION!
      await AuditLog.create({
        action: 'GEOFENCE_FRAUD_REJECTED',
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: req.user.role,
        entityType: 'GEOFENCE',
        entityId: workOrder.orderNumber,
        details: geofenceResult.statusMessage,
        metadata: {
          distanceMeters: geofenceResult.distanceMeters,
          incidentCoords,
          contractorUploadCoords: uploadCoords,
        },
      });

      return res.status(422).json({
        success: false,
        isGeofenceVerified: false,
        distanceMeters: geofenceResult.distanceMeters,
        thresholdMeters: 35,
        message: geofenceResult.statusMessage,
      });
    }

    // Geofence PASSED: Advance to PENDING_INSPECTION
    workOrder.stage = 'PENDING_INSPECTION';
    workOrder.afterPhotoUrl = afterPhotoUrl;
    workOrder.completionNotes = completionNotes || 'Repair completed according to municipal specification.';
    workOrder.completedAt = new Date();
    workOrder.updatedAt = new Date();
    await workOrder.save();

    await AuditLog.create({
      action: 'PROOF_OF_WORK_VERIFIED',
      performedBy: req.user._id,
      performerName: req.user.name,
      performerRole: req.user.role,
      entityType: 'WORK_ORDER',
      entityId: workOrder.orderNumber,
      details: `Proof-of-work geofence PASSED (${geofenceResult.distanceMeters}m). Work Order submitted for municipal inspection.`,
    });

    res.json({
      success: true,
      message: 'Proof of work verified! Work order submitted for municipal sign-off.',
      workOrder,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/work-orders/:id/approve
// @desc    Municipal Engineer approves repair, releases payment, and resolves incident
router.put('/:id/approve', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { approvedCost } = req.body;
    const workOrder = await WorkOrder.findById(req.params.id);

    if (!workOrder) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }

    workOrder.stage = 'APPROVED';
    workOrder.approvedCost = Number(approvedCost) || workOrder.costEstimate;
    workOrder.auditedBy = req.user._id;
    workOrder.updatedAt = new Date();
    await workOrder.save();

    // Mark incident RESOLVED
    await Incident.findByIdAndUpdate(workOrder.incidentId, {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      updatedAt: new Date(),
    });

    await AuditLog.create({
      action: 'WORK_ORDER_APPROVED',
      performedBy: req.user._id,
      performerName: req.user.name,
      performerRole: req.user.role,
      entityType: 'WORK_ORDER',
      entityId: workOrder.orderNumber,
      details: `Work Order ${workOrder.orderNumber} approved and signed off. Approved payment: ₹${workOrder.approvedCost}. Defect marked RESOLVED.`,
    });

    res.json({
      success: true,
      message: 'Work order approved and defect officially marked as resolved.',
      workOrder,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/work-orders/:id/rework
// @desc    Admin rejects completion and demands rework
router.put('/:id/rework', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { reworkNotes } = req.body;
    const workOrder = await WorkOrder.findById(req.params.id);

    if (!workOrder) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }

    workOrder.stage = 'REWORK_REQUIRED';
    workOrder.reworkNotes = reworkNotes || 'Quality inspection failed. Please re-execute repair.';
    workOrder.updatedAt = new Date();
    await workOrder.save();

    await AuditLog.create({
      action: 'WORK_ORDER_REWORK_DEMANDED',
      performedBy: req.user._id,
      performerName: req.user.name,
      performerRole: req.user.role,
      entityType: 'WORK_ORDER',
      entityId: workOrder.orderNumber,
      details: `Rework demanded on ${workOrder.orderNumber}: ${workOrder.reworkNotes}`,
    });

    res.json({ success: true, message: 'Rework demanded from contractor.', workOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/work-orders/:id/audit-review
// @desc    Governance Auditor conducts independent quality audit of proof-of-work
router.put('/:id/audit-review', protect, authorize('AUDITOR', 'ADMIN'), async (req, res) => {
  try {
    const { auditStatus, auditNotes } = req.body;

    if (!['AUDIT_PASSED', 'AUDIT_FLAGGED_INCOMPLETE', 'AUDIT_REJECTED_FRAUD'].includes(auditStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid audit decision status' });
    }

    const workOrder = await WorkOrder.findById(req.params.id).populate('incidentId');
    if (!workOrder) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }

    workOrder.auditStatus = auditStatus;
    workOrder.auditNotes = auditNotes || '';
    workOrder.auditedAt = new Date();
    workOrder.auditorName = req.user.name;
    workOrder.auditedBy = req.user._id;
    workOrder.updatedAt = new Date();

    if (auditStatus === 'AUDIT_PASSED') {
      // Certified clean by auditor - funds approved
    } else if (auditStatus === 'AUDIT_FLAGGED_INCOMPLETE') {
      // Demands supplementary contractor repair
      workOrder.stage = 'REWORK_REQUIRED';
      workOrder.reworkNotes = `Vigilance Audit: ${auditNotes || 'Repair flagged incomplete during visual inspection.'}`;
      if (workOrder.incidentId) {
        await Incident.findByIdAndUpdate(workOrder.incidentId._id, { status: 'IN_PROGRESS' });
      }
    } else if (auditStatus === 'AUDIT_REJECTED_FRAUD') {
      // Fraudulent claim
      workOrder.stage = 'REWORK_REQUIRED';
      workOrder.approvedCost = 0;
      workOrder.reworkNotes = `Vigilance Fraud Rejection: ${auditNotes || 'Photographic or physical evidence rejected as fraudulent.'}`;
      if (workOrder.incidentId) {
        await Incident.findByIdAndUpdate(workOrder.incidentId._id, { status: 'REPORTED' });
      }
    }

    await workOrder.save();

    await AuditLog.create({
      action: `VIGILANCE_${auditStatus}`,
      performedBy: req.user._id,
      performerName: req.user.name,
      performerRole: req.user.role,
      entityType: 'WORK_ORDER',
      entityId: workOrder.orderNumber,
      details: `Auditor ${req.user.name} recorded determination '${auditStatus}' on ${workOrder.orderNumber}. Notes: ${workOrder.auditNotes || 'No additional remarks.'}`,
    });

    res.json({
      success: true,
      message: `Vigilance audit determination '${auditStatus}' recorded successfully.`,
      workOrder,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

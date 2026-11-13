import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { Incident } from '../models/Incident.js';
import { WorkOrder } from '../models/WorkOrder.js';
import { AuditLog } from '../models/AuditLog.js';
import { calculatePriorityScore } from '../utils/priorityScorer.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civicflow';

export const seedDatabase = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('[Seed] Connecting to database...');
      await mongoose.connect(MONGO_URI);
    }
    console.log('[Seed] Connected. Clearing previous collections...');

    await User.deleteMany({});
    await Incident.deleteMany({});
    await WorkOrder.deleteMany({});
    await AuditLog.deleteMany({});

    console.log('[Seed] Creating demo users...');
    const users = await User.create([
      {
        name: 'Aarav Sharma',
        email: 'citizen@civicflow.gov.in',
        password: 'password123',
        role: 'CITIZEN',
        department: 'GENERAL',
        wardNumber: 3,
        phone: '+91 98765 43210',
      },
      {
        name: 'Er. Rajesh Verma',
        email: 'admin@civicflow.gov.in',
        password: 'password123',
        role: 'ADMIN',
        department: 'ROADS_BRIDGES',
        wardNumber: 1,
        phone: '+91 98111 22233',
      },
      {
        name: 'Apex Infrastructure Works',
        email: 'contractor@civicflow.gov.in',
        password: 'password123',
        role: 'CONTRACTOR',
        department: 'ROADS_BRIDGES',
        wardNumber: 3,
        phone: '+91 94444 55566',
      },
      {
        name: 'BuildWell Civil & Drainage Corp',
        email: 'buildwell@civicflow.gov.in',
        password: 'password123',
        role: 'CONTRACTOR',
        department: 'WATER_SEWERAGE',
        wardNumber: 2,
        phone: '+91 95555 66677',
      },
      {
        name: 'Tricity Electrics & Urban Grid',
        email: 'tricitygrid@civicflow.gov.in',
        password: 'password123',
        role: 'CONTRACTOR',
        department: 'ELECTRICAL_LIGHTING',
        wardNumber: 5,
        phone: '+91 96666 77788',
      },
      {
        name: 'Pooja Iyer',
        email: 'auditor@civicflow.gov.in',
        password: 'password123',
        role: 'AUDITOR',
        department: 'GENERAL',
        wardNumber: 1,
        phone: '+91 97777 88899',
      },
    ]);

    const citizen = users[0];
    const admin = users[1];
    const contractor = users[2];
    const contractorWater = users[3];
    const contractorElec = users[4];
    const auditor = users[5];

    console.log('[Seed] Creating incidents with real spatial coordinates (Chandigarh / Mohali region)...');

    // Base coordinate reference: Chandigarh Sector 17 [76.7794, 30.7398]
    // Mohali Sector 62 [76.7179, 30.7046]
    // Kharar Highway [76.6433, 30.7456]
    
    // Incident 1: Major Crater Pothole (Master Ticket with 4 Clustered Reports)
    const inc1 = await Incident.create({
      title: 'Deep Trench Pothole on Sector 62 Main Arterial Road',
      category: 'POTHOLE',
      description: 'Severe 8-inch deep crater causing vehicle rim damage and extreme traffic slowdown near Phase 7 market.',
      location: { type: 'Point', coordinates: [76.7180, 30.7048] },
      address: 'Phase 7 Market Turn, Sector 62, Mohali',
      wardNumber: 4,
      photoUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
      reportedBy: citizen._id,
      isMasterTicket: true,
      reportCount: 4,
      subscriberIds: [citizen._id],
      severityLevel: 'HIGH',
      trafficDensityRating: 5,
      calculatedPriorityScore: calculatePriorityScore({
        severityLevel: 'HIGH',
        reportCount: 4,
        trafficDensityRating: 5,
        createdAt: new Date(Date.now() - 3 * 86400000),
      }),
      status: 'IN_PROGRESS',
      createdAt: new Date(Date.now() - 3 * 86400000),
    });

    // Clustered child report within 22 meters
    await Incident.create({
      title: 'Large hole on Phase 7 road near traffic light',
      category: 'POTHOLE',
      description: 'Dangerous road cave-in on the left lane.',
      location: { type: 'Point', coordinates: [76.7181, 30.7047] }, // ~18m away
      address: 'Sector 62 Phase 7, Near Light Point',
      wardNumber: 4,
      photoUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
      reportedBy: citizen._id,
      isMasterTicket: false,
      parentMasterId: inc1._id,
      severityLevel: 'HIGH',
      trafficDensityRating: 5,
      status: 'IN_PROGRESS',
      createdAt: new Date(Date.now() - 2 * 86400000),
    });

    // Work Order 1: Assigned to Contractor for Incident 1
    const wo1 = await WorkOrder.create({
      orderNumber: 'WO-2026-1042',
      incidentId: inc1._id,
      assignedDepartment: 'ROADS_BRIDGES',
      assignedContractorId: contractor._id,
      allocatedHours: 48,
      slaDeadline: new Date(Date.now() + 18 * 3600000),
      slaStatus: 'ON_TRACK',
      stage: 'ON_SITE',
      costEstimate: 14500,
      beforePhotoUrl: inc1.photoUrl,
      createdAt: new Date(Date.now() - 30 * 3600000),
    });
    inc1.workOrderId = wo1._id;
    await inc1.save();

    // Incident 2: High Pressure Water Main Burst (Master Ticket - SLA Warning)
    const inc2 = await Incident.create({
      title: 'Drinking Water Pipeline Rupture Flooding Sector 17 Plaza',
      category: 'WATER_LEAK',
      description: 'Potable water supply pipe fractured, flooding the public plaza walkway with significant wastage.',
      location: { type: 'Point', coordinates: [76.7801, 30.7402] },
      address: 'Near Central Bank Building, Sector 17, Chandigarh',
      wardNumber: 2,
      photoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f9?auto=format&fit=crop&w=800&q=80',
      reportedBy: citizen._id,
      isMasterTicket: true,
      reportCount: 3,
      subscriberIds: [citizen._id],
      severityLevel: 'CRITICAL',
      trafficDensityRating: 4,
      calculatedPriorityScore: calculatePriorityScore({
        severityLevel: 'CRITICAL',
        reportCount: 3,
        trafficDensityRating: 4,
        createdAt: new Date(Date.now() - 2 * 86400000),
      }),
      status: 'WORK_ORDER_CREATED',
      createdAt: new Date(Date.now() - 2 * 86400000),
    });

    const wo2 = await WorkOrder.create({
      orderNumber: 'WO-2026-1043',
      incidentId: inc2._id,
      assignedDepartment: 'WATER_SEWERAGE',
      assignedContractorId: contractorWater._id,
      allocatedHours: 24,
      slaDeadline: new Date(Date.now() + 2 * 3600000), // Only 2 hours remaining!
      slaStatus: 'WARNING_75',
      stage: 'ACCEPTED',
      auditStatus: 'PENDING_AUDIT',
      costEstimate: 22000,
      beforePhotoUrl: inc2.photoUrl,
      createdAt: new Date(Date.now() - 22 * 3600000),
    });
    inc2.workOrderId = wo2._id;
    await inc2.save();

    // Incident 3: Resolved Pothole with Geofence Proof of Work (Before & After)
    const inc3 = await Incident.create({
      title: 'Resurfacing Asphalt Pothole on University Access Road',
      category: 'POTHOLE',
      description: 'Multiple potholes filled with cold-mix asphalt, leveled, and steam-rolled.',
      location: { type: 'Point', coordinates: [76.6430, 30.7450] },
      address: 'Campus Gate 2, Kharar-Gharuan Highway',
      wardNumber: 7,
      photoUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
      reportedBy: citizen._id,
      isMasterTicket: true,
      reportCount: 5,
      subscriberIds: [citizen._id],
      severityLevel: 'HIGH',
      trafficDensityRating: 4,
      calculatedPriorityScore: 78,
      status: 'RESOLVED',
      resolvedAt: new Date(Date.now() - 86400000),
      createdAt: new Date(Date.now() - 5 * 86400000),
    });

    const wo3 = await WorkOrder.create({
      orderNumber: 'WO-2026-1038',
      incidentId: inc3._id,
      assignedDepartment: 'ROADS_BRIDGES',
      assignedContractorId: contractor._id,
      allocatedHours: 48,
      slaDeadline: new Date(Date.now() - 24 * 3600000),
      slaStatus: 'ON_TRACK',
      stage: 'APPROVED',
      auditStatus: 'AUDIT_PASSED',
      auditNotes: 'Core thickness measured at 65mm. Geofence radius compliant (14.2m). Certified for public vehicle transit.',
      auditorName: 'Pooja Iyer',
      costEstimate: 18000,
      approvedCost: 18000,
      beforePhotoUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
      afterPhotoUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
      contractorUploadCoordinates: { type: 'Point', coordinates: [76.6431, 30.7451] }, // 14 meters away
      geofenceDistanceMeters: 14.2,
      isGeofenceVerified: true,
      completionNotes: 'High-grade bitumen compacting completed. Tested for load bearing.',
      completedAt: new Date(Date.now() - 90000000),
      auditedBy: auditor._id,
      auditedAt: new Date(Date.now() - 40000000),
      createdAt: new Date(Date.now() - 4 * 86400000),
    });
    inc3.workOrderId = wo3._id;
    await inc3.save();

    // Incident 4: Dark Corridor - 6 Broken Streetlights (Pending Inspection)
    const inc4 = await Incident.create({
      title: 'Dark Zone: Multiple Continuous Streetlights Dead on Aerocity Road',
      category: 'STREETLIGHT',
      description: 'Underground wiring short circuit causing 200m blackout zone at night.',
      location: { type: 'Point', coordinates: [76.7350, 30.6720] },
      address: 'Aerocity Block C Avenue, Mohali',
      wardNumber: 5,
      photoUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
      reportedBy: citizen._id,
      isMasterTicket: true,
      reportCount: 2,
      subscriberIds: [citizen._id],
      severityLevel: 'MEDIUM',
      trafficDensityRating: 3,
      calculatedPriorityScore: 54,
      status: 'IN_PROGRESS',
      createdAt: new Date(Date.now() - 86400000),
    });

    const wo4 = await WorkOrder.create({
      orderNumber: 'WO-2026-1045',
      incidentId: inc4._id,
      assignedDepartment: 'ELECTRICAL_LIGHTING',
      assignedContractorId: contractorElec._id,
      allocatedHours: 24,
      slaDeadline: new Date(Date.now() + 12 * 3600000),
      slaStatus: 'ON_TRACK',
      stage: 'PENDING_INSPECTION',
      auditStatus: 'PENDING_AUDIT',
      costEstimate: 8500,
      beforePhotoUrl: inc4.photoUrl,
      afterPhotoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
      contractorUploadCoordinates: { type: 'Point', coordinates: [76.7352, 30.6721] },
      geofenceDistanceMeters: 21.0,
      isGeofenceVerified: true,
      completionNotes: 'Capacitor bank replaced and 6 LED fixtures recabled.',
      completedAt: new Date(Date.now() - 3600000),
      createdAt: new Date(Date.now() - 20 * 3600000),
    });
    inc4.workOrderId = wo4._id;
    await inc4.save();

    // Incident 5: Fallen Gulmohar Tree Blocking Dual Carriageway
    const inc5 = await Incident.create({
      title: 'Massive Fallen Tree Uprooted by Storm Blocking Ambulance Route',
      category: 'FALLEN_TREE',
      description: 'Old tree snapped during rainstorm, crushing guardrail and blocking Sector 32 hospital route.',
      location: { type: 'Point', coordinates: [76.7620, 30.7120] },
      address: 'Sector 32 GMCH Hospital Approach, Chandigarh',
      wardNumber: 3,
      photoUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
      reportedBy: citizen._id,
      isMasterTicket: true,
      reportCount: 7,
      subscriberIds: [citizen._id],
      severityLevel: 'CRITICAL',
      trafficDensityRating: 5,
      calculatedPriorityScore: 92,
      status: 'REPORTED',
      createdAt: new Date(Date.now() - 4 * 3600000),
    });

    // Create Audit Logs
    await AuditLog.create([
      {
        action: 'SYSTEM_INITIALIZED',
        performerName: 'Municipal Server System',
        performerRole: 'SYSTEM',
        entityType: 'USER',
        entityId: 'SYSTEM-ROOT',
        details: 'CivicFlow database populated with municipal spatial zones and baseline SLA policies.',
      },
      {
        action: 'PROOF_OF_WORK_VERIFIED',
        performedBy: contractor._id,
        performerName: contractor.name,
        performerRole: 'CONTRACTOR',
        entityType: 'GEOFENCE',
        entityId: 'WO-2026-1038',
        details: 'Geofence check PASSED: Photo uploaded 14.2m from incident site (threshold <= 35m). Anti-fraud clearance granted.',
      },
      {
        action: 'GEOFENCE_FRAUD_REJECTED',
        performedBy: contractor._id,
        performerName: contractor.name,
        performerRole: 'CONTRACTOR',
        entityType: 'GEOFENCE',
        entityId: 'WO-2026-1039',
        details: 'Geofence violation: Contractor attempted sign-off 240m away from site. Claim flagged and rejected.',
      },
    ]);

    console.log('[Seed] Database populated successfully!');
    console.log(`[Seed] Created ${users.length} users, 5 master incidents, 1 child cluster, 4 work orders.`);
    return true;
  } catch (error) {
    console.error(`[Seed Error] ${error.message}`);
    return false;
  } finally {
    await mongoose.disconnect();
  }
};

// Execute if run directly
if (process.argv[1] && process.argv[1].endsWith('seedData.js')) {
  seedDatabase().then(() => process.exit(0));
}

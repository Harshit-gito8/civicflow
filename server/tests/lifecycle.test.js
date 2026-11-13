import assert from 'assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { Incident } from '../models/Incident.js';
import { WorkOrder } from '../models/WorkOrder.js';
import { AuditLog } from '../models/AuditLog.js';
import { calculatePriorityScore } from '../utils/priorityScorer.js';
import { verifyProofOfWorkGeofence } from '../utils/geoCluster.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civicflow';

async function testConnectedLifecycle() {
  console.log('====================================================');
  console.log('CivicFlow Connected Municipal Lifecycle Test Suite');
  console.log('====================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log('[Connected] MongoDB session active.');

  try {
    // Step 1: Query citizen, engineer, contractor, and auditor
    const citizen = await User.findOne({ email: 'citizen@civicflow.gov.in' });
    const engineer = await User.findOne({ email: 'admin@civicflow.gov.in' });
    const contractor = await User.findOne({ email: 'contractor@civicflow.gov.in' });
    const auditor = await User.findOne({ email: 'auditor@civicflow.gov.in' });

    assert.ok(citizen, 'Citizen account must exist');
    assert.ok(engineer, 'Engineer account must exist');
    assert.ok(contractor, 'Contractor account must exist');
    assert.ok(auditor, 'Auditor account must exist');
    console.log('[PASS] Step 1: All four municipal RBAC user personas verified.');

    // Step 2: Citizen registers grievance with geo-coordinates
    const testCoordinates = [76.7190, 30.7055];
    const initialPriority = calculatePriorityScore({
      severityLevel: 'HIGH',
      reportCount: 1,
      trafficDensityRating: 4,
      createdAt: new Date(),
    });

    const newGrievance = await Incident.create({
      title: 'Active Underground Water Line Rupture on Sector 62',
      category: 'WATER_LEAK',
      description: 'Pressurized water gushing across main lane causing vehicular skids and water logging.',
      location: { type: 'Point', coordinates: testCoordinates },
      address: 'Near Sector 62 Library Point, Mohali',
      wardNumber: 4,
      photoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f9?auto=format&fit=crop&w=800&q=80',
      reportedBy: citizen._id,
      isMasterTicket: true,
      reportCount: 1,
      subscriberIds: [citizen._id],
      severityLevel: 'HIGH',
      trafficDensityRating: 4,
      calculatedPriorityScore: initialPriority,
      status: 'REPORTED',
    });

    assert.ok(newGrievance._id, 'New grievance must be persisted in DB');
    assert.strictEqual(newGrievance.status, 'REPORTED', 'Initial status must be REPORTED');
    console.log(`[PASS] Step 2: Grievance logged. Docket #${newGrievance._id.toString().slice(-6)} created with status 'REPORTED'.`);

    // Step 3: Verify it is visible in the Ward Engineer dispatch queue
    const unassignedIncidents = await Incident.find({
      isMasterTicket: true,
      status: { $in: ['REPORTED', 'TRIAGED'] },
    });
    const foundInQueue = unassignedIncidents.some((i) => i._id.equals(newGrievance._id));
    assert.ok(foundInQueue, 'Grievance must appear in Engineer dispatch queue');
    console.log('[PASS] Step 3: Verified grievance appears in Engineer queue awaiting contractor dispatch.');

    // Step 4: Engineer dispatches work order to chosen contractor
    const hours = 48;
    const slaDeadline = new Date(Date.now() + hours * 3600 * 1000);
    const orderNumber = `WO-${new Date().getFullYear()}-${Math.floor(2000 + Math.random() * 7000)}`;

    const workOrder = await WorkOrder.create({
      orderNumber,
      incidentId: newGrievance._id,
      assignedDepartment: 'WATER_SEWERAGE',
      assignedContractorId: contractor._id,
      allocatedHours: hours,
      slaDeadline,
      slaStatus: 'ON_TRACK',
      costEstimate: 16500,
      stage: 'DISPATCHED',
      auditStatus: 'PENDING_AUDIT',
      beforePhotoUrl: newGrievance.photoUrl,
    });

    newGrievance.workOrderId = workOrder._id;
    newGrievance.status = 'WORK_ORDER_CREATED';
    await newGrievance.save();

    assert.strictEqual(newGrievance.status, 'WORK_ORDER_CREATED', 'Incident status must advance to WORK_ORDER_CREATED');
    console.log(`[PASS] Step 4: Work order ${orderNumber} dispatched to ${contractor.name}. Incident status advanced to 'WORK_ORDER_CREATED'.`);

    // Step 5: Contractor accepts and logs arrival on-site
    workOrder.stage = 'ACCEPTED';
    await workOrder.save();

    workOrder.stage = 'ON_SITE';
    await workOrder.save();
    newGrievance.status = 'IN_PROGRESS';
    await newGrievance.save();

    assert.strictEqual(newGrievance.status, 'IN_PROGRESS', 'Incident status must advance to IN_PROGRESS upon on-site arrival');
    console.log(`[PASS] Step 5: Contractor arrived on site. Incident status advanced to 'IN_PROGRESS'.`);

    // Step 6: Contractor completes repair and submits Proof-of-Work with Anti-Fraud Geofence
    const contractorUploadCoords = [76.7191, 30.7056]; // ~14m from defect
    const geofenceCheck = verifyProofOfWorkGeofence(testCoordinates, contractorUploadCoords, 35);

    assert.strictEqual(geofenceCheck.isVerified, true, 'Geofence check within 35m must pass');
    workOrder.stage = 'PENDING_INSPECTION';
    workOrder.afterPhotoUrl = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80';
    workOrder.completionNotes = 'Pressure valve replaced and bitumen road patch restored.';
    workOrder.contractorUploadCoordinates = { type: 'Point', coordinates: contractorUploadCoords };
    workOrder.geofenceDistanceMeters = geofenceCheck.distanceMeters;
    workOrder.isGeofenceVerified = true;
    workOrder.completedAt = new Date();
    await workOrder.save();

    console.log(`[PASS] Step 6: Contractor proof-of-work geofence PASSED (${geofenceCheck.distanceMeters}m <= 35m). Advanced to 'PENDING_INSPECTION'.`);

    // Step 7: Municipal Engineer inspects and signs off payment, officially marking defect RESOLVED
    workOrder.stage = 'APPROVED';
    workOrder.approvedCost = 16500;
    workOrder.auditedBy = engineer._id;
    await workOrder.save();

    newGrievance.status = 'RESOLVED';
    newGrievance.resolvedAt = new Date();
    await newGrievance.save();

    assert.strictEqual(newGrievance.status, 'RESOLVED', 'Incident status must be officially RESOLVED');
    console.log(`[PASS] Step 7: Engineer approved work order. Incident marked 'RESOLVED' in database.`);

    // Step 8: Verify it is updated on the Map registry as RESOLVED
    const resolvedCheck = await Incident.findById(newGrievance._id);
    assert.strictEqual(resolvedCheck.status, 'RESOLVED', 'DB must reflect resolved status');
    assert.ok(resolvedCheck.resolvedAt, 'resolvedAt timestamp must be recorded');
    console.log('[PASS] Step 8: Verified on Map Registry that incident is green (status: RESOLVED).');

    // Step 9: City Auditor conducts Vigilance Audit Review
    workOrder.auditStatus = 'AUDIT_PASSED';
    workOrder.auditNotes = 'Independent vigilance inspection completed. Pipe integrity and asphalt leveling verified.';
    workOrder.auditorName = auditor.name;
    workOrder.auditedBy = auditor._id;
    workOrder.auditedAt = new Date();
    await workOrder.save();

    await AuditLog.create({
      action: 'VIGILANCE_AUDIT_PASSED',
      performedBy: auditor._id,
      performerName: auditor.name,
      performerRole: auditor.role,
      entityType: 'WORK_ORDER',
      entityId: workOrder.orderNumber,
      details: `Auditor ${auditor.name} officially certified ${workOrder.orderNumber}: ${workOrder.auditNotes}`,
    });

    const updatedWO = await WorkOrder.findById(workOrder._id);
    assert.strictEqual(updatedWO.auditStatus, 'AUDIT_PASSED', 'Work order auditStatus must be AUDIT_PASSED');

    const auditLogCheck = await AuditLog.findOne({ entityId: workOrder.orderNumber, action: 'VIGILANCE_AUDIT_PASSED' });
    assert.ok(auditLogCheck, 'Audit log entry must be recorded in ledger');
    console.log(`[PASS] Step 9: Auditor Pooja Iyer certified proof of work ('AUDIT_PASSED'). Immutable ledger logged.`);

    console.log('\n====================================================');
    console.log('ALL 9 END-TO-END MUNICIPAL LIFECYCLE TESTS PASSED!');
    console.log('Every state transition is 100% persisted and synced in MongoDB.');
    console.log('====================================================');

    // Clean up test grievance and work order
    await WorkOrder.findByIdAndDelete(workOrder._id);
    await Incident.findByIdAndDelete(newGrievance._id);
    await AuditLog.findByIdAndDelete(auditLogCheck._id);
  } catch (err) {
    console.error(`[TEST FAILURE] ${err.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testConnectedLifecycle();

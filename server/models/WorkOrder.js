import mongoose from 'mongoose';

const WorkOrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  incidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    required: true,
  },
  assignedDepartment: {
    type: String,
    required: true,
    enum: ['ROADS_BRIDGES', 'WATER_SEWERAGE', 'ELECTRICAL_LIGHTING', 'TRAFFIC_TRANSIT', 'GENERAL'],
  },
  assignedContractorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  allocatedHours: {
    type: Number,
    required: true,
    default: 48,
  },
  slaDeadline: {
    type: Date,
    required: true,
  },
  slaStatus: {
    type: String,
    enum: ['ON_TRACK', 'WARNING_75', 'BREACHED'],
    default: 'ON_TRACK',
  },
  stage: {
    type: String,
    enum: [
      'DISPATCHED',
      'ACCEPTED',
      'ON_SITE',
      'PENDING_INSPECTION',
      'APPROVED',
      'REWORK_REQUIRED'
    ],
    default: 'DISPATCHED',
  },
  costEstimate: {
    type: Number,
    required: true,
    default: 5000,
  },
  approvedCost: {
    type: Number,
    default: 0,
  },
  beforePhotoUrl: {
    type: String,
    default: '',
  },
  afterPhotoUrl: {
    type: String,
    default: '',
  },
  contractorUploadCoordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  },
  geofenceDistanceMeters: {
    type: Number,
    default: 0,
  },
  isGeofenceVerified: {
    type: Boolean,
    default: false,
  },
  reworkNotes: {
    type: String,
    default: '',
  },
  completionNotes: {
    type: String,
    default: '',
  },
  completedAt: {
    type: Date,
    default: null,
  },
  // Vigilance & Quality Audit
  auditStatus: {
    type: String,
    enum: ['PENDING_AUDIT', 'AUDIT_PASSED', 'AUDIT_FLAGGED_INCOMPLETE', 'AUDIT_REJECTED_FRAUD'],
    default: 'PENDING_AUDIT',
  },
  auditNotes: {
    type: String,
    default: '',
  },
  auditedAt: {
    type: Date,
    default: null,
  },
  auditorName: {
    type: String,
    default: '',
  },
  auditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

WorkOrderSchema.index({ stage: 1 });
WorkOrderSchema.index({ assignedContractorId: 1 });
WorkOrderSchema.index({ slaDeadline: 1 });

export const WorkOrder = mongoose.model('WorkOrder', WorkOrderSchema);

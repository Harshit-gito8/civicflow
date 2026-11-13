import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  performerName: {
    type: String,
    default: 'System Daemon',
  },
  performerRole: {
    type: String,
    default: 'SYSTEM',
  },
  entityType: {
    type: String,
    enum: ['INCIDENT', 'WORK_ORDER', 'USER', 'SLA_BREACH', 'GEOFENCE'],
    required: true,
  },
  entityId: {
    type: String,
    required: true,
  },
  details: {
    type: String,
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

AuditLogSchema.index({ timestamp: -1 });

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

import mongoose from 'mongoose';

const IncidentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Incident title is required'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'POTHOLE',
      'WATER_LEAK',
      'STREETLIGHT',
      'SEWAGE_OVERFLOW',
      'TRAFFIC_SIGNAL',
      'FALLEN_TREE',
      'GARBAGE_DUMP'
    ],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    // Coordinates format: [longitude, latitude] (GeoJSON standard)
    coordinates: {
      type: [Number],
      required: [true, 'Longitude and Latitude coordinates are required'],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length === 2;
        },
        message: 'Coordinates must be [longitude, latitude]',
      },
    },
  },
  address: {
    type: String,
    required: [true, 'Address or landmark is required'],
  },
  wardNumber: {
    type: Number,
    required: [true, 'Ward number is required'],
    min: 1,
    max: 50,
  },
  photoUrl: {
    type: String,
    default: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Spatial Clustering
  isMasterTicket: {
    type: Boolean,
    default: true,
  },
  parentMasterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    default: null,
  },
  reportCount: {
    type: Number,
    default: 1,
  },
  subscriberIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // Dynamic Priority Scoring Factors
  severityLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
  },
  trafficDensityRating: {
    type: Number,
    min: 1,
    max: 5,
    default: 3,
  },
  calculatedPriorityScore: {
    type: Number,
    default: 0,
  },
  // Lifecycle Status
  status: {
    type: String,
    enum: [
      'REPORTED',
      'TRIAGED',
      'WORK_ORDER_CREATED',
      'IN_PROGRESS',
      'RESOLVED',
      'CLOSED',
      'REJECTED'
    ],
    default: 'REPORTED',
  },
  // Resolution Info
  workOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkOrder',
    default: null,
  },
  resolvedAt: {
    type: Date,
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

// GeoJSON 2dsphere index for location queries
IncidentSchema.index({ location: '2dsphere' });
IncidentSchema.index({ category: 1, status: 1 });
IncidentSchema.index({ wardNumber: 1 });
IncidentSchema.index({ calculatedPriorityScore: -1 });

export const Incident = mongoose.model('Incident', IncidentSchema);

const mongoose = require('mongoose');
const { generateScheduledTripId, generateRoutePointId } = require('../utils/uuidUtils');

const normalizeRoutePoints = (doc) => {
  if (!Array.isArray(doc.route_points)) {
    doc.route_points = [];
    return;
  }

  doc.route_points = doc.route_points.map((point, index) => {
    const data = point ? point.toObject?.() ?? point : {};
    if (!data.stop_id) {
      data.stop_id = generateRoutePointId();
    }
    data.sequence = typeof data.sequence === 'number' ? data.sequence : index + 1;
    data.order = typeof data.order === 'number' ? data.order : index + 1;
    data.dwell_target_seconds = typeof data.dwell_target_seconds === 'number' ? data.dwell_target_seconds : 120;
    data.sla_arrival_buffer_seconds = typeof data.sla_arrival_buffer_seconds === 'number' ? data.sla_arrival_buffer_seconds : 300;
    data.geofence_radius_meters =
      typeof data.geofence_radius_meters === 'number' && Number.isFinite(data.geofence_radius_meters)
        ? data.geofence_radius_meters
        : 100;
    return data;
  });
};

const routePointSchema = new mongoose.Schema(
  {
    stop_id: {
      type: String,
      default: generateRoutePointId
    },
    name: {
      type: String,
      default: null
    },
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    sequence: {
      type: Number,
      default: 0
    },
    order: {
      type: Number,
      default: 0
    },
    dwell_target_seconds: {
      type: Number,
      default: 120
    },
    sla_arrival_buffer_seconds: {
      type: Number,
      default: 300
    },
    geofence_radius_meters: {
      type: Number,
      default: 100
    },
    planned_arrival_time: Date,
    planned_departure_time: Date
  },
  { _id: false }
);

const scheduledTripSchema = new mongoose.Schema(
  {
    scheduled_trip_id: {
      type: String,
      default: generateScheduledTripId,
      unique: true,
      required: true
    },
    vehicle_id: {
      type: String,
      ref: 'Vehicle',
      required: true
    },
    driver_id: {
      type: String,
      ref: 'User',
      required: true
    },
    operator_id: {
      type: String,
      ref: 'Operator',
      required: true
    },
    route_name: String,
    scheduled_start_time: {
      type: String,
      required: true
    },
    trip_period: {
      type: String,
      enum: ['morning', 'afternoon', 'evening'],
      default: 'morning'
    },
    start_location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    end_location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    route_points: {
      type: [routePointSchema],
      default: []
    },
    repeat_days: {
      type: {
        Monday: { type: Boolean, default: false },
        Tuesday: { type: Boolean, default: false },
        Wednesday: { type: Boolean, default: false },
        Thursday: { type: Boolean, default: false },
        Friday: { type: Boolean, default: false },
        Saturday: { type: Boolean, default: false },
        Sunday: { type: Boolean, default: false }
      },
      default: {
        Monday: false,
        Tuesday: false,
        Wednesday: false,
        Thursday: false,
        Friday: false,
        Saturday: false,
        Sunday: false
      }
    },
    is_active: {
      type: Boolean,
      default: true
    },
    associated_trip_id: {
      type: String,
      ref: 'Trip',
      default: null
    },
    last_started_on: {
      type: String,
      default: null
    },
    last_completed_on: {
      type: String,
      default: null
    },
    last_status_change_at: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'cancelled'],
      default: 'pending'
    }
  },
  { timestamps: true, id: false }
);

scheduledTripSchema.pre('validate', function (next) {
  normalizeRoutePoints(this);
  next();
});

scheduledTripSchema.pre('save', function (next) {
  if (!this.scheduled_trip_id) {
    this.scheduled_trip_id = generateScheduledTripId();
  }
  normalizeRoutePoints(this);
  next();
});

scheduledTripSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.scheduled_trip_id = ret.scheduled_trip_id || ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.id;
    return ret;
  }
});

scheduledTripSchema.set('toObject', {
  virtuals: true,
  transform: (_, ret) => {
    ret.scheduled_trip_id = ret.scheduled_trip_id || ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.id;
    return ret;
  }
});

module.exports = mongoose.model('ScheduledTrip', scheduledTripSchema);

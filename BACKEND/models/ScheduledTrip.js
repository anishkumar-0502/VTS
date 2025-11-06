const mongoose = require('mongoose');
const { generateScheduledTripId } = require('../utils/uuidUtils');

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
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'cancelled'],
      default: 'pending'
    }
  },
  { timestamps: true, id: false }
);

scheduledTripSchema.pre('save', function (next) {
  if (!this.scheduled_trip_id) {
    this.scheduled_trip_id = generateScheduledTripId();
  }
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

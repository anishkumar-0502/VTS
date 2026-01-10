const mongoose = require('mongoose');

const tripHistorySchema = new mongoose.Schema(
  {
    trip_id: {
      type: String,
      required: true,
      unique: true
    },
    scheduled_trip_id: {
      type: String,
      ref: 'ScheduledTrip',
      default: null
    },
    driver_id: {
      type: String,
      required: true
    },
    vehicle_id: {
      type: String,
      required: true
    },
    operator_id: {
      type: String,
      required: true
    },
    route_name: String,
    planned_date: {
      type: String,
      default: null
    },
    trip_period: {
      type: String,
      default: null
    },
    trip_type: {
      type: String,
      default: null
    },
    start_time: Date,
    end_time: Date,
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
    completed_date: {
      type: String,
      index: true,
      default: null
    },
    completed_day: {
      type: String,
      default: null
    },
    distance_traveled: Number,
    duration: Number,
    snapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'completed'
    },
    source_type: {
      type: String,
      enum: ['on_demand', 'scheduled'],
      default: 'on_demand'
    }
  },
  { timestamps: true, id: false }
);

tripHistorySchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.trip_id = ret.trip_id || ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

tripHistorySchema.set('toObject', {
  virtuals: true,
  transform: (_, ret) => {
    ret.trip_id = ret.trip_id || ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('TripHistory', tripHistorySchema, 'trip_history');

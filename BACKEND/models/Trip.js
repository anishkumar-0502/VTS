const mongoose = require('mongoose');
const { generateTripId } = require('../utils/uuidUtils');

const tripSchema = new mongoose.Schema(
  {
    trip_id: {
      type: String,
      default: generateTripId,
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
    start_time: {
      type: Date,
      required: true
    },
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
    distance_traveled: Number,
    duration: Number,
    average_speed: Number,
    max_speed: Number,
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active'
    },
    total_passengers: Number,
    stops: [
      {
        name: String,
        latitude: Number,
        longitude: Number,
        arrival_time: Date,
        departure_time: Date,
        passengers_boarded: Number,
        passengers_alighted: Number
      }
    ],
    fuel_consumed: Number,
    speed_violations: [
      {
        timestamp: Date,
        speed: Number,
        speed_limit: Number,
        location: {
          latitude: Number,
          longitude: Number
        }
      }
    ],
    route_deviations: [
      {
        timestamp: Date,
        expected_location: {
          latitude: Number,
          longitude: Number
        },
        actual_location: {
          latitude: Number,
          longitude: Number
        },
        deviation_meters: Number
      }
    ],
    passengers: [
      {
        user_id: {
          type: String,
          ref: 'User'
        },
        name: String,
        phone_number: String,
        pickup_stop: {
          name: String,
          latitude: Number,
          longitude: Number
        },
        drop_stop: {
          name: String,
          latitude: Number,
          longitude: Number
        },
        picked_up: {
          type: Boolean,
          default: false
        },
        picked_up_time: Date,
        dropped: {
          type: Boolean,
          default: false
        },
        dropped_time: Date,
        parent_contact: String,
        parent_confirmed_pickup: {
          type: Boolean,
          default: false
        },
        parent_pickup_confirmation_time: Date,
        parent_confirmed_dropoff: {
          type: Boolean,
          default: false
        },
        parent_dropoff_confirmation_time: Date,
        notification_sent_before_pickup: {
          type: Boolean,
          default: false
        },
        notification_sent_before_dropoff: {
          type: Boolean,
          default: false
        },
        geofence_exit_alert_sent: {
          type: Boolean,
          default: false
        }
      }
    ],
    route_points: [
      {
        name: String,
        latitude: Number,
        longitude: Number,
        order: Number
      }
    ],
    selected_start_point: {
      name: String,
      latitude: Number,
      longitude: Number
    },
    selected_end_point: {
      name: String,
      latitude: Number,
      longitude: Number
    },
    speed_alarm_enabled: {
      type: Boolean,
      default: true
    },
    speed_limit: {
      type: Number,
      default: 60
    }
  },
  { timestamps: true, id: false }
);

tripSchema.pre('save', function (next) {
  if (!this.trip_id) {
    this.trip_id = generateTripId();
  }
  next();
});

tripSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.trip_id = ret.trip_id || ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.id;
    return ret;
  }
});

tripSchema.set('toObject', {
  virtuals: true,
  transform: (_, ret) => {
    ret.trip_id = ret.trip_id || ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.id;
    return ret;
  }
});

module.exports = mongoose.model('Trip', tripSchema);

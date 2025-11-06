const mongoose = require('mongoose');
const { generateTrackingDataId } = require('../utils/uuidUtils');

const trackingDataSchema = new mongoose.Schema(
  {
    tracking_data_id: {
      type: String,
      default: generateTrackingDataId,
      unique: true,
      required: true
    },
    vehicle_id: {
      type: String,
      ref: 'Vehicle',
      default: null
    },
    device_id: {
      type: String,
      ref: 'Device',
      required: true
    },
    trip_id: {
      type: String,
      ref: 'Trip'
    },
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    altitude: Number,
    speed: {
      type: Number,
      default: 0
    },
    course: Number,
    accuracy: Number,
    satellites: Number,
    fix_quality: Number,
    hdop: Number,
    battery_level: Number,
    signal_strength: Number,
    timestamp: {
      type: Date,
      required: true,
      index: true
    },
    device_timestamp: Date,
    address: String,
    address_components: {
      street: String,
      city: String,
      state: String,
      country: String
    }
  },
  { timestamps: true, id: false, collection: 'trackingdata' }
);

trackingDataSchema.pre('save', function (next) {
  if (!this.tracking_data_id) {
    this.tracking_data_id = generateTrackingDataId();
  }
  next();
});

trackingDataSchema.index({ vehicle_id: 1, timestamp: -1 });
trackingDataSchema.index({ device_id: 1, timestamp: -1 });
trackingDataSchema.index({ trip_id: 1, timestamp: -1 });

trackingDataSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.tracking_data_id = ret.tracking_data_id || ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.id;
    return ret;
  }
});

trackingDataSchema.set('toObject', {
  virtuals: true,
  transform: (_, ret) => {
    ret.tracking_data_id = ret.tracking_data_id || ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.id;
    return ret;
  }
});

module.exports = mongoose.model('TrackingData', trackingDataSchema);

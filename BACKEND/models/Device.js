const mongoose = require('mongoose');
const { generateDeviceId } = require('../utils/uuidUtils');

const deviceSchema = new mongoose.Schema(
  {
    device_id: {
      type: String,
      unique: true,
      required: true,
      default: generateDeviceId
    },
    imei: {
      type: String,
      required: true,
      unique: true
    },
    device_type: {
      type: String,
      enum: ['gps_tracker', 'iot_device', 'mobile'],
      default: 'gps_tracker'
    },
    status: {
      type: Boolean,
      default: true
    },
    assigned_operator_id: {
      type: String,
      ref: 'Operator',
      default: null
    },
    vehicle_id: {
      type: String,
      ref: 'Vehicle'
    },
    assigned_date: {
      type: Date,
      default: null
    },
    battery_level: {
      type: Number,
      default: 100
    },
    signal_strength: Number,
    last_signal: Date,
    last_location: {
      latitude: Number,
      longitude: Number,
      timestamp: Date
    },
    firmware_version: String,
    hardware_version: String,
    sim_number: String,
    notes: String
  },
  { timestamps: true, id: false }
);

deviceSchema.pre('save', function (next) {
  if (!this.device_id) {
    this.device_id = generateDeviceId();
  }
  next();
});

deviceSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.device_id = ret.device_id || ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.id;
    return ret;
  }
});

deviceSchema.set('toObject', {
  virtuals: true,
  transform: (_, ret) => {
    ret.device_id = ret.device_id || ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.id;
    return ret;
  }
});

module.exports = mongoose.model('Device', deviceSchema);

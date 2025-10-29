const mongoose = require('mongoose');
const { generateVehicleId } = require('../utils/uuidUtils');

const vehicleSchema = new mongoose.Schema(
  {
    vehicle_id: {
      type: String,
      default: generateVehicleId,
      unique: true,
      required: true
    },
    vehicle_number: {
      type: String,
      required: true,
      unique: true
    },
    operator_id: {
      type: String,
      ref: 'Operator',
      required: true
    },
    device_id: {
      type: String,
      ref: 'Device'
    },
    vehicle_type: {
      type: String,
      enum: ['bus', 'truck', 'car', 'van'],
      default: 'bus'
    },
    route_name: String,
    driver_id: {
      type: String,
      ref: 'User'
    },
    capacity: {
      type: Number,
      default: 0
    },
    current_status: {
      type: String,
      enum: ['idle', 'active', 'maintenance', 'offline'],
      default: 'offline'
    },
    status: {
      type: Boolean,
      default: true
    },
    latitude: Number,
    longitude: Number,
    speed: {
      type: Number,
      default: 0
    },
    altitude: Number,
    bearing: Number,
    last_update: Date,
    route_points: [
      {
        name: String,
        latitude: Number,
        longitude: Number,
        order: Number,
        arrival_time: Date
      }
    ],
    standing_location: {
      name: String,
      latitude: Number,
      longitude: Number
    },
    maintenance_due_date: Date,
    registration_number: String,
    chassis_number: String,
    color: String,
    mileage: Number,
    fuel_type: String,
    seating_capacity: Number
  },
  { timestamps: true, id: false }
);

vehicleSchema.pre('save', function (next) {
  if (!this.vehicle_id) {
    this.vehicle_id = generateVehicleId();
  }
  next();
});

vehicleSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.vehicle_id = ret.vehicle_id || ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.id;
    return ret;
  }
});

vehicleSchema.set('toObject', {
  virtuals: true,
  transform: (_, ret) => {
    ret.vehicle_id = ret.vehicle_id || ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.id;
    return ret;
  }
});

module.exports = mongoose.model('Vehicle', vehicleSchema);

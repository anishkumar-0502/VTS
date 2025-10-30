const mongoose = require('mongoose');
const { generateDriverId } = require('../utils/uuidUtils');

const driverSchema = new mongoose.Schema(
  {
    driver_id: {
      type: String,
      unique: true,
      default: generateDriverId
    },
    user_id: {
      type: String,
      ref: 'User',
      required: true,
      unique: true
    },
    operator_id: {
      type: String,
      ref: 'Operator',
      required: true
    },
    assigned_vehicle_id: {
      type: String,
      ref: 'Vehicle',
      default: null
    },
    license_number: {
      type: String,
      default: null
    },
    license_expiry: {
      type: Date,
      default: null
    },
    status: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

driverSchema.pre('save', function (next) {
  if (!this.driver_id) {
    this.driver_id = generateDriverId();
  }
  next();
});

driverSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.driver_id = ret.driver_id || ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

driverSchema.set('toObject', {
  virtuals: true,
  transform: (_, ret) => {
    ret.driver_id = ret.driver_id || ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Driver', driverSchema);

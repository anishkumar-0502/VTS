const mongoose = require('mongoose');
const { generateOperatorId } = require('../utils/uuidUtils');

const operatorSchema = new mongoose.Schema(
  {
    operator_id: {
      type: String,
      unique: true,
      default: generateOperatorId
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true
    },
    company_name: String,
    registration_number: String,
    address: String,
    city: String,
    state: String,
    postal_code: String,
    country: String,
    license_number: String,
    license_expiry: Date,
    admin_user_id: {
      type: String,
      ref: 'User'
    },
    status: {
      type: Boolean,
      default: true
    },
    subscription_plan: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      default: 'basic'
    },
    total_vehicles: {
      type: Number,
      default: 0
    },
    total_drivers: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

operatorSchema.pre('save', function (next) {
  if (!this.operator_id) {
    this.operator_id = generateOperatorId();
  }
  next();
});

operatorSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.operator_id = ret.operator_id || ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

operatorSchema.set('toObject', {
  virtuals: true,
  transform: (_, ret) => {
    ret.operator_id = ret.operator_id || ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Operator', operatorSchema);

const mongoose = require('mongoose');
const { generateEndUserId } = require('../utils/uuidUtils');

const locationSchema = new mongoose.Schema(
  {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    address: { type: String, default: null },
    name: { type: String, default: null }
  },
  { _id: false }
);

const endUserSchema = new mongoose.Schema(
  {
    end_user_id: {
      type: String,
      unique: true,
      default: generateEndUserId
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
    status: {
      type: Boolean,
      default: true
    },
    assigned_vehicle_id: {
      type: String,
      ref: 'Vehicle',
      default: null
    },
    sos_contact: {
      name: { type: String, default: null },
      phone_number: { type: Number, default: null }
    },
    pickup_location: {
      type: locationSchema,
      default: () => ({})
    },
    dropoff_location: {
      type: locationSchema,
      default: () => ({})
    }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

endUserSchema.pre('save', function (next) {
  if (!this.end_user_id) {
    this.end_user_id = generateEndUserId();
  }
  next();
});

const transformDocument = (_, ret) => {
  ret.end_user_id = ret.end_user_id || ret._id;
  delete ret._id;
  delete ret.__v;
  return ret;
};

endUserSchema.set('toJSON', { virtuals: true, transform: transformDocument });
endUserSchema.set('toObject', { virtuals: true, transform: transformDocument });

module.exports = mongoose.model('EndUser', endUserSchema);

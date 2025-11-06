const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const { generateUserId } = require('../utils/uuidUtils');

const userSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      default: generateUserId,
      unique: true,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    phone_number: {
      type: Number,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    role_id: {
      type: Number,
      required: true
    },
    status: {
      type: Boolean,
      default: true
    },
    operator_id: {
      type: String,
      ref: 'Operator',
      default: null
    },
    assigned_vehicle_id: {
      type: String,
      ref: 'Vehicle',
      default: null
    },
    license_number: String,
    license_expiry: Date,
    end_user_id: {
      type: String,
      ref: 'EndUser',
      default: null
    },
    sos_contact: {
      name: String,
      phone_number: Number
    },
    last_login: Date,
    profile_image: String,
    fcm_token: String,
    fcm_tokens: [String],
    pickup_location: {
      latitude: Number,
      longitude: Number,
      address: String,
      name: String
    },
    dropoff_location: {
      latitude: Number,
      longitude: Number,
      address: String,
      name: String
    }
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcryptjs.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (plainPassword) {
  return await bcryptjs.compare(plainPassword, this.password);
};

userSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  }
});

userSchema.set('toObject', {
  virtuals: true,
  transform: (_, ret) => {
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);

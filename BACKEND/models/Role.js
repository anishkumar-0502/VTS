const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    role_id: {
      type: Number,
      primary: true,
      unique: true
    },
    role_name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    permissions: {
      type: [String],
      default: []
    },
    description: String,
    status: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

roleSchema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      const counter = await mongoose.model('Counter').findByIdAndUpdate(
        'role_id',
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true }
      );
      this.role_id = counter.sequence_value;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

roleSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

roleSchema.set('toObject', {
  virtuals: true,
  transform: (_, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Role', roleSchema);

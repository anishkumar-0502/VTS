const mongoose = require('mongoose');
const { generateNotificationId } = require('../utils/uuidUtils');

const notificationSchema = new mongoose.Schema(
  {
    notification_id: {
      type: String,
      default: generateNotificationId,
      unique: true,
      required: true
    },
    user_id: {
      type: String,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['speed_alert', 'location_update', 'trip_started', 'trip_completed', 'device_offline', 'sos_alert', 'route_deviation', 'maintenance_due'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    vehicle_id: {
      type: String,
      ref: 'Vehicle'
    },
    device_id: {
      type: String,
      ref: 'Device'
    },
    trip_id: {
      type: String,
      ref: 'Trip'
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    read: {
      type: Boolean,
      default: false
    },
    read_at: Date,
    notification_channel: {
      type: String,
      enum: ['push', 'email', 'sms', 'in_app'],
      default: 'push'
    },
    send_status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending'
    },
    sent_at: Date,
    failed_reason: String,
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical'],
      default: 'normal'
    }
  },
  { timestamps: true, id: false }
);

notificationSchema.pre('save', function (next) {
  if (!this.notification_id) {
    this.notification_id = generateNotificationId();
  }
  next();
});

notificationSchema.index({ user_id: 1, createdAt: -1 });
notificationSchema.index({ read: 1, user_id: 1 });

notificationSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.notification_id = ret.notification_id || ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.id;
    return ret;
  }
});

notificationSchema.set('toObject', {
  virtuals: true,
  transform: (_, ret) => {
    ret.notification_id = ret.notification_id || ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.id;
    return ret;
  }
});

module.exports = mongoose.model('Notification', notificationSchema);

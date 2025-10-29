const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      ref: 'User',
      required: true,
      index: true
    },
    user_email: String,
    user_role: String,
    operator_id: String,
    action: {
      type: String,
      required: true,
      enum: [
        'CREATE',
        'READ',
        'UPDATE',
        'DELETE',
        'BULK_IMPORT',
        'BULK_DELETE',
        'LOGIN',
        'LOGOUT',
        'ASSIGN',
        'APPROVE',
        'REJECT',
        'EXPORT'
      ]
    },
    resource_type: {
      type: String,
      required: true,
      enum: [
        'USER',
        'DRIVER',
        'PARENT',
        'VEHICLE',
        'TRIP',
        'DEVICE',
        'ROUTE',
        'OPERATOR',
        'ROLE',
        'PERMISSION',
        'TRACKING'
      ]
    },
    resource_id: String,
    resource_name: String,
    method: String,
    endpoint: String,
    ip_address: String,
    user_agent: String,
    status_code: Number,
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed
    },
    details: mongoose.Schema.Types.Mixed,
    error_message: String,
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    duration_ms: Number
  },
  { timestamps: true, collection: 'audit_logs' }
);

auditLogSchema.index({ user_id: 1, timestamp: -1 });
auditLogSchema.index({ resource_type: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ operator_id: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

auditLogSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

auditLogSchema.set('toObject', {
  virtuals: true,
  transform: (_, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);

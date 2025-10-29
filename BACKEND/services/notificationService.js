const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');

class NotificationService {
  static async createNotification(notificationData) {
    try {
      const notification = new Notification({
        ...notificationData,
        send_status: 'pending',
        sent_at: null
      });

      await notification.save();
      logger.loggerInfo(`Notification created: ${notification._id}`);
      return notification;
    } catch (error) {
      logger.loggerError(`Error creating notification: ${error.message}`);
      throw error;
    }
  }

  static async getNotificationById(notificationId) {
    try {
      const notification = await Notification.findById(notificationId)
        .populate('user_id')
        .populate('vehicle_id')
        .populate('device_id')
        .populate('trip_id');
      if (!notification) {
        throw new Error('Notification not found');
      }
      return notification;
    } catch (error) {
      logger.loggerError(`Error fetching notification: ${error.message}`);
      throw error;
    }
  }

  static async getUserNotifications(userId, filters = {}) {
    try {
      const query = { user_id: userId };
      if (filters.read !== undefined) query.read = filters.read;
      if (filters.type) query.type = filters.type;

      const notifications = await Notification.find(query)
        .populate('vehicle_id')
        .populate('device_id')
        .populate('trip_id')
        .sort({ createdAt: -1 });
      return notifications;
    } catch (error) {
      logger.loggerError(`Error fetching user notifications: ${error.message}`);
      throw error;
    }
  }

  static async markAsRead(notificationId) {
    try {
      const notification = await Notification.findByIdAndUpdate(
        notificationId,
        { read: true, read_at: new Date() },
        { new: true }
      );
      return notification;
    } catch (error) {
      logger.loggerError(`Error marking notification as read: ${error.message}`);
      throw error;
    }
  }

  static async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { user_id: userId, read: false },
        { read: true, read_at: new Date() }
      );
      logger.loggerInfo(`Marked ${result.modifiedCount} notifications as read for user ${userId}`);
      return result;
    } catch (error) {
      logger.loggerError(`Error marking all notifications as read: ${error.message}`);
      throw error;
    }
  }

  static async sendBulkNotifications(userIds, notificationData) {
    try {
      const notifications = userIds.map(userId => ({
        ...notificationData,
        user_id: userId,
        send_status: 'pending'
      }));

      const result = await Notification.insertMany(notifications);
      logger.loggerInfo(`${result.length} notifications queued for sending`);
      return result;
    } catch (error) {
      logger.loggerError(`Error sending bulk notifications: ${error.message}`);
      throw error;
    }
  }

  static async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({
        user_id: userId,
        read: false
      });
      return count;
    } catch (error) {
      logger.loggerError(`Error getting unread count: ${error.message}`);
      throw error;
    }
  }

  static async deleteNotification(notificationId) {
    try {
      const notification = await Notification.findByIdAndDelete(notificationId);
      logger.loggerInfo(`Notification deleted: ${notificationId}`);
      return notification;
    } catch (error) {
      logger.loggerError(`Error deleting notification: ${error.message}`);
      throw error;
    }
  }

  static async deleteOldNotifications(days = 30) {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate }
      });
      logger.loggerInfo(`Deleted ${result.deletedCount} old notifications`);
      return result;
    } catch (error) {
      logger.loggerError(`Error deleting old notifications: ${error.message}`);
      throw error;
    }
  }

  static async notifySpeedViolation(vehicleId, violationData) {
    try {
      const vehicle = await Vehicle.findById(vehicleId).populate('operator_id').populate('driver_id');
      if (!vehicle) throw new Error('Vehicle not found');

      const notification = await this.createNotification({
        user_id: vehicle.driver_id._id,
        type: 'speed_alert',
        title: 'Speed Violation Alert',
        message: `Your vehicle ${vehicle.vehicle_number} exceeded speed limit: ${violationData.speed} km/h`,
        vehicle_id: vehicleId,
        data: violationData,
        priority: 'high'
      });

      if (global.socketManager) {
        global.socketManager.emitToDriver(vehicle.driver_id._id.toString(), 'speed_violation', violationData);
      }

      return notification;
    } catch (error) {
      logger.loggerError(`Error notifying speed violation: ${error.message}`);
      throw error;
    }
  }

  static async notifyDeviceOffline(deviceId) {
    try {
      const Device = require('../models/Device');
      const device = await Device.findOne({ device_id: deviceId }).populate('assigned_operator_id');
      if (!device) throw new Error('Device not found');

      const notification = await this.createNotification({
        user_id: device.assigned_operator_id._id,
        type: 'device_offline',
        title: 'Device Offline',
        message: `GPS Device ${device.imei} is offline`,
        device_id: deviceId,
        priority: 'high'
      });

      return notification;
    } catch (error) {
      logger.loggerError(`Error notifying device offline: ${error.message}`);
      throw error;
    }
  }
}

module.exports = NotificationService;

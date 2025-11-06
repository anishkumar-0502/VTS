const Device = require('../../models/Device');
const TrackingData = require('../../models/TrackingData');
const logger = require('../../utils/logger');

class TelemetryHandler {
  static async ensureDevice(trackerId, payload = {}) {
    const now = new Date();
    let device = await Device.findOne({ imei: trackerId });
    if (!device) {
      device = await Device.create({
        imei: trackerId,
        device_type: 'gps_tracker',
        status: true,
        module_model: payload.module_model || null,
        firmware_version: payload.firmware_version || null,
        battery_level: payload.battery_level || null,
        last_signal: now
      });
      return { device, created: true };
    }
    return { device, created: false };
  }

  static resolveTimestamp(value) {
    if (!value) {
      return new Date();
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  static async handleBootNotification(payload) {
    try {
      const trackerId = payload.vehicle_id;
      const { device, created } = await TelemetryHandler.ensureDevice(trackerId, payload);
      device.status = true;
      device.last_signal = new Date();
      if (payload.firmware_version) {
        device.firmware_version = payload.firmware_version;
      }
      if (payload.module_model) {
        device.module_model = payload.module_model;
      }
      await device.save();
      logger.loggerWebhook('Boot notification processed', { trackerId });
      if (created) {
        logger.loggerInfo(`✓ GPS Tracker registered: ${trackerId}`);
      } else {
        logger.loggerInfo(`✓ GPS Tracker reconnected: ${trackerId}`);
      }
      return {
        message: `GPS Tracker ${trackerId} registered successfully`,
        device_id: device.device_id,
        tracker_id: trackerId
      };
    } catch (error) {
      logger.loggerError(`Boot notification error: ${error.message}`);
      throw error;
    }
  }

  static async handleLocationUpdate(payload) {
    try {
      const trackerId = payload.vehicle_id;
      const timestamp = TelemetryHandler.resolveTimestamp(payload.timestamp);
      const { device } = await TelemetryHandler.ensureDevice(trackerId, payload);
      const trackingRecord = await TrackingData.create({
        device_id: device.device_id,
        vehicle_id: device.assigned_vehicle_id || null,
        latitude: payload.latitude,
        longitude: payload.longitude,
        altitude: payload.altitude || 0,
        speed: payload.speed_kmh || 0,
        course: payload.course || 0,
        satellites: payload.satellites || 0,
        fix_quality: payload.fix_quality || 0,
        hdop: payload.hdop || 0,
        timestamp,
        device_timestamp: timestamp
      });
      device.last_signal = new Date();
      device.status = true;
      device.last_latitude = payload.latitude;
      device.last_longitude = payload.longitude;
      device.last_speed = payload.speed_kmh || 0;
      device.last_course = payload.course || 0;
      device.battery_level = payload.battery_level ?? device.battery_level;
      device.last_location = {
        latitude: payload.latitude,
        longitude: payload.longitude,
        timestamp
      };
      await device.save();
      if (device.assigned_vehicle_id && global.socketManager) {
        global.socketManager.broadcastLocationUpdate(
          device.assigned_vehicle_id,
          device.device_id,
          {
            latitude: payload.latitude,
            longitude: payload.longitude,
            speed: payload.speed_kmh || 0,
            course: payload.course || 0,
            altitude: payload.altitude || 0,
            timestamp
          },
          device.toObject()
        );
      }
      logger.loggerWebhook('Location update processed', {
        trackerId,
        lat: payload.latitude,
        lng: payload.longitude,
        speed: payload.speed_kmh
      });
      return {
        message: `Location updated for tracker ${trackerId}`,
        coordinates: {
          latitude: payload.latitude,
          longitude: payload.longitude
        },
        tracking_id: trackingRecord.tracking_data_id
      };
    } catch (error) {
      logger.loggerError(`Location update error: ${error.message}`);
      throw error;
    }
  }

  static async handleHeartbeat(payload) {
    try {
      const trackerId = payload.vehicle_id;
      const { device } = await TelemetryHandler.ensureDevice(trackerId, payload);
      device.last_signal = new Date();
      if (payload.battery_level !== undefined && payload.battery_level !== null) {
        device.battery_level = payload.battery_level;
      }
      await device.save();
      logger.loggerWebhook('Heartbeat processed', { trackerId });
      return {
        message: `Heartbeat received from ${trackerId}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.loggerError(`Heartbeat error: ${error.message}`);
      throw error;
    }
  }

  static async handleStatusNotification(payload) {
    try {
      const trackerId = payload.vehicle_id;
      const { device } = await TelemetryHandler.ensureDevice(trackerId, payload);
      device.status = payload.fix_status === 'invalid' ? false : true;
      device.last_signal = new Date();
      await device.save();
      logger.loggerWebhook('Status notification processed', {
        trackerId,
        status: payload.fix_status
      });
      return {
        message: `Status updated for ${trackerId}`,
        fix_status: payload.fix_status || 'unknown'
      };
    } catch (error) {
      logger.loggerError(`Status notification error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = TelemetryHandler;

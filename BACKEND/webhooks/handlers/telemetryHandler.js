const mongoose = require('mongoose');
const Device = require('../../models/Device');
const Vehicle = require('../../models/Vehicle');
const TrackingData = require('../../models/TrackingData');
const logger = require('../../utils/logger');
const { generateEntityId } = require('../../utils/uuidUtils');

class TelemetryHandler {
  static toNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  static buildDeviceStatusPayload(device) {
    const source = device.toObject ? device.toObject() : device;
    const payload = {
      device_id: source.device_id || source._id || null,
      imei: source.imei || null,
      device_type: source.device_type || null,
      status: source.status ?? null,
      assigned_operator_id: source.assigned_operator_id || null,
      assigned_vehicle_id: source.assigned_vehicle_id || null,
      assigned_date: source.assigned_date || null,
      battery_level: source.battery_level ?? null,
      firmware_version: source.firmware_version || null,
      sim_number: source.sim_number || null,
      last_signal: source.last_signal || null,
      module_model: source.module_model || null,
      last_course: source.last_course ?? null,
      last_latitude: source.last_latitude ?? null,
      last_longitude: source.last_longitude ?? null,
      last_speed: source.last_speed ?? null,
      last_location: source.last_location || null
    };
    return payload;
  }

  static async upsertDeviceStatus(device) {
    try {
      const collection = mongoose.connection.collection('device_status');
      const now = new Date();
      const payload = TelemetryHandler.buildDeviceStatusPayload(device);
      await collection.updateOne(
        { device_id: payload.device_id },
        {
          $setOnInsert: { createdAt: now },
          $set: {
            ...payload,
            updatedAt: now
          }
        },
        { upsert: true }
      );
    } catch (error) {
      logger.loggerError(`Failed to upsert device status for ${device.device_id || device.imei}: ${error.message}`);
    }
  }

  static async syncAllDeviceStatuses() {
    try {
      const cursor = Device.find().cursor();
      let processed = 0;
      for await (const device of cursor) {
        await TelemetryHandler.upsertDeviceStatus(device);
        processed += 1;
      }
      logger.loggerInfo(`Device status backfill complete: ${processed} records processed`);
    } catch (error) {
      logger.loggerError(`Failed to sync device status snapshots: ${error.message}`);
      throw error;
    }
  }

  static async recordUnregisteredDevice(trackerId, payload = {}) {
    try {
      const now = new Date();
      const collection = mongoose.connection.collection('un_regusted_deuve');
      await collection.updateOne(
        { tracker_id: trackerId },
        {
          $setOnInsert: {
            id: generateEntityId('UNREGDEV'),
            created_at: now
          },
          $set: {
            tracker_id: trackerId,
            last_payload: payload,
            last_attempt_at: now
          },
          $inc: { attempt_count: 1 }
        },
        { upsert: true }
      );
    } catch (error) {
      logger.loggerError(`Failed to record unregistered device ${trackerId}: ${error.message}`);
    }
  }

  static async ensureDevice(trackerId, payload = {}) {
    const device = await Device.findOne({ device_id: trackerId });
    if (!device) {
      await TelemetryHandler.recordUnregisteredDevice(trackerId, payload);
      logger.loggerWarn(`Unregistered tracker denied: ${trackerId}`);
      const error = new Error(`Device ${trackerId} is not registered`);
      error.status = 403;
      error.code = 'UNREGISTERED_DEVICE';
      throw error;
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
      const { device } = await TelemetryHandler.ensureDevice(trackerId, payload);
      device.status = true;
      device.last_signal = new Date();
      if (payload.firmware_version) {
        device.firmware_version = payload.firmware_version;
      }
      if (payload.module_model) {
        device.module_model = payload.module_model;
      }
      await device.save();
      await TelemetryHandler.upsertDeviceStatus(device);
      logger.loggerWebhook('Boot notification processed', { trackerId });
      logger.loggerInfo(`✓ GPS Tracker validated: ${trackerId}`);
      return {
        message: `GPS Tracker ${trackerId} validated successfully`,
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
      const latitude = TelemetryHandler.toNumber(payload.latitude);
      const longitude = TelemetryHandler.toNumber(payload.longitude);
      if (latitude === null || longitude === null) {
        const error = new Error(`Invalid coordinates for tracker ${trackerId}`);
        error.status = 422;
        throw error;
      }
      const altitude = TelemetryHandler.toNumber(payload.altitude) ?? 0;
      const speed = TelemetryHandler.toNumber(payload.speed_kmh) ?? 0;
      const course = TelemetryHandler.toNumber(payload.course) ?? 0;
      const satellites = TelemetryHandler.toNumber(payload.satellites) ?? 0;
      const fixQuality = TelemetryHandler.toNumber(payload.fix_quality) ?? 0;
      const hdop = TelemetryHandler.toNumber(payload.hdop) ?? 0;
      const assignedVehicleId = device.assigned_vehicle_id || null;
      let vehicleNumber = payload.vehicle_number || payload.vehicleNumber || trackerId;
      if (assignedVehicleId) {
        const vehicleDoc = await Vehicle.findOne({ vehicle_id: assignedVehicleId })
          .select('vehicle_number vehicle_id')
          .lean();
        if (vehicleDoc?.vehicle_number) {
          vehicleNumber = vehicleDoc.vehicle_number;
        } else {
          vehicleNumber = assignedVehicleId;
        }
      }
      const trackingRecord = await TrackingData.create({
        device_id: device.device_id,
        vehicle_id: assignedVehicleId,
        latitude,
        longitude,
        altitude,
        speed,
        course,
        satellites,
        fix_quality: fixQuality,
        hdop,
        timestamp,
        device_timestamp: timestamp
      });
      device.last_signal = new Date();
      device.status = true;
      device.last_latitude = latitude;
      device.last_longitude = longitude;
      device.last_speed = speed;
      device.last_course = course;
      device.battery_level = payload.battery_level ?? device.battery_level;
      device.last_location = {
        latitude,
        longitude,
        timestamp
      };
      await device.save();
      await TelemetryHandler.upsertDeviceStatus(device);
      if (global.socketManager) {
        const vehicleKey = device.assigned_vehicle_id || device.device_id;
        global.socketManager.broadcastLocationUpdate(
          vehicleKey,
          device.device_id,
          {
            latitude,
            longitude,
            speed,
            course,
            altitude,
            timestamp,
            vehicle_number: vehicleNumber
          },
          device.toObject()
        );
      }
      logger.loggerWebhook('Location update processed', {
        trackerId,
        lat: latitude,
        lng: longitude,
        speed
      });
      return {
        message: `Location updated for tracker ${trackerId}`,
        coordinates: {
          latitude,
          longitude
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
      await TelemetryHandler.upsertDeviceStatus(device);
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
      await TelemetryHandler.upsertDeviceStatus(device);
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

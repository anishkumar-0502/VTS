const mongoose = require('mongoose');
const Device = require('../../models/Device');
const Vehicle = require('../../models/Vehicle');
const TrackingData = require('../../models/TrackingData');
const ScheduledTrip = require('../../models/ScheduledTrip');
const User = require('../../models/User');
const EndUser = require('../../models/EndUser');
const logger = require('../../utils/logger');
const { generateEntityId } = require('../../utils/uuidUtils');
const { sendTripLiveUpdateNotification } = require('../../services/firebaseService');
const { calculateDistance } = require('../../utils/distanceUtils');
const GPSNotificationService = require('../../firebase/sendNotification');

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

  static async sendParentLiveNotifications(vehicleId, latitude, longitude, scheduledTrip, vehicleNumber) {
    try {
      if (!vehicleId || !scheduledTrip) return;

      const vehicle = await Vehicle.findOne({ vehicle_id: vehicleId })
        .select('end_user_ids standing_location')
        .lean();

      if (!vehicle || !Array.isArray(vehicle.end_user_ids) || vehicle.end_user_ids.length === 0) {
        return;
      }

      for (const endUserId of vehicle.end_user_ids) {
        try {
          const user = await User.findOne({ end_user_id: endUserId })
            .select('name fcm_tokens')
            .lean();

          if (!user || !Array.isArray(user.fcm_tokens) || user.fcm_tokens.length === 0) {
            continue;
          }

          const routePoints = scheduledTrip.route_points || [];
          let currentStop = null;
          let nextStop = null;
          let distanceToNextStop = null;

          for (const stop of routePoints) {
            if (stop.status === 'arrived' || stop.status === 'at_stop') {
              currentStop = stop;
            }
            if (stop.status === 'pending' || stop.status === 'approaching') {
              nextStop = stop;
              if (currentStop && nextStop) {
                distanceToNextStop = calculateDistance(latitude, longitude, nextStop.latitude, nextStop.longitude);
              }
              break;
            }
          }

          const tripData = {
            currentLocation: {
              latitude,
              longitude,
              address: vehicle.standing_location?.name || 'In Transit'
            },
            currentStop: currentStop || { name: 'En Route' },
            nextStop: nextStop || { name: 'Final Destination' },
            vehicleNumber: vehicleNumber,
            distanceToNextStop: distanceToNextStop || 0,
            eta: nextStop ? `${Math.ceil(distanceToNextStop / 40)} mins` : 'Shortly'
          };

          await sendTripLiveUpdateNotification(user.fcm_tokens, user.name, tripData, endUserId, scheduledTrip?.scheduled_trip_id || scheduledTrip?._id);
        } catch (error) {
          logger.loggerWarn(`Failed to send notification to parent ${endUserId}: ${error.message}`);
        }
      }
    } catch (error) {
      logger.loggerWarn(`Error sending parent live notifications: ${error.message}`);
    }
  }

  static async sendGPSLocationUpdateNotifications(vehicleId, latitude, longitude, speedKmh) {
    try {
      if (!vehicleId) return;

      const vehicle = await Vehicle.findOne({ vehicle_id: vehicleId })
        .select('end_user_ids vehicle_number')
        .lean();

      if (!vehicle || !Array.isArray(vehicle.end_user_ids) || vehicle.end_user_ids.length === 0) {
        logger.loggerInfo(`No end users associated with vehicle ${vehicleId}`);
        return;
      }

      const recipientList = [];

      for (const endUserId of vehicle.end_user_ids) {
        try {
          const user = await User.findOne({ end_user_id: endUserId })
            .select('fcm_tokens user_id name')
            .lean();

          if (!user || !Array.isArray(user.fcm_tokens) || user.fcm_tokens.length === 0) {
            logger.loggerDebug(`User ${endUserId} has no FCM tokens`);
            continue;
          }

          recipientList.push({
            fcmTokens: user.fcm_tokens,
            latitude,
            longitude,
            speedKmh,
            userData: {
              userId: user.user_id,
              endUserId,
              userName: user.name,
              vehicleNumber: vehicle.vehicle_number || vehicleId
            }
          });
        } catch (error) {
          logger.loggerWarn(`Failed to fetch user data for end_user_id ${endUserId}: ${error.message}`);
        }
      }

      if (recipientList.length > 0) {
        await GPSNotificationService.sendBulkLocationNotifications(recipientList);
      }
    } catch (error) {
      logger.loggerError(`Error sending GPS location update notifications: ${error.message}`);
    }
  }

  static async updateRoutePointStatus(scheduledTrip, latitude, longitude) {
    try {
      if (!scheduledTrip || !Array.isArray(scheduledTrip.route_points)) {
        return;
      }

      const updates = [];
      for (const point of scheduledTrip.route_points) {
        if (!point.latitude || !point.longitude) continue;
        if (point.stop_status === 'reached') continue;

        const distance = calculateDistance(latitude, longitude, point.latitude, point.longitude);
        const geofenceRadius = point.geofence_radius_meters || 100;

        if (distance <= geofenceRadius && point.stop_status !== 'reached') {
          updates.push({
            updateOne: {
              filter: { scheduled_trip_id: scheduledTrip.scheduled_trip_id, 'route_points.stop_id': point.stop_id },
              update: { $set: { 'route_points.$.stop_status': 'reached' } }
            }
          });
        }
      }

      if (updates.length > 0) {
        await ScheduledTrip.bulkWrite(updates);
        logger.loggerInfo(`Updated ${updates.length} route points to 'reached' status for trip ${scheduledTrip.scheduled_trip_id}`);
      }
    } catch (error) {
      logger.loggerError(`Error updating route point status: ${error.message}`);
    }
  }

  static async ensureDevice(trackerId, payload = {}) {
    let device = await Device.findOne({
      $or: [
        { tracker_id: trackerId },
        { device_id: trackerId }
      ]
    });

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
        tracker_id: trackerId,
        interval: 5000 // 5 seconds in milliseconds
      };
    } catch (error) {
      logger.loggerError(`Boot notification error: ${error.message}`);
      throw error;
    }
  }

  static async handleLocationUpdate(payload) {
    try {
      const trackerId = payload.tracker_id || payload.vehicle_id;
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
      let routeData = null;

      if (assignedVehicleId) {
        const vehicleDoc = await Vehicle.findOne({ vehicle_id: assignedVehicleId })
          .select('vehicle_number vehicle_id')
          .lean();
        if (vehicleDoc?.vehicle_number) {
          vehicleNumber = vehicleDoc.vehicle_number;
        } else {
          vehicleNumber = assignedVehicleId;
        }

        // Fetch active scheduled trip for route data
        const scheduledTrip = await ScheduledTrip.findOne({
          vehicle_id: assignedVehicleId,
          is_active: true,
          status: { $in: ['pending', 'in-progress'] }
        })
        .select('scheduled_trip_id route_name start_location end_location route_points scheduled_start_time trip_period');

        if (scheduledTrip) {
          routeData = {
            scheduled_trip_id: scheduledTrip.scheduled_trip_id || scheduledTrip._id,
            route_name: scheduledTrip.route_name,
            start_location: scheduledTrip.start_location,
            end_location: scheduledTrip.end_location,
            route_points: scheduledTrip.route_points,
            scheduled_start_time: scheduledTrip.scheduled_start_time,
            trip_period: scheduledTrip.trip_period
          };

          TelemetryHandler.updateRoutePointStatus(scheduledTrip, latitude, longitude)
            .catch(err => logger.loggerError(`Failed to update route point status: ${err.message}`));
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

      if (assignedVehicleId) {
        if (routeData) {
          TelemetryHandler.sendParentLiveNotifications(
            assignedVehicleId,
            latitude,
            longitude,
            routeData,
            vehicleNumber
          ).catch(err => logger.loggerError(`Failed to send parent live notifications: ${err.message}`));
        }

        GPSNotificationService.sendVehicleApproachingStopNotification({
          tracker_id: trackerId,
          latitude,
          longitude,
          speed_kmh: speed
        }).catch(err => logger.loggerError(`Failed to send vehicle approaching stop notification: ${err.message}`));
      }

      logger.loggerWebhook('Location update processed', {
        trackerId,
        lat: latitude,
        lng: longitude,
        speed
      });
      const response = {
        message: `Location updated for tracker ${trackerId}`,
        coordinates: {
          latitude,
          longitude
        },
        tracking_id: trackingRecord.tracking_data_id
      };

      // Include route data if available
      if (routeData) {
        response.route = routeData;
      }

      return response;
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

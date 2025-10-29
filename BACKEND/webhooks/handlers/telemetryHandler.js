const { ObjectId } = require('mongodb');
const dbService = require('../../config/db');
const logger = require('../../utils/logger');

class TelemetryHandler {
  static async handleBootNotification(payload) {
    try {
      logger.loggerWebhook('Boot notification received', { trackerId: payload.vehicle_id });

      const db = await dbService.connectToDatabase();
      const trackerId = payload.vehicle_id;

      let gpsDevice = await db.collection('gpsdevices').findOne({ imei: trackerId });
      
      if (!gpsDevice) {
        const result = await db.collection('gpsdevices').insertOne({
          imei: trackerId,
          tracker_id: trackerId,
          status: true,
          firmware_version: payload.firmware_version || null,
          module_model: payload.module_model || null,
          vehicle_id: null,
          operator_id: null,
          last_signal: new Date(),
          battery_level: null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        gpsDevice = { _id: result.insertedId };
        logger.loggerInfo(`✓ GPS Tracker registered: ${trackerId}`);
      } else {
        await db.collection('gpsdevices').updateOne(
          { _id: gpsDevice._id },
          { 
            $set: { 
              status: true, 
              last_signal: new Date(),
              firmware_version: payload.firmware_version || gpsDevice.firmware_version,
              module_model: payload.module_model || gpsDevice.module_model,
              updatedAt: new Date() 
            } 
          }
        );
        logger.loggerInfo(`✓ GPS Tracker reconnected: ${trackerId}`);
      }

      return {
        message: `GPS Tracker ${trackerId} registered successfully`,
        device_id: gpsDevice._id,
        tracker_id: trackerId
      };
    } catch (error) {
      logger.loggerError(`Boot notification error: ${error.message}`);
      throw error;
    }
  }

  static async handleLocationUpdate(payload) {
    try {
      logger.loggerWebhook('Location update received', {
        trackerId: payload.vehicle_id,
        lat: payload.latitude,
        lng: payload.longitude,
        speed: payload.speed_kmh
      });

      const db = await dbService.connectToDatabase();
      const trackerId = payload.vehicle_id;

      let gpsDevice = await db.collection('gpsdevices').findOne({ imei: trackerId });
      
      if (!gpsDevice) {
        const result = await db.collection('gpsdevices').insertOne({
          imei: trackerId,
          tracker_id: trackerId,
          status: true,
          vehicle_id: null,
          operator_id: null,
          last_signal: new Date(),
          battery_level: null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        gpsDevice = { _id: result.insertedId };
        logger.loggerInfo(`✓ GPS Tracker auto-registered: ${trackerId}`);
      }

      const trackingDataResult = await db.collection('trackingdata').insertOne({
        gps_device_id: gpsDevice._id,
        tracker_id: trackerId,
        vehicle_id: gpsDevice.vehicle_id || null,
        latitude: payload.latitude,
        longitude: payload.longitude,
        speed: payload.speed_kmh || 0,
        course: payload.course || 0,
        altitude: payload.altitude || 0,
        satellites: payload.satellites || 0,
        fix_quality: payload.fix_quality || 0,
        hdop: payload.hdop || 0,
        timestamp: new Date(payload.timestamp),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await db.collection('gpsdevices').updateOne(
        { _id: gpsDevice._id },
        {
          $set: {
            last_signal: new Date(),
            status: true,
            last_latitude: payload.latitude,
            last_longitude: payload.longitude,
            battery_level: payload.battery_level || gpsDevice.battery_level,
            updatedAt: new Date()
          }
        }
      );

      if (gpsDevice.vehicle_id && global.socketManager) {
        global.socketManager.broadcastLocationUpdate(gpsDevice.vehicle_id, gpsDevice._id, {
          latitude: payload.latitude,
          longitude: payload.longitude,
          speed: payload.speed_kmh,
          course: payload.course,
          altitude: payload.altitude,
          timestamp: new Date(payload.timestamp)
        }, gpsDevice);
      }

      return {
        message: `Location updated for tracker ${trackerId}`,
        coordinates: {
          latitude: payload.latitude,
          longitude: payload.longitude
        },
        tracking_id: trackingDataResult.insertedId
      };
    } catch (error) {
      logger.loggerError(`Location update error: ${error.message}`);
      throw error;
    }
  }

  static async handleHeartbeat(payload) {
    try {
      logger.loggerWebhook('Heartbeat received', { trackerId: payload.vehicle_id });

      const db = await dbService.connectToDatabase();
      const trackerId = payload.vehicle_id;

      let gpsDevice = await db.collection('gpsdevices').findOne({ imei: trackerId });
      if (!gpsDevice) {
        const result = await db.collection('gpsdevices').insertOne({
          imei: trackerId,
          tracker_id: trackerId,
          status: true,
          vehicle_id: null,
          operator_id: null,
          last_signal: new Date(),
          battery_level: null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        gpsDevice = { _id: result.insertedId };
      } else {
        await db.collection('gpsdevices').updateOne(
          { _id: gpsDevice._id },
          {
            $set: {
              last_signal: new Date(),
              battery_level: payload.battery_level || gpsDevice.battery_level,
              updatedAt: new Date()
            }
          }
        );
      }

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
      logger.loggerWebhook('Status notification received', {
        trackerId: payload.vehicle_id,
        status: payload.fix_status
      });

      const db = await dbService.connectToDatabase();
      const trackerId = payload.vehicle_id;

      let gpsDevice = await db.collection('gpsdevices').findOne({ imei: trackerId });
      if (!gpsDevice) {
        const result = await db.collection('gpsdevices').insertOne({
          imei: trackerId,
          tracker_id: trackerId,
          status: payload.fix_status === 'invalid' ? false : true,
          vehicle_id: null,
          operator_id: null,
          last_signal: new Date(),
          battery_level: null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        gpsDevice = { _id: result.insertedId };
      } else {
        await db.collection('gpsdevices').updateOne(
          { _id: gpsDevice._id },
          {
            $set: {
              status: payload.fix_status === 'invalid' ? false : true,
              last_signal: new Date(),
              updatedAt: new Date()
            }
          }
        );
      }

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

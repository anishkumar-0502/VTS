const { ObjectId } = require('mongodb');
const dbService = require('../../config/db');
const logger = require('../../utils/logger');

class TelemetryHandler {
  static async handleBootNotification(payload) {
    try {
      logger.loggerWebhook('Boot notification received', { vehicleId: payload.vehicle_id });

      const db = await dbService.connectToDatabase();
      const vehicle = await db.collection('vehicles').findOne({ vehicle_number: payload.vehicle_id });
      
      if (!vehicle) {
        logger.loggerWarn(`Boot notification: Vehicle not found - ${payload.vehicle_id}`);
        throw new Error('Vehicle not found');
      }

      let gpsDevice = await db.collection('gpsdevices').findOne({ vehicle_id: vehicle._id });
      if (!gpsDevice) {
        const result = await db.collection('gpsdevices').insertOne({
          vehicle_id: vehicle._id,
          operator_id: vehicle.operator_id,
          imei: payload.vehicle_id,
          status: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        gpsDevice = { _id: result.insertedId };
        logger.loggerInfo(`GPS device auto-registered: ${payload.vehicle_id}`);
      } else {
        await db.collection('gpsdevices').updateOne(
          { _id: gpsDevice._id },
          { $set: { status: true, last_signal: new Date(), updatedAt: new Date() } }
        );
      }

      return {
        message: `Device ${payload.vehicle_id} registered successfully`,
        device_id: gpsDevice._id
      };
    } catch (error) {
      logger.loggerError(`Boot notification error: ${error.message}`);
      throw error;
    }
  }

  static async handleLocationUpdate(payload) {
    try {
      logger.loggerWebhook('Location update received', {
        vehicleId: payload.vehicle_id,
        lat: payload.latitude,
        lng: payload.longitude,
        speed: payload.speed_kmh
      });

      const db = await dbService.connectToDatabase();
      const vehicle = await db.collection('vehicles').findOne({ vehicle_number: payload.vehicle_id });
      
      if (!vehicle) {
        throw new Error('Vehicle not found');
      }

      let gpsDevice = await db.collection('gpsdevices').findOne({ vehicle_id: vehicle._id });
      if (!gpsDevice) {
        const result = await db.collection('gpsdevices').insertOne({
          vehicle_id: vehicle._id,
          operator_id: vehicle.operator_id,
          imei: payload.vehicle_id,
          status: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        gpsDevice = { _id: result.insertedId };
      }

      const trackingDataResult = await db.collection('trackingdata').insertOne({
        gps_device_id: gpsDevice._id,
        vehicle_id: vehicle._id,
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

      await db.collection('vehicles').updateOne(
        { _id: vehicle._id },
        {
          $set: {
            latitude: payload.latitude,
            longitude: payload.longitude,
            last_update: new Date(),
            status: true,
            updatedAt: new Date()
          }
        }
      );

      await db.collection('gpsdevices').updateOne(
        { _id: gpsDevice._id },
        {
          $set: {
            last_signal: new Date(),
            status: true,
            battery_level: payload.battery_level || gpsDevice.battery_level,
            updatedAt: new Date()
          }
        }
      );

      if (global.socketManager) {
        global.socketManager.broadcastLocationUpdate(vehicle._id, gpsDevice._id, {
          latitude: payload.latitude,
          longitude: payload.longitude,
          speed: payload.speed_kmh,
          course: payload.course,
          altitude: payload.altitude,
          timestamp: new Date(payload.timestamp)
        }, gpsDevice);
      }

      return {
        message: `Location updated for ${payload.vehicle_id}`,
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
      logger.loggerWebhook('Heartbeat received', { vehicleId: payload.vehicle_id });

      const db = await dbService.connectToDatabase();
      const vehicle = await db.collection('vehicles').findOne({ vehicle_number: payload.vehicle_id });
      
      if (!vehicle) {
        throw new Error('Vehicle not found');
      }

      const gpsDevice = await db.collection('gpsdevices').findOne({ vehicle_id: vehicle._id });
      if (gpsDevice) {
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
        message: `Heartbeat received from ${payload.vehicle_id}`,
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
        vehicleId: payload.vehicle_id,
        status: payload.fix_status
      });

      const db = await dbService.connectToDatabase();
      const vehicle = await db.collection('vehicles').findOne({ vehicle_number: payload.vehicle_id });
      
      if (!vehicle) {
        throw new Error('Vehicle not found');
      }

      const gpsDevice = await db.collection('gpsdevices').findOne({ vehicle_id: vehicle._id });
      if (gpsDevice) {
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
        message: `Status updated for ${payload.vehicle_id}`,
        fix_status: payload.fix_status || 'unknown'
      };
    } catch (error) {
      logger.loggerError(`Status notification error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = TelemetryHandler;

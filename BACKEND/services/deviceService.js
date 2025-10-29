const Device = require('../models/Device');
const Vehicle = require('../models/Vehicle');
const logger = require('../utils/logger');
const { CustomError } = require('../middlewares/errorHandler');

class DeviceService {
  static async createDevice(deviceData) {
    try {
      const existingDevice = await Device.findOne({ imei: deviceData.imei });
      if (existingDevice) {
        throw new CustomError('Device with this IMEI already exists', 409);
      }

      if (deviceData.device_id) {
        const existingByDeviceId = await Device.findOne({ device_id: deviceData.device_id });
        if (existingByDeviceId) {
          throw new CustomError('Device with this device_id already exists', 409);
        }
      }

      const device = new Device(deviceData);
      await device.save();
      logger.loggerInfo(`Device created: ${device.imei}`);
      return device;
    } catch (error) {
      logger.loggerError(`Error creating device: ${error.message}`);
      throw error;
    }
  }

  static async getDeviceById(deviceId) {
    try {
      const device = await Device.findOne({ device_id: deviceId }).populate('assigned_operator_id').populate('vehicle_id');
      if (!device) {
        throw new CustomError('Device not found', 404);
      }
      return device;
    } catch (error) {
      logger.loggerError(`Error fetching device: ${error.message}`);
      throw error;
    }
  }

  static async getDeviceByImei(imei) {
    try {
      const device = await Device.findOne({ imei }).populate('assigned_operator_id').populate('vehicle_id');
      if (!device) {
        throw new CustomError('Device not found', 404);
      }
      return device;
    } catch (error) {
      logger.loggerError(`Error fetching device by IMEI: ${error.message}`);
      throw error;
    }
  }

  static async getAllDevices(filters = {}) {
    try {
      const query = {};
      if (filters.assigned_operator_id) query.assigned_operator_id = filters.assigned_operator_id;
      if (filters.status !== undefined) query.status = filters.status;
      if (filters.vehicle_id) query.vehicle_id = filters.vehicle_id;

      const devices = await Device.find(query).populate('assigned_operator_id').populate('vehicle_id');
      return devices;
    } catch (error) {
      logger.loggerError(`Error fetching devices: ${error.message}`);
      throw error;
    }
  }

  static async assignDeviceToVehicle(deviceId, vehicleId) {
    try {
      const device = await Device.findOne({ device_id: deviceId });
      if (!device) {
        throw new CustomError('Device not found', 404);
      }

      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        throw new CustomError('Vehicle not found', 404);
      }

      device.vehicle_id = vehicleId;
      device.assigned_date = new Date();
      await device.save();

      vehicle.device_id = device._id;
      await vehicle.save();

      logger.loggerInfo(`Device ${device.imei} assigned to vehicle ${vehicle.vehicle_number}`);
      return device;
    } catch (error) {
      logger.loggerError(`Error assigning device: ${error.message}`);
      throw error;
    }
  }

  static async unassignDeviceFromVehicle(deviceId) {
    try {
      const device = await Device.findOne({ device_id: deviceId });
      if (!device) {
        throw new CustomError('Device not found', 404);
      }

      if (device.vehicle_id) {
        await Vehicle.findByIdAndUpdate(device.vehicle_id, { device_id: null });
      }

      device.vehicle_id = null;
      await device.save();

      logger.loggerInfo(`Device ${device.imei} unassigned from vehicle`);
      return device;
    } catch (error) {
      logger.loggerError(`Error unassigning device: ${error.message}`);
      throw error;
    }
  }

  static async updateDeviceStatus(deviceId, statusData) {
    try {
      const device = await Device.findOneAndUpdate(
        { device_id: deviceId },
        {
          status: statusData.status,
          battery_level: statusData.battery_level,
          signal_strength: statusData.signal_strength,
          last_signal: new Date(),
          last_location: statusData.last_location
        },
        { new: true }
      );
      return device;
    } catch (error) {
      logger.loggerError(`Error updating device status: ${error.message}`);
      throw error;
    }
  }

  static async updateDeviceBattery(deviceId, batteryLevel) {
    try {
      const device = await Device.findOneAndUpdate(
        { device_id: deviceId },
        { battery_level: batteryLevel, updatedAt: new Date() },
        { new: true }
      );
      return device;
    } catch (error) {
      logger.loggerError(`Error updating device battery: ${error.message}`);
      throw error;
    }
  }

  static async deleteDevice(deviceId) {
    try {
      const device = await Device.findOne({ device_id: deviceId });
      if (!device) {
        throw new CustomError('Device not found', 404);
      }

      if (device.vehicle_id) {
        await Vehicle.findByIdAndUpdate(device.vehicle_id, { device_id: null });
      }

      await Device.findOneAndDelete({ device_id: deviceId });
      logger.loggerInfo(`Device deleted: ${device.imei}`);
      return device;
    } catch (error) {
      logger.loggerError(`Error deleting device: ${error.message}`);
      throw error;
    }
  }

  static async getUnassignedDevices(operatorId) {
    try {
      const devices = await Device.find({
        assigned_operator_id: operatorId,
        vehicle_id: null,
        status: true
      });
      return devices;
    } catch (error) {
      logger.loggerError(`Error fetching unassigned devices: ${error.message}`);
      throw error;
    }
  }
}

module.exports = DeviceService;

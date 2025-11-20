const Vehicle = require('../models/Vehicle');
const Device = require('../models/Device');
const logger = require('../utils/logger');

class VehicleService {
  static async createVehicle(vehicleData) {
    try {
      const existingVehicle = await Vehicle.findOne({ vehicle_number: vehicleData.vehicle_number });
      if (existingVehicle) {
        throw new Error('Vehicle with this number already exists');
      }

      const vehicle = new Vehicle(vehicleData);
      await vehicle.save();
      logger.loggerInfo(`Vehicle created: ${vehicle.vehicle_number}`);
      return vehicle;
    } catch (error) {
      logger.loggerError(`Error creating vehicle: ${error.message}`);
      throw error;
    }
  }

  static async getVehicleById(vehicleId) {
    try {
      const vehicle = await Vehicle.findById(vehicleId)
        .populate('operator_id')
        .populate('device_id')
        .populate('driver_id');
      if (!vehicle) {
        throw new Error('Vehicle not found');
      }
      return vehicle;
    } catch (error) {
      logger.loggerError(`Error fetching vehicle: ${error.message}`);
      throw error;
    }
  }

  static async getVehicleByNumber(vehicleNumber) {
    try {
      const vehicle = await Vehicle.findOne({ vehicle_number: vehicleNumber })
        .populate('operator_id')
        .populate('device_id')
        .populate('driver_id');
      if (!vehicle) {
        throw new Error('Vehicle not found');
      }
      return vehicle;
    } catch (error) {
      logger.loggerError(`Error fetching vehicle by number: ${error.message}`);
      throw error;
    }
  }

  static async getAllVehicles(filters = {}) {
    try {
      const query = {};
      if (filters.operator_id) query.operator_id = filters.operator_id;
      if (filters.status) query.current_status = filters.status;
      if (filters.driver_id) query.driver_id = filters.driver_id;

      const vehicles = await Vehicle.find(query)
        .populate('operator_id')
        .populate('device_id')
        .populate('driver_id');
      return vehicles;
    } catch (error) {
      logger.loggerError(`Error fetching vehicles: ${error.message}`);
      throw error;
    }
  }

  static async updateVehicle(vehicleId, updateData) {
    try {
      const vehicle = await Vehicle.findByIdAndUpdate(vehicleId, updateData, { new: true })
        .populate('operator_id')
        .populate('device_id')
        .populate('driver_id');
      logger.loggerInfo(`Vehicle updated: ${vehicle.vehicle_number}`);
      return vehicle;
    } catch (error) {
      logger.loggerError(`Error updating vehicle: ${error.message}`);
      throw error;
    }
  }

  static async updateVehicleLocation(vehicleId, locationData) {
    try {
      const vehicle = await Vehicle.findByIdAndUpdate(
        vehicleId,
        {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          speed: locationData.speed || 0,
          altitude: locationData.altitude,
          bearing: locationData.bearing,
          last_update: new Date()
        },
        { new: true }
      );
      return vehicle;
    } catch (error) {
      logger.loggerError(`Error updating vehicle location: ${error.message}`);
      throw error;
    }
  }

  static async updateVehicleStatus(vehicleId, status) {
    try {
      const vehicle = await Vehicle.findByIdAndUpdate(
        vehicleId,
        { current_status: status, last_update: new Date() },
        { new: true }
      );
      logger.loggerInfo(`Vehicle status updated: ${vehicle.vehicle_number} - ${status}`);
      return vehicle;
    } catch (error) {
      logger.loggerError(`Error updating vehicle status: ${error.message}`);
      throw error;
    }
  }

  static async assignDriverToVehicle(vehicleId, driverId) {
    try {
      const vehicle = await Vehicle.findByIdAndUpdate(
        vehicleId,
        { driver_id: driverId },
        { new: true }
      ).populate('driver_id');
      logger.loggerInfo(`Driver assigned to vehicle: ${vehicle.vehicle_number}`);
      return vehicle;
    } catch (error) {
      logger.loggerError(`Error assigning driver: ${error.message}`);
      throw error;
    }
  }



  static async deleteVehicle(vehicleId) {
    try {
      const vehicle = await Vehicle.findByIdAndDelete(vehicleId);
      if (vehicle.device_id) {
        await Device.findByIdAndUpdate(vehicle.device_id, { vehicle_id: null });
      }
      logger.loggerInfo(`Vehicle deleted: ${vehicle.vehicle_number}`);
      return vehicle;
    } catch (error) {
      logger.loggerError(`Error deleting vehicle: ${error.message}`);
      throw error;
    }
  }

  static async getVehiclesByOperator(operatorId) {
    try {
      const vehicles = await Vehicle.find({ operator_id: operatorId })
        .populate('operator_id')
        .populate('device_id')
        .populate('driver_id');
      return vehicles;
    } catch (error) {
      logger.loggerError(`Error fetching operator vehicles: ${error.message}`);
      throw error;
    }
  }

  static async getActiveVehicles() {
    try {
      const vehicles = await Vehicle.find({
        current_status: { $in: ['active', 'idle'] }
      })
        .populate('operator_id')
        .populate('device_id')
        .populate('driver_id');
      return vehicles;
    } catch (error) {
      logger.loggerError(`Error fetching active vehicles: ${error.message}`);
      throw error;
    }
  }
}

module.exports = VehicleService;

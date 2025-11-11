const mongoose = require('mongoose');
const logger = require('../utils/logger');

class TransactionService {
  static async executeTransaction(operations) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const results = [];

      for (const operation of operations) {
        const result = await this.executeOperation(operation, session);
        results.push(result);
      }

      await session.commitTransaction();
      logger.loggerInfo(`Transaction completed successfully with ${operations.length} operations`);
      return {
        success: true,
        results,
        message: 'All operations completed successfully'
      };
    } catch (error) {
      await session.abortTransaction();
      logger.loggerError(`Transaction failed and rolled back: ${error.message}`);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  static async executeOperation(operation, session) {
    const { type, model, method, data, filter, options = {} } = operation;

    try {
      switch (method) {
        case 'create':
          return await model.create([data], { session });

        case 'insertMany':
          return await model.insertMany(data, { session });

        case 'updateOne':
          return await model.updateOne(filter, data, { session, ...options });

        case 'updateMany':
          return await model.updateMany(filter, data, { session, ...options });

        case 'findOneAndUpdate':
          return await model.findOneAndUpdate(filter, data, { session, new: true, ...options });

        case 'findByIdAndUpdate':
          return await model.findByIdAndUpdate(filter._id, data, { session, new: true, ...options });

        case 'deleteOne':
          return await model.deleteOne(filter, { session });

        case 'deleteMany':
          return await model.deleteMany(filter, { session });

        case 'findOneAndDelete':
          return await model.findOneAndDelete(filter, { session });

        default:
          throw new Error(`Unknown operation method: ${method}`);
      }
    } catch (error) {
      logger.loggerError(`Operation failed: ${error.message}`);
      throw error;
    }
  }

  static async assignDriverToVehicle(driverId, vehicleId, Session) {
    const User = require('../models/User');
    const Vehicle = require('../models/Vehicle');

    const operations = [
      {
        type: 'update_user',
        model: User,
        method: 'findByIdAndUpdate',
        filter: { _id: driverId },
        data: { assigned_vehicle_id: vehicleId }
      },
      {
        type: 'assign_vehicle',
        model: Vehicle,
        method: 'findByIdAndUpdate',
        filter: { _id: vehicleId },
        data: {
          $addToSet: { assigned_drivers: driverId },
          assigned_status: 'assigned'
        }
      }
    ];

    return await this.executeTransaction(operations);
  }

  static async createUserWithAssignments(userData, assignments = {}) {
    const User = require('../models/User');
    const Vehicle = require('../models/Vehicle');
    const Device = require('../models/Device');

    const operations = [];

    operations.push({
      type: 'create_user',
      model: User,
      method: 'create',
      data: userData
    });

    if (assignments.assigned_vehicle_id) {
      operations.push({
        type: 'assign_vehicle',
        model: Vehicle,
        method: 'findByIdAndUpdate',
        filter: { _id: assignments.assigned_vehicle_id },
        data: { $addToSet: { assigned_drivers: userData._id } }
      });
    }

    if (assignments.device_ids && assignments.device_ids.length > 0) {
      operations.push({
        type: 'assign_devices',
        model: Device,
        method: 'updateMany',
        filter: { _id: { $in: assignments.device_ids } },
        data: { $addToSet: { assigned_to: userData._id } }
      });
    }

    return await this.executeTransaction(operations);
  }

  static async startTripWithAssignments(tripData, vehicleId, driverId) {
    const Trip = require('../models/Trip');
    const Vehicle = require('../models/Vehicle');
    const User = require('../models/User');

    const operations = [
      {
        type: 'create_trip',
        model: Trip,
        method: 'create',
        data: tripData
      },
      {
        type: 'update_vehicle',
        model: Vehicle,
        method: 'findByIdAndUpdate',
        filter: { _id: vehicleId },
        data: { 
          current_status: 'en_route',
          active_trip_id: tripData._id
        }
      },
      {
        type: 'update_driver',
        model: User,
        method: 'findByIdAndUpdate',
        filter: { _id: driverId },
        data: { 
          current_trip_id: tripData._id,
          status: 'on_duty'
        }
      }
    ];

    return await this.executeTransaction(operations);
  }

  static async endTripWithCleanup(tripId, vehicleId, driverId, endData) {
    const Trip = require('../models/Trip');
    const Vehicle = require('../models/Vehicle');
    const User = require('../models/User');

    const endTime = new Date();
    const operations = [
      {
        type: 'end_trip',
        model: Trip,
        method: 'findByIdAndUpdate',
        filter: { _id: tripId },
        data: {
          ...endData,
          end_time: endTime,
          status: 'completed'
        }
      },
      {
        type: 'update_vehicle',
        model: Vehicle,
        method: 'findByIdAndUpdate',
        filter: { _id: vehicleId },
        data: {
          current_status: 'idle',
          active_trip_id: null
        }
      },
      {
        type: 'update_driver',
        model: User,
        method: 'findByIdAndUpdate',
        filter: { _id: driverId },
        data: {
          current_trip_id: null,
          status: 'on_break'
        }
      }
    ];

    return await this.executeTransaction(operations);
  }

  static async bulkAssignDriversToVehicles(assignments) {
    const User = require('../models/User');
    const Vehicle = require('../models/Vehicle');

    const operations = [];

    for (const assignment of assignments) {
      operations.push({
        type: 'assign_driver',
        model: User,
        method: 'findByIdAndUpdate',
        filter: { _id: assignment.driverId },
        data: { assigned_vehicle_id: assignment.vehicleId }
      });

      operations.push({
        type: 'add_driver_to_vehicle',
        model: Vehicle,
        method: 'findByIdAndUpdate',
        filter: { _id: assignment.vehicleId },
        data: { $addToSet: { assigned_drivers: assignment.driverId } }
      });
    }

    return await this.executeTransaction(operations);
  }

  static async updatePassengerWithConfirmation(tripId, passengerId, status, parentId) {
    const Trip = require('../models/Trip');

    const operations = [
      {
        type: 'update_passenger_status',
        model: Trip,
        method: 'updateOne',
        filter: { 
          _id: tripId,
          'passengers.user_id': passengerId
        },
        data: {
          $set: {
            'passengers.$.picked_up': status === 'picked_up',
            'passengers.$.picked_up_time': status === 'picked_up' ? new Date() : undefined,
            'passengers.$.dropped': status === 'dropped',
            'passengers.$.dropped_time': status === 'dropped' ? new Date() : undefined
          }
        }
      }
    ];

    return await this.executeTransaction(operations);
  }

  static async transferDeviceBetweenVehicles(deviceId, fromVehicleId, toVehicleId) {
    const Vehicle = require('../models/Vehicle');
    const Device = require('../models/Device');

    const operations = [
      {
        type: 'remove_from_vehicle',
        model: Vehicle,
        method: 'findByIdAndUpdate',
        filter: { _id: fromVehicleId },
        data: { $pull: { assigned_devices: deviceId } }
      },
      {
        type: 'assign_to_vehicle',
        model: Vehicle,
        method: 'findByIdAndUpdate',
        filter: { _id: toVehicleId },
        data: { $addToSet: { assigned_devices: deviceId } }
      },
      {
        type: 'update_device',
        model: Device,
        method: 'findByIdAndUpdate',
        filter: { _id: deviceId },
        data: { vehicle_id: toVehicleId }
      }
    ];

    return await this.executeTransaction(operations);
  }

  static async deactivateUserAndCleanup(userId) {
    const User = require('../models/User');
    const Vehicle = require('../models/Vehicle');
    const Trip = require('../models/Trip');

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const operations = [
      {
        type: 'deactivate_user',
        model: User,
        method: 'findByIdAndUpdate',
        filter: { _id: userId },
        data: { status: false }
      }
    ];

    if (user.assigned_vehicle_id) {
      operations.push({
        type: 'remove_driver_from_vehicle',
        model: Vehicle,
        method: 'findByIdAndUpdate',
        filter: { _id: user.assigned_vehicle_id },
        data: { $pull: { assigned_drivers: userId } }
      });
    }

    if (user.current_trip_id) {
      operations.push({
        type: 'cancel_active_trip',
        model: Trip,
        method: 'findByIdAndUpdate',
        filter: { _id: user.current_trip_id },
        data: { status: 'cancelled' }
      });
    }

    return await this.executeTransaction(operations);
  }
}

module.exports = TransactionService;

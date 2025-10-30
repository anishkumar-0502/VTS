const UserService = require('../services/userService');
const DeviceService = require('../services/deviceService');
const VehicleService = require('../services/vehicleService');
const BulkImportService = require('../services/bulkImportService');
const TransactionService = require('../services/transactionService');
const { CustomError } = require('../middlewares/errorHandler');
const { generateEmailBasedPassword } = require('../utils/passwordGenerator');
const { sendCredentialsEmail } = require('../middlewares/emailer');
const Role = require('../models/Role');
const Operator = require('../models/Operator');
const Device = require('../models/Device');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const User = require('../models/User');
const TrackingData = require('../models/TrackingData');
const logger = require('../utils/logger');
const fs = require('fs');

class OperatorController {
  // ========== ANALYTICS & DASHBOARD ==========
  static async getDashboardAnalytics(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;

      const totalDrivers = await User.countDocuments({ operator_id, role_id: 3, status: true });
      const totalEndUsers = await User.countDocuments({ operator_id, role_id: 4, status: true });
      const totalVehicles = await Vehicle.countDocuments({ operator_id, status: true });
      const totalDevices = await Device.countDocuments({ assigned_operator_id: operator_id, status: true });
      const activeVehicles = await Vehicle.countDocuments({ operator_id, current_status: 'active', status: true });
      const activeDevices = await Device.countDocuments({ assigned_operator_id: operator_id, status: true, battery_level: { $gt: 0 } });

      const recentTracking = await TrackingData.find()
        .sort({ timestamp: -1 })
        .limit(10)
        
        ;

      res.status(200).json({
        error: false,
        message: 'Dashboard analytics retrieved successfully',
        data: {
          totalDrivers,
          totalEndUsers,
          totalVehicles,
          totalDevices,
          activeVehicles,
          activeDevices,
          recentTracking
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getLiveTracking(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const { vehicleId, deviceId, limit = 50 } = req.query;

      const query = { operator_id };
      if (vehicleId) query.vehicle_id = vehicleId;
      if (deviceId) query.device_id = deviceId;

      const tracking = await TrackingData.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        
        ;

      res.status(200).json({
        error: false,
        message: 'Live tracking data retrieved successfully',
        data: tracking
      });
    } catch (error) {
      next(error);
    }
  }

  // ========== MANAGE DRIVERS ==========
  static async createDriver(req, res, next) {
    try {
      const { name, email, phone_number, license_number, license_expiry, assigned_vehicle_id } = req.body;
      const operator_id = req.user.operator_id || req.user.user_id;

      if (!name || !email || !phone_number || !license_number) {
        throw new CustomError('Missing required fields', 400);
      }

      const driverRole = await Role.findOne({ role_id: 3 });
      if (!driverRole) {
        throw new CustomError('Driver role not found', 404);
      }
      const password = generateEmailBasedPassword(email);

      const driverUser = await UserService.createUser({
        name,
        email,
        phone_number,
        password,
        role_id: 3,
        operator_id,
        assigned_vehicle_id: assigned_vehicle_id || null,
        license_number,
        license_expiry
      });

      let driverProfile;
      try {
        driverProfile = await Driver.create({
          user_id: driverUser.user_id,
          operator_id,
          assigned_vehicle_id: assigned_vehicle_id || null,
          license_number,
          license_expiry
        });
      } catch (creationError) {
        await User.deleteOne({ user_id: driverUser.user_id });
        throw creationError;
      }

      await sendCredentialsEmail(email, name, password, 3);

      res.status(201).json({
        error: false,
        message: 'Driver created successfully',
        data: {
          user: driverUser.toObject(),
          driver: driverProfile.toObject(),
          password
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDrivers(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const drivers = await User.find({ operator_id, role_id: 3, status: true });

      res.status(200).json({
        error: false,
        message: 'Drivers retrieved successfully',
        data: drivers
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDriverById(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const driver = await User.findOne({ user_id: req.params.driverId, operator_id, role_id: 3 });

      if (!driver) {
        throw new CustomError('Driver not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Driver retrieved successfully',
        data: driver
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateDriver(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const { name, phone_number, license_number, license_expiry, assigned_vehicle_id } = req.body;

      const driver = await User.findOneAndUpdate(
        { user_id: req.params.driverId, operator_id, role_id: 3 },
        { name, phone_number, license_number, license_expiry, assigned_vehicle_id },
        { new: true }
      );

      if (!driver) {
        throw new CustomError('Driver not found', 404);
      }

      await Driver.findOneAndUpdate(
        { user_id: driver.user_id, operator_id },
        {
          assigned_vehicle_id,
          license_number,
          license_expiry,
          status: driver.status
        },
        { upsert: true }
      );

      res.status(200).json({
        error: false,
        message: 'Driver updated successfully',
        data: driver
      });
    } catch (error) {
      next(error);
    }
  }

  static async deactivateDriver(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const driver = await User.findOneAndUpdate(
        { user_id: req.params.driverId, operator_id, role_id: 3 },
        { status: false },
        { new: true }
      );

      if (!driver) {
        throw new CustomError('Driver not found', 404);
      }

      await Driver.findOneAndUpdate(
        { user_id: driver.user_id, operator_id },
        { status: false },
        { new: true }
      );

      res.status(200).json({
        error: false,
        message: 'Driver deactivated successfully',
        data: driver
      });
    } catch (error) {
      next(error);
    }
  }

  static async bulkCreateDrivers(req, res, next) {
    try {
      const { drivers } = req.body;
      const operator_id = req.user.operator_id || req.user.user_id;

      if (!Array.isArray(drivers) || drivers.length === 0) {
        throw new CustomError('Drivers array is required', 400);
      }

      const createdDrivers = [];
      const createdDriverProfiles = [];
      const credentials = [];

      for (const driverData of drivers) {
        const { name, email, phone_number, license_number, license_expiry, assigned_vehicle_id } = driverData;

        if (!name || !email || !phone_number || !license_number) {
          logger.loggerWarn(`Skipping driver with incomplete data: ${JSON.stringify(driverData)}`);
          continue;
        }

        const password = generateEmailBasedPassword(email);

        try {
          const driverUser = await UserService.createUser({
            name,
            email,
            phone_number,
            password,
            role_id: 3,
            operator_id,
            assigned_vehicle_id: assigned_vehicle_id || null,
            license_number,
            license_expiry
          });

          const driverProfile = await Driver.create({
            user_id: driverUser.user_id,
            operator_id,
            assigned_vehicle_id: assigned_vehicle_id || null,
            license_number,
            license_expiry
          });

          await sendCredentialsEmail(email, name, password, 3);

          createdDrivers.push(driverUser);
          createdDriverProfiles.push(driverProfile);
          credentials.push({
            email,
            password,
            name
          });
        } catch (err) {
          logger.loggerError(`Error creating driver ${email}: ${err.message}`);
        }
      }

      res.status(201).json({
        error: false,
        message: `${createdDrivers.length} drivers created successfully`,
        data: {
          created: createdDrivers.length,
          drivers: createdDrivers,
          driverProfiles: createdDriverProfiles,
          credentials
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // ========== MANAGE END-USERS (PARENTS) ==========
  static async createEndUser(req, res, next) {
    try {
      const { name, email, phone_number, sos_contact, pickup_location, dropoff_location } = req.body;
      const operator_id = req.user.operator_id || req.user.user_id;

      if (!name || !email || !phone_number) {
        throw new CustomError('Missing required fields', 400);
      }

      const password = generateEmailBasedPassword(email);

      const endUser = await UserService.createUser({
        name,
        email,
        phone_number,
        password,
        role_id: 4,
        operator_id,
        sos_contact,
        pickup_location,
        dropoff_location
      });

      await sendCredentialsEmail(email, name, password, 4);

      res.status(201).json({
        error: false,
        message: 'End-user created successfully',
        data: { ...endUser.toObject(), password }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEndUsers(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const endUsers = await User.find({ operator_id, role_id: 4, status: true });

      res.status(200).json({
        error: false,
        message: 'End-users retrieved successfully',
        data: endUsers
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEndUserById(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const endUser = await User.findOne({ user_id: req.params.userId, operator_id, role_id: 4 });

      if (!endUser) {
        throw new CustomError('End-user not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'End-user retrieved successfully',
        data: endUser
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateEndUser(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const { name, phone_number, sos_contact, pickup_location, dropoff_location } = req.body;

      const endUser = await User.findOneAndUpdate(
        { user_id: req.params.userId, operator_id, role_id: 4 },
        { name, phone_number, sos_contact, pickup_location, dropoff_location },
        { new: true }
      );

      if (!endUser) {
        throw new CustomError('End-user not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'End-user updated successfully',
        data: endUser
      });
    } catch (error) {
      next(error);
    }
  }

  static async deactivateEndUser(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const endUser = await User.findOneAndUpdate(
        { user_id: req.params.userId, operator_id, role_id: 4 },
        { status: false },
        { new: true }
      );

      if (!endUser) {
        throw new CustomError('End-user not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'End-user deactivated successfully',
        data: endUser
      });
    } catch (error) {
      next(error);
    }
  }

  static async bulkCreateEndUsers(req, res, next) {
    try {
      const { endUsers } = req.body;
      const operator_id = req.user.operator_id || req.user.user_id;

      if (!Array.isArray(endUsers) || endUsers.length === 0) {
        throw new CustomError('End-users array is required', 400);
      }

      const createdEndUsers = [];
      const credentials = [];

      for (const userData of endUsers) {
        const { name, email, phone_number, sos_contact, pickup_location, dropoff_location } = userData;

        if (!name || !email || !phone_number) {
          logger.loggerWarn(`Skipping end-user with incomplete data: ${JSON.stringify(userData)}`);
          continue;
        }

        const password = generateEmailBasedPassword(email);

        try {
          const endUser = await UserService.createUser({
            name,
            email,
            phone_number,
            password,
            role_id: 4,
            operator_id,
            sos_contact,
            pickup_location,
            dropoff_location
          });

          await sendCredentialsEmail(email, name, password, 4);

          createdEndUsers.push(endUser);
          credentials.push({
            email,
            password,
            name
          });
        } catch (err) {
          logger.loggerError(`Error creating end-user ${email}: ${err.message}`);
        }
      }

      res.status(201).json({
        error: false,
        message: `${createdEndUsers.length} end-users created successfully`,
        data: {
          created: createdEndUsers.length,
          endUsers: createdEndUsers,
          credentials
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // ========== MANAGE DEVICES ==========
  static async createDevice(req, res, next) {
    try {
      const { device_name, device_type, manufacturer, model, sim_number, api_key } = req.body;
      const operator_id = req.user.operator_id || req.user.user_id;

      if (!device_name || !device_type) {
        throw new CustomError('device_name and device_type are required', 400);
      }

      const device = new Device({
        device_name,
        device_type,
        manufacturer,
        model,
        sim_number,
        api_key,
        assigned_operator_id: operator_id,
        status: true
      });

      await device.save();

      res.status(201).json({
        error: false,
        message: 'Device created successfully',
        data: device
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDevices(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const devices = await Device.find({ assigned_operator_id: operator_id, status: true });

      res.status(200).json({
        error: false,
        message: 'Devices retrieved successfully',
        data: devices
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDeviceById(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const device = await Device.findOne({ device_id: req.params.deviceId, assigned_operator_id: operator_id });

      if (!device) {
        throw new CustomError('Device not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Device retrieved successfully',
        data: device
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateDevice(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const { device_name, sim_number, model } = req.body;

      const device = await Device.findOneAndUpdate(
        { device_id: req.params.deviceId, assigned_operator_id: operator_id },
        { device_name, sim_number, model },
        { new: true }
      );

      if (!device) {
        throw new CustomError('Device not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Device updated successfully',
        data: device
      });
    } catch (error) {
      next(error);
    }
  }

  static async deactivateDevice(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const device = await Device.findOneAndUpdate(
        { device_id: req.params.deviceId, assigned_operator_id: operator_id },
        { status: false },
        { new: true }
      );

      if (!device) {
        throw new CustomError('Device not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Device deactivated successfully',
        data: device
      });
    } catch (error) {
      next(error);
    }
  }

  static async bulkAssignDevices(req, res, next) {
    try {
      const { device_ids, vehicle_id } = req.body;
      const operator_id = req.user.operator_id || req.user.user_id;

      if (!Array.isArray(device_ids) || !vehicle_id) {
        throw new CustomError('Device IDs array and vehicle ID are required', 400);
      }

      const assignments = [];

      for (const device_id of device_ids) {
        const device = await Device.findOneAndUpdate(
          { device_id, assigned_operator_id: operator_id },
          { vehicle_id },
          { new: true }
        );

        if (device) {
          assignments.push(device);
        }
      }

      res.status(200).json({
        error: false,
        message: `${assignments.length} devices assigned successfully`,
        data: assignments
      });
    } catch (error) {
      next(error);
    }
  }

  // ========== MANAGE VEHICLES ==========
  static async createVehicle(req, res, next) {
    try {
      const {
        vehicle_number,
        vehicle_type,
        route_name,
        capacity,
        driver_id,
        registration_number,
        chassis_number,
        color,
        seating_capacity,
        route_points,
        standing_location
      } = req.body;
      const operator_id = req.user.operator_id || req.user.user_id;

      if (!vehicle_number) {
        throw new CustomError('Vehicle number is required', 400);
      }

      const vehicle = new Vehicle({
        vehicle_number,
        operator_id,
        vehicle_type: vehicle_type || 'bus',
        route_name,
        capacity: capacity || 0,
        driver_id: driver_id || null,
        registration_number,
        chassis_number,
        color,
        seating_capacity,
        route_points: route_points || [],
        standing_location: standing_location || {},
        current_status: 'offline',
        status: true
      });

      await vehicle.save();

      res.status(201).json({
        error: false,
        message: 'Vehicle created successfully',
        data: vehicle
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVehicles(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const vehicles = await Vehicle.find({ operator_id, status: true });

      res.status(200).json({
        error: false,
        message: 'Vehicles retrieved successfully',
        data: vehicles
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVehicleById(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const vehicle = await Vehicle.findOne({ vehicle_id: req.params.vehicleId, operator_id });

      if (!vehicle) {
        throw new CustomError('Vehicle not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Vehicle retrieved successfully',
        data: vehicle
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateVehicle(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const { vehicle_number, route_name, capacity, route_points, standing_location } = req.body;

      const vehicle = await Vehicle.findOneAndUpdate(
        { vehicle_id: req.params.vehicleId, operator_id },
        { vehicle_number, route_name, capacity, route_points, standing_location },
        { new: true }
      );

      if (!vehicle) {
        throw new CustomError('Vehicle not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Vehicle updated successfully',
        data: vehicle
      });
    } catch (error) {
      next(error);
    }
  }

  static async deactivateVehicle(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const vehicle = await Vehicle.findOneAndUpdate(
        { vehicle_id: req.params.vehicleId, operator_id },
        { status: false },
        { new: true }
      );

      if (!vehicle) {
        throw new CustomError('Vehicle not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Vehicle deactivated successfully',
        data: vehicle
      });
    } catch (error) {
      next(error);
    }
  }

  static async assignDriverToVehicle(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const { driver_id, vehicle_id } = req.body;

      if (!driver_id || !vehicle_id) {
        throw new CustomError('Driver ID and Vehicle ID are required', 400);
      }

      const driver = await User.findOne({ user_id: driver_id, operator_id });
      const vehicle = await Vehicle.findOne({ vehicle_id: vehicle_id, operator_id });

      if (!driver) {
        throw new CustomError('Driver not found', 404);
      }

      if (!vehicle) {
        throw new CustomError('Vehicle not found', 404);
      }

      await TransactionService.assignDriverToVehicle(
        driver_id,
        vehicle_id
      );

      const updatedDriver = await User.findOne({ user_id: driver_id });

      res.status(200).json({
        error: false,
        message: 'Driver assigned to vehicle successfully',
        data: {
          driver: { user_id: driver_id, name: driver.name },
          vehicle: { vehicle_id: vehicle_id, vehicle_number: vehicle.vehicle_number },
          assignedAt: new Date(),
          assigned_vehicle_id: updatedDriver.assigned_vehicle_id
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async bulkAssignDrivers(req, res, next) {
    try {
      const { assignments } = req.body;
      const operator_id = req.user.operator_id || req.user.user_id;

      if (!Array.isArray(assignments) || assignments.length === 0) {
        throw new CustomError('Assignments array is required', 400);
      }

      const formattedAssignments = assignments.map(a => ({
        driverId: a.driver_id,
        vehicleId: a.vehicle_id
      }));

      await TransactionService.bulkAssignDriversToVehicles(
        formattedAssignments
      );

      const assignedVehicles = await Vehicle.find({
        _id: { $in: formattedAssignments.map(a => a.vehicleId) },
        operator_id
      }).select('vehicle_id vehicle_number driver_id assigned_drivers');

      res.status(200).json({
        error: false,
        message: `${formattedAssignments.length} drivers assigned successfully`,
        data: {
          assignmentCount: formattedAssignments.length,
          vehicles: assignedVehicles,
          timestamp: new Date()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async assignDeviceToVehicle(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const { device_id, vehicle_id } = req.body;

      if (!device_id || !vehicle_id) {
        throw new CustomError('Device ID and Vehicle ID are required', 400);
      }

      const device = await Device.findOneAndUpdate(
        { device_id, operator_id },
        { vehicle_id },
        { new: true }
      );

      if (!device) {
        throw new CustomError('Device not found', 404);
      }

      const vehicle = await Vehicle.findOneAndUpdate(
        { vehicle_id: vehicle_id, operator_id },
        { device_id },
        { new: true }
      );

      res.status(200).json({
        error: false,
        message: 'Device assigned to vehicle successfully',
        data: { device, vehicle }
      });
    } catch (error) {
      next(error);
    }
  }

  // ========== PROFILE ==========
  static async getOwnProfile(req, res, next) {
    try {
      const user = await User.findOne({ user_id: req.user.user_id });

      if (!user) {
        throw new CustomError('User not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Profile retrieved successfully',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateOwnProfile(req, res, next) {
    try {
      const { name, phone_number } = req.body;

      const user = await User.findOneAndUpdate(
        { user_id: req.user.user_id },
        { name, phone_number },
        { new: true }
      );

      if (!user) {
        throw new CustomError('User not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Profile updated successfully',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  // ========== BULK IMPORT ==========
  static async bulkImportDrivers(req, res, next) {
    try {
      if (!req.file) {
        throw new CustomError('No file uploaded', 400);
      }

      const operator_id = req.user.operator_id || req.user.user_id;
      const fileExt = BulkImportService.getFileExtension(req.file.originalname);
      const filePath = req.file.path;

      const importData = await BulkImportService.processImportFile(filePath, fileExt, 'drivers');
      const driverRole = await Role.findOne({ role_id: 3 });

      if (!driverRole) {
        throw new CustomError('Driver role not found', 404);
      }

      const validation = await BulkImportService.validateBulkUserData(
        importData,
        driverRole._id,
        operator_id
      );

      const importResult = await BulkImportService.importUsers(
        validation.valid,
        driverRole._id,
        operator_id
      );

      for (const user of importResult.created) {
        await sendCredentialsEmail(user.email, user.name, user.password, 3);
      }

      fs.unlinkSync(filePath);

      res.status(200).json({
        error: false,
        message: 'Drivers imported successfully',
        data: {
          validation: {
            validRecords: validation.valid.length,
            invalidRecords: validation.invalid.length,
            duplicateRecords: validation.duplicates.length,
            invalid: validation.invalid,
            duplicates: validation.duplicates
          },
          import: importResult
        }
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  }

  static async bulkImportEndUsers(req, res, next) {
    try {
      if (!req.file) {
        throw new CustomError('No file uploaded', 400);
      }

      const operator_id = req.user.operator_id || req.user.user_id;
      const fileExt = BulkImportService.getFileExtension(req.file.originalname);
      const filePath = req.file.path;

      const importData = await BulkImportService.processImportFile(filePath, fileExt, 'users');
      const endUserRole = await Role.findOne({ role_id: 4 });

      if (!endUserRole) {
        throw new CustomError('End user role not found', 404);
      }

      const validation = await BulkImportService.validateBulkUserData(
        importData,
        endUserRole._id,
        operator_id
      );

      const importResult = await BulkImportService.importUsers(
        validation.valid,
        endUserRole._id,
        operator_id
      );

      for (const user of importResult.created) {
        await sendCredentialsEmail(user.email, user.name, user.password, 4);
      }

      fs.unlinkSync(filePath);

      res.status(200).json({
        error: false,
        message: 'End users imported successfully',
        data: {
          validation: {
            validRecords: validation.valid.length,
            invalidRecords: validation.invalid.length,
            duplicateRecords: validation.duplicates.length,
            invalid: validation.invalid,
            duplicates: validation.duplicates
          },
          import: importResult
        }
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  }

  static async bulkImportVehicles(req, res, next) {
    try {
      if (!req.file) {
        throw new CustomError('No file uploaded', 400);
      }

      const operator_id = req.user.operator_id || req.user.user_id;
      const fileExt = BulkImportService.getFileExtension(req.file.originalname);
      const filePath = req.file.path;

      const importData = await BulkImportService.processImportFile(filePath, fileExt, 'vehicles');

      const validation = await BulkImportService.validateBulkVehicleData(importData, operator_id);

      const importResult = await BulkImportService.importVehicles(validation.valid, operator_id);

      fs.unlinkSync(filePath);

      res.status(200).json({
        error: false,
        message: 'Vehicles imported successfully',
        data: {
          validation: {
            validRecords: validation.valid.length,
            invalidRecords: validation.invalid.length,
            duplicateRecords: validation.duplicates.length,
            invalid: validation.invalid,
            duplicates: validation.duplicates
          },
          import: importResult
        }
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  }

  // ========== STATISTICS ==========
  static async getOperatorStats(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;

      const totalVehicles = await Vehicle.countDocuments({ operator_id, status: true });
      const activeVehicles = await Vehicle.countDocuments({ operator_id, current_status: 'active', status: true });
      const totalDevices = await Device.countDocuments({ assigned_operator_id: operator_id, status: true });
      const activeDevices = await Device.countDocuments({ assigned_operator_id: operator_id, status: true, battery_level: { $gt: 0 } });
      const totalDrivers = await User.countDocuments({ operator_id, role_id: 3, status: true });
      const totalEndUsers = await User.countDocuments({ operator_id, role_id: 4, status: true });

      res.status(200).json({
        error: false,
        message: 'Operator statistics retrieved successfully',
        data: {
          totalVehicles,
          activeVehicles,
          totalDevices,
          activeDevices,
          totalDrivers,
          totalEndUsers
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OperatorController;

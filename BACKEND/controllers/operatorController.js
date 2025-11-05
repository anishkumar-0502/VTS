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
const EndUser = require('../models/EndUser');
const User = require('../models/User');
const TrackingData = require('../models/TrackingData');
const logger = require('../utils/logger');
const fs = require('fs');

const resolveOperatorContext = async (userPayload) => {
  const deviceIdentifiers = new Set();
  const operatorIdentifiers = new Set();

  if (!userPayload || !userPayload.user_id) {
    return { identifiers: [], operatorIds: [], primaryOperatorId: null };
  }

  deviceIdentifiers.add(userPayload.user_id);

  if (userPayload.operator_id) {
    deviceIdentifiers.add(userPayload.operator_id);
    operatorIdentifiers.add(userPayload.operator_id);
  }

  const userRecord = await User.findOne({ user_id: userPayload.user_id })
    .select('operator_id email')
    .lean();

  if (userRecord?.operator_id) {
    deviceIdentifiers.add(userRecord.operator_id);
    operatorIdentifiers.add(userRecord.operator_id);
  }

  const operatorConditions = [];
  if (userRecord?.operator_id) {
    operatorConditions.push({ operator_id: userRecord.operator_id });
  }
  if (userRecord?.email) {
    operatorConditions.push({ email: userRecord.email });
  }
  operatorConditions.push({ admin_user_id: userPayload.user_id });

  if (operatorConditions.length) {
    const operators = await Operator.find({ $or: operatorConditions })
      .select('operator_id')
      .lean();

    operators.forEach((operator) => {
      if (operator?.operator_id) {
        deviceIdentifiers.add(operator.operator_id);
        operatorIdentifiers.add(operator.operator_id);
      }
    });
  }

  const identifiers = Array.from(deviceIdentifiers).filter(Boolean);
  const operatorIds = Array.from(operatorIdentifiers).filter(Boolean);
  const primaryOperatorId = userRecord?.operator_id || userPayload.operator_id || operatorIds[0] || null;

  return { identifiers, operatorIds, primaryOperatorId };
};

class OperatorController {
  // ========== ANALYTICS & DASHBOARD ==========
  static async getDashboardAnalytics(req, res, next) {
    try {
      const { identifiers, operatorIds } = await resolveOperatorContext(req.user);

      if (!identifiers.length && !operatorIds.length) {
        return res.status(200).json({
          error: false,
          message: 'Dashboard analytics retrieved successfully',
          data: {
            totalDrivers: 0,
            totalEndUsers: 0,
            totalVehicles: 0,
            totalDevices: 0,
            activeVehicles: 0,
            activeDevices: 0,
            recentTracking: []
          }
        });
      }

      const deviceFilter = identifiers.length ? { assigned_operator_id: { $in: identifiers } } : null;
      const operatorFilter = operatorIds.length ? { operator_id: { $in: operatorIds } } : null;

      const devicePromise = deviceFilter
        ? Device.find(deviceFilter).select('device_id status battery_level').lean()
        : Promise.resolve([]);

      const driverCountPromise = operatorFilter
        ? User.countDocuments({ ...operatorFilter, role_id: 3, status: true })
        : Promise.resolve(0);

      const endUserCountPromise = operatorFilter
        ? EndUser.countDocuments({ ...operatorFilter, status: true })
        : Promise.resolve(0);

      const vehicleCountPromise = operatorFilter
        ? Vehicle.countDocuments({ ...operatorFilter, status: true })
        : Promise.resolve(0);

      const activeVehicleCountPromise = operatorFilter
        ? Vehicle.countDocuments({ ...operatorFilter, current_status: 'active', status: true })
        : Promise.resolve(0);

      const devices = await devicePromise;
      const [totalDrivers, totalEndUsers, totalVehicles, activeVehicles] = await Promise.all([
        driverCountPromise,
        endUserCountPromise,
        vehicleCountPromise,
        activeVehicleCountPromise
      ]);

      const totalDevices = devices.filter((device) => device.status).length;
      const activeDevices = devices.filter((device) => device.status && (device.battery_level ?? 0) > 0).length;
      const deviceIds = devices.map((device) => device.device_id);

      const recentTracking = deviceIds.length
        ? await TrackingData.find({ device_id: { $in: deviceIds } })
          .sort({ timestamp: -1 })
          .limit(10)
          .lean()
        : [];

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
        .lean();

      const vehicleIds = tracking
        .map((entry) => entry.vehicle_id)
        .filter((id, index, array) => id && array.indexOf(id) === index);

      const vehicles = vehicleIds.length
        ? await Vehicle.find({ vehicle_id: { $in: vehicleIds } })
          .select('vehicle_id vehicle_number vehicle_type route_name capacity current_status assigned_driver_id end_user_ids')
          .lean()
        : [];

      const vehicleMap = new Map(vehicles.map((vehicle) => [vehicle.vehicle_id, vehicle]));

      const driverIds = vehicles
        .map((vehicle) => vehicle.assigned_driver_id)
        .filter((id, index, array) => id && array.indexOf(id) === index);

      const driverUsers = driverIds.length
        ? await User.find({ user_id: { $in: driverIds }, role_id: 3 })
          .select('user_id name email phone_number assigned_vehicle_id status')
          .lean()
        : [];

      const driverProfiles = driverIds.length
        ? await Driver.find({ user_id: { $in: driverIds } })
          .select('driver_id user_id assigned_vehicle_id license_number license_expiry status')
          .lean()
        : [];

      const driverUserMap = new Map(driverUsers.map((user) => [user.user_id, user]));
      const driverProfileMap = new Map(driverProfiles.map((profile) => [profile.user_id, profile]));

      const data = tracking.map((entry) => {
        const vehicle = entry.vehicle_id ? vehicleMap.get(entry.vehicle_id) || null : null;
        const driver = vehicle?.assigned_driver_id ? driverUserMap.get(vehicle.assigned_driver_id) || null : null;
        const driverProfile = driver?.user_id ? driverProfileMap.get(driver.user_id) || null : null;
        return {
          ...entry,
          vehicle,
          driver: driver
            ? {
              ...driver,
              driver_profile: driverProfile || null
            }
            : null
        };
      });

      res.status(200).json({
        error: false,
        message: 'Live tracking data retrieved successfully',
        data
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
          name,
          email,
          phone_number,
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
      const drivers = await User.find({ operator_id, role_id: 3, status: true }).lean();
      const driverProfiles = await Driver.find({ operator_id }).lean();

      const profileMap = new Map();
      driverProfiles.forEach((profile) => {
        profileMap.set(profile.user_id, profile);
      });

      const assignedVehicleIds = drivers
        .map((driver) => driver.assigned_vehicle_id)
        .filter((id, index, array) => id && array.indexOf(id) === index);

      const vehicleRecords = assignedVehicleIds.length
        ? await Vehicle.find({ vehicle_id: { $in: assignedVehicleIds } })
          .select('vehicle_id vehicle_number vehicle_type route_name capacity current_status assigned_driver_id end_user_ids')
          .lean()
        : [];

      const vehicleMap = new Map(vehicleRecords.map((vehicle) => [vehicle.vehicle_id, vehicle]));

      const data = drivers.map((driver) => ({
        ...driver,
        driver_profile: profileMap.get(driver.user_id) || null,
        assigned_vehicle: driver.assigned_vehicle_id ? vehicleMap.get(driver.assigned_vehicle_id) || null : null
      }));

      res.status(200).json({
        error: false,
        message: 'Drivers retrieved successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDriverById(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const driverProfile = await Driver.findOne({ driver_id: req.params.driverId, operator_id });

      if (!driverProfile) {
        throw new CustomError('Driver not found', 404);
      }

      const driver = await User.findOne({ user_id: driverProfile.user_id, operator_id, role_id: 3 });

      if (!driver) {
        throw new CustomError('Driver not found', 404);
      }

      let assignedVehicle = null;

      if (driver.assigned_vehicle_id) {
        assignedVehicle = await Vehicle.findOne({ vehicle_id: driver.assigned_vehicle_id, operator_id })
          .select('vehicle_id vehicle_number vehicle_type route_name capacity current_status assigned_driver_id end_user_ids')
          .lean();
      }

      res.status(200).json({
        error: false,
        message: 'Driver retrieved successfully',
        data: { ...driver.toObject(), driver_profile: driverProfile.toObject(), assigned_vehicle: assignedVehicle }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateDriver(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const { name, phone_number, license_number, license_expiry, assigned_vehicle_id } = req.body;

      const driverProfile = await Driver.findOne({ driver_id: req.params.driverId, operator_id });

      if (!driverProfile) {
        throw new CustomError('Driver not found', 404);
      }

      if (typeof phone_number !== 'undefined') {
        const existingUserWithPhone = await User.findOne({ phone_number, user_id: { $ne: driverProfile.user_id } });
        if (existingUserWithPhone) {
          throw new CustomError('Phone number already in use', 409);
        }
      }

      const userUpdate = {};
      if (typeof name !== 'undefined') userUpdate.name = name;
      if (typeof phone_number !== 'undefined') userUpdate.phone_number = phone_number;
      if (typeof license_number !== 'undefined') userUpdate.license_number = license_number;
      if (typeof license_expiry !== 'undefined') userUpdate.license_expiry = license_expiry;
      if (typeof assigned_vehicle_id !== 'undefined') userUpdate.assigned_vehicle_id = assigned_vehicle_id;

      const driver = await User.findOneAndUpdate(
        { user_id: driverProfile.user_id, operator_id, role_id: 3 },
        userUpdate,
        { new: true }
      );

      if (!driver) {
        throw new CustomError('Driver not found', 404);
      }

      const profileUpdate = {
        user_id: driver.user_id,
        operator_id,
        name: driver.name,
        email: driver.email,
        phone_number: driver.phone_number,
        status: driver.status
      };
      if (typeof assigned_vehicle_id !== 'undefined') profileUpdate.assigned_vehicle_id = assigned_vehicle_id;
      if (typeof license_number !== 'undefined') profileUpdate.license_number = license_number;
      if (typeof license_expiry !== 'undefined') profileUpdate.license_expiry = license_expiry;

      const updatedProfile = await Driver.findOneAndUpdate(
        { driver_id: req.params.driverId, operator_id },
        profileUpdate,
        { upsert: true, new: true }
      );

      res.status(200).json({
        error: false,
        message: 'Driver updated successfully',
        data: { ...driver.toObject(), driver_profile: updatedProfile ? updatedProfile.toObject() : null }
      });
    } catch (error) {
      next(error);
    }
  }

  static async deactivateDriver(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const driverProfile = await Driver.findOne({ driver_id: req.params.driverId, operator_id });

      if (!driverProfile) {
        throw new CustomError('Driver not found', 404);
      }

      const driver = await User.findOneAndUpdate(
        { user_id: driverProfile.user_id, operator_id, role_id: 3 },
        { status: false },
        { new: true }
      );

      if (!driver) {
        throw new CustomError('Driver not found', 404);
      }

      const updatedProfile = await Driver.findOneAndUpdate(
        { driver_id: req.params.driverId, operator_id },
        { status: false },
        { new: true }
      );

      res.status(200).json({
        error: false,
        message: 'Driver deactivated successfully',
        data: { ...driver.toObject(), driver_profile: updatedProfile ? updatedProfile.toObject() : null }
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
            name,
            email,
            phone_number,
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

      const userRecord = await UserService.createUser({
        name,
        email,
        phone_number,
        password,
        role_id: 4,
        operator_id
      });

      let endUserProfile;
      try {
        endUserProfile = await EndUser.create({
          user_id: userRecord.user_id,
          operator_id,
          sos_contact,
          pickup_location,
          dropoff_location
        });
        await User.updateOne({ user_id: userRecord.user_id }, { end_user_id: endUserProfile.end_user_id });
        userRecord.end_user_id = endUserProfile.end_user_id;
      } catch (creationError) {
        await User.deleteOne({ user_id: userRecord.user_id });
        throw creationError;
      }

      await sendCredentialsEmail(email, name, password, 4);

      res.status(201).json({
        error: false,
        message: 'End-user created successfully',
        data: {
          user: userRecord.toObject(),
          end_user: endUserProfile.toObject(),
          password
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEndUsers(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const [userRecords, endUserProfiles] = await Promise.all([
        User.find({ operator_id, role_id: 4, status: true }).lean(),
        EndUser.find({ operator_id, status: true }).lean()
      ]);

      const profileMap = new Map();
      endUserProfiles.forEach((profile) => {
        profileMap.set(profile.user_id, profile);
      });

      const assignedVehicleIds = userRecords
        .map((record) => record.assigned_vehicle_id)
        .filter((id, index, array) => id && array.indexOf(id) === index);

      const vehicleRecords = assignedVehicleIds.length
        ? await Vehicle.find({ vehicle_id: { $in: assignedVehicleIds } })
          .select('vehicle_id vehicle_number vehicle_type route_name capacity current_status assigned_driver_id end_user_ids')
          .lean()
        : [];

      const vehicleMap = new Map(vehicleRecords.map((vehicle) => [vehicle.vehicle_id, vehicle]));

      const driverIds = vehicleRecords
        .map((vehicle) => vehicle.assigned_driver_id)
        .filter((id, index, array) => id && array.indexOf(id) === index);

      const driverUsers = driverIds.length
        ? await User.find({ user_id: { $in: driverIds }, role_id: 3 })
          .select('user_id name email phone_number assigned_vehicle_id status')
          .lean()
        : [];

      const driverProfiles = driverIds.length
        ? await Driver.find({ user_id: { $in: driverIds }, operator_id })
          .select('driver_id user_id assigned_vehicle_id license_number license_expiry status')
          .lean()
        : [];

      const driverUserMap = new Map(driverUsers.map((user) => [user.user_id, user]));
      const driverProfileMap = new Map(driverProfiles.map((profile) => [profile.user_id, profile]));

      const data = userRecords.map((record) => {
        const profile = profileMap.get(record.user_id) || null;
        const assignedVehicle = record.assigned_vehicle_id
          ? vehicleMap.get(record.assigned_vehicle_id) || null
          : null;

        if (assignedVehicle?.assigned_driver_id) {
          const driverUser = driverUserMap.get(assignedVehicle.assigned_driver_id) || null;
          if (driverUser) {
            const driverProfile = driverProfileMap.get(assignedVehicle.assigned_driver_id) || null;
            assignedVehicle.driver = {
              ...driverUser,
              driver_profile: driverProfile
            };
          }
        }

        return {
          ...record,
          end_user_profile: profile ? profile.toObject ? profile.toObject() : profile : null,
          end_user_reference: profile?.end_user_id || null,
          assigned_vehicle: assignedVehicle
        };
      });

      res.status(200).json({
        error: false,
        message: 'End-users retrieved successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEndUserById(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const identifier = req.params.userId;

      const endUserProfile = await EndUser.findOne({
        operator_id,
        $or: [{ user_id: identifier }, { end_user_id: identifier }]
      });

      if (!endUserProfile) {
        throw new CustomError('End-user not found', 404);
      }

      const endUser = await User.findOne({ user_id: endUserProfile.user_id, operator_id, role_id: 4 });

      if (!endUser) {
        throw new CustomError('End-user not found', 404);
      }

      const persona = endUser.toObject();
      persona.end_user_id = endUserProfile.end_user_id;

      let assignedVehicle = null;

      if (persona.assigned_vehicle_id) {
        assignedVehicle = await Vehicle.findOne({
          vehicle_id: persona.assigned_vehicle_id,
          operator_id
        })
          .select(
            'vehicle_id vehicle_number vehicle_type route_name capacity current_status assigned_driver_id end_user_ids'
          )
          .lean();

        if (assignedVehicle?.assigned_driver_id) {
          const driverUser = await User.findOne({ user_id: assignedVehicle.assigned_driver_id, role_id: 3 })
            .select('user_id name email phone_number assigned_vehicle_id status')
            .lean();

          if (driverUser) {
            const driverProfile = await Driver.findOne({ user_id: driverUser.user_id, operator_id })
              .select('driver_id user_id assigned_vehicle_id license_number license_expiry status')
              .lean();

            assignedVehicle.driver = {
              ...driverUser,
              driver_profile: driverProfile || null
            };
          }
        }
      }

      res.status(200).json({
        error: false,
        message: 'End-user retrieved successfully',
        data: { ...persona, end_user_profile: endUserProfile.toObject(), assigned_vehicle: assignedVehicle }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateEndUser(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const { name, phone_number, sos_contact, pickup_location, dropoff_location } = req.body;
      const identifier = req.params.userId;

      const existingEndUser = await EndUser.findOne({
        operator_id,
        $or: [{ user_id: identifier }, { end_user_id: identifier }]
      });

      if (!existingEndUser) {
        throw new CustomError('End-user not found', 404);
      }

      const targetUserId = existingEndUser.user_id;

      const [endUser, endUserProfile] = await Promise.all([
        User.findOneAndUpdate(
          { user_id: targetUserId, operator_id, role_id: 4 },
          { name, phone_number },
          { new: true }
        ),
        EndUser.findOneAndUpdate(
          { user_id: targetUserId, operator_id },
          { sos_contact, pickup_location, dropoff_location },
          { new: true }
        )
      ]);

      if (!endUser || !endUserProfile) {
        throw new CustomError('End-user not found', 404);
      }

      const persona = endUser.toObject();
      persona.end_user_id = endUserProfile.end_user_id;

      res.status(200).json({
        error: false,
        message: 'End-user updated successfully',
        data: { ...persona, end_user_profile: endUserProfile.toObject() }
      });
    } catch (error) {
      next(error);
    }
  }

  static async deactivateEndUser(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const identifier = req.params.userId;

      const existingEndUser = await EndUser.findOne({
        operator_id,
        $or: [{ user_id: identifier }, { end_user_id: identifier }]
      });

      if (!existingEndUser) {
        throw new CustomError('End-user not found', 404);
      }

      const targetUserId = existingEndUser.user_id;

      const [endUser, endUserProfile] = await Promise.all([
        User.findOneAndUpdate(
          { user_id: targetUserId, operator_id, role_id: 4 },
          { status: false },
          { new: true }
        ),
        EndUser.findOneAndUpdate(
          { user_id: targetUserId, operator_id },
          { status: false },
          { new: true }
        )
      ]);

      if (!endUser || !endUserProfile) {
        throw new CustomError('End-user not found', 404);
      }

      const persona = endUser.toObject();
      persona.end_user_id = endUserProfile.end_user_id;

      res.status(200).json({
        error: false,
        message: 'End-user deactivated successfully',
        data: {
          user: persona,
          end_user_profile: endUserProfile.toObject()
        }
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

        let userRecord = null;
        let endUserProfile = null;

        try {
          userRecord = await UserService.createUser({
            name,
            email,
            phone_number,
            password,
            role_id: 4,
            operator_id
          });

          endUserProfile = await EndUser.create({
            user_id: userRecord.user_id,
            operator_id,
            sos_contact,
            pickup_location,
            dropoff_location
          });

          await User.updateOne({ user_id: userRecord.user_id }, { end_user_id: endUserProfile.end_user_id });
          userRecord.end_user_id = endUserProfile.end_user_id;

          await sendCredentialsEmail(email, name, password, 4);

          createdEndUsers.push({
            user: userRecord,
            end_user: endUserProfile
          });
          credentials.push({
            email,
            password,
            name
          });
        } catch (err) {
          if (userRecord && !endUserProfile) {
            await User.deleteOne({ user_id: userRecord.user_id });
          }
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

  static async getDevices(req, res, next) {
    try {
      const { identifiers, operatorIds } = await resolveOperatorContext(req.user);
      const devices = identifiers.length
        ? await Device.find({ assigned_operator_id: { $in: identifiers } }).lean()
        : [];

      if (!devices.length) {
        return res.status(200).json({
          error: false,
          message: 'Devices retrieved successfully',
          data: []
        });
      }

      const vehicleIds = devices
        .map((device) => device.assigned_vehicle_id)
        .filter((id) => Boolean(id));

      const vehicleMap = new Map();
      const driverMap = new Map();

      if (vehicleIds.length) {
        const vehicles = await Vehicle.find({ vehicle_id: { $in: vehicleIds } })
          .select('vehicle_id vehicle_number vehicle_type route_name assigned_driver_id assigned_device_id')
          .lean();

        vehicles.forEach((vehicle) => {
          vehicleMap.set(vehicle.vehicle_id, vehicle);
        });

        const driverIds = vehicles
          .map((vehicle) => vehicle.assigned_driver_id)
          .filter((id) => Boolean(id));

        if (driverIds.length) {
          const driverUsers = await User.find({ user_id: { $in: driverIds }, role_id: 3 })
            .select('user_id name email phone_number assigned_vehicle_id status')
            .lean();
          driverUsers.forEach((driver) => {
            driverMap.set(driver.user_id, driver);
          });

          const driverProfiles = await Driver.find({ user_id: { $in: driverIds } })
            .select('driver_id user_id assigned_vehicle_id license_number license_expiry status')
            .lean();
          driverProfiles.forEach((profile) => {
            const existing = driverMap.get(profile.user_id) || {};
            driverMap.set(profile.user_id, {
              ...existing,
              driver_profile: profile
            });
          });
        }
      }

      const data = devices.map((device) => {
        const vehicle = device.assigned_vehicle_id ? vehicleMap.get(device.assigned_vehicle_id) || null : null;
        const driver = vehicle?.assigned_driver_id ? driverMap.get(vehicle.assigned_driver_id) || null : null;
        return {
          ...device,
          assigned_vehicle: vehicle,
          assigned_driver: driver
        };
      });

      res.status(200).json({
        error: false,
        message: 'Devices retrieved successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDeviceById(req, res, next) {
    try {
      const { identifiers, operatorIds } = await resolveOperatorContext(req.user);

      const device = await Device.findOne({ device_id: req.params.deviceId, assigned_operator_id: { $in: identifiers } }).lean();

      if (!device) {
        throw new CustomError('Device not found', 404);
      }

      let assignedVehicle = null;
      let assignedDriver = null;

      if (device.assigned_vehicle_id) {
        assignedVehicle = await Vehicle.findOne({ vehicle_id: device.assigned_vehicle_id })
          .select('vehicle_id vehicle_number vehicle_type route_name capacity current_status assigned_driver_id end_user_ids')
          .lean();

        if (assignedVehicle?.assigned_driver_id) {
          assignedDriver = await User.findOne({ user_id: assignedVehicle.assigned_driver_id, role_id: 3 })
            .select('user_id name email phone_number assigned_vehicle_id status')
            .lean();

          if (assignedDriver) {
            const driverProfile = await Driver.findOne({ user_id: assignedDriver.user_id, operator_id: device.assigned_operator_id })
              .select('driver_id user_id assigned_vehicle_id license_number license_expiry status')
              .lean();

            assignedDriver.driver_profile = driverProfile || null;
          }
        }
      }

      res.status(200).json({
        error: false,
        message: 'Device retrieved successfully',
        data: {
          ...device,
          assigned_vehicle: assignedVehicle,
          assigned_driver: assignedDriver
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateDevice(req, res, next) {
    try {
      const { identifiers } = await resolveOperatorContext(req.user);
      const { device_name, sim_number, model } = req.body;

      const device = await Device.findOneAndUpdate(
        { device_id: req.params.deviceId, assigned_operator_id: { $in: identifiers } },
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
      const { identifiers } = await resolveOperatorContext(req.user);
      const device = await Device.findOneAndUpdate(
        { device_id: req.params.deviceId, assigned_operator_id: { $in: identifiers } },
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
      const { identifiers, operatorIds } = await resolveOperatorContext(req.user);
      const assignmentOperatorId = operatorIds[0] || req.user.operator_id || null;

      if (!Array.isArray(device_ids) || !device_ids.length || !vehicle_id) {
        throw new CustomError('Device IDs array and vehicle ID are required', 400);
      }

      const assignments = [];

      for (const device_id of device_ids) {
        const device = await Device.findOneAndUpdate(
          { device_id, assigned_operator_id: { $in: identifiers } },
          { assigned_operator_id: assignmentOperatorId, assigned_vehicle_id: vehicle_id, assigned_date: new Date() },
          { new: true }
        );

        if (device) {
          await Vehicle.updateOne({ vehicle_id }, { assigned_device_id: device_id });
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

      let assignedDriverUser = null;
      let assignedDriverProfile = null;

      if (driver_id) {
        assignedDriverUser = await User.findOne({ user_id: driver_id, operator_id, role_id: 3 })
          .select('user_id name email phone_number assigned_vehicle_id status')
          .lean();

        if (!assignedDriverUser) {
          assignedDriverProfile = await Driver.findOne({ driver_id, operator_id }).lean();
          if (!assignedDriverProfile) {
            throw new CustomError('Driver not found', 404);
          }

          assignedDriverUser = await User.findOne({ user_id: assignedDriverProfile.user_id, operator_id, role_id: 3 })
            .select('user_id name email phone_number assigned_vehicle_id status')
            .lean();

          if (!assignedDriverUser) {
            throw new CustomError('Driver not found', 404);
          }
        } else {
          assignedDriverProfile = await Driver.findOne({ user_id: assignedDriverUser.user_id, operator_id }).lean();
        }

        if (!assignedDriverProfile) {
          assignedDriverProfile = await Driver.findOne({ user_id: assignedDriverUser.user_id, operator_id }).lean();
          if (!assignedDriverProfile) {
            throw new CustomError('Driver profile not found', 404);
          }
        }

        if (assignedDriverUser.assigned_vehicle_id) {
          throw new CustomError('Driver is already assigned to another vehicle', 409);
        }
      }

      const vehicle = new Vehicle({
        vehicle_number,
        operator_id,
        vehicle_type: vehicle_type || 'bus',
        route_name,
        capacity: capacity || 0,
        assigned_driver_id: assignedDriverUser ? assignedDriverUser.user_id : null,
        assigned_device_id: null,
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

      if (assignedDriverUser) {
        await Promise.all([
          User.updateOne({ user_id: assignedDriverUser.user_id }, { assigned_vehicle_id: vehicle.vehicle_id }),
          Driver.updateOne({ user_id: assignedDriverUser.user_id, operator_id }, { assigned_vehicle_id: vehicle.vehicle_id })
        ]);
      }

      const vehicleData = vehicle.toObject();
      const driverData = assignedDriverUser
        ? {
          ...assignedDriverUser,
          driver_profile: assignedDriverProfile || null
        }
        : null;

      res.status(201).json({
        error: false,
        message: 'Vehicle created successfully',
        data: {
          ...vehicleData,
          driver: driverData
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVehicles(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const vehicles = await Vehicle.find({ operator_id, status: true }).lean();

      const driverIds = vehicles
        .map((vehicle) => vehicle.assigned_driver_id)
        .filter((id) => Boolean(id));

      const driverUsers = driverIds.length
        ? await User.find({ user_id: { $in: driverIds }, role_id: 3 })
          .select('user_id name email phone_number assigned_vehicle_id status')
          .lean()
        : [];

      const driverProfiles = driverIds.length
        ? await Driver.find({ user_id: { $in: driverIds }, operator_id })
          .select('driver_id user_id assigned_vehicle_id license_number license_expiry status')
          .lean()
        : [];

      const endUserIds = vehicles
        .flatMap((vehicle) => Array.isArray(vehicle.end_user_ids) ? vehicle.end_user_ids : [])
        .filter((id, index, array) => array.indexOf(id) === index);

      const endUserProfiles = endUserIds.length
        ? await EndUser.find({ operator_id, end_user_id: { $in: endUserIds } }).lean()
        : [];

      const endUserUserIds = endUserProfiles
        .map((profile) => profile.user_id)
        .filter((id, index, array) => id && array.indexOf(id) === index);

      const endUserUsers = endUserUserIds.length
        ? await User.find({ user_id: { $in: endUserUserIds }, role_id: 4 })
          .select('user_id name email phone_number assigned_vehicle_id status')
          .lean()
        : [];

      const driverUserMap = new Map(driverUsers.map((user) => [user.user_id, user]));
      const driverProfileMap = new Map(driverProfiles.map((profile) => [profile.user_id, profile]));
      const endUserProfileMap = new Map(endUserProfiles.map((profile) => [profile.end_user_id, profile]));
      const endUserUserMap = new Map(endUserUsers.map((user) => [user.user_id, user]));

      const data = vehicles.map((vehicle) => {
        const driver = driverUserMap.has(vehicle.assigned_driver_id)
          ? {
            ...driverUserMap.get(vehicle.assigned_driver_id),
            driver_profile: driverProfileMap.get(vehicle.assigned_driver_id) || null
          }
          : null;

        const endUsers = Array.isArray(vehicle.end_user_ids)
          ? vehicle.end_user_ids
            .map((endUserId) => {
              const profile = endUserProfileMap.get(endUserId);
              if (!profile) {
                return null;
              }
              const userRecord = profile.user_id ? endUserUserMap.get(profile.user_id) : null;
              return {
                end_user_id: profile.end_user_id,
                user_id: profile.user_id,
                name: userRecord ? userRecord.name : null,
                email: userRecord ? userRecord.email : null,
                phone_number: userRecord ? userRecord.phone_number : null,
                status: profile.status,
                pickup_location: profile.pickup_location,
                dropoff_location: profile.dropoff_location
              };
            })
            .filter(Boolean)
          : [];

        return {
          ...vehicle,
          driver,
          end_users: endUsers
        };
      });

      res.status(200).json({
        error: false,
        message: 'Vehicles retrieved successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVehicleById(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const vehicle = await Vehicle.findOne({ vehicle_id: req.params.vehicleId, operator_id }).lean();

      if (!vehicle) {
        throw new CustomError('Vehicle not found', 404);
      }

      let driver = null;

      if (vehicle.assigned_driver_id) {
        const driverUser = await User.findOne({ user_id: vehicle.assigned_driver_id, role_id: 3 })
          .select('user_id name email phone_number assigned_vehicle_id status')
          .lean();

        if (driverUser) {
          const driverProfile = await Driver.findOne({ user_id: driverUser.user_id, operator_id })
            .select('driver_id user_id assigned_vehicle_id license_number license_expiry status')
            .lean();

          driver = {
            ...driverUser,
            driver_profile: driverProfile || null
          };
        }
      }

      const endUsers = Array.isArray(vehicle.end_user_ids) && vehicle.end_user_ids.length
        ? await EndUser.find({ operator_id, end_user_id: { $in: vehicle.end_user_ids } }).lean()
        : [];

      const endUserUserIds = endUsers
        .map((profile) => profile.user_id)
        .filter((id, index, array) => id && array.indexOf(id) === index);

      const endUserUsers = endUserUserIds.length
        ? await User.find({ user_id: { $in: endUserUserIds }, role_id: 4 })
          .select('user_id name email phone_number assigned_vehicle_id status')
          .lean()
        : [];

      const endUserUserMap = new Map(endUserUsers.map((user) => [user.user_id, user]));

      const endUserDetails = endUsers.map((profile) => {
        const userRecord = profile.user_id ? endUserUserMap.get(profile.user_id) : null;
        return {
          end_user_id: profile.end_user_id,
          user_id: profile.user_id,
          name: userRecord ? userRecord.name : null,
          email: userRecord ? userRecord.email : null,
          phone_number: userRecord ? userRecord.phone_number : null,
          status: profile.status,
          pickup_location: profile.pickup_location,
          dropoff_location: profile.dropoff_location
        };
      });

      res.status(200).json({
        error: false,
        message: 'Vehicle retrieved successfully',
        data: {
          ...vehicle,
          driver,
          end_users: endUserDetails
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateVehicle(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
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

      const vehicle = await Vehicle.findOne({ vehicle_id: req.params.vehicleId, operator_id });

      if (!vehicle) {
        throw new CustomError('Vehicle not found', 404);
      }

      const previousDriverId = vehicle.assigned_driver_id || null;
      let assignedDriverUser = null;
      let assignedDriverProfile = null;

      if (driver_id === null) {
        vehicle.assigned_driver_id = null;
      } else if (typeof driver_id !== 'undefined') {
        assignedDriverUser = await User.findOne({ user_id: driver_id, operator_id, role_id: 3 })
          .select('user_id name email phone_number assigned_vehicle_id status')
          .lean();

        if (!assignedDriverUser) {
          assignedDriverProfile = await Driver.findOne({ driver_id, operator_id }).lean();
          if (!assignedDriverProfile) {
            throw new CustomError('Driver not found', 404);
          }

          assignedDriverUser = await User.findOne({ user_id: assignedDriverProfile.user_id, operator_id, role_id: 3 })
            .select('user_id name email phone_number assigned_vehicle_id status')
            .lean();

          if (!assignedDriverUser) {
            throw new CustomError('Driver not found', 404);
          }
        } else {
          assignedDriverProfile = await Driver.findOne({ user_id: assignedDriverUser.user_id, operator_id }).lean();
        }

        if (!assignedDriverProfile) {
          assignedDriverProfile = await Driver.findOne({ user_id: assignedDriverUser.user_id, operator_id }).lean();
          if (!assignedDriverProfile) {
            throw new CustomError('Driver profile not found', 404);
          }
        }

        if (
          assignedDriverUser.assigned_vehicle_id &&
          assignedDriverUser.assigned_vehicle_id !== vehicle.vehicle_id
        ) {
          throw new CustomError('Driver is already assigned to another vehicle', 409);
        }

        vehicle.assigned_driver_id = assignedDriverUser.user_id;
      }

      if (typeof vehicle_number !== 'undefined') {
        vehicle.vehicle_number = vehicle_number;
      }

      if (typeof vehicle_type !== 'undefined') {
        vehicle.vehicle_type = vehicle_type;
      }

      if (typeof route_name !== 'undefined') {
        vehicle.route_name = route_name;
      }

      if (typeof capacity !== 'undefined') {
        vehicle.capacity = capacity;
      }

      if (typeof registration_number !== 'undefined') {
        vehicle.registration_number = registration_number;
      }

      if (typeof chassis_number !== 'undefined') {
        vehicle.chassis_number = chassis_number;
      }

      if (typeof color !== 'undefined') {
        vehicle.color = color;
      }

      if (typeof seating_capacity !== 'undefined') {
        vehicle.seating_capacity = seating_capacity;
      }

      if (typeof route_points !== 'undefined') {
        vehicle.route_points = route_points;
      }

      if (typeof standing_location !== 'undefined') {
        vehicle.standing_location = standing_location;
      }

      await vehicle.save();

      const updates = [];

      if (previousDriverId && previousDriverId !== vehicle.assigned_driver_id) {
        updates.push(
          User.updateOne({ user_id: previousDriverId }, { assigned_vehicle_id: null })
        );
        updates.push(
          Driver.updateOne({ user_id: previousDriverId, operator_id }, { assigned_vehicle_id: null })
        );
      }

      if (vehicle.assigned_driver_id && vehicle.assigned_driver_id !== previousDriverId) {
        updates.push(
          User.updateOne({ user_id: vehicle.assigned_driver_id }, { assigned_vehicle_id: vehicle.vehicle_id })
        );
        updates.push(
          Driver.updateOne({ user_id: vehicle.assigned_driver_id, operator_id }, { assigned_vehicle_id: vehicle.vehicle_id })
        );
      }

      if (updates.length) {
        await Promise.all(updates);
      }

      const driverUser = vehicle.assigned_driver_id
        ? await User.findOne({ user_id: vehicle.assigned_driver_id, role_id: 3 })
          .select('user_id name email phone_number assigned_vehicle_id status')
          .lean()
        : null;

      const driverProfile = driverUser
        ? await Driver.findOne({ user_id: driverUser.user_id, operator_id })
          .select('driver_id user_id assigned_vehicle_id license_number license_expiry status')
          .lean()
        : null;

      res.status(200).json({
        error: false,
        message: 'Vehicle updated successfully',
        data: {
          ...vehicle.toObject(),
          driver: driverUser
            ? {
              ...driverUser,
              driver_profile: driverProfile || null
            }
            : null
        }
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
      const { driver_id: driverIdentifier, vehicle_id } = req.body;

      if (!driverIdentifier || !vehicle_id) {
        throw new CustomError('Driver ID and Vehicle ID are required', 400);
      }

      const vehicle = await Vehicle.findOne({ vehicle_id, operator_id });
      if (!vehicle) {
        throw new CustomError('Vehicle not found', 404);
      }

      let driverUser = await User.findOne({ user_id: driverIdentifier, operator_id, role_id: 3 });
      let driverProfile = null;

      if (!driverUser) {
        driverProfile = await Driver.findOne({ driver_id: driverIdentifier, operator_id });
        if (!driverProfile) {
          throw new CustomError('Driver not found', 404);
        }

        driverUser = await User.findOne({ user_id: driverProfile.user_id, operator_id, role_id: 3 });
        if (!driverUser) {
          throw new CustomError('Driver not found', 404);
        }
      } else {
        driverProfile = await Driver.findOne({ user_id: driverUser.user_id, operator_id });
      }

      const previousDriverId = vehicle.assigned_driver_id || null;

      const updatePromises = [
        Vehicle.findOneAndUpdate(
          { vehicle_id: vehicle.vehicle_id, operator_id },
          { assigned_driver_id: driverUser.user_id },
          { new: true }
        ),
        User.updateOne({ user_id: driverUser.user_id }, { assigned_vehicle_id: vehicle.vehicle_id }),
        Driver.updateOne({ user_id: driverUser.user_id, operator_id }, { assigned_vehicle_id: vehicle.vehicle_id })
      ];

      if (previousDriverId && previousDriverId !== driverUser.user_id) {
        updatePromises.push(User.updateOne({ user_id: previousDriverId }, { assigned_vehicle_id: null }));
        updatePromises.push(Driver.updateOne({ user_id: previousDriverId, operator_id }, { assigned_vehicle_id: null }));
      }

      const [updatedVehicle] = await Promise.all(updatePromises);

      const [updatedDriver, updatedProfile] = await Promise.all([
        User.findOne({ user_id: driverUser.user_id }),
        Driver.findOne({ user_id: driverUser.user_id, operator_id })
      ]);

      res.status(200).json({
        error: false,
        message: 'Driver assigned to vehicle successfully',
        data: {
          driver: {
            user_id: updatedDriver.user_id,
            driver_id: updatedProfile?.driver_id || driverProfile?.driver_id || null,
            name: updatedDriver.name
          },
          vehicle: {
            vehicle_id: updatedVehicle?.vehicle_id || vehicle.vehicle_id,
            vehicle_number: updatedVehicle?.vehicle_number || vehicle.vehicle_number
          },
          assignedAt: new Date(),
          assigned_vehicle_id: updatedDriver.assigned_vehicle_id
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async assignEndUserToVehicle(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const {
        end_user_id: endUserIdFromBody,
        endUserId,
        user_id: userIdFromBody,
        vehicle_id,
        vehicleId
      } = req.body;

      const endUserIdentifier = endUserIdFromBody || endUserId || userIdFromBody;
      const targetVehicleId = vehicle_id || vehicleId;

      if (!endUserIdentifier || !targetVehicleId) {
        throw new CustomError('End-user ID and Vehicle ID are required', 400);
      }

      const vehicle = await Vehicle.findOne({ vehicle_id: targetVehicleId, operator_id });
      if (!vehicle) {
        throw new CustomError('Vehicle not found', 404);
      }

      const endUserProfile = await EndUser.findOne({
        operator_id,
        $or: [{ end_user_id: endUserIdentifier }, { user_id: endUserIdentifier }]
      });

      if (!endUserProfile) {
        throw new CustomError('End-user not found', 404);
      }

      if (!endUserProfile.status) {
        throw new CustomError('End-user is inactive', 409);
      }

      const endUserUser = await User.findOne({ user_id: endUserProfile.user_id, operator_id, role_id: 4 });

      if (!endUserUser) {
        throw new CustomError('End-user not found', 404);
      }

      const previousVehicleId = endUserProfile.assigned_vehicle_id || null;

      if (previousVehicleId && previousVehicleId !== vehicle.vehicle_id) {
        throw new CustomError('End-user is already assigned to another vehicle', 409);
      }

      await Promise.all([
        EndUser.updateOne(
          { end_user_id: endUserProfile.end_user_id, operator_id },
          { assigned_vehicle_id: vehicle.vehicle_id }
        ),
        User.updateOne(
          { user_id: endUserProfile.user_id },
          { assigned_vehicle_id: vehicle.vehicle_id }
        ),
        Vehicle.updateOne(
          { vehicle_id: vehicle.vehicle_id, operator_id },
          { $addToSet: { end_user_ids: endUserProfile.end_user_id } }
        )
      ]);

      const [updatedEndUserProfile, updatedEndUserUser, updatedVehicle] = await Promise.all([
        EndUser.findOne({ end_user_id: endUserProfile.end_user_id }).lean(),
        User.findOne({ user_id: endUserProfile.user_id }).lean(),
        Vehicle.findOne({ vehicle_id: vehicle.vehicle_id, operator_id }).lean()
      ]);

      const aggregatedEndUserIds = Array.isArray(updatedVehicle?.end_user_ids) && updatedVehicle.end_user_ids.length
        ? updatedVehicle.end_user_ids
        : [];

      res.status(200).json({
        error: false,
        message: 'End-user assigned to vehicle successfully',
        data: {
          end_user: {
            user_id: updatedEndUserUser.user_id,
            end_user_id: updatedEndUserProfile.end_user_id,
            name: updatedEndUserUser.name,
            assigned_vehicle_id: updatedEndUserProfile.assigned_vehicle_id
          },
          vehicle: {
            vehicle_id: updatedVehicle.vehicle_id,
            vehicle_number: updatedVehicle.vehicle_number,
            end_user_ids: aggregatedEndUserIds
          },
          assignedAt: new Date()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async unassignEndUserFromVehicle(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const {
        end_user_id: endUserIdFromBody,
        endUserId,
        user_id: userIdFromBody,
        vehicle_id,
        vehicleId
      } = req.body;

      const endUserIdentifier = endUserIdFromBody || endUserId || userIdFromBody;
      const specifiedVehicleId = vehicle_id || vehicleId || null;

      if (!endUserIdentifier) {
        throw new CustomError('End-user ID is required', 400);
      }

      const endUserProfile = await EndUser.findOne({
        operator_id,
        $or: [{ end_user_id: endUserIdentifier }, { user_id: endUserIdentifier }]
      });

      if (!endUserProfile) {
        throw new CustomError('End-user not found', 404);
      }

      const endUserUser = await User.findOne({ user_id: endUserProfile.user_id, operator_id, role_id: 4 });

      if (!endUserUser) {
        throw new CustomError('End-user not found', 404);
      }

      const currentVehicleId = endUserProfile.assigned_vehicle_id || null;

      if (!currentVehicleId) {
        throw new CustomError('End-user is not assigned to any vehicle', 409);
      }

      if (specifiedVehicleId && specifiedVehicleId !== currentVehicleId) {
        throw new CustomError('End-user is not assigned to the specified vehicle', 404);
      }

      await Promise.all([
        EndUser.updateOne(
          { end_user_id: endUserProfile.end_user_id, operator_id },
          { assigned_vehicle_id: null }
        ),
        User.updateOne(
          { user_id: endUserProfile.user_id },
          { assigned_vehicle_id: null }
        ),
        Vehicle.updateOne(
          { vehicle_id: currentVehicleId, operator_id },
          { $pull: { end_user_ids: endUserProfile.end_user_id } }
        )
      ]);

      const [updatedEndUserProfile, updatedVehicle] = await Promise.all([
        EndUser.findOne({ end_user_id: endUserProfile.end_user_id }).lean(),
        Vehicle.findOne({ vehicle_id: currentVehicleId, operator_id }).lean()
      ]);

      const aggregatedEndUserIds = Array.isArray(updatedVehicle?.end_user_ids) && updatedVehicle.end_user_ids.length
        ? updatedVehicle.end_user_ids
        : Array.isArray(updatedVehicle?.assigned_end_user_ids)
          ? updatedVehicle.assigned_end_user_ids
          : [];

      res.status(200).json({
        error: false,
        message: 'End-user unassigned from vehicle successfully',
        data: {
          end_user: {
            user_id: endUserUser.user_id,
            end_user_id: updatedEndUserProfile.end_user_id,
            name: endUserUser.name,
            assigned_vehicle_id: updatedEndUserProfile.assigned_vehicle_id
          },
          vehicle: updatedVehicle
            ? {
              vehicle_id: updatedVehicle.vehicle_id,
              vehicle_number: updatedVehicle.vehicle_number,
              end_user_ids: aggregatedEndUserIds
            }
            : null,
          unassignedAt: new Date()
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
      const { device_id, vehicle_id } = req.body;
      const { identifiers, operatorIds } = await resolveOperatorContext(req.user);
      const assignmentOperatorId = operatorIds[0] || req.user.operator_id || null;

      if (!device_id || !vehicle_id) {
        throw new CustomError('Device ID and Vehicle ID are required', 400);
      }

      const device = await Device.findOne({ device_id, assigned_operator_id: { $in: identifiers.length ? identifiers : [assignmentOperatorId].filter(Boolean) } });

      if (!device) {
        throw new CustomError('Device not found', 404);
      }

      const vehicle = await Vehicle.findOne({ vehicle_id, operator_id: assignmentOperatorId });
      if (!vehicle) {
        throw new CustomError('Vehicle not found', 404);
      }

      const previousOperatorId = device.assigned_operator_id || null;
      const previousVehicleId = device.assigned_vehicle_id || null;

      device.assigned_vehicle_id = vehicle_id;
      device.assigned_operator_id = assignmentOperatorId;
      device.assigned_date = new Date();
      await device.save();

      if (previousVehicleId && previousVehicleId !== vehicle_id) {
        await Vehicle.updateOne({ vehicle_id: previousVehicleId }, { assigned_device_id: null });
      }

      vehicle.assigned_device_id = device_id;
      await vehicle.save();

      res.status(200).json({
        error: false,
        message: 'Device assigned to vehicle successfully',
        data: {
          device,
          vehicle,
          previous_assignment: previousVehicleId || previousOperatorId
            ? {
              operator_id: previousOperatorId,
              vehicle_id: previousVehicleId
            }
            : null
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // ========== PROFILE ==========
  static async getOwnProfile(req, res, next) {
    try {
      const user = await User.findOne({ user_id: req.user.user_id })
        .select('-password -__v')
        .lean();

      if (!user) {
        throw new CustomError('User not found', 404);
      }

      const { operatorIds, primaryOperatorId } = await resolveOperatorContext(req.user);

      const operatorConditions = [];

      if (operatorIds.length) {
        operatorConditions.push({ operator_id: { $in: operatorIds } });
      }

      if (user.operator_id) {
        operatorConditions.push({ operator_id: user.operator_id });
      }

      if (user.email) {
        operatorConditions.push({ email: user.email });
      }

      operatorConditions.push({ admin_user_id: user.user_id });

      const operators = operatorConditions.length
        ? await Operator.find({ $or: operatorConditions })
          .select('-__v')
          .lean()
        : [];

      const uniqueOperators = [];
      const seenOperators = new Set();

      operators.forEach((operator) => {
        if (operator?.operator_id && !seenOperators.has(operator.operator_id)) {
          seenOperators.add(operator.operator_id);
          uniqueOperators.push(operator);
        }
      });

      let primaryOperator = null;

      if (primaryOperatorId && seenOperators.has(primaryOperatorId)) {
        primaryOperator = uniqueOperators.find((operator) => operator.operator_id === primaryOperatorId) || null;
      }

      if (!primaryOperator && user.operator_id) {
        primaryOperator = uniqueOperators.find((operator) => operator.operator_id === user.operator_id) || null;
      }

      if (!primaryOperator && uniqueOperators.length) {
        primaryOperator = uniqueOperators[0];
      }

      const profile = {
        ...user,
        operator_details: primaryOperator,
        associated_operators: uniqueOperators
      };

      res.status(200).json({
        error: false,
        message: 'Profile retrieved successfully',
        data: profile
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
      const totalEndUsers = await EndUser.countDocuments({ operator_id, status: true });

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

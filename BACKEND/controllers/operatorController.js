const mongoose = require('mongoose');
const UserService = require('../services/userService');
const DeviceService = require('../services/deviceService');
const VehicleService = require('../services/vehicleService');
const BulkImportService = require('../services/bulkImportService');
const TransactionService = require('../services/transactionService');
const { CustomError } = require('../middlewares/errorHandler');
const { generateEmailBasedPassword } = require('../utils/passwordGenerator');
const { generateRoutePointId } = require('../utils/uuidUtils');
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

const normalizeRoutePointsPayload = (routePoints) => {
  if (!Array.isArray(routePoints)) {
    return [];
  }

  return routePoints
    .filter((point) => point)
    .map((point, index) => {
      const normalized = { ...point };
      normalized.stop_id = normalized.stop_id || generateRoutePointId();
      normalized.sequence =
        typeof normalized.sequence === 'number' && Number.isFinite(normalized.sequence)
          ? normalized.sequence
          : index + 1;
      normalized.order =
        typeof normalized.order === 'number' && Number.isFinite(normalized.order)
          ? normalized.order
          : index + 1;
      normalized.dwell_target_seconds =
        typeof normalized.dwell_target_seconds === 'number' && Number.isFinite(normalized.dwell_target_seconds)
          ? normalized.dwell_target_seconds
          : 120;
      normalized.sla_arrival_buffer_seconds =
        typeof normalized.sla_arrival_buffer_seconds === 'number' && Number.isFinite(normalized.sla_arrival_buffer_seconds)
          ? normalized.sla_arrival_buffer_seconds
          : 300;
      if (normalized.latitude !== undefined && normalized.latitude !== null) {
        const parsedLatitude = Number(normalized.latitude);
        normalized.latitude = Number.isFinite(parsedLatitude) ? parsedLatitude : null;
      }
      if (normalized.longitude !== undefined && normalized.longitude !== null) {
        const parsedLongitude = Number(normalized.longitude);
        normalized.longitude = Number.isFinite(parsedLongitude) ? parsedLongitude : null;
      }
      return normalized;
    });
};

const buildVehicleIdentifierConditions = (identifier) => {
  if (!identifier) {
    return [];
  }

  const normalizedIdentifier = typeof identifier === 'string' ? identifier.trim() : identifier;

  const conditions = [{ vehicle_id: normalizedIdentifier }];

  if (mongoose.Types.ObjectId.isValid(normalizedIdentifier)) {
    conditions.push({ _id: new mongoose.Types.ObjectId(normalizedIdentifier) });
  }

  return conditions;
};

const findOperatorVehicle = async (operatorId, identifier, options = {}) => {
  const { throwOnMissing = true } = options;
  const conditions = buildVehicleIdentifierConditions(identifier);

  if (!conditions.length) {
    if (throwOnMissing) {
      throw new CustomError('Vehicle identifier is required', 400);
    }
    return null;
  }

  const vehicle = await Vehicle.findOne({ operator_id: operatorId, $or: conditions });

  if (vehicle) {
    return vehicle;
  }

  const globalVehicle = await Vehicle.findOne({ $or: conditions });

  if (!globalVehicle) {
    if (throwOnMissing) {
      throw new CustomError('Vehicle not found', 404);
    }
    return null;
  }

  if (throwOnMissing) {
    throw new CustomError('Vehicle belongs to a different operator', 403);
  }

  return null;
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
        ? Vehicle.countDocuments({
            ...operatorFilter,
            current_status: { $in: ['active', 'en_route', 'at_stop', 'delayed'] },
            status: true
          })
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

      const recentTrackingDocs = deviceIds.length
        ? await TrackingData.find({ device_id: { $in: deviceIds } })
            .sort({ timestamp: -1 })
            .limit(30)
            .lean()
        : [];

      const dedupedTracking = [];
      const seenTrackerIds = new Set();
      const seenVehicleIds = new Set();
      recentTrackingDocs.forEach((entry) => {
        if (!entry) {
          return;
        }
        const trackerId = typeof entry.device_id === 'string' ? entry.device_id.trim() : null;
        const vehicleId = typeof entry.vehicle_id === 'string' ? entry.vehicle_id.trim() : null;
        if (trackerId) {
          if (seenTrackerIds.has(trackerId)) {
            return;
          }
          seenTrackerIds.add(trackerId);
        } else if (vehicleId) {
          if (seenVehicleIds.has(vehicleId)) {
            return;
          }
          seenVehicleIds.add(vehicleId);
        }
        dedupedTracking.push(entry);
      });

      const vehicleIdSet = new Set();
      const trackingDeviceSet = new Set();
      dedupedTracking.forEach((entry) => {
        if (entry?.vehicle_id) {
          vehicleIdSet.add(entry.vehicle_id);
        }
        if (entry?.device_id) {
          trackingDeviceSet.add(entry.device_id);
        }
      });

      let vehicleDocs = [];
      if (vehicleIdSet.size || trackingDeviceSet.size) {
        const vehicleQuery = [];
        if (vehicleIdSet.size) {
          vehicleQuery.push({ vehicle_id: { $in: Array.from(vehicleIdSet) } });
        }
        if (trackingDeviceSet.size) {
          vehicleQuery.push({ assigned_device_id: { $in: Array.from(trackingDeviceSet) } });
        }
        vehicleDocs = vehicleQuery.length
          ? await Vehicle.find({ $or: vehicleQuery })
              .select('vehicle_id vehicle_number assigned_device_id operator_id current_status')
              .lean()
          : [];
      }

      const vehicleById = new Map();
      const vehicleByDevice = new Map();
      vehicleDocs.forEach((vehicle) => {
        if (vehicle?.vehicle_id) {
          vehicleById.set(vehicle.vehicle_id, vehicle);
        }
        if (vehicle?.assigned_device_id) {
          vehicleByDevice.set(vehicle.assigned_device_id, vehicle);
        }
      });

      const recentTracking = dedupedTracking.map((entry) => {
        const trackerId = typeof entry.device_id === 'string' ? entry.device_id : null;
        const vehicleId = typeof entry.vehicle_id === 'string' ? entry.vehicle_id : null;
        const vehicle =
          (vehicleId && vehicleById.get(vehicleId)) ||
          (trackerId && vehicleByDevice.get(trackerId)) ||
          null;
        const timestampValue =
          entry.timestamp instanceof Date ? entry.timestamp : entry.timestamp ? new Date(entry.timestamp) : null;
        const timestampIso =
          timestampValue && !Number.isNaN(timestampValue.getTime()) ? timestampValue.toISOString() : null;
        const speedValue = typeof entry.speed === 'number' ? entry.speed : 0;
        const statusValue = vehicle?.current_status
          ? vehicle.current_status
          : timestampIso
          ? speedValue > 1
            ? 'active'
            : 'idle'
          : 'offline';

        return {
          ...entry,
          vehicle_id: vehicle?.vehicle_id || vehicleId,
          vehicle_number: vehicle?.vehicle_number || entry.vehicle_number || null,
          operator_id: vehicle?.operator_id || entry.operator_id || null,
          device_id: trackerId,
          timestamp: timestampIso,
          speed: speedValue,
          status: statusValue
        };
      });

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
          .select('vehicle_id vehicle_number vehicle_type capacity current_status assigned_driver_id end_user_ids')
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

  static async getOperatorUsers(req, res, next) {
    try {
      const operator_id = req.user.operator_id || req.user.user_id;
      const typeParam = typeof req.query.type === 'string' ? req.query.type.trim().toLowerCase() : 'all';
      const includeDrivers =
        typeParam === 'all' ||
        typeParam === 'drivers' ||
        typeParam === 'driver';
      const includeEndUsers =
        typeParam === 'all' ||
        typeParam === 'end-users' ||
        typeParam === 'endusers' ||
        typeParam === 'end_users' ||
        typeParam === 'enduser' ||
        typeParam === 'end-user';
      if (!includeDrivers && !includeEndUsers) {
        throw new CustomError('Invalid type parameter', 400);
      }
      const driverUsersPromise =
        includeDrivers || includeEndUsers
          ? User.find({ operator_id, role_id: 3 }).lean()
          : Promise.resolve([]);
      const driverProfilesPromise =
        includeDrivers || includeEndUsers
          ? Driver.find({ operator_id }).lean()
          : Promise.resolve([]);
      const endUserUsersPromise = includeEndUsers
        ? User.find({ operator_id, role_id: 4, status: true }).lean()
        : Promise.resolve([]);
      const endUserProfilesPromise = includeEndUsers
        ? EndUser.find({ operator_id, status: true }).lean()
        : Promise.resolve([]);
      const [driverUsers, driverProfiles, endUserUsers, endUserProfiles] = await Promise.all([
        driverUsersPromise,
        driverProfilesPromise,
        endUserUsersPromise,
        endUserProfilesPromise
      ]);
      const driverProfileMap = new Map(driverProfiles.map((profile) => [profile.user_id, profile]));
      const driverUserMap = new Map(driverUsers.map((user) => [user.user_id, user]));
      const vehicleIdSet = new Set();
      driverUsers.forEach((driver) => {
        if (driver?.assigned_vehicle_id) {
          vehicleIdSet.add(driver.assigned_vehicle_id);
        }
      });
      endUserUsers.forEach((user) => {
        if (user?.assigned_vehicle_id) {
          vehicleIdSet.add(user.assigned_vehicle_id);
        }
      });
      const vehicleRecords = vehicleIdSet.size
        ? await Vehicle.find({ vehicle_id: { $in: Array.from(vehicleIdSet) } })
            .select(
              'vehicle_id vehicle_number vehicle_type capacity current_status assigned_driver_id end_user_ids'
            )
            .lean()
        : [];
      const vehicleMap = new Map(vehicleRecords.map((vehicle) => [vehicle.vehicle_id, vehicle]));
      const data = {};
      if (includeDrivers) {
        const drivers = driverUsers
          .filter((driver) => driver.status)
          .map((driver) => {
            const vehicle = driver.assigned_vehicle_id ? vehicleMap.get(driver.assigned_vehicle_id) || null : null;
            const assignedVehicle = vehicle ? { ...vehicle } : null;
            return {
              ...driver,
              driver_profile: driverProfileMap.get(driver.user_id) || null,
              assigned_vehicle: assignedVehicle
            };
          });
        data.drivers = drivers;
      }
      if (includeEndUsers) {
        const endUserProfileMap = new Map(endUserProfiles.map((profile) => [profile.user_id, profile]));
        const endUsers = endUserUsers.map((record) => {
          const profile = endUserProfileMap.get(record.user_id) || null;
          let assignedVehicle = null;
          if (record.assigned_vehicle_id) {
            const vehicle = vehicleMap.get(record.assigned_vehicle_id) || null;
            if (vehicle) {
              assignedVehicle = { ...vehicle };
              if (vehicle.assigned_driver_id) {
                const driverUser = driverUserMap.get(vehicle.assigned_driver_id) || null;
                if (driverUser) {
                  const driverProfile = driverProfileMap.get(vehicle.assigned_driver_id) || null;
                  assignedVehicle.driver = {
                    ...driverUser,
                    driver_profile: driverProfile || null
                  };
                }
              }
            }
          }
          return {
            ...record,
            end_user_profile: profile,
            end_user_reference: profile?.end_user_id || null,
            assigned_vehicle: assignedVehicle
          };
        });
        data.end_users = endUsers;
      }
      res.status(200).json({
        error: false,
        message: 'Operator users retrieved successfully',
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
      
      const data = await User.aggregate([
        { $match: { operator_id, role_id: 3, status: true } },
        { $lookup: { from: 'drivers', localField: 'user_id', foreignField: 'user_id', as: 'driver_profile' } },
        { $unwind: { path: '$driver_profile', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'vehicles', localField: 'assigned_vehicle_id', foreignField: 'vehicle_id', as: 'assigned_vehicle' } },
        { $unwind: { path: '$assigned_vehicle', preserveNullAndEmptyArrays: true } },
        { $project: {
          user_id: 1,
          email: 1,
          name: 1,
          phone_number: 1,
          operator_id: 1,
          role_id: 1,
          assigned_vehicle_id: 1,
          status: 1,
          driver_profile: { $ifNull: ['$driver_profile', null] },
          assigned_vehicle: { $cond: [
            { $eq: ['$assigned_vehicle_id', null] },
            null,
            { vehicle_id: '$assigned_vehicle.vehicle_id', vehicle_number: '$assigned_vehicle.vehicle_number', vehicle_type: '$assigned_vehicle.vehicle_type', capacity: '$assigned_vehicle.capacity', current_status: '$assigned_vehicle.current_status', assigned_driver_id: '$assigned_vehicle.assigned_driver_id', end_user_ids: '$assigned_vehicle.end_user_ids' }
          ] }
        } }
      ]);

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
          .select('vehicle_id vehicle_number vehicle_type capacity current_status assigned_driver_id end_user_ids')
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
      
      const data = await User.aggregate([
        { $match: { operator_id, role_id: 4, status: true } },
        { $lookup: { from: 'endusers', localField: 'user_id', foreignField: 'user_id', as: 'end_user_profile' } },
        { $unwind: { path: '$end_user_profile', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'vehicles', localField: 'assigned_vehicle_id', foreignField: 'vehicle_id', as: 'assigned_vehicle' } },
        { $unwind: { path: '$assigned_vehicle', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'users', localField: 'assigned_vehicle.assigned_driver_id', foreignField: 'user_id', as: 'driver_user' } },
        { $unwind: { path: '$driver_user', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'drivers', localField: 'driver_user.user_id', foreignField: 'user_id', as: 'driver_profile' } },
        { $unwind: { path: '$driver_profile', preserveNullAndEmptyArrays: true } },
        { $project: {
          user_id: 1,
          email: 1,
          name: 1,
          phone_number: 1,
          operator_id: 1,
          role_id: 1,
          assigned_vehicle_id: 1,
          status: 1,
          end_user_profile: { $ifNull: ['$end_user_profile', null] },
          end_user_reference: '$end_user_profile.end_user_id',
          assigned_vehicle: { $cond: [
            { $eq: ['$assigned_vehicle_id', null] },
            null,
            {
              vehicle_id: '$assigned_vehicle.vehicle_id',
              vehicle_number: '$assigned_vehicle.vehicle_number',
              vehicle_type: '$assigned_vehicle.vehicle_type',
              capacity: '$assigned_vehicle.capacity',
              current_status: '$assigned_vehicle.current_status',
              assigned_driver_id: '$assigned_vehicle.assigned_driver_id',
              end_user_ids: '$assigned_vehicle.end_user_ids',
              driver: { $cond: [
                { $eq: ['$assigned_vehicle.assigned_driver_id', null] },
                null,
                {
                  user_id: '$driver_user.user_id',
                  name: '$driver_user.name',
                  email: '$driver_user.email',
                  phone_number: '$driver_user.phone_number',
                  assigned_vehicle_id: '$driver_user.assigned_vehicle_id',
                  status: '$driver_user.status',
                  driver_profile: { $ifNull: ['$driver_profile', null] }
                }
              ] }
            }
          ] }
        } }
      ]);

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
          .select('vehicle_id vehicle_number vehicle_type assigned_driver_id assigned_device_id')
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
          .select('vehicle_id vehicle_number vehicle_type capacity current_status assigned_driver_id end_user_ids')
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
        capacity,
        driver_id,
        registration_number,
        chassis_number,
        color,
        seating_capacity,
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
        capacity: capacity || 0,
        assigned_driver_id: assignedDriverUser ? assignedDriverUser.user_id : null,
        assigned_device_id: null,
        registration_number,
        chassis_number,
        color,
        seating_capacity,
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
        capacity,
        driver_id,
        registration_number,
        chassis_number,
        color,
        seating_capacity,
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

      const vehicle = await findOperatorVehicle(operator_id, vehicle_id);

      let driverUser = await User.findOne({ user_id: driverIdentifier, operator_id, role_id: 3 });
      let driverProfile = null;

      if (!driverUser) {
        driverProfile = await Driver.findOne({
          $or: [
            { driver_id: driverIdentifier },
            { user_id: driverIdentifier }
          ]
        });

        if (driverProfile && driverProfile.operator_id !== operator_id) {
          throw new CustomError('Driver belongs to a different operator', 403);
        }

        const fallbackDriverUser = await User.findOne({ user_id: driverIdentifier, role_id: 3 });
        if (fallbackDriverUser && fallbackDriverUser.operator_id !== operator_id) {
          throw new CustomError('Driver belongs to a different operator', 403);
        }

        const resolvedDriverId = driverProfile?.user_id || fallbackDriverUser?.user_id;

        if (resolvedDriverId) {
          driverUser = await User.findOne({ user_id: resolvedDriverId, operator_id, role_id: 3 });
        }

        if (!driverUser) {
          throw new CustomError('Driver not found', 404);
        }

        if (!driverProfile) {
          driverProfile = await Driver.findOne({ user_id: driverUser.user_id, operator_id });
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

      const vehicle = await findOperatorVehicle(operator_id, targetVehicleId);

      const endUserIdentifierConditions = [{ end_user_id: endUserIdentifier }, { user_id: endUserIdentifier }];

      const endUserProfile = await EndUser.findOne({
        operator_id,
        $or: endUserIdentifierConditions
      });

      if (!endUserProfile) {
        const globalEndUser = await EndUser.findOne({ $or: endUserIdentifierConditions });
        if (globalEndUser) {
          throw new CustomError('End-user belongs to a different operator', 403);
        }
        throw new CustomError('End-user not found', 404);
      }

      if (!endUserProfile.status) {
        throw new CustomError('End-user is inactive', 409);
      }

      const endUserUser = await User.findOne({ user_id: endUserProfile.user_id, operator_id, role_id: 4 });

      if (!endUserUser) {
        const fallbackEndUserUser = await User.findOne({ user_id: endUserProfile.user_id, role_id: 4 });
        if (fallbackEndUserUser && fallbackEndUserUser.operator_id !== operator_id) {
          throw new CustomError('End-user belongs to a different operator', 403);
        }
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
        findOperatorVehicle(operator_id, currentVehicleId)
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

      const updatePayload = {};
      if (typeof name !== 'undefined') {
        updatePayload.name = name;
      }
      if (typeof phone_number !== 'undefined') {
        updatePayload.phone_number = phone_number;
      }

      const updatedUser = await UserService.updateUser(req.user.user_id, updatePayload);

      res.status(200).json({
        error: false,
        message: 'Profile updated successfully',
        data: updatedUser
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
      const activeVehicles = await Vehicle.countDocuments({
        operator_id,
        current_status: { $in: ['active', 'en_route', 'at_stop', 'delayed'] },
        status: true
      });
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

  static async createScheduledTrip(req, res, next) {
    try {
      const { vehicle_id, driver_id, route_name, scheduled_start_time, trip_period, start_location, end_location, route_points, repeat_days } = req.body;
      const { CustomError } = require('../middlewares/errorHandler');
      const ScheduledTrip = require('../models/ScheduledTrip');
      const { generateScheduledTripId } = require('../utils/uuidUtils');

      if (!vehicle_id || !driver_id || !scheduled_start_time) {
        throw new CustomError('Vehicle ID, Driver ID, and scheduled start time are required', 400);
      }

      const conflictingTrip = await ScheduledTrip.findOne({
        operator_id: req.user.operator_id,
        scheduled_start_time,
        is_active: true,
        $or: [{ vehicle_id }, { driver_id }]
      });

      if (conflictingTrip) {
        throw new CustomError('Driver or vehicle already scheduled at this time', 400);
      }

      const normalizedRoutePoints = normalizeRoutePointsPayload(route_points);

      const scheduledTrip = new ScheduledTrip({
        scheduled_trip_id: generateScheduledTripId(),
        vehicle_id,
        driver_id,
        operator_id: req.user.operator_id,
        route_name,
        scheduled_start_time,
        trip_period: trip_period || 'morning',
        start_location,
        end_location,
        route_points: normalizedRoutePoints,
        repeat_days: repeat_days || [],
        is_active: true
      });

      await scheduledTrip.save();

      res.status(201).json({
        error: false,
        message: 'Scheduled trip created successfully',
        data: scheduledTrip
      });
    } catch (error) {
      next(error);
    }
  }

  static async getScheduledTrips(req, res, next) {
    try {
      const ScheduledTrip = require('../models/ScheduledTrip');
      const PaginationHelper = require('../utils/paginationHelper');
      const { skip, limit, page } = req.pagination;
      const { vehicle_id, driver_id } = req.query;

      const filter = { operator_id: req.user.operator_id };
      if (vehicle_id) filter.vehicle_id = vehicle_id;
      if (driver_id) filter.driver_id = driver_id;

      const total = await ScheduledTrip.countDocuments(filter);

      const scheduledTrips = await ScheduledTrip.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ scheduled_start_time: 1 });

      const response = PaginationHelper.formatPaginatedResponse(scheduledTrips, total, page, limit);

      res.status(200).json({
        error: false,
        message: 'Scheduled trips retrieved successfully',
        ...response
      });
    } catch (error) {
      next(error);
    }
  }

  static async getScheduledTripById(req, res, next) {
    try {
      const ScheduledTrip = require('../models/ScheduledTrip');
      const { CustomError } = require('../middlewares/errorHandler');
      const { scheduledTripId } = req.params;

      const scheduledTrip = await ScheduledTrip.findOne({
        scheduled_trip_id: scheduledTripId,
        operator_id: req.user.operator_id
      });

      if (!scheduledTrip) {
        throw new CustomError('Scheduled trip not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Scheduled trip retrieved successfully',
        data: scheduledTrip
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateScheduledTrip(req, res, next) {
    try {
      const ScheduledTrip = require('../models/ScheduledTrip');
      const { CustomError } = require('../middlewares/errorHandler');
      const { scheduledTripId } = req.params;
      const updateData = { ...req.body };

      if (Object.prototype.hasOwnProperty.call(updateData, 'route_points')) {
        updateData.route_points = normalizeRoutePointsPayload(updateData.route_points);
      }

      const scheduledTrip = await ScheduledTrip.findOneAndUpdate(
        { scheduled_trip_id: scheduledTripId, operator_id: req.user.operator_id },
        updateData,
        { new: true }
      );

      if (!scheduledTrip) {
        throw new CustomError('Scheduled trip not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Scheduled trip updated successfully',
        data: scheduledTrip
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteScheduledTrip(req, res, next) {
    try {
      const ScheduledTrip = require('../models/ScheduledTrip');
      const { CustomError } = require('../middlewares/errorHandler');
      const { scheduledTripId } = req.params;

      const scheduledTrip = await ScheduledTrip.findOneAndDelete({
        scheduled_trip_id: scheduledTripId,
        operator_id: req.user.operator_id
      });

      if (!scheduledTrip) {
        throw new CustomError('Scheduled trip not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Scheduled trip deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OperatorController;

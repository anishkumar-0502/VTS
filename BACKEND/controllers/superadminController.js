const DeviceService = require('../services/deviceService');
const Role = require('../models/Role');
const Operator = require('../models/Operator');
const Device = require('../models/Device');
const Vehicle = require('../models/Vehicle');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Driver = require('../models/Driver');
const EndUser = require('../models/EndUser');
const TrackingData = require('../models/TrackingData');
const UserService = require('../services/userService');
const { CustomError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const { generateEmailBasedPassword } = require('../utils/passwordGenerator');
const { sendCredentialsEmail } = require('../middlewares/emailer');

class SuperadminController {
  static async getDashboardAnalytics(req, res, next) {
    try {
      const now = new Date();
      await SuperadminController.updateVehicleStatuses(now);
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const nextSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [
        vehicleStatusResult,
        totalOperators,
        totalDevices,
        activeDevices,
        alertsByType,
        operatorStats,
        maintenanceSummaryResult,
        upcomingMaintenance,
        liveVehicleDocs,
        activeUserDocs
      ] = await Promise.all([
        Vehicle.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              active: { $sum: { $cond: [{ $eq: ['$current_status', 'active'] }, 1, 0] } },
              idle: { $sum: { $cond: [{ $eq: ['$current_status', 'idle'] }, 1, 0] } },
              maintenance: { $sum: { $cond: [{ $eq: ['$current_status', 'maintenance'] }, 1, 0] } },
              offline: { $sum: { $cond: [{ $eq: ['$current_status', 'offline'] }, 1, 0] } },
              avgSpeed: { $avg: { $ifNull: ['$speed', 0] } }
            }
          }
        ]),
        Operator.countDocuments({ status: true }),
        Device.countDocuments(),
        Device.countDocuments({ status: true }),
        Notification.aggregate([
          {
            $match: {
              createdAt: { $gte: last24Hours }
            }
          },
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } }
        ]),
        Vehicle.aggregate([
          {
            $match: { operator_id: { $ne: null } }
          },
          {
            $group: {
              _id: '$operator_id',
              totalVehicles: { $sum: 1 },
              activeVehicles: { $sum: { $cond: [{ $eq: ['$current_status', 'active'] }, 1, 0] } },
              idleVehicles: { $sum: { $cond: [{ $eq: ['$current_status', 'idle'] }, 1, 0] } },
              maintenanceVehicles: { $sum: { $cond: [{ $eq: ['$current_status', 'maintenance'] }, 1, 0] } },
              offlineVehicles: { $sum: { $cond: [{ $eq: ['$current_status', 'offline'] }, 1, 0] } },
              avgSpeed: { $avg: { $ifNull: ['$speed', 0] } }
            }
          },
          { $sort: { activeVehicles: -1, totalVehicles: -1 } },
          { $limit: 6 }
        ]),
        Vehicle.aggregate([
          {
            $match: { maintenance_due_date: { $ne: null } }
          },
          {
            $group: {
              _id: null,
              overdue: { $sum: { $cond: [{ $lt: ['$maintenance_due_date', now] }, 1, 0] } },
              dueSoon: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $gte: ['$maintenance_due_date', now] },
                        { $lte: ['$maintenance_due_date', nextSevenDays] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              },
              dueLater: { $sum: { $cond: [{ $gt: ['$maintenance_due_date', nextSevenDays] }, 1, 0] } }
            }
          }
        ]),
        Vehicle.find({ maintenance_due_date: { $ne: null } })
          .select('vehicle_id vehicle_number maintenance_due_date current_status operator_id assigned_device_id')
          .sort({ maintenance_due_date: 1 })
          .limit(5)
          .lean(),
        Vehicle.find({
          status: true,
          assigned_device_id: { $ne: null }
        })
          .select('vehicle_id vehicle_number operator_id assigned_device_id current_status latitude longitude speed last_update updatedAt createdAt')
          .sort({ last_update: -1, updatedAt: -1 })
          .limit(50)
          .lean(),
        User.find({ status: true }).select('operator_id').lean()
      ]);

      const vehicleStatus = vehicleStatusResult[0] || {
        total: 0,
        active: 0,
        idle: 0,
        maintenance: 0,
        offline: 0,
        avgSpeed: 0
      };

      const alertsLast24h = alertsByType.reduce((acc, item) => acc + (item.count || 0), 0);

      const fleetOverview = {
        totalVehicles: vehicleStatus.total || 0,
        activeVehicles: vehicleStatus.active || 0,
        idleVehicles: vehicleStatus.idle || 0,
        maintenanceVehicles: vehicleStatus.maintenance || 0,
        offlineVehicles: vehicleStatus.offline || 0,
        totalOperators,
        totalTrackers: totalDevices,
        activeTrackers: activeDevices,
        averageSpeed: Number((vehicleStatus.avgSpeed || 0).toFixed(2)),
        alertsLast24h,
        utilizationRate: vehicleStatus.total ? Number(((vehicleStatus.active / vehicleStatus.total) * 100).toFixed(2)) : 0
      };

      const alertSummary = {
        totalAlerts24h: alertsLast24h,
        alertsByType: alertsByType.map((entry) => ({
          type: entry._id,
          count: entry.count,
          label: entry._id ? entry._id.replace(/_/g, ' ') : 'unknown'
        })),
        topAlertType: alertsByType.length ? alertsByType[0]._id : null
      };

      const operatorIdSet = new Set();
      operatorStats.forEach((entry) => {
        if (entry._id) {
          operatorIdSet.add(entry._id);
        }
      });
      upcomingMaintenance.forEach((entry) => {
        if (entry.operator_id) {
          operatorIdSet.add(entry.operator_id);
        }
      });
      liveVehicleDocs.forEach((vehicle) => {
        if (vehicle.operator_id) {
          operatorIdSet.add(vehicle.operator_id);
        }
      });

      const operatorLookup = operatorIdSet.size
        ? await Operator.find({ operator_id: { $in: Array.from(operatorIdSet) } })
            .select('operator_id name company_name')
            .lean()
        : [];
      const operatorMap = new Map(operatorLookup.map((operator) => [operator.operator_id, operator]));

      const topOperators = operatorStats.map((entry) => {
        const operator = operatorMap.get(entry._id);
        const label = operator?.company_name || operator?.name || entry._id;
        const utilization = entry.totalVehicles
          ? Number(((entry.activeVehicles / entry.totalVehicles) * 100).toFixed(2))
          : 0;
        const issues = (entry.maintenanceVehicles || 0) + (entry.offlineVehicles || 0);
        return {
          operatorId: entry._id,
          operatorName: label,
          totalVehicles: entry.totalVehicles || 0,
          activeVehicles: entry.activeVehicles || 0,
          idleVehicles: entry.idleVehicles || 0,
          maintenanceVehicles: entry.maintenanceVehicles || 0,
          offlineVehicles: entry.offlineVehicles || 0,
          averageSpeed: Number((entry.avgSpeed || 0).toFixed(2)),
          utilizationRate: utilization,
          issueVehicles: issues
        };
      });

      const liveVehicles = liveVehicleDocs.map((vehicle) => {
        const operator = vehicle.operator_id ? operatorMap.get(vehicle.operator_id) : null;
        const lastUpdateSource = vehicle.last_update || vehicle.updatedAt || vehicle.createdAt || null;
        let lastUpdate = null;
        if (lastUpdateSource) {
          const dateValue = lastUpdateSource instanceof Date ? lastUpdateSource : new Date(lastUpdateSource);
          if (!Number.isNaN(dateValue.getTime())) {
            lastUpdate = dateValue.toISOString();
          }
        }
        const latitude = typeof vehicle.latitude === 'number' ? vehicle.latitude : null;
        const longitude = typeof vehicle.longitude === 'number' ? vehicle.longitude : null;

        return {
          vehicleId: vehicle.vehicle_id,
          vehicleNumber: vehicle.vehicle_number,
          operatorId: vehicle.operator_id || null,
          operatorName: operator?.company_name || operator?.name || null,
          operatorCountry: operator?.country || null,
          trackerId: vehicle.assigned_device_id || null,
          latitude,
          longitude,
          speed: Number((vehicle.speed || 0).toFixed(2)),
          status: vehicle.current_status || 'unknown',
          lastUpdate
        };
      });

      const customerCountryMap = new Map();
      const totalCustomerCount = activeUserDocs.length;
      let knownCountryCount = 0;
      activeUserDocs.forEach((userDoc) => {
        const operatorId = userDoc?.operator_id;
        if (!operatorId) {
          return;
        }
        const operator = operatorMap.get(operatorId);
        const country = operator?.country?.trim();
        if (!country || !country.length) {
          return;
        }
        const label = country;
        const key = label.toLowerCase();
        knownCountryCount += 1;
        const existing = customerCountryMap.get(key);
        if (existing) {
          existing.customers += 1;
        } else {
          customerCountryMap.set(key, {
            country: label,
            customers: 1
          });
        }
      });

      let demographicCountries = Array.from(customerCountryMap.values())
        .sort((a, b) => b.customers - a.customers)
        .map((entry) => ({
          country: entry.country,
          customers: entry.customers,
          percentage: knownCountryCount
            ? Number(((entry.customers / knownCountryCount) * 100).toFixed(1))
            : 0
        }));

      if (!demographicCountries.length && totalCustomerCount > 0) {
        demographicCountries = [
          {
            country: 'India',
            customers: totalCustomerCount,
            percentage: 100
          }
        ];
      }

      const customerDemographics = {
        totalCustomers: totalCustomerCount,
        countries: demographicCountries
      };

      const routeSummary = {
        totalRoutes: operatorStats.length,
        activeRoutes: operatorStats.filter((route) => (route.activeVehicles || 0) > 0).length,
        routesWithIssues: operatorStats.filter((route) => (route.issueVehicles || 0) > 0).length,
        averageRouteSpeed: operatorStats.length
          ? Number(
              (
                operatorStats.reduce((sum, route) => sum + (route.avgSpeed || 0), 0) / operatorStats.length
              ).toFixed(2)
            )
          : 0
      };

      const slowRoutes = operatorStats
        .slice()
        .sort((a, b) => (a.avgSpeed || 0) - (b.avgSpeed || 0))
        .slice(0, 5)
        .map((route) => ({
          routeName: route._id,
          averageSpeed: Number((route.avgSpeed || 0).toFixed(2)),
          activeVehicles: route.activeVehicles || 0,
          issueVehicles: route.issueVehicles || 0,
          stopCount: route.stopCount || 0
        }));

      const routeHealth = {
        summary: {
          ...routeSummary,
          onScheduleRate: routeSummary.totalRoutes
            ? Number(
                (
                  ((routeSummary.totalRoutes - routeSummary.routesWithIssues) / routeSummary.totalRoutes) *
                  100
                ).toFixed(2)
              )
            : 0
        },
        slowRoutes
      };

      const maintenanceSummaryData = maintenanceSummaryResult[0] || {
        overdue: 0,
        dueSoon: 0,
        dueLater: 0
      };

      const maintenance = {
        summary: {
          overdue: maintenanceSummaryData.overdue || 0,
          dueSoon: maintenanceSummaryData.dueSoon || 0,
          dueLater: maintenanceSummaryData.dueLater || 0
        },
        upcoming: upcomingMaintenance.map((item) => {
          const dueDate = item.maintenance_due_date ? new Date(item.maintenance_due_date) : null;
          const daysUntilDue = dueDate
            ? Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
            : null;
          const operator = item.operator_id ? operatorMap.get(item.operator_id) : null;
          return {
            vehicleId: item.vehicle_id,
            vehicleNumber: item.vehicle_number,
            operatorId: item.operator_id || null,
            operatorName: operator?.company_name || operator?.name || null,
            trackerId: item.assigned_device_id || null,
            status: item.current_status || 'unknown',
            dueDate: dueDate ? dueDate.toISOString() : null,
            daysUntilDue
          };
        })
      };

      res.status(200).json({
        error: false,
        message: 'Dashboard analytics retrieved successfully',
        data: {
          fleetOverview,
          alertSummary,
          operatorPerformance: {
            topOperators
          },
          routeHealth,
          maintenance,
          liveVehicles,
          customerDemographics
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateVehicleStatuses(referenceTime) {
    const assignedVehicles = await Vehicle.find({
      status: true,
      assigned_device_id: { $ne: null }
    })
      .select('vehicle_id assigned_device_id current_status latitude longitude speed last_update')
      .lean();

    if (!assignedVehicles.length) {
      return;
    }

    const deviceIds = assignedVehicles
      .map((vehicle) => vehicle.assigned_device_id)
      .filter((deviceId) => typeof deviceId === 'string' && deviceId.length);

    if (!deviceIds.length) {
      return;
    }

    const latestTracking = await TrackingData.aggregate([
      {
        $match: {
          device_id: { $in: deviceIds }
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: '$device_id',
          timestamp: { $first: '$timestamp' },
          speed: { $first: '$speed' },
          latitude: { $first: '$latitude' },
          longitude: { $first: '$longitude' }
        }
      }
    ]);

    const trackingMap = new Map(latestTracking.map((entry) => [entry._id, entry]));
    const thresholdMs = 10 * 60 * 1000;
    const bulkUpdates = [];
    const nowMs = referenceTime instanceof Date ? referenceTime.getTime() : Date.now();

    assignedVehicles.forEach((vehicle) => {
      if (vehicle.current_status === 'maintenance') {
        return;
      }

      const tracking = trackingMap.get(vehicle.assigned_device_id);
      let nextStatus = 'offline';
      let nextSpeed = typeof vehicle.speed === 'number' ? vehicle.speed : 0;
      let nextLatitude = vehicle.latitude;
      let nextLongitude = vehicle.longitude;
      let nextLastUpdate = vehicle.last_update ? new Date(vehicle.last_update) : null;

      if (tracking && tracking.timestamp) {
        const trackTime = tracking.timestamp instanceof Date ? tracking.timestamp : new Date(tracking.timestamp);
        if (!Number.isNaN(trackTime.getTime())) {
          const ageMs = nowMs - trackTime.getTime();
          if (ageMs <= thresholdMs) {
            const speedValue = typeof tracking.speed === 'number' ? tracking.speed : 0;
            nextSpeed = speedValue;
            nextLatitude = typeof tracking.latitude === 'number' ? tracking.latitude : nextLatitude;
            nextLongitude = typeof tracking.longitude === 'number' ? tracking.longitude : nextLongitude;
            nextLastUpdate = trackTime;
            nextStatus = speedValue > 1 ? 'active' : 'idle';
          }
        }
      }

      const updateDoc = {};

      if (nextStatus !== vehicle.current_status) {
        updateDoc.current_status = nextStatus;
      }

      if (typeof nextSpeed === 'number') {
        const formattedSpeed = Number(nextSpeed.toFixed(2));
        const currentSpeed = typeof vehicle.speed === 'number' ? Number(vehicle.speed.toFixed(2)) : null;
        if (currentSpeed !== formattedSpeed) {
          updateDoc.speed = formattedSpeed;
        }
      }

      if (typeof nextLatitude === 'number' && nextLatitude !== vehicle.latitude) {
        updateDoc.latitude = nextLatitude;
      }

      if (typeof nextLongitude === 'number' && nextLongitude !== vehicle.longitude) {
        updateDoc.longitude = nextLongitude;
      }

      if (nextLastUpdate) {
        const existingUpdate = vehicle.last_update ? new Date(vehicle.last_update).getTime() : null;
        if (!existingUpdate || existingUpdate !== nextLastUpdate.getTime()) {
          updateDoc.last_update = nextLastUpdate;
        }
      }

      if (Object.keys(updateDoc).length) {
        bulkUpdates.push({
          updateOne: {
            filter: { vehicle_id: vehicle.vehicle_id },
            update: { $set: updateDoc }
          }
        });
      }
    });

    if (bulkUpdates.length) {
      await Vehicle.bulkWrite(bulkUpdates, { ordered: false });
    }
  }

  static async getGPSTracking(req, res, next) {
    try {
      const { operatorId, vehicleId, deviceId, limit = 50 } = req.query;

      const query = {};
      if (vehicleId) query.vehicle_id = vehicleId;
      if (deviceId) query.device_id = deviceId;

      let tracking = await TrackingData.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .populate('vehicle_id')
        .populate('device_id');

      if (operatorId) {
        const vehicles = await Vehicle.find({ operator_id: operatorId });
        const vehicleIds = vehicles.map(v => v._id);
        tracking = tracking.filter(t => vehicleIds.includes(t.vehicle_id._id));
      }

      res.status(200).json({
        error: false,
        message: 'GPS tracking data retrieved successfully',
        data: tracking
      });
    } catch (error) {
      next(error);
    }
  }

  static async createOperator(req, res, next) {
    let operatorRecord = null;
    try {
      const { name, email, phone_number, company_name, registration_number, address, city, state, postal_code, country } = req.body;

      const sanitizedEmail = email?.toLowerCase();
      if (!name || !sanitizedEmail || !phone_number) {
        throw new CustomError('Missing required fields', 400);
      }

      const existingOperator = await Operator.findOne({ email: sanitizedEmail });
      if (existingOperator) {
        throw new CustomError('Operator with this email already exists', 409);
      }

      const existingUser = await User.findOne({ email: sanitizedEmail });
      if (existingUser) {
        throw new CustomError('User with this email already exists', 409);
      }

      operatorRecord = await Operator.create({
        name,
        email: sanitizedEmail,
        phone: phone_number,
        company_name,
        registration_number,
        address,
        city,
        state,
        postal_code,
        country,
        status: true
      });

      const role = await Role.findOne({ role_name: 'operator' });
      if (!role) {
        throw new CustomError('Operator role not found', 404);
      }

      const password = generateEmailBasedPassword(sanitizedEmail);

      const user = await UserService.createUser({
        name,
        email: sanitizedEmail,
        phone_number,
        password,
        role_id: role.role_id,
        operator_id: operatorRecord.operator_id
      });

      await sendCredentialsEmail(sanitizedEmail, name, password, role.role_id);

      const operatorData = operatorRecord.toObject();

      res.status(201).json({
        error: false,
        message: 'Operator created successfully',
        data: { operator: operatorData, user, temp_password: password }
      });
    } catch (error) {
      if (operatorRecord) {
        try {
          await Operator.deleteOne({ operator_id: operatorRecord.operator_id });
        } catch (cleanupError) {
          logger.loggerError(`Cleanup failed for operator ${operatorRecord.operator_id}: ${cleanupError.message}`);
        }
      }

      if (error?.code === 11000) {
        if (error.keyPattern?.email) {
          return next(new CustomError('Operator with this email already exists', 409));
        }
        if (error.keyPattern?.phone) {
          return next(new CustomError('Operator with this phone number already exists', 409));
        }
      }

      next(error);
    }
  }

  static async getOperators(req, res, next) {
    try {
      const PaginationHelper = require('../utils/paginationHelper');
      const { skip, limit, page, isPaginated } = req.pagination;

      const total = await Operator.countDocuments({ status: true });
      
      let query = Operator.find({ status: true }).sort({ createdAt: -1 });
      
      if (isPaginated) {
        query = query.skip(skip).limit(limit);
      }

      const operators = await query.lean();

      if (operators.length === 0) {
        const response = PaginationHelper.formatPaginatedResponse([], total, page, limit);
        return res.status(200).json({
          error: false,
          message: 'Operators retrieved successfully',
          ...response
        });
      }

      const response = PaginationHelper.formatPaginatedResponse(operators, total, page, limit);
      res.status(200).json({
        error: false,
        message: 'Operators retrieved successfully',
        ...response
      });
    } catch (error) {
      next(error);
    }
  }

  static async getOperatorById(req, res, next) {
    try {
      const operator = await Operator.findOne({ operator_id: req.params.operatorId });
      if (!operator) {
        throw new CustomError('Operator not found', 404);
      }

      const vehicles = await Vehicle.find({ operator_id: operator.operator_id });
      const drivers = await User.find({ operator_id: operator.operator_id, role_id: 3 });
      const devices = await Device.find({ assigned_operator_id: operator.operator_id });

      res.status(200).json({
        error: false,
        message: 'Operator retrieved successfully',
        data: {
          ...operator.toObject(),
          vehicles,
          drivers,
          devices,
          vehicle_count: vehicles.length,
          driver_count: drivers.length,
          device_count: devices.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateOperator(req, res, next) {
    try {
      const operator = await Operator.findOneAndUpdate({ operator_id: req.params.operatorId }, req.body, { new: true });
      if (!operator) {
        throw new CustomError('Operator not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Operator updated successfully',
        data: operator
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleOperatorStatus(req, res, next) {
    try {
      const operator = await Operator.findOne({ operator_id: req.params.operatorId });
      if (!operator) {
        throw new CustomError('Operator not found', 404);
      }

      operator.status = !operator.status;
      await operator.save();

      await User.updateMany({ operator_id: operator.operator_id }, { status: operator.status });

      res.status(200).json({
        error: false,
        message: 'Operator status toggled successfully',
        data: operator
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllUsers(req, res, next) {
    try {
      const { role_id, operator_id, status } = req.query;
      const matchStage = {};
      if (role_id) matchStage.role_id = parseInt(role_id);
      if (operator_id) matchStage.operator_id = operator_id;
      if (status !== undefined) matchStage.status = status === 'true';

      const data = await User.aggregate([
        { $match: matchStage },
        { $lookup: { from: 'operators', localField: 'operator_id', foreignField: 'operator_id', as: 'operator' } },
        { $unwind: { path: '$operator', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'drivers', localField: 'user_id', foreignField: 'user_id', as: 'driver_profile' } },
        { $unwind: { path: '$driver_profile', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'endusers', localField: 'user_id', foreignField: 'user_id', as: 'end_user_profile' } },
        { $unwind: { path: '$end_user_profile', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'vehicles', localField: 'assigned_vehicle_id', foreignField: 'vehicle_id', as: 'assigned_vehicle' } },
        { $unwind: { path: '$assigned_vehicle', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'users', localField: 'assigned_vehicle.assigned_driver_id', foreignField: 'user_id', as: 'vehicle_driver' } },
        { $unwind: { path: '$vehicle_driver', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'drivers', localField: 'vehicle_driver.user_id', foreignField: 'user_id', as: 'vehicle_driver_profile' } },
        { $unwind: { path: '$vehicle_driver_profile', preserveNullAndEmptyArrays: true } },
        { $project: {
          user_id: 1,
          email: 1,
          name: 1,
          phone_number: 1,
          operator_id: 1,
          role_id: 1,
          assigned_vehicle_id: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          operator: { $ifNull: ['$operator', null] },
          driver_profile: { $cond: [{ $eq: ['$role_id', 3] }, { $ifNull: ['$driver_profile', null] }, null] },
          end_user_profile: { $cond: [{ $eq: ['$role_id', 4] }, { $ifNull: ['$end_user_profile', null] }, null] },
          end_user_reference: { $cond: [{ $eq: ['$role_id', 4] }, '$end_user_profile.end_user_id', null] },
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
              operator_id: '$assigned_vehicle.operator_id',
              driver: { $cond: [
                { $eq: ['$assigned_vehicle.assigned_driver_id', null] },
                null,
                {
                  user_id: '$vehicle_driver.user_id',
                  name: '$vehicle_driver.name',
                  email: '$vehicle_driver.email',
                  phone_number: '$vehicle_driver.phone_number',
                  assigned_vehicle_id: '$vehicle_driver.assigned_vehicle_id',
                  status: '$vehicle_driver.status',
                  operator_id: '$vehicle_driver.operator_id',
                  driver_profile: { $ifNull: ['$vehicle_driver_profile', null] }
                }
              ] }
            }
          ] }
        } }
      ]);

      res.status(200).json({
        error: false,
        message: 'Users retrieved successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req, res, next) {
    try {
      const user = await User.findOne({ user_id: req.params.userId }).lean();
      if (!user) {
        throw new CustomError('User not found', 404);
      }

      const operator = user.operator_id
        ? await Operator.findOne({ operator_id: user.operator_id })
          .select('operator_id name company_name email phone status city state country')
          .lean()
        : null;

      let assignedVehicle = null;

      if (user.assigned_vehicle_id) {
        assignedVehicle = await Vehicle.findOne({ vehicle_id: user.assigned_vehicle_id })
          .select('vehicle_id vehicle_number vehicle_type capacity current_status assigned_driver_id end_user_ids operator_id')
          .lean();

        if (assignedVehicle?.assigned_driver_id) {
          const driverUser = await User.findOne({ user_id: assignedVehicle.assigned_driver_id })
            .select('user_id name email phone_number assigned_vehicle_id status operator_id')
            .lean();

          const driverProfile = await Driver.findOne({ user_id: assignedVehicle.assigned_driver_id })
            .select('driver_id user_id assigned_vehicle_id license_number license_expiry status')
            .lean();

          assignedVehicle.driver = driverUser
            ? {
              ...driverUser,
              driver_profile: driverProfile || null
            }
            : null;
        }

        if (Array.isArray(assignedVehicle?.end_user_ids) && assignedVehicle.end_user_ids.length) {
          const endUserProfiles = await EndUser.find({ end_user_id: { $in: assignedVehicle.end_user_ids } }).lean();
          const endUserUsers = await User.find({ user_id: { $in: endUserProfiles.map((profile) => profile.user_id).filter(Boolean) } })
            .select('user_id name email phone_number assigned_vehicle_id status operator_id')
            .lean();
          const endUserUserMap = new Map(endUserUsers.map((record) => [record.user_id, record]));
          assignedVehicle.end_users = assignedVehicle.end_user_ids
            .map((endUserId) => {
              const profile = endUserProfiles.find((record) => record.end_user_id === endUserId);
              if (!profile) {
                return null;
              }
              const userRecord = profile.user_id ? endUserUserMap.get(profile.user_id) || null : null;
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
            .filter(Boolean);
        }
      }

      let driverProfile = null;
      if (user.role_id === 3) {
        driverProfile = await Driver.findOne({ user_id: user.user_id })
          .select('driver_id user_id assigned_vehicle_id license_number license_expiry status')
          .lean();
      }

      let endUserProfile = null;
      if (user.role_id === 4) {
        endUserProfile = await EndUser.findOne({ user_id: user.user_id }).lean();
      }

      res.status(200).json({
        error: false,
        message: 'User retrieved successfully',
        data: {
          ...user,
          operator,
          driver_profile: driverProfile,
          end_user_profile: endUserProfile,
          end_user_reference: endUserProfile?.end_user_id || null,
          assigned_vehicle: assignedVehicle
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async createUser(req, res, next) {
    try {
      const { name, email, phone_number, role_id, operator_id } = req.body;

      if (!name || !email || !phone_number || !role_id) {
        throw new CustomError('Missing required fields', 400);
      }

      const password = generateEmailBasedPassword(email);

      const user = await UserService.createUser({
        name,
        email,
        phone_number,
        password,
        role_id,
        operator_id: operator_id || null
      });

      await sendCredentialsEmail(email, name, password, role_id);

      res.status(201).json({
        error: false,
        message: 'User created successfully',
        data: { user, temp_password: password }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(req, res, next) {
    try {
      const { password: incomingPassword, reset_password, ...rest } = req.body;
      const updatePayload = { ...rest };
      let tempPassword = null;

      if (reset_password || typeof incomingPassword !== 'undefined') {
        const existingUser = await User.findOne({ user_id: req.params.userId });
        if (!existingUser) {
          throw new CustomError('User not found', 404);
        }

        const emailForPassword = rest.email || existingUser.email;
        tempPassword = generateEmailBasedPassword(emailForPassword);
        updatePayload.password = tempPassword;
      }

      const user = await UserService.updateUser(req.params.userId, updatePayload);

      if (tempPassword) {
        await sendCredentialsEmail(user.email, user.name, tempPassword, user.role_id);
      }

      res.status(200).json({
        error: false,
        message: 'User updated successfully',
        data: tempPassword ? { user, temp_password: tempPassword } : user
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleUserStatus(req, res, next) {
    try {
      const user = await UserService.toggleUserStatus(req.params.userId);

      res.status(200).json({
        error: false,
        message: 'User status toggled successfully',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllDevices(req, res, next) {
    try {
      const devicesWithVehicles = await Device.aggregate([
        { $lookup: { from: 'vehicles', localField: 'assigned_vehicle_id', foreignField: 'vehicle_id', as: 'vehicle_details' } },
        { $unwind: { path: '$vehicle_details', preserveNullAndEmptyArrays: true } },
        { $project: {
          device_id: 1,
          imei: 1,
          device_type: 1,
          status: 1,
          assigned_operator_id: 1,
          assigned_vehicle_id: 1,
          battery_level: 1,
          firmware_version: 1,
          sim_number: 1,
          last_signal: 1,
          last_location: 1,
          last_speed: 1,
          last_course: 1,
          module_model: 1,
          createdAt: 1,
          updatedAt: 1,
          vehicle_details: { $cond: [{ $eq: ['$assigned_vehicle_id', null] }, null, '$vehicle_details'] }
        } }
      ]);

      res.status(200).json({
        error: false,
        message: 'Devices retrieved successfully',
        data: devicesWithVehicles
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDeviceById(req, res, next) {
    try {
      const result = await Device.aggregate([
        { $match: { device_id: req.params.deviceId } },
        { $lookup: { from: 'vehicles', localField: 'assigned_vehicle_id', foreignField: 'vehicle_id', as: 'vehicle_details' } },
        { $unwind: { path: '$vehicle_details', preserveNullAndEmptyArrays: true } },
        { $project: {
          device_id: 1,
          imei: 1,
          device_type: 1,
          status: 1,
          assigned_operator_id: 1,
          assigned_vehicle_id: 1,
          battery_level: 1,
          firmware_version: 1,
          sim_number: 1,
          last_signal: 1,
          last_location: 1,
          last_speed: 1,
          last_course: 1,
          module_model: 1,
          createdAt: 1,
          updatedAt: 1,
          vehicle_details: { $cond: [{ $eq: ['$assigned_vehicle_id', null] }, null, '$vehicle_details'] }
        } }
      ]);

      if (!result.length) {
        throw new CustomError('Device not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Device retrieved successfully',
        data: result[0]
      });
    } catch (error) {
      next(error);
    }
  }

  static async createDevice(req, res, next) {
    try {
      const { device_id, imei, device_type, assigned_operator_id, sim_number, firmware_version } = req.body;

      if (!imei) {
        throw new CustomError('IMEI is required', 400);
      }

      if (!device_id) {
        throw new CustomError('device_id is required', 400);
      }

      const devicePayload = {
        device_id,
        imei,
        device_type: device_type || 'gps_tracker',
        sim_number,
        firmware_version,
        status: true
      };

      if (assigned_operator_id) {
        devicePayload.assigned_operator_id = assigned_operator_id;
      }

      const device = await DeviceService.createDevice(devicePayload);

      res.status(201).json({
        error: false,
        message: 'Device created successfully',
        data: device
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateDevice(req, res, next) {
    try {
      const device = await Device.findOneAndUpdate({ device_id: req.params.deviceId }, req.body, { new: true });
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

  static async toggleDeviceStatus(req, res, next) {
    try {
      const device = await Device.findOne({ device_id: req.params.deviceId });
      if (!device) {
        throw new CustomError('Device not found', 404);
      }

      device.status = !device.status;
      await device.save();

      res.status(200).json({
        error: false,
        message: 'Device status toggled successfully',
        data: device
      });
    } catch (error) {
      next(error);
    }
  }

  static async assignDeviceToOperator(req, res, next) {
    try {
      const { device_id, operator_id } = req.body;

      if (!device_id || !operator_id) {
        throw new CustomError('device_id and operator_id are required', 400);
      }

      const device = await Device.findOneAndUpdate(
        { device_id },
        { assigned_operator_id: operator_id, assigned_date: new Date() },
        { new: true }
      );

      if (!device) {
        throw new CustomError('Device not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Device assigned to operator successfully',
        data: device
      });
    } catch (error) {
      next(error);
    }
  }

  static async bulkAssignDevices(req, res, next) {
    try {
      const { assignments } = req.body;

      if (!Array.isArray(assignments) || assignments.length === 0) {
        throw new CustomError('assignments array is required', 400);
      }

      const results = [];
      for (const { device_id, operator_id } of assignments) {
        try {
          const device = await Device.findOneAndUpdate(
            { device_id },
            { assigned_operator_id: operator_id, assigned_date: new Date() },
            { new: true }
          );
          results.push({ device_id, operator_id, status: 'success', device });
        } catch (err) {
          results.push({ device_id, operator_id, status: 'failed', error: err.message });
        }
      }

      res.status(200).json({
        error: false,
        message: 'Bulk device assignment completed',
        data: results
      });
    } catch (error) {
      next(error);
    }
  }

  static async unassignDeviceFromOperator(req, res, next) {
    try {
      const { device_id, operator_id } = req.body;

      if (!device_id) {
        throw new CustomError('device_id is required', 400);
      }

      const device = await Device.findOne({ device_id });

      if (!device) {
        throw new CustomError('Device not found', 404);
      }

      if (operator_id && device.assigned_operator_id && device.assigned_operator_id !== operator_id) {
        throw new CustomError('Device is not assigned to the specified operator', 400);
      }

      if (device.assigned_vehicle_id) {
        throw new CustomError('Device is assigned to a vehicle and cannot be unassigned', 400);
      }

      device.assigned_operator_id = null;
      device.assigned_date = null;
      await device.save();

      res.status(200).json({
        error: false,
        message: 'Device unassigned from operator successfully',
        data: device
      });
    } catch (error) {
      next(error);
    }
  }

  static async bulkUnassignDevices(req, res, next) {
    try {
      const { device_ids, operator_id } = req.body;

      if (!Array.isArray(device_ids) || device_ids.length === 0) {
        throw new CustomError('device_ids array is required', 400);
      }

      const results = [];

      for (const device_id of device_ids) {
        try {
          const device = await Device.findOne({ device_id });

          if (!device) {
            throw new CustomError('Device not found', 404);
          }

          if (operator_id && device.assigned_operator_id && device.assigned_operator_id !== operator_id) {
            throw new CustomError('Device is not assigned to the specified operator', 400);
          }

          if (device.assigned_vehicle_id) {
            throw new CustomError('Device is assigned to a vehicle and cannot be unassigned', 400);
          }

          device.assigned_operator_id = null;
          device.assigned_date = null;
          await device.save();

          results.push({ device_id, status: 'success', device });
        } catch (err) {
          results.push({ device_id, status: 'failed', error: err.message });
        }
      }

      res.status(200).json({
        error: false,
        message: 'Bulk device unassignment completed',
        data: results
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllRoles(req, res, next) {
    try {
      const PaginationHelper = require('../utils/paginationHelper');
      const { skip, limit, page, isPaginated } = req.pagination;

      const total = await Role.countDocuments();
      
      let query = Role.find().sort({ role_id: 1 });
      
      if (isPaginated) {
        query = query.skip(skip).limit(limit);
      }

      const roles = await query.lean();

      const response = PaginationHelper.formatPaginatedResponse(roles, total, page, limit);
      res.status(200).json({
        error: false,
        message: 'Roles retrieved successfully',
        ...response
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRoleById(req, res, next) {
    try {
      const role = await Role.findOne({ role_id: req.params.roleId });
      if (!role) {
        throw new CustomError('Role not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Role retrieved successfully',
        data: role
      });
    } catch (error) {
      next(error);
    }
  }

  static async createRole(req, res, next) {
    try {
      const { role_name, permissions, description } = req.body;

      if (!role_name) {
        throw new CustomError('Role name is required', 400);
      }

      const existingRole = await Role.findOne({ role_name });
      if (existingRole) {
        throw new CustomError('Role already exists', 400);
      }

      const role = new Role({
        role_name,
        permissions: permissions || [],
        description,
        status: true
      });

      await role.save();

      res.status(201).json({
        error: false,
        message: 'Role created successfully',
        data: role
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateRole(req, res, next) {
    try {
      const role = await Role.findOneAndUpdate(
        { role_id: req.params.roleId },
        req.body,
        { new: true }
      );

      if (!role) {
        throw new CustomError('Role not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Role updated successfully',
        data: role
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleRoleStatus(req, res, next) {
    try {
      const role = await Role.findOne({ role_id: req.params.roleId });
      if (!role) {
        throw new CustomError('Role not found', 404);
      }

      role.status = !role.status;
      await role.save();

      res.status(200).json({
        error: false,
        message: 'Role status toggled successfully',
        data: role
      });
    } catch (error) {
      next(error);
    }
  }

  static async getOwnProfile(req, res, next) {
    try {
      const profile = await UserService.getUserProfile(req.user.user_id);

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
      const { name, phone_number, email } = req.body;
      const updateData = {};

      if (typeof name !== 'undefined') updateData.name = name;
      if (typeof phone_number !== 'undefined') updateData.phone_number = phone_number;
      if (typeof email !== 'undefined') updateData.email = email;

      const updatedUser = await UserService.updateUser(req.user.user_id, updateData);
      const profile = await UserService.getUserProfile(updatedUser);

      res.status(200).json({
        error: false,
        message: 'Profile updated successfully',
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSystemStats(req, res, next) {
    try {
      const totalOperators = await Operator.countDocuments({ status: true });
      const totalUsers = await User.countDocuments({ status: true });
      const totalDevices = await Device.countDocuments({ status: true });
      const totalVehicles = await Vehicle.countDocuments();
      const activeDevices = await Device.countDocuments({ status: true });
      const activeVehicles = await Vehicle.countDocuments({ current_status: { $in: ['active', 'en_route', 'at_stop', 'delayed'] } });

      res.status(200).json({
        error: false,
        message: 'System stats retrieved successfully',
        data: {
          totalOperators,
          totalUsers,
          totalDevices,
          totalVehicles,
          activeDevices,
          activeVehicles
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async cleanupData(req, res, next) {
    try {
      const { daysOld = 30 } = req.body;
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      // Delete old tracking data
      const trackingDeleted = await TrackingData.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      // Delete old trip histories (keep last 90 days)
      const tripCutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const TripHistory = require('../models/TripHistory');
      const tripHistoryDeleted = await TripHistory.deleteMany({
        completed_date: { $lt: tripCutoffDate }
      });

      // Delete old notifications (keep last 30 days)
      const notificationDeleted = await Notification.deleteMany({
        created_at: { $lt: cutoffDate }
      });

      res.status(200).json({
        error: false,
        message: 'Data cleanup completed successfully',
        data: {
          trackingDataDeleted: trackingDeleted.deletedCount,
          tripHistoryDeleted: tripHistoryDeleted.deletedCount,
          notificationsDeleted: notificationDeleted.deletedCount
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SuperadminController;

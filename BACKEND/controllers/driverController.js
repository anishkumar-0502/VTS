const TripService = require('../services/tripService');
const cacheService = require('../services/cacheService');
const UserService = require('../services/userService');
const TrackingData = require('../models/TrackingData');
const { CustomError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const OnDemandTrip = require('../models/Trip');
const TripHistory = require('../models/TripHistory');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Device = require('../models/Device');
const mongoose = require('mongoose');
const VehicleService = require('../services/vehicleService');

const normalizeIdentifier = (value) => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value === undefined || value === null) {
    return value;
  }
  return String(value).trim();
};

const buildIdentifierConditions = (identifier, key) => {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) {
    return [];
  }

  const conditions = [{ [key]: normalized }];

  if (mongoose.Types.ObjectId.isValid(normalized)) {
    conditions.push({ _id: new mongoose.Types.ObjectId(normalized) });
  }

  return conditions;
};

const findVehicleByIdentifier = async (identifier, operatorId, options = {}) => {
  const conditions = buildIdentifierConditions(identifier, 'vehicle_id');

  if (!conditions.length) {
    throw new CustomError('Vehicle ID is required', 400);
  }

  const baseQuery = operatorId ? { operator_id: operatorId, $or: conditions } : { $or: conditions };

  let vehicleQuery = Vehicle.findOne(baseQuery);

  if (options.lean) {
    vehicleQuery = vehicleQuery.lean();
  }

  const vehicle = await vehicleQuery;

  if (vehicle) {
    return vehicle;
  }

  if (operatorId) {
    const fallbackVehicle = await Vehicle.findOne({ $or: conditions });
    if (fallbackVehicle && fallbackVehicle.operator_id !== operatorId) {
      throw new CustomError('Vehicle belongs to a different operator', 403);
    }
    if (fallbackVehicle) {
      return fallbackVehicle;
    }
  }

  throw new CustomError('Vehicle not found', 404);
};

const findTripByIdentifier = async (identifier, driverId, options = {}) => {
  const conditions = buildIdentifierConditions(identifier, 'trip_id');

  if (!conditions.length) {
    throw new CustomError('Trip ID is required', 400);
  }

  const baseQuery = driverId ? { driver_id: driverId, $or: conditions } : { $or: conditions };

  let tripQuery = OnDemandTrip.findOne(baseQuery);

  if (options.select) {
    tripQuery = tripQuery.select(options.select);
  }

  if (options.lean) {
    tripQuery = tripQuery.lean();
  }

  const trip = await tripQuery;

  if (!trip) {
    throw new CustomError('Trip not found', 404);
  }

  return trip;
};

const getDriverIdentifiers = async (userId) => {
  const identifiers = [userId];
  const driverRecord = await Driver.findOne({ user_id: userId }).select('driver_id').lean();
  if (driverRecord?.driver_id) {
    identifiers.push(driverRecord.driver_id);
  }
  return identifiers;
};

class DriverController {
  static async startTrip(req, res, next) {
}

  static async endTrip(req, res, next) {
    try {
      const { tripId } = req.params;
      const { end_location, distance_traveled } = req.body;

      if (!end_location) {
        throw new CustomError('End location is required', 400);
      }

      const trip = await TripService.endTrip(tripId, {
        end_location,
        distance_traveled
      });

      await Vehicle.findOneAndUpdate(
        { vehicle_id: trip.vehicle_id },
        { current_trip_id: null },
        { new: true }
      );

      const vehicle = await findVehicleByIdentifier(trip.vehicle_id, req.user.operator_id, { lean: true });

      if (global.socketManager) {
        global.socketManager.emitToTrip(tripId, 'trip_ended', {
          tripId,
          driverId: req.user.user_id,
          vehicleId: vehicle?.vehicle_id || trip.vehicle_id,
          endLocation: end_location,
          distanceTraveled: distance_traveled,
          timestamp: new Date()
        });
        global.socketManager.emitToOperator(req.user.operator_id, 'trip_ended', {
          tripId,
          driverId: req.user.user_id,
          vehicleId: vehicle?.vehicle_id || trip.vehicle_id,
          timestamp: new Date()
        });
      }

      res.status(200).json({
        error: false,
        message: 'Trip ended successfully',
        data: trip
      });
    } catch (error) {
      next(error);
    }
  }

  static async getActiveTrip(req, res, next) {
    try {
      const OnDemandTrip = require('../models/Trip');
      const Trip = OnDemandTrip;
      
      const result = await Trip.aggregate([
        { $match: { driver_id: req.user.user_id, status: { $in: ['active', 'en_route', 'at_stop', 'delayed'] } } },
        { $lookup: { from: 'vehicles', localField: 'vehicle_id', foreignField: 'vehicle_id', as: 'vehicle' } },
        { $unwind: { path: '$vehicle', preserveNullAndEmptyArrays: true } },
        { $project: {
          trip_id: 1,
          driver_id: 1,
          vehicle_id: '$vehicle',
          route_name: 1,
          status: 1,
          start_location: 1,
          end_location: 1,
          selected_start_point: 1,
          selected_end_point: 1,
          passengers: 1,
          route_points: 1,
          createdAt: 1,
          updatedAt: 1
        } }
      ]);

      if (!result.length) {
        throw new CustomError('No active trip found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Active trip retrieved successfully',
        data: result[0]
      });
    } catch (error) {
      next(error);
    }
  }

  static async recordLocationUpdate(req, res, next) {
    try {
      const { latitude, longitude, speed, heading, tripId, deviceId, recordedAt } = req.body;
      const result = await TripService.processLocationUpdate({
        tripId,
        driverId: req.user.user_id,
        operatorId: req.user.operator_id,
        latitude: Number(latitude),
        longitude: Number(longitude),
        speed: Number(speed),
        heading: heading !== undefined && heading !== null ? Number(heading) : undefined,
        deviceId,
        recordedAt
      });

      res.status(200).json({
        error: false,
        message: 'Location update processed successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTripHistory(req, res, next) {
    try {
      const PaginationHelper = require('../utils/paginationHelper');
      const { skip, limit, page, isPaginated } = req.pagination;

      const filter = { driver_id: req.user.user_id };
      const total = await TripHistory.countDocuments(filter);

      let query = TripHistory.aggregate([
        { $match: filter },
        { $sort: { completed_date: -1, end_time: -1 } }
      ]);

      if (isPaginated) {
        query = TripHistory.aggregate([
          { $match: filter },
          { $sort: { completed_date: -1, end_time: -1 } },
          { $skip: skip },
          { $limit: limit }
        ]);
      }

      const tripsBeforeJoin = await query.exec();
      const vehicleIds = [...new Set(tripsBeforeJoin.map(t => t.vehicle_id))];
      const vehicles = vehicleIds.length ? await Vehicle.find({ vehicle_id: { $in: vehicleIds } }).select('vehicle_id vehicle_number vehicle_type').lean() : [];
      const vehicleMap = new Map(vehicles.map(v => [v.vehicle_id, v]));

      const tripsWithVehicles = tripsBeforeJoin.map(trip => ({
        ...trip,
        vehicle_details: vehicleMap.get(trip.vehicle_id) || null
      }));

      const response = PaginationHelper.formatPaginatedResponse(tripsWithVehicles, total, page, limit);
      res.status(200).json({
        error: false,
        message: 'Trip history retrieved successfully',
        ...response
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTripDetails(req, res, next) {
    try {
      const { tripId } = req.params;
      const Trip = require('../models/Trip');
      
      const result = await Trip.aggregate([
        { $match: { trip_id: tripId, driver_id: req.user.user_id } },
        { $lookup: { from: 'vehicles', localField: 'vehicle_id', foreignField: 'vehicle_id', as: 'vehicle' } },
        { $unwind: { path: '$vehicle', preserveNullAndEmptyArrays: true } },
        { $limit: 1 },
        { $project: {
          trip_id: 1,
          driver_id: 1,
          vehicle_id: '$vehicle',
          route_name: 1,
          status: 1,
          start_location: 1,
          end_location: 1,
          selected_start_point: 1,
          selected_end_point: 1,
          passengers: 1,
          route_points: 1,
          distance_traveled: 1,
          start_time: 1,
          end_time: 1,
          createdAt: 1,
          updatedAt: 1
        } }
      ]);

      if (!result.length) {
        throw new CustomError('Trip not found', 404);
      }

      const trip = result[0];
      const analytics = await TripService.getTripAnalytics(trip.trip_id);

      res.status(200).json({
        error: false,
        message: 'Trip details retrieved successfully',
        data: { trip, analytics }
      });
    } catch (error) {
      next(error);
    }
  }

  static async reportSOS(req, res, next) {
    try {
      const { tripId, vehicle_id, location } = req.body;

      if (!vehicle_id || !location) {
        throw new CustomError('Vehicle ID and location are required', 400);
      }

      const NotificationService = require('../services/notificationService');
      const notification = await NotificationService.createNotification({
        user_id: req.user.operator_id,
        type: 'sos_alert',
        title: 'SOS Alert',
        message: `Driver ${req.user.name} reported SOS from vehicle`,
        vehicle_id,
        priority: 'critical',
        data: { driver_id: req.user.user_id, location }
      });

      if (global.socketManager) {
        global.socketManager.broadcastSOSAlert(
          tripId,
          req.user.operator_id,
          location,
          'driver',
          req.user.user_id
        );
      }

      res.status(200).json({
        error: false,
        message: 'SOS alert sent successfully',
        data: notification
      });
    } catch (error) {
      next(error);
    }
  }

  static async addSpeedViolation(req, res, next) {
    try {
      const { tripId, speed, speed_limit, location } = req.body;

      if (!tripId || !speed) {
        throw new CustomError('Trip ID and speed are required', 400);
      }

      const trip = await TripService.recordSpeedViolation(tripId, {
        timestamp: new Date(),
        speed,
        speed_limit,
        location
      });

      res.status(200).json({
        error: false,
        message: 'Speed violation recorded',
        data: trip
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVehicleStatus(req, res, next) {
    try {
      const { vehicleId } = req.params;
      const vehicle = await findVehicleByIdentifier(vehicleId, req.user.operator_id);

      const latestTracking = await TrackingData.findOne({
        vehicle_id: vehicle.vehicle_id
      }).sort({ timestamp: -1 });

      res.status(200).json({
        error: false,
        message: 'Vehicle status retrieved successfully',
        data: {
          vehicle,
          latestTracking
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDriverStats(req, res, next) {
    try {
      const totalTrips = await OnDemandTrip.countDocuments({ driver_id: req.user.user_id });
      const completedTrips = await OnDemandTrip.countDocuments({
        driver_id: req.user.user_id,
        status: 'completed'
      });

      const activeTrips = await OnDemandTrip.countDocuments({
        driver_id: req.user.user_id,
        status: { $in: ['active', 'en_route', 'at_stop', 'delayed'] }
      });

      res.status(200).json({
        error: false,
        message: 'Driver stats retrieved successfully',
        data: {
          totalTrips,
          completedTrips,
          activeTrips
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDailyTrips(req, res, next) {
    try {
      const PaginationHelper = require('../utils/paginationHelper');
      const { skip, limit, page, isPaginated } = req.pagination;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const filter = {
        driver_id: req.user.user_id,
        start_time: { $gte: today, $lt: tomorrow }
      };

      const total = await OnDemandTrip.countDocuments(filter);

      let query = OnDemandTrip.find(filter).sort({ start_time: 1 });
      
      if (isPaginated) {
        query = query.skip(skip).limit(limit);
      }

      const trips = await query.lean();

      const response = PaginationHelper.formatPaginatedResponse(trips, total, page, limit);
      res.status(200).json({
        error: false,
        message: 'Daily trips retrieved successfully',
        ...response
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAvailableTrips(req, res, next) {
    try {
      const PaginationHelper = require('../utils/paginationHelper');
      const { skip, limit, page } = req.pagination;

      const driver = await User.findOne({ user_id: req.user.user_id }).populate('assigned_vehicle_id');

      if (!driver || !driver.assigned_vehicle_id) {
        throw new CustomError('No vehicle assigned to driver', 404);
      }

      const vehicle = await findVehicleByIdentifier(driver.assigned_vehicle_id, req.user.operator_id, { lean: true });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const filter = {
        driver_id: req.user.user_id,
        vehicle_id: driver.assigned_vehicle_id,
        start_time: { $gte: today, $lt: tomorrow },
        status: { $in: ['active', 'en_route', 'at_stop', 'delayed'] }
      };

      const total = await OnDemandTrip.countDocuments(filter);
      let query = OnDemandTrip.find(filter)
        .lean()
        .select('_id trip_id route_name passengers route_points')
        .sort({ start_time: 1 });
      
      if (isPaginated) {
        query = query.skip(skip).limit(limit);
      }

      const trips = await query;

      const response = PaginationHelper.formatPaginatedResponse(trips, total, page, limit);
      res.status(200).json({
        error: false,
        message: 'Available trips retrieved successfully',
        ...response,
        data: {
          ...response.data,
          vehicle: {
            _id: vehicle._id,
            vehicle_number: vehicle.vehicle_number,
            capacity: vehicle.capacity
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async selectTripStartEnd(req, res, next) {
    try {
      const { tripId, startPointIndex, endPointIndex } = req.body;

      if (!tripId || startPointIndex === undefined || endPointIndex === undefined) {
        throw new CustomError('Trip ID and route point indices are required', 400);
      }

      const trip = await OnDemandTrip.findById(tripId);

      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }

      if (trip.driver_id !== req.user.user_id) {
        throw new CustomError('Unauthorized', 403);
      }

      if (!trip.route_points || !Array.isArray(trip.route_points) || trip.route_points.length === 0) {
        throw new CustomError('Trip route points not found', 404);
      }

      const startPoint = trip.route_points[startPointIndex];
      const endPoint = trip.route_points[endPointIndex];

      if (!startPoint || !endPoint) {
        throw new CustomError('Invalid route point indices', 400);
      }

      trip.selected_start_point = {
        name: startPoint.name,
        latitude: startPoint.latitude,
        longitude: startPoint.longitude
      };

      trip.selected_end_point = {
        name: endPoint.name,
        latitude: endPoint.latitude,
        longitude: endPoint.longitude
      };

      await trip.save();

      res.status(200).json({
        error: false,
        message: 'Trip start and end points selected successfully',
        data: trip
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePassengerStatus(req, res, next) {
    try {
      const { tripId, passengerId, status } = req.body;

      if (!tripId || !passengerId || !status) {
        throw new CustomError('Trip ID, passenger ID, and status are required', 400);
      }

      if (!['picked_up', 'dropped'].includes(status)) {
        throw new CustomError('Invalid status. Must be picked_up or dropped', 400);
      }

      const trip = await OnDemandTrip.findById(tripId);

      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }

      if (trip.driver_id !== req.user.user_id) {
        throw new CustomError('Unauthorized', 403);
      }

      const passengerIndex = trip.passengers.findIndex(
        p => p.user_id.toString() === passengerId.toString()
      );

      if (passengerIndex === -1) {
        throw new CustomError('Passenger not found in this trip', 404);
      }

      const timestamp = new Date();

      if (status === 'picked_up') {
        trip.passengers[passengerIndex].picked_up = true;
        trip.passengers[passengerIndex].picked_up_time = timestamp;
      } else if (status === 'dropped') {
        trip.passengers[passengerIndex].dropped = true;
        trip.passengers[passengerIndex].dropped_time = timestamp;
      }

      await trip.save();

      const passenger = trip.passengers[passengerIndex];

      if (global.socketManager) {
        global.socketManager.broadcastPassengerUpdate(
          tripId.toString(),
          req.user.operator_id,
          passengerId,
          status,
          status === 'picked_up' ? passenger.pickup_stop : passenger.drop_stop
        );
      }

      const firebaseService = require('../services/firebaseService');
      if (firebaseService && passenger.parent_contact) {
        const parentUser = await User.findOne({ email: passenger.parent_contact });
        if (parentUser && parentUser.fcm_tokens && parentUser.fcm_tokens.length > 0) {
          await firebaseService.sendStudentNotificationToParents(
            parentUser.fcm_tokens,
            `${passenger.name} ${status === 'picked_up' ? 'picked up' : 'dropped off'}`,
            {
              status,
              studentName: passenger.name,
              tripId: tripId.toString(),
              timestamp: timestamp.toISOString()
            }
          );
        }
      }

      res.status(200).json({
        error: false,
        message: `Passenger marked as ${status} successfully`,
        data: passenger
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateStopChecklist(req, res, next) {
    try {
      const { tripId, stopId, itemId, label, required, completed, notes } = req.body;
      const result = await TripService.updateStopChecklistItem({
        tripId,
        stopId,
        driverId: req.user.user_id,
        item: {
          itemId,
          item_id: itemId,
          label,
          required,
          completed,
          notes
        }
      });

      res.status(200).json({
        error: false,
        message: 'Stop checklist updated successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async addStopPhotoNote(req, res, next) {
    try {
      const { tripId, stopId, photoUrl, caption } = req.body;
      const result = await TripService.addStopPhotoNote({
        tripId,
        stopId,
        driverId: req.user.user_id,
        photoUrl,
        caption
      });

      res.status(200).json({
        error: false,
        message: 'Stop photo note added successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async recordStopIncident(req, res, next) {
    try {
      const {
        tripId,
        stopId,
        type,
        severity,
        description,
        passengerId,
        photoUrls,
        resolvesBlocker,
        resolved,
        resolutionNotes
      } = req.body;

      const result = await TripService.recordStopIncident({
        tripId,
        stopId,
        driverId: req.user.user_id,
        type,
        severity,
        description,
        passengerId,
        photoUrls,
        resolvesBlocker,
        resolved,
        resolutionNotes
      });

      res.status(200).json({
        error: false,
        message: 'Stop incident recorded successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req, res, next) {
    try {
      const cacheKey = `driver_profile:${req.user.user_id}`;

      const cachedDriver = await cacheService.get(cacheKey);
      if (cachedDriver) {
        return res.status(200).json({
          error: false,
          message: 'Driver profile retrieved successfully',
          data: cachedDriver,
          source: 'cache'
        });
      }

      const profile = await UserService.getUserProfile(req.user.user_id);

      await cacheService.set(cacheKey, profile, 300);

      res.status(200).json({
        error: false,
        message: 'Driver profile retrieved successfully',
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const { name, phone_number, email } = req.body;

      const driverUser = await User.findOne({ user_id: req.user.user_id, role_id: 3 });

      if (!driverUser) {
        throw new CustomError('Driver not found', 404);
      }

      const updatePayload = {};

      if (typeof name !== 'undefined') {
        updatePayload.name = name;
      }

      if (typeof email !== 'undefined') {
        if (email !== driverUser.email) {
          const emailExists = await User.findOne({ email, user_id: { $ne: driverUser.user_id } });
          if (emailExists) {
            throw new CustomError('Email already in use', 409);
          }
        }
        updatePayload.email = email;
      }

      if (typeof phone_number !== 'undefined') {
        const sanitizedPhone = typeof phone_number === 'string' ? phone_number.replace(/\D/g, '') : phone_number;

        if (!sanitizedPhone || Number.isNaN(Number(sanitizedPhone))) {
          throw new CustomError('Invalid phone number format', 400);
        }

        const numericPhone = Number(sanitizedPhone);

        if (numericPhone !== driverUser.phone_number) {
          const phoneExists = await User.findOne({ phone_number: numericPhone, user_id: { $ne: driverUser.user_id } });
          if (phoneExists) {
            throw new CustomError('Phone number already in use', 409);
          }
        }
        updatePayload.phone_number = numericPhone;
      }

      const hasUpdates = Object.keys(updatePayload).length > 0;

      const updatedDriverDocument = hasUpdates
        ? await User.findOneAndUpdate(
          { user_id: driverUser.user_id },
          updatePayload,
          { new: true, lean: true }
        )
        : await User.findOne({ user_id: driverUser.user_id }).lean();

      if (!updatedDriverDocument) {
        throw new CustomError('Driver not found', 404);
      }

      const assignedVehicle = updatedDriverDocument.assigned_vehicle_id
        ? await Vehicle.findOne({ vehicle_id: updatedDriverDocument.assigned_vehicle_id }).lean()
        : null;

      await Driver.findOneAndUpdate(
        { user_id: driverUser.user_id },
        {
          name: updatedDriverDocument.name,
          email: updatedDriverDocument.email,
          phone_number: updatedDriverDocument.phone_number
        }
      );

      const responseData = {
        ...updatedDriverDocument,
        assigned_vehicle: assignedVehicle
      };

      res.status(200).json({
        error: false,
        message: 'Driver profile updated successfully',
        data: responseData
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSpeedAlarmSettings(req, res, next) {
    try {
      const { tripId, speedAlarmEnabled, speedLimit } = req.body;

      if (!tripId) {
        throw new CustomError('Trip ID is required', 400);
      }

      const trip = await OnDemandTrip.findById(tripId);

      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }

      if (trip.driver_id !== req.user.user_id) {
        throw new CustomError('Unauthorized', 403);
      }

      if (speedAlarmEnabled !== undefined) {
        trip.speed_alarm_enabled = speedAlarmEnabled;
      }

      if (speedLimit !== undefined && speedLimit > 0) {
        trip.speed_limit = speedLimit;
      }

      await trip.save();

      res.status(200).json({
        error: false,
        message: 'Speed alarm settings updated successfully',
        data: {
          speed_alarm_enabled: trip.speed_alarm_enabled,
          speed_limit: trip.speed_limit
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async recordSpeed(req, res, next) {
    try {
      const { tripId, currentSpeed, location } = req.body;

      if (!tripId || currentSpeed === undefined) {
        throw new CustomError('Trip ID and current speed are required', 400);
      }

      const trip = await OnDemandTrip.findById(tripId);

      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }

      if (trip.driver_id !== req.user.user_id) {
        throw new CustomError('Unauthorized', 403);
      }

      const speedAlarm = trip.speed_alarm_enabled && currentSpeed > trip.speed_limit;

      if (speedAlarm && global.socketManager) {
        global.socketManager.broadcastSpeedAlert(
          tripId,
          req.user.operator_id,
          currentSpeed,
          trip.speed_limit,
          req.user.user_id
        );
      }

      res.status(200).json({
        error: false,
        message: 'Speed recorded successfully',
        data: {
          current_speed: currentSpeed,
          speed_limit: trip.speed_limit,
          alarm_triggered: speedAlarm,
          timestamp: new Date()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async registerFCMToken(req, res, next) {
    try {
      const { fcmToken } = req.body;

      if (!fcmToken) {
        throw new CustomError('FCM token is required', 400);
      }

      const driver = await User.findOneAndUpdate(
        { user_id: req.user.user_id },
        {
          fcm_token: fcmToken,
          $addToSet: { fcm_tokens: fcmToken }
        },
        { new: true }
      );

      if (!driver) {
        throw new CustomError('Driver not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'FCM token registered successfully',
        data: { fcm_token: fcmToken }
      });
    } catch (error) {
      next(error);
    }
  }

  static async unregisterFCMToken(req, res, next) {
    try {
      const { fcmToken } = req.body;

      if (!fcmToken) {
        throw new CustomError('FCM token is required', 400);
      }

      const driver = await User.findOneAndUpdate(
        { user_id: req.user.user_id },
        { $pull: { fcm_tokens: fcmToken } },
        { new: true }
      );

      if (!driver) {
        throw new CustomError('Driver not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'FCM token unregistered successfully',
        data: { removed: fcmToken }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getScheduledTrips(req, res, next) {
    try {
      const PaginationHelper = require('../utils/paginationHelper');
      const { skip, limit, page } = req.pagination;
      const ScheduledTrip = require('../models/ScheduledTrip');
      const driverIdentifiers = await getDriverIdentifiers(req.user.user_id);

      const filter = { driver_id: { $in: driverIdentifiers } };
      const total = await ScheduledTrip.countDocuments(filter);

      const scheduledTrips = await ScheduledTrip.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ scheduled_start_time: 1 })
        .lean();

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

  static async getTodaysScheduledTrips(req, res, next) {
    try {
      const ScheduledTrip = require('../models/ScheduledTrip');

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayName = dayNames[new Date().getDay()];
      const repeatDayKey = `repeat_days.${todayName}`;
      const driverIdentifiers = await getDriverIdentifiers(req.user.user_id);
      const resetDateKey = new Date().toISOString().slice(0, 10);

      await ScheduledTrip.updateMany(
        {
          driver_id: { $in: driverIdentifiers },
          status: 'completed',
          last_completed_on: { $ne: resetDateKey }
        },
        {
          $set: {
            status: 'pending',
            associated_trip_id: null,
            last_started_on: null,
            last_status_change_at: new Date()
          }
        }
      );

      const scheduledTrips = await ScheduledTrip.find({
        driver_id: { $in: driverIdentifiers },
        is_active: true,
        [repeatDayKey]: true,
        status: { $ne: 'completed' },
        $or: [
          { last_completed_on: { $ne: resetDateKey } },
          { last_completed_on: null }
        ]
      }).sort({ scheduled_start_time: 1 });

      const plannedTrips = await TripService.ensurePlannedTripsForScheduledTrips(scheduledTrips, resetDateKey);
      const plannedTripMap = new Map(plannedTrips.map(planned => [planned.scheduled_trip_id, planned]));

      const tripsWithVehicles = await Promise.all(
        scheduledTrips.map(async trip => {
          const vehicle = await findVehicleByIdentifier(trip.vehicle_id, req.user.operator_id, { lean: true });
          const tripData = trip.toObject();
          tripData.vehicle_id = vehicle;
          const completedToday = tripData.last_completed_on === resetDateKey;
          tripData.isCompletedToday = completedToday;
          tripData.daily_status = completedToday ? 'completed' : tripData.status;
          const plannedTrip = plannedTripMap.get(tripData.scheduled_trip_id);
          if (plannedTrip) {
            tripData.planned_trip_id = plannedTrip.trip_id || plannedTrip._id;
            tripData.planned_start_time = plannedTrip.planned_start_time;
            tripData.planned_end_time = plannedTrip.planned_end_time;
            tripData.planned_route_points = plannedTrip.route_points;
            tripData.passenger_manifest = plannedTrip.passengers;
            tripData.total_passengers_planned = plannedTrip.total_passengers;
          }
          return tripData;
        })
      );

      res.status(200).json({
        error: false,
        message: 'Today\'s scheduled trips retrieved successfully',
        data: tripsWithVehicles
      });
    } catch (error) {
      next(error);
    }
  }

  static async startScheduledTrip(req, res, next) {
    try {
      const ScheduledTrip = require('../models/ScheduledTrip');
      const { scheduledTripId } = req.params;
      const driverIdentifiers = await getDriverIdentifiers(req.user.user_id);

      const scheduledTrip = await ScheduledTrip.findOne({
        scheduled_trip_id: scheduledTripId,
        driver_id: { $in: driverIdentifiers }
      });

      if (!scheduledTrip) {
        throw new CustomError('Scheduled trip not found', 404);
      }

      if (scheduledTrip.status === 'in-progress') {
        throw new CustomError('This trip is already in progress', 400);
      }

      if (!scheduledTrip.is_active) {
        throw new CustomError('This trip is inactive', 400);
      }

      const now = new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayName = dayNames[now.getDay()];
      if (!scheduledTrip.repeat_days?.[todayName]) {
        throw new CustomError('This trip is not scheduled for today', 400);
      }

      const todayKey = now.toISOString().slice(0, 10);
      if (scheduledTrip.last_completed_on === todayKey) {
        throw new CustomError('This trip has already been completed today', 400);
      }

      const trip = await TripService.startTripFromScheduled({
        scheduledTrip,
        driver_id: req.user.user_id,
        operator_id: req.user.operator_id
      });

      await ScheduledTrip.updateOne(
        { scheduled_trip_id: scheduledTripId },
        {
          associated_trip_id: trip.trip_id || trip._id,
          status: 'in-progress',
          last_started_on: todayKey,
          last_status_change_at: now
        }
      );

      if (global.socketManager) {
        global.socketManager.emitToTrip(trip._id.toString(), 'trip_started', {
          tripId: trip._id,
          driverId: req.user.user_id,
          vehicleId: scheduledTrip.vehicle_id,
          routeName: scheduledTrip.route_name,
          startLocation: scheduledTrip.start_location,
          timestamp: new Date()
        });
        global.socketManager.emitToOperator(req.user.operator_id, 'trip_started', {
          tripId: trip._id,
          driverId: req.user.user_id,
          vehicleId: scheduledTrip.vehicle_id,
          timestamp: new Date()
        });
      }

      res.status(201).json({
        error: false,
        message: 'Scheduled trip started successfully',
        data: trip
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DriverController;

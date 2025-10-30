const TripService = require('../services/tripService');
const cacheService = require('../services/cacheService');
const QueryOptimizer = require('../utils/queryOptimizer');
const TrackingData = require('../models/TrackingData');
const { CustomError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const Trip = require('../models/Trip');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');

class DriverController {
  static async startTrip(req, res, next) {
    try {
      const { vehicle_id, route_name, start_location } = req.body;

      if (!vehicle_id) {
        throw new CustomError('Vehicle ID is required', 400);
      }

      const trip = await TripService.startTrip({
        vehicle_id,
        driver_id: req.user.id,
        operator_id: req.user.operator_id,
        route_name,
        start_location
      });

      if (global.socketManager) {
        global.socketManager.emitToTrip(trip._id.toString(), 'trip_started', {
          tripId: trip._id,
          driverId: req.user.id,
          vehicleId: vehicle_id,
          routeName: route_name,
          startLocation: start_location,
          timestamp: new Date()
        });
        global.socketManager.emitToOperator(req.user.operator_id, 'trip_started', {
          tripId: trip._id,
          driverId: req.user.id,
          vehicleId: vehicle_id,
          routeName: route_name,
          timestamp: new Date()
        });
      }

      res.status(201).json({
        error: false,
        message: 'Trip started successfully',
        data: trip
      });
    } catch (error) {
      next(error);
    }
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

      if (global.socketManager) {
        global.socketManager.emitToTrip(tripId, 'trip_ended', {
          tripId,
          driverId: req.user.id,
          endLocation: end_location,
          distanceTraveled: distance_traveled,
          timestamp: new Date()
        });
        global.socketManager.emitToOperator(req.user.operator_id, 'trip_ended', {
          tripId,
          driverId: req.user.id,
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
      const Trip = require('../models/Trip');
      const trip = await Trip.findOne({
        driver_id: req.user.id,
        status: 'active'
      }).populate('vehicle_id');

      if (!trip) {
        throw new CustomError('No active trip found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Active trip retrieved successfully',
        data: trip
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTripHistory(req, res, next) {
    try {
      const { skip, limit, page } = req.pagination;

      const total = await Trip.countDocuments({
        driver_id: req.user.id
      });

      const trips = await Trip.find({
        driver_id: req.user.id
      })
        .populate('vehicle_id')
        .skip(skip)
        .limit(limit)
        .sort({ start_time: -1 });

      const PaginationHelper = require('../utils/paginationHelper');
      const response = PaginationHelper.formatPaginatedResponse(trips, total, page, limit);

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
      const trip = await TripService.getTripById(tripId);

      if (trip.driver_id.toString() !== req.user.id) {
        throw new CustomError('Unauthorized', 403);
      }

      const analytics = await TripService.getTripAnalytics(tripId);

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
        data: { driver_id: req.user.id, location }
      });

      if (global.socketManager) {
        global.socketManager.broadcastSOSAlert(
          tripId,
          req.user.operator_id,
          location,
          'driver',
          req.user.id
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
      const Vehicle = require('../models/Vehicle');

      const vehicle = await Vehicle.findById(vehicleId).populate('device_id');
      if (!vehicle) {
        throw new CustomError('Vehicle not found', 404);
      }

      const latestTracking = await TrackingData.findOne({
        vehicle_id: vehicleId
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
      const totalTrips = await Trip.countDocuments({ driver_id: req.user.id });
      const completedTrips = await Trip.countDocuments({
        driver_id: req.user.id,
        status: 'completed'
      });

      const activeTrips = await Trip.countDocuments({
        driver_id: req.user.id,
        status: 'active'
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
      const { skip, limit, page } = req.pagination;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const total = await Trip.countDocuments({
        driver_id: req.user.id,
        start_time: { $gte: today, $lt: tomorrow }
      });

      const trips = await Trip.find({
        driver_id: req.user.id,
        start_time: { $gte: today, $lt: tomorrow }
      })
        .populate('vehicle_id', 'vehicle_number route_points capacity')
        .skip(skip)
        .limit(limit)
        .sort({ start_time: 1 });

      const PaginationHelper = require('../utils/paginationHelper');
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
      const driver = await User.findOne({ user_id: req.user.id }).populate('assigned_vehicle_id');

      if (!driver || !driver.assigned_vehicle_id) {
        throw new CustomError('No vehicle assigned to driver', 404);
      }

      const vehicle = await Vehicle.findById(driver.assigned_vehicle_id);

      if (!vehicle) {
        throw new CustomError('Vehicle not found', 404);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const trips = await Trip.find({
        driver_id: req.user.id,
        vehicle_id: driver.assigned_vehicle_id,
        start_time: { $gte: today, $lt: tomorrow },
        status: 'active'
      }).select('_id route_name passengers route_points');

      res.status(200).json({
        error: false,
        message: 'Available trips retrieved successfully',
        data: {
          vehicle: {
            _id: vehicle._id,
            vehicle_number: vehicle.vehicle_number,
            route_points: vehicle.route_points,
            capacity: vehicle.capacity
          },
          trips
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

      const trip = await Trip.findById(tripId);

      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }

      if (trip.driver_id !== req.user.id) {
        throw new CustomError('Unauthorized', 403);
      }

      const vehicle = await Vehicle.findById(trip.vehicle_id);

      if (!vehicle || !vehicle.route_points) {
        throw new CustomError('Vehicle route points not found', 404);
      }

      const startPoint = vehicle.route_points[startPointIndex];
      const endPoint = vehicle.route_points[endPointIndex];

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

      const trip = await Trip.findById(tripId);

      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }

      if (trip.driver_id !== req.user.id) {
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

  static async getProfile(req, res, next) {
    try {
      const cacheKey = `driver_profile:${req.user.id}`;

      const cachedDriver = await cacheService.get(cacheKey);
      if (cachedDriver) {
        return res.status(200).json({
          error: false,
          message: 'Driver profile retrieved successfully',
          data: cachedDriver,
          source: 'cache'
        });
      }

      const populateStrategy = QueryOptimizer.getOptimalPopulateStrategy('user');
      let mongooseQuery = User.findOne({ user_id: req.user.id })
        .select(QueryOptimizer.getFieldSelection('driver', 'full'));

      for (const populate of populateStrategy) {
        mongooseQuery = mongooseQuery.populate(populate);
      }

      const driver = await mongooseQuery.exec();

      if (!driver) {
        throw new CustomError('Driver not found', 404);
      }

      await cacheService.set(cacheKey, driver, 300);

      res.status(200).json({
        error: false,
        message: 'Driver profile retrieved successfully',
        data: driver
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const { name, phone_number, email } = req.body;

      const driver = await User.findOneAndUpdate(
        { user_id: req.user.id },
        { name, phone_number, email },
        { new: true }
      ).populate('vehicle_id');

      if (!driver) {
        throw new CustomError('Driver not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Driver profile updated successfully',
        data: driver
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

      const trip = await Trip.findById(tripId);

      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }

      if (trip.driver_id !== req.user.id) {
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

      const trip = await Trip.findById(tripId);

      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }

      if (trip.driver_id !== req.user.id) {
        throw new CustomError('Unauthorized', 403);
      }

      const speedAlarm = trip.speed_alarm_enabled && currentSpeed > trip.speed_limit;

      if (speedAlarm && global.socketManager) {
        global.socketManager.broadcastSpeedAlert(
          tripId,
          req.user.operator_id,
          currentSpeed,
          trip.speed_limit,
          req.user.id
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
        { user_id: req.user.id },
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
        { user_id: req.user.id },
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
}

module.exports = DriverController;

const OnDemandTrip = require('../models/Trip');
const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const ScheduledTrip = require('../models/ScheduledTrip');
const TripHistory = require('../models/TripHistory');
const Vehicle = require('../models/Vehicle');
const TrackingData = require('../models/TrackingData');
const User = require('../models/User');
const Operator = require('../models/Operator');
const logger = require('../utils/logger');
const { NotificationQueueService } = require('./notificationQueueService');
const { CustomError } = require('../middlewares/errorHandler');

const normalizeIdentifier = (value) => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
};

const buildVehicleMatchFilter = (value) => {
  const normalized = normalizeIdentifier(value);
  if (!normalized) {
    return null;
  }
  if (mongoose.Types.ObjectId.isValid(normalized)) {
    return {
      $or: [
        { _id: new mongoose.Types.ObjectId(normalized) },
        { vehicle_id: normalized }
      ]
    };
  }
  return { vehicle_id: normalized };
};

const buildTripMatchFilter = (value) => {
  const normalized = normalizeIdentifier(value);
  if (!normalized) {
    return null;
  }
  if (mongoose.Types.ObjectId.isValid(normalized)) {
    return {
      $or: [
        { _id: new mongoose.Types.ObjectId(normalized) },
        { trip_id: normalized }
      ]
    };
  }
  return { trip_id: normalized };
};

const findVehicleByIdentifier = async (identifier) => {
  const filter = buildVehicleMatchFilter(identifier);
  if (!filter) {
    return null;
  }
  const vehicle = await Vehicle.findOne(filter).lean();
  if (!vehicle) {
    return null;
  }
  return vehicle;
};

const findDriverByUserId = async (userId) => {
  const driver = await User.findOne({ user_id: userId }).lean();
  if (!driver) {
    return null;
  }
  return driver;
};

const findOperatorById = async (operatorId) => {
  const operator = await Operator.findOne({ operator_id: operatorId }).select('operator_id').lean();
  if (!operator) {
    return null;
  }
  return operator;
};

class TripService {
  static async startTrip(tripData) {
    try {
      const vehicle = await findVehicleByIdentifier(tripData.vehicle_id);

      if (!vehicle) {
        throw new CustomError('Vehicle not found', 404);
      }

      const driver = await findDriverByUserId(tripData.driver_id);
      if (!driver) {
        throw new CustomError('Driver not found', 404);
      }

      const requestedOperatorId = tripData.operator_id || driver.operator_id;
      const operator = requestedOperatorId ? await findOperatorById(requestedOperatorId) : null;
      if (!operator) {
        throw new CustomError('Operator not found', 404);
      }

      const vehicleOperatorId = vehicle.operator_id;
      const driverOperatorId = driver.operator_id;

      if (!vehicleOperatorId) {
        throw new CustomError('Vehicle is not linked to any operator', 409);
      }

      if (!driverOperatorId) {
        throw new CustomError('Driver is not linked to any operator', 409);
      }

      if (driverOperatorId !== vehicleOperatorId) {
        throw new CustomError('Driver and vehicle belong to different operators', 409);
      }

      if (operator.operator_id !== vehicleOperatorId) {
        throw new CustomError('Authenticated operator does not match vehicle operator', 403);
      }

      const tripPayload = {
        ...tripData,
        vehicle_id: vehicle.vehicle_id,
        driver_id: driver.user_id,
        operator_id: vehicleOperatorId,
        start_time: new Date(),
        status: 'active'
      };

      if (tripPayload.route_points && !Array.isArray(tripPayload.route_points)) {
        delete tripPayload.route_points;
      }

      const trip = new OnDemandTrip(tripPayload);

      await trip.save();
      await Vehicle.findOneAndUpdate(buildVehicleMatchFilter(vehicle.vehicle_id), { current_status: 'active' });
      logger.loggerInfo(`Trip started: ${trip._id}`);
      return trip;
    } catch (error) {
      logger.loggerError(`Error starting trip: ${error.message}`);
      throw error;
    }
  }

  static async getTripByIdentifier(tripIdentifier, options = {}) {
    const filter = buildTripMatchFilter(tripIdentifier);
    if (!filter) {
      throw new CustomError('Trip ID is required', 400);
    }
    let query = OnDemandTrip.findOne(filter);
    if (options.populate) {
      const populateItems = Array.isArray(options.populate) ? options.populate : [options.populate];
      for (const populateItem of populateItems) {
        query = query.populate(populateItem);
      }
    }
    if (options.select) {
      query = query.select(options.select);
    }
    if (options.lean) {
      query = query.lean();
    }
    const trip = await query;
    if (!trip) {
      throw new CustomError('Trip not found', 404);
    }
    return trip;
  }

  static async getTripById(tripId) {
    return this.getTripByIdentifier(tripId, {
      populate: ['vehicle_id', 'driver_id', 'operator_id']
    });
  }

  static async getAllTrips(filters = {}) {
    try {
      const query = {};
      if (filters.vehicle_id) query.vehicle_id = filters.vehicle_id;
      if (filters.driver_id) query.driver_id = filters.driver_id;
      if (filters.operator_id) query.operator_id = filters.operator_id;
      if (filters.status) query.status = filters.status;

      const trips = await OnDemandTrip.find(query)
        .populate('vehicle_id')
        .populate('driver_id')
        .populate('operator_id')
        .sort({ start_time: -1 });
      return trips;
    } catch (error) {
      logger.loggerError(`Error fetching trips: ${error.message}`);
      throw error;
    }
  }

  static async endTrip(tripId, endData) {
    try {
      const trip = await this.getTripByIdentifier(tripId);
      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }

      const vehicleIdentifier = normalizeIdentifier(trip.vehicle_id);

      trip.end_time = new Date();
      trip.end_location = endData.end_location;
      trip.status = 'completed';
      trip.distance_traveled = endData.distance_traveled;
      trip.duration = (trip.end_time - trip.start_time) / (1000 * 60);

      if (!trip.vehicle_id && vehicleIdentifier) {
        trip.vehicle_id = vehicleIdentifier;
      }

      await trip.save();
      if (trip.scheduled_trip_id) {
        const scheduledId = normalizeIdentifier(trip.scheduled_trip_id);
        if (scheduledId) {
          const completionTimestamp = new Date();
          await ScheduledTrip.updateOne(
            { scheduled_trip_id: scheduledId },
            {
              status: 'completed',
              last_completed_on: completionTimestamp.toISOString().slice(0, 10),
              last_status_change_at: completionTimestamp
            }
          );
        }
      }
      if (vehicleIdentifier) {
        await Vehicle.findOneAndUpdate(buildVehicleMatchFilter(vehicleIdentifier), { current_status: 'idle' });
      }
      logger.loggerInfo(`Trip ended: ${trip._id}`);
      return trip;
    } catch (error) {
      logger.loggerError(`Error ending trip: ${error.message}`);
      throw error;
    }
  }

  static async cancelTrip(tripId, reason) {
    try {
      const filter = buildTripMatchFilter(tripId);
      if (!filter) {
        throw new CustomError('Trip ID is required', 400);
      }
      const trip = await OnDemandTrip.findOneAndUpdate(
        filter,
        {
          status: 'cancelled',
          end_time: new Date()
        },
        { new: true }
      );

      if (trip) {
        const vehicleIdentifier = normalizeIdentifier(trip.vehicle_id);
        if (vehicleIdentifier) {
          await Vehicle.findOneAndUpdate(buildVehicleMatchFilter(vehicleIdentifier), { current_status: 'idle' });
        }
      }

      logger.loggerInfo(`Trip cancelled: ${trip._id} - Reason: ${reason}`);
      return trip;
    } catch (error) {
      logger.loggerError(`Error cancelling trip: ${error.message}`);
      throw error;
    }
  }

  static async addStop(tripId, stopData) {
    try {
      const filter = buildTripMatchFilter(tripId);
      if (!filter) {
        throw new CustomError('Trip ID is required', 400);
      }
      const trip = await OnDemandTrip.findOneAndUpdate(
        filter,
        { $push: { stops: stopData } },
        { new: true }
      );
      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }
      return trip;
    } catch (error) {
      logger.loggerError(`Error adding stop: ${error.message}`);
      throw error;
    }
  }

  static async recordSpeedViolation(tripId, violationData) {
    try {
      const filter = buildTripMatchFilter(tripId);
      if (!filter) {
        throw new CustomError('Trip ID is required', 400);
      }
      const trip = await OnDemandTrip.findOneAndUpdate(
        filter,
        { $push: { speed_violations: violationData } },
        { new: true }
      );
      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }
      logger.loggerInfo(`Speed violation recorded for trip: ${tripId}`);
      return trip;
    } catch (error) {
      logger.loggerError(`Error recording speed violation: ${error.message}`);
      throw error;
    }
  }

  static async recordRouteDeviation(tripId, deviationData) {
    try {
      const filter = buildTripMatchFilter(tripId);
      if (!filter) {
        throw new CustomError('Trip ID is required', 400);
      }
      const trip = await OnDemandTrip.findOneAndUpdate(
        filter,
        { $push: { route_deviations: deviationData } },
        { new: true }
      );
      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }
      logger.loggerInfo(`Route deviation recorded for trip: ${tripId}`);
      return trip;
    } catch (error) {
      logger.loggerError(`Error recording route deviation: ${error.message}`);
      throw error;
    }
  }

  static async getTripAnalytics(tripId) {
    try {
      const trip = await this.getTripByIdentifier(tripId);
      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }

      const vehicleIdentifier = normalizeIdentifier(trip.vehicle_id);

      const trackingData = await TrackingData.find({ trip_id: tripId }).sort({ timestamp: 1 });

      const analytics = {
        trip_id: trip._id,
        vehicle_id: vehicleIdentifier || trip.vehicle_id,
        driver_id: trip.driver_id,
        start_time: trip.start_time,
        end_time: trip.end_time,
        duration_minutes: trip.duration,
        distance_traveled: trip.distance_traveled,
        average_speed: trip.average_speed,
        max_speed: trip.max_speed,
        speed_violations_count: trip.speed_violations?.length || 0,
        route_deviations_count: trip.route_deviations?.length || 0,
        total_stops: trip.stops?.length || 0,
        tracking_points: trackingData.length
      };

      return analytics;
    } catch (error) {
      logger.loggerError(`Error fetching trip analytics: ${error.message}`);
      throw error;
    }
  }

  static async getActiveTrips() {
    try {
      const trips = await OnDemandTrip.find({ status: 'active' })
        .populate('vehicle_id')
        .populate('driver_id')
        .populate('operator_id');
      return trips;
    } catch (error) {
      logger.loggerError(`Error fetching active trips: ${error.message}`);
      throw error;
    }
  }

  static async scheduleAdvanceNotifications(tripId, notificationAdvanceMinutes = 5) {
    try {
      const filter = buildTripMatchFilter(tripId);
      if (!filter) {
        throw new CustomError('Trip ID is required', 400);
      }
      const trip = await OnDemandTrip.findOne(filter).populate('passengers.user_id');
      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }

      logger.loggerInfo(`Scheduling advance notifications for trip ${tripId} (${notificationAdvanceMinutes} mins before)`);

      const results = [];
      for (const passenger of trip.passengers) {
        try {
          const parentUser = await User.findOne({ email: passenger.parent_contact });
          if (!parentUser) {
            logger.loggerWarn(`No parent user found for passenger contact: ${passenger.parent_contact}`);
            continue;
          }

          const pickupJob = await NotificationQueueService.schedulePickupNotification(
            tripId,
            parentUser._id,
            notificationAdvanceMinutes,
            passenger.name,
            passenger.pickup_stop?.name || 'Pickup Stop'
          );

          const dropoffJob = await NotificationQueueService.scheduleDropoffNotification(
            tripId,
            parentUser._id,
            notificationAdvanceMinutes,
            passenger.name,
            passenger.drop_stop?.name || 'Drop Stop'
          );

          results.push({
            passengerId: passenger.user_id._id,
            passengerName: passenger.name,
            pickupJobId: pickupJob.id,
            dropoffJobId: dropoffJob.id
          });
        } catch (error) {
          logger.loggerError(`Error scheduling notifications for passenger ${passenger.name}: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      logger.loggerError(`Error scheduling advance notifications: ${error.message}`);
      throw error;
    }
  }

  static async checkGeofenceViolations(tripId, currentLocation) {
    try {
      const trip = await this.getTripByIdentifier(tripId);
      if (!trip) throw new CustomError('Trip not found', 404);

      const violations = [];
      const geofenceRadius = 100;

      for (const passenger of trip.passengers) {
        const parentUser = await User.findOne({ email: passenger.parent_contact });
        if (!parentUser || !parentUser.geofence) continue;

        const { latitude: gfLat, longitude: gfLng, radius = geofenceRadius } = parentUser.geofence;
        const { latitude: currentLat, longitude: currentLng } = currentLocation;

        const distance = this.calculateHaversineDistance(
          gfLat, gfLng,
          currentLat, currentLng
        );

        if (distance > radius && !passenger.geofence_exit_alert_sent) {
          violations.push({
            passengerId: passenger.user_id,
            passengerName: passenger.name,
            parentId: parentUser._id,
            distanceFromGeofence: distance,
            geofenceRadius: radius,
            currentLocation
          });

          passenger.geofence_exit_alert_sent = true;
        }
      }

      if (violations.length > 0) {
        await trip.save();
        logger.loggerInfo(`Geofence violations detected for trip ${tripId}: ${violations.length}`);

        if (global.socketManager) {
          for (const violation of violations) {
            global.socketManager.emitToParent(
              violation.parentId.toString(),
              'geofence_alert',
              {
                tripId: trip._id,
                studentName: violation.passengerName,
                message: `Your child's vehicle has exited the geofence boundary`,
                currentLocation: violation.currentLocation,
                distance: violation.distanceFromGeofence.toFixed(2),
                timestamp: new Date()
              }
            );
          }
        }
      }

      return violations;
    } catch (error) {
      logger.loggerError(`Error checking geofence violations: ${error.message}`);
      throw error;
    }
  }

  static calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    return distanceKm;
  }

  static async sendStudentNotificationToParent(tripId, passengerId, status) {
    try {
      const trip = await this.getTripByIdentifier(tripId);
      if (!trip) throw new CustomError('Trip not found', 404);

      const passenger = trip.passengers.find(p => p.user_id.toString() === passengerId.toString());
      if (!passenger) throw new CustomError('Passenger not found', 404);

      const parentUser = await User.findOne({ email: passenger.parent_contact });
      if (!parentUser || !parentUser.fcm_tokens || parentUser.fcm_tokens.length === 0) {
        logger.loggerWarn(`No FCM tokens for parent of passenger ${passengerId}`);
        return;
      }

      if (status === 'picked_up' && !passenger.notification_sent_before_pickup) {
        await NotificationQueueService.scheduleStudentPickupNotification(
          tripId,
          parentUser._id,
          passenger.name,
          passenger.pickup_stop
        );
        passenger.notification_sent_before_pickup = true;
      } else if (status === 'dropped' && !passenger.notification_sent_before_dropoff) {
        await NotificationQueueService.scheduleStudentDropoffNotification(
          tripId,
          parentUser._id,
          passenger.name,
          passenger.drop_stop
        );
        passenger.notification_sent_before_dropoff = true;
      }

      await trip.save();
      logger.loggerInfo(`Sent ${status} notification for passenger ${passengerId}`);
    } catch (error) {
      logger.loggerError(`Error sending student notification: ${error.message}`);
      throw error;
    }
  }

  static async startTripFromScheduled(data) {
    try {
      const { scheduledTrip, driver_id, operator_id } = data;

      const vehicle = await findVehicleByIdentifier(scheduledTrip.vehicle_id);
      if (!vehicle) {
        throw new CustomError('Vehicle not found', 404);
      }

      const tripPayload = {
        vehicle_id: vehicle.vehicle_id,
        driver_id: driver_id,
        operator_id: operator_id,
        route_name: scheduledTrip.route_name,
        start_location: scheduledTrip.start_location,
        route_points: Array.isArray(scheduledTrip.route_points) ? scheduledTrip.route_points : undefined,
        start_time: new Date(),
        trip_period: scheduledTrip.trip_period,
        scheduled_trip_id: scheduledTrip.scheduled_trip_id,
        status: 'active'
      };

      if (!tripPayload.route_points) {
        delete tripPayload.route_points;
      }

      const trip = new OnDemandTrip(tripPayload);
      await trip.save();
      await Vehicle.findOneAndUpdate(buildVehicleMatchFilter(vehicle.vehicle_id), { current_status: 'active' });

      logger.loggerInfo(`Trip started from scheduled trip: ${trip._id}`);
      return trip;
    } catch (error) {
      logger.loggerError(`Error starting trip from scheduled: ${error.message}`);
      throw error;
    }
  }
}

module.exports = TripService;

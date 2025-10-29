const Trip = require('../models/Trip');
const Vehicle = require('../models/Vehicle');
const TrackingData = require('../models/TrackingData');
const User = require('../models/User');
const logger = require('../utils/logger');
const { NotificationQueueService } = require('./notificationQueueService');

class TripService {
  static async startTrip(tripData) {
    try {
      const vehicle = await Vehicle.findById(tripData.vehicle_id);
      if (!vehicle) {
        throw new Error('Vehicle not found');
      }

      const trip = new Trip({
        ...tripData,
        start_time: new Date(),
        status: 'active'
      });

      await trip.save();
      await Vehicle.findByIdAndUpdate(tripData.vehicle_id, { current_status: 'active' });
      logger.loggerInfo(`Trip started: ${trip._id}`);
      return trip;
    } catch (error) {
      logger.loggerError(`Error starting trip: ${error.message}`);
      throw error;
    }
  }

  static async getTripById(tripId) {
    try {
      const trip = await Trip.findById(tripId)
        .populate('vehicle_id')
        .populate('driver_id')
        .populate('operator_id');
      if (!trip) {
        throw new Error('Trip not found');
      }
      return trip;
    } catch (error) {
      logger.loggerError(`Error fetching trip: ${error.message}`);
      throw error;
    }
  }

  static async getAllTrips(filters = {}) {
    try {
      const query = {};
      if (filters.vehicle_id) query.vehicle_id = filters.vehicle_id;
      if (filters.driver_id) query.driver_id = filters.driver_id;
      if (filters.operator_id) query.operator_id = filters.operator_id;
      if (filters.status) query.status = filters.status;

      const trips = await Trip.find(query)
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
      const trip = await Trip.findById(tripId);
      if (!trip) {
        throw new Error('Trip not found');
      }

      trip.end_time = new Date();
      trip.end_location = endData.end_location;
      trip.status = 'completed';
      trip.distance_traveled = endData.distance_traveled;
      trip.duration = (trip.end_time - trip.start_time) / (1000 * 60);

      await trip.save();
      await Vehicle.findByIdAndUpdate(trip.vehicle_id, { current_status: 'idle' });
      logger.loggerInfo(`Trip ended: ${trip._id}`);
      return trip;
    } catch (error) {
      logger.loggerError(`Error ending trip: ${error.message}`);
      throw error;
    }
  }

  static async cancelTrip(tripId, reason) {
    try {
      const trip = await Trip.findByIdAndUpdate(
        tripId,
        {
          status: 'cancelled',
          end_time: new Date()
        },
        { new: true }
      );

      if (trip) {
        await Vehicle.findByIdAndUpdate(trip.vehicle_id, { current_status: 'idle' });
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
      const trip = await Trip.findByIdAndUpdate(
        tripId,
        { $push: { stops: stopData } },
        { new: true }
      );
      return trip;
    } catch (error) {
      logger.loggerError(`Error adding stop: ${error.message}`);
      throw error;
    }
  }

  static async recordSpeedViolation(tripId, violationData) {
    try {
      const trip = await Trip.findByIdAndUpdate(
        tripId,
        { $push: { speed_violations: violationData } },
        { new: true }
      );
      logger.loggerInfo(`Speed violation recorded for trip: ${tripId}`);
      return trip;
    } catch (error) {
      logger.loggerError(`Error recording speed violation: ${error.message}`);
      throw error;
    }
  }

  static async recordRouteDeviation(tripId, deviationData) {
    try {
      const trip = await Trip.findByIdAndUpdate(
        tripId,
        { $push: { route_deviations: deviationData } },
        { new: true }
      );
      logger.loggerInfo(`Route deviation recorded for trip: ${tripId}`);
      return trip;
    } catch (error) {
      logger.loggerError(`Error recording route deviation: ${error.message}`);
      throw error;
    }
  }

  static async getTripAnalytics(tripId) {
    try {
      const trip = await Trip.findById(tripId);
      if (!trip) {
        throw new Error('Trip not found');
      }

      const trackingData = await TrackingData.find({ trip_id: tripId }).sort({ timestamp: 1 });

      const analytics = {
        trip_id: trip._id,
        vehicle_id: trip.vehicle_id,
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
      const trips = await Trip.find({ status: 'active' })
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
      const trip = await Trip.findById(tripId).populate('passengers.user_id');
      if (!trip) {
        throw new Error('Trip not found');
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
      const trip = await Trip.findById(tripId);
      if (!trip) throw new Error('Trip not found');

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
      const trip = await Trip.findById(tripId);
      if (!trip) throw new Error('Trip not found');

      const passenger = trip.passengers.find(p => p.user_id.toString() === passengerId.toString());
      if (!passenger) throw new Error('Passenger not found');

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
}

module.exports = TripService;

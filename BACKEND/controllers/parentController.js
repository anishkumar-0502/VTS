const TrackingData = require('../models/TrackingData');
const Trip = require('../models/Trip');
const NotificationService = require('../services/notificationService');
const { CustomError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { sendNotification } = require('../services/firebaseService');

class ParentController {
  static async getCurrentTrip(req, res, next) {
    try {
      const { childId } = req.query;

      if (!childId) {
        throw new CustomError('Child ID is required', 400);
      }

      const child = await User.findOne({ user_id: childId });
      if (!child) {
        throw new CustomError('Child not found', 404);
      }

      const trip = await Trip.findOne({
        status: 'active',
        passengers: { $elemMatch: { user_id: childId } }
      }).populate('vehicle_id').populate('driver_id');

      if (!trip) {
        res.status(200).json({
          error: false,
          message: 'No active trip found',
          data: null
        });
        return;
      }

      const latestTracking = await TrackingData.findOne({
        vehicle_id: trip.vehicle_id._id
      }).sort({ timestamp: -1 });

      res.status(200).json({
        error: false,
        message: 'Current trip retrieved successfully',
        data: {
          trip_id: trip._id,
          vehicle: trip.vehicle_id,
          driver: {
            name: trip.driver_id.name,
            phone: trip.driver_id.phone_number
          },
          route_points: trip.vehicle_id.route_points,
          selected_start: trip.selected_start_point,
          selected_end: trip.selected_end_point,
          current_location: latestTracking,
          status: trip.status
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getChildPassengerStatus(req, res, next) {
    try {
      const { tripId, childId } = req.query;

      if (!tripId || !childId) {
        throw new CustomError('Trip ID and child ID are required', 400);
      }

      const trip = await Trip.findById(tripId);
      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }

      const passenger = trip.passengers.find(p => p.user_id.toString() === childId);
      if (!passenger) {
        throw new CustomError('Child not found in this trip', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Passenger status retrieved successfully',
        data: passenger
      });
    } catch (error) {
      next(error);
    }
  }

  static async getNextStop(req, res, next) {
    try {
      const { tripId, childId } = req.query;

      if (!tripId || !childId) {
        throw new CustomError('Trip ID and child ID are required', 400);
      }

      const trip = await Trip.findById(tripId).populate('vehicle_id');
      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }

      const passenger = trip.passengers.find(p => p.user_id.toString() === childId);
      if (!passenger) {
        throw new CustomError('Child not found in this trip', 404);
      }

      if (passenger.picked_up && !passenger.dropped) {
        const nextStop = passenger.drop_stop;
        const latestTracking = await TrackingData.findOne({
          vehicle_id: trip.vehicle_id._id
        }).sort({ timestamp: -1 });

        const distance = latestTracking ? calculateDistance(
          latestTracking.latitude,
          latestTracking.longitude,
          nextStop.latitude,
          nextStop.longitude
        ) : 0;

        const eta = distance > 0 ? Math.round(distance / (latestTracking?.speed || 30) * 60) : 0;

        res.status(200).json({
          error: false,
          message: 'Next stop retrieved successfully',
          data: {
            stop: nextStop,
            distance_km: distance,
            eta_minutes: eta,
            current_location: latestTracking
          }
        });
      } else {
        res.status(200).json({
          error: false,
          message: 'Child not yet picked up or already dropped',
          data: null
        });
      }
    } catch (error) {
      next(error);
    }
  }

  static async confirmChildPickup(req, res, next) {
    try {
      const { tripId, childId } = req.body;

      if (!tripId || !childId) {
        throw new CustomError('Trip ID and child ID are required', 400);
      }

      const trip = await Trip.findById(tripId);
      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }

      const passengerIndex = trip.passengers.findIndex(p => p.user_id.toString() === childId);
      if (passengerIndex === -1) {
        throw new CustomError('Child not found in this trip', 404);
      }

      if (!trip.passengers[passengerIndex].picked_up) {
        throw new CustomError('Child has not been picked up by driver yet', 400);
      }

      const confirmTime = new Date();
      trip.passengers[passengerIndex].parent_confirmed_pickup = true;
      trip.passengers[passengerIndex].parent_pickup_confirmation_time = confirmTime;

      await trip.save();

      if (global.socketManager) {
        global.socketManager.emitToTrip(tripId, 'parent_confirmed_pickup', {
          tripId,
          childId,
          parentId: req.user.id,
          confirmationTime: confirmTime
        });
        global.socketManager.emitToOperator(req.user.operator_id, 'parent_confirmed_pickup', {
          tripId,
          childId,
          parentId: req.user.id
        });
      }

      res.status(200).json({
        error: false,
        message: 'Pickup confirmed successfully',
        data: trip.passengers[passengerIndex]
      });
    } catch (error) {
      next(error);
    }
  }

  static async confirmChildDropoff(req, res, next) {
    try {
      const { tripId, childId } = req.body;

      if (!tripId || !childId) {
        throw new CustomError('Trip ID and child ID are required', 400);
      }

      const trip = await Trip.findById(tripId);
      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }

      const passengerIndex = trip.passengers.findIndex(p => p.user_id.toString() === childId);
      if (passengerIndex === -1) {
        throw new CustomError('Child not found in this trip', 404);
      }

      if (!trip.passengers[passengerIndex].dropped) {
        throw new CustomError('Child has not been dropped by driver yet', 400);
      }

      const confirmTime = new Date();
      trip.passengers[passengerIndex].parent_confirmed_dropoff = true;
      trip.passengers[passengerIndex].parent_dropoff_confirmation_time = confirmTime;

      await trip.save();

      if (global.socketManager) {
        global.socketManager.emitToTrip(tripId, 'parent_confirmed_dropoff', {
          tripId,
          childId,
          parentId: req.user.id,
          confirmationTime: confirmTime
        });
        global.socketManager.emitToOperator(req.user.operator_id, 'parent_confirmed_dropoff', {
          tripId,
          childId,
          parentId: req.user.id
        });
      }

      res.status(200).json({
        error: false,
        message: 'Dropoff confirmed successfully',
        data: trip.passengers[passengerIndex]
      });
    } catch (error) {
      next(error);
    }
  }

  static async trackChild(req, res, next) {
    try {
      const { childId } = req.query;

      if (!childId) {
        throw new CustomError('Child ID is required', 400);
      }

      const child = await User.findOne({ user_id: childId });
      if (!child) {
        throw new CustomError('Child not found', 404);
      }

      const activeTrip = await Trip.findOne({
        status: 'active',
        passengers: { $elemMatch: { user_id: childId } }
      }).populate('vehicle_id');

      if (!activeTrip) {
        res.status(200).json({
          error: false,
          message: 'No active trip',
          data: null
        });
        return;
      }

      const latestTracking = await TrackingData.findOne({
        vehicle_id: activeTrip.vehicle_id._id
      }).sort({ timestamp: -1 });

      res.status(200).json({
        error: false,
        message: 'Child location retrieved successfully',
        data: {
          child: {
            name: child.name,
            phone_number: child.phone_number
          },
          vehicle: {
            vehicle_number: activeTrip.vehicle_id.vehicle_number,
            current_status: activeTrip.vehicle_id.current_status,
            speed: latestTracking?.speed || 0
          },
          location: latestTracking
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getLocationHistory(req, res, next) {
    try {
      const { childId, days = 1 } = req.query;
      const Vehicle = require('../models/Vehicle');

      const vehicle = await Vehicle.findOne({ driver_id: childId });
      if (!vehicle) {
        throw new CustomError('Vehicle not found', 404);
      }

      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const trackingData = await TrackingData.find({
        vehicle_id: vehicle._id,
        timestamp: { $gte: startDate }
      }).sort({ timestamp: -1 });

      res.status(200).json({
        error: false,
        message: 'Location history retrieved successfully',
        data: trackingData
      });
    } catch (error) {
      next(error);
    }
  }

  static async getActiveTripStatus(req, res, next) {
    try {
      const { childId } = req.query;

      const trip = await Trip.findOne({
        driver_id: childId,
        status: 'active'
      }).populate('vehicle_id');

      if (!trip) {
        res.status(200).json({
          error: false,
          message: 'No active trip',
          data: null
        });
        return;
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

  static async getNotifications(req, res, next) {
    try {
      const { unreadOnly = false } = req.query;

      const notifications = await NotificationService.getUserNotifications(req.user.id, {
        read: unreadOnly ? false : undefined
      });

      res.status(200).json({
        error: false,
        message: 'Notifications retrieved successfully',
        data: notifications
      });
    } catch (error) {
      next(error);
    }
  }

  static async markNotificationAsRead(req, res, next) {
    try {
      const { notificationId } = req.params;

      const notification = await NotificationService.markAsRead(notificationId);

      res.status(200).json({
        error: false,
        message: 'Notification marked as read',
        data: notification
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUnreadCount(req, res, next) {
    try {
      const count = await NotificationService.getUnreadCount(req.user.id);

      res.status(200).json({
        error: false,
        message: 'Unread count retrieved successfully',
        data: { unreadCount: count }
      });
    } catch (error) {
      next(error);
    }
  }

  static async enableSpeedAlerts(req, res, next) {
    try {
      const { childId, enabled } = req.body;
      const User = require('../models/User');

      const user = await User.findByIdAndUpdate(
        childId,
        { speed_alerts_enabled: enabled },
        { new: true }
      );

      res.status(200).json({
        error: false,
        message: `Speed alerts ${enabled ? 'enabled' : 'disabled'} successfully`,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  static async setGeofence(req, res, next) {
    try {
      const { childId, latitude, longitude, radius_meters } = req.body;

      if (!latitude || !longitude || !radius_meters) {
        throw new CustomError('Latitude, longitude, and radius are required', 400);
      }

      const User = require('../models/User');
      const user = await User.findByIdAndUpdate(
        childId,
        {
          geofence: {
            latitude,
            longitude,
            radius_meters
          }
        },
        { new: true }
      );

      res.status(200).json({
        error: false,
        message: 'Geofence set successfully',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDriverContact(req, res, next) {
    try {
      const { tripId, childId } = req.query;

      if (!tripId || !childId) {
        throw new CustomError('Trip ID and child ID are required', 400);
      }

      const trip = await Trip.findById(tripId).populate('driver_id');
      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }

      const passenger = trip.passengers.find(p => p.user_id.toString() === childId);
      if (!passenger) {
        throw new CustomError('Child not found in this trip', 404);
      }

      if (!trip.driver_id) {
        throw new CustomError('Driver not found for this trip', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Driver contact retrieved successfully',
        data: {
          driver_id: trip.driver_id.user_id,
          driver_name: trip.driver_id.name,
          driver_phone: trip.driver_id.phone_number,
          vehicle_number: trip.vehicle_id
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async initiateDriverCall(req, res, next) {
    try {
      const { tripId, childId } = req.body;

      if (!tripId || !childId) {
        throw new CustomError('Trip ID and child ID are required', 400);
      }

      const trip = await Trip.findById(tripId).populate('driver_id');
      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }

      const passenger = trip.passengers.find(p => p.user_id.toString() === childId);
      if (!passenger) {
        throw new CustomError('Child not found in this trip', 404);
      }

      if (!trip.driver_id) {
        throw new CustomError('Driver not found for this trip', 404);
      }

      const notification = await NotificationService.createNotification({
        user_id: trip.driver_id.user_id,
        type: 'parent_call_request',
        title: 'Call from Parent',
        message: `Parent of ${passenger.name} is calling you`,
        trip_id: tripId,
        priority: 'high'
      });

      res.status(200).json({
        error: false,
        message: 'Call initiated successfully',
        data: {
          call_id: notification._id,
          driver_phone: trip.driver_id.phone_number,
          driver_name: trip.driver_id.name
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req, res, next) {
    try {
      const parent = await User.findOne({ user_id: req.user.id });

      if (!parent) {
        throw new CustomError('Parent not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Parent profile retrieved successfully',
        data: parent
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const { name, phone_number, email, sos_contact } = req.body;

      const parent = await User.findOneAndUpdate(
        { user_id: req.user.id },
        { name, phone_number, email, sos_contact },
        { new: true }
      );

      if (!parent) {
        throw new CustomError('Parent not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Parent profile updated successfully',
        data: parent
      });
    } catch (error) {
      next(error);
    }
  }

  static async getNotificationPreferences(req, res, next) {
    try {
      const parent = await User.findOne({ user_id: req.user.id });

      if (!parent) {
        throw new CustomError('Parent not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Notification preferences retrieved successfully',
        data: {
          speed_alerts_enabled: parent.speed_alerts_enabled,
          pickup_notification_enabled: parent.pickup_notification_enabled !== false,
          dropoff_notification_enabled: parent.dropoff_notification_enabled !== false,
          stop_notification_enabled: parent.stop_notification_enabled !== false,
          notification_advance_minutes: parent.notification_advance_minutes || 5
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateNotificationPreferences(req, res, next) {
    try {
      const { 
        speed_alerts_enabled, 
        pickup_notification_enabled, 
        dropoff_notification_enabled, 
        stop_notification_enabled,
        notification_advance_minutes 
      } = req.body;

      const parent = await User.findOneAndUpdate(
        { user_id: req.user.id },
        { 
          speed_alerts_enabled, 
          pickup_notification_enabled, 
          dropoff_notification_enabled, 
          stop_notification_enabled,
          notification_advance_minutes 
        },
        { new: true }
      );

      if (!parent) {
        throw new CustomError('Parent not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Notification preferences updated successfully',
        data: {
          speed_alerts_enabled: parent.speed_alerts_enabled,
          pickup_notification_enabled: parent.pickup_notification_enabled,
          dropoff_notification_enabled: parent.dropoff_notification_enabled,
          stop_notification_enabled: parent.stop_notification_enabled,
          notification_advance_minutes: parent.notification_advance_minutes
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

      const parent = await User.findOneAndUpdate(
        { user_id: req.user.id },
        { 
          fcm_token: fcmToken,
          $addToSet: { fcm_tokens: fcmToken }
        },
        { new: true }
      );

      if (!parent) {
        throw new CustomError('Parent not found', 404);
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

      const parent = await User.findOneAndUpdate(
        { user_id: req.user.id },
        { $pull: { fcm_tokens: fcmToken } },
        { new: true }
      );

      if (!parent) {
        throw new CustomError('Parent not found', 404);
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

  static async reportSOSToOperator(req, res, next) {
    try {
      const { tripId, childId, location } = req.body;

      if (!tripId || !childId || !location) {
        throw new CustomError('Trip ID, child ID, and location are required', 400);
      }

      const trip = await Trip.findById(tripId);
      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }

      const passenger = trip.passengers.find(p => p.user_id.toString() === childId);
      if (!passenger) {
        throw new CustomError('Child not found in this trip', 404);
      }

      const parent = await User.findOne({ user_id: req.user.id });
      if (!parent) {
        throw new CustomError('Parent not found', 404);
      }

      const notification = await NotificationService.createNotification({
        user_id: trip.operator_id,
        type: 'parent_sos_alert',
        title: 'SOS Alert from Parent',
        message: `Parent of ${passenger.name} reported SOS. Child on trip with driver ${trip.driver_id}`,
        trip_id: tripId,
        priority: 'critical',
        data: {
          child_name: passenger.name,
          parent_name: parent.name,
          parent_phone: parent.phone_number,
          location
        }
      });

      res.status(200).json({
        error: false,
        message: 'SOS alert sent to operator successfully',
        data: notification
      });
    } catch (error) {
      next(error);
    }
  }

  static async getChildStats(req, res, next) {
    try {
      const { childId } = req.query;

      if (!childId) {
        throw new CustomError('Child ID is required', 400);
      }

      const completedTrips = await Trip.countDocuments({
        passengers: { $elemMatch: { user_id: childId } },
        status: 'completed'
      });

      const totalTrips = await Trip.countDocuments({
        passengers: { $elemMatch: { user_id: childId } }
      });

      const currentTrip = await Trip.findOne({
        passengers: { $elemMatch: { user_id: childId } },
        status: 'active'
      });

      res.status(200).json({
        error: false,
        message: 'Child statistics retrieved successfully',
        data: {
          total_trips: totalTrips,
          completed_trips: completedTrips,
          active_trip: currentTrip ? currentTrip._id : null
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ParentController;

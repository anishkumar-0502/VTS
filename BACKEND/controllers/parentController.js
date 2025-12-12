const OnDemandTrip = require('../models/Trip');
const Trip = require('../models/Trip');
const NotificationService = require('../services/notificationService');
const UserService = require('../services/userService');
const { CustomError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const User = require('../models/User');
const EndUser = require('../models/EndUser');
const Vehicle = require('../models/Vehicle');
const TrackingData = require('../models/TrackingData');
const ScheduledTrip = require('../models/ScheduledTrip');
const { sendNotification, sendCurrentStopNotification, sendNextStopNotification, sendTripStatusNotification, sendTripLiveUpdateNotification } = require('../services/firebaseService');
const { calculateDistance } = require('../utils/distanceUtils');
const ParentNotificationHelper = require('../utils/parentNotificationHelper');

class ParentController {
  static async getCurrentTrip(req, res, next) {
    try {
      const { childId } = req.query;

      if (!childId) {
        throw new CustomError('Child ID is required', 400);
      }

      const endUser = await EndUser.findOne({ end_user_id: childId });
      if (!endUser) {
        res.status(200).json({
          error: false,
          message: 'No active trip found',
          data: null
        });
        return;
      }

      const vehicle = await Vehicle.findOne({ vehicle_id: endUser.assigned_vehicle_id });
      if (!vehicle || !vehicle.current_trip_id) {
        res.status(200).json({
          error: false,
          message: 'No active trip found',
          data: null
        });
        return;
      }

      const scheduledTrip = await ScheduledTrip.findOne({ associated_trip_id: vehicle.current_trip_id });
      if (!scheduledTrip) {
        res.status(200).json({
          error: false,
          message: 'No active trip found',
          data: null
        });
        return;
      }

      res.status(200).json({
        error: false,
        message: 'Current trip retrieved successfully',
        data: scheduledTrip
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

      const result = await EndUser.aggregate([
        { $match: { end_user_id: childId } },
        {
          $lookup: {
            from: 'trips', let: { userId: '$user_id' }, pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$trip_id', tripId] },
                      { $anyElementTrue: { $map: { input: '$passengers', as: 'p', in: { $eq: ['$$p.user_id', '$$userId'] } } } }
                    ]
                  }
                }
              }
            ], as: 'trip'
          }
        },
        { $unwind: { path: '$trip', preserveNullAndEmptyArrays: false } },
        {
          $addFields: {
            passenger: {
              $arrayElemAt: [
                { $filter: { input: '$trip.passengers', as: 'p', cond: { $eq: ['$$p.user_id', '$user_id'] } } },
                0
              ]
            }
          }
        },
        { $match: { passenger: { $exists: true, $ne: null } } },
        { $project: { passenger: 1 } }
      ]);

      if (!result.length) {
        throw new CustomError('Child not found in this trip', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Passenger status retrieved successfully',
        data: result[0].passenger
      });
    } catch (error) {
      next(error);
    }
  }

  static async getNextStop(req, res, next) {
    try {
      const { childId } = req.query;

      if (!childId) {
        throw new CustomError('Child ID is required', 400);
      }

      const user = await User.findOne({ end_user_id: childId });
      if (!user) {
        throw new CustomError('Child not found', 404);
      }

      const vehicle = await Vehicle.findOne({ vehicle_id: user.assigned_vehicle_id });
      if (!vehicle || !vehicle.current_trip_id) {
        throw new CustomError('Vehicle not found or no active trip', 404);
      }

      if (!vehicle.standing_location) {
        res.status(200).json({
          error: false,
          message: 'Standing location not found',
          data: null
        });
        return;
      }

      const scheduledTrip = await ScheduledTrip.findOne({ associated_trip_id: vehicle.current_trip_id });
      if (!scheduledTrip || !scheduledTrip.route_points || scheduledTrip.route_points.length === 0) {
        res.status(200).json({
          error: false,
          message: 'No route points found',
          data: null
        });
        return;
      }

      const currentLat = vehicle.standing_location.latitude;
      const currentLng = vehicle.standing_location.longitude;

      let nextStop = null;
      let minDistance = Infinity;

      for (const stop of scheduledTrip.route_points) {
        const distance = calculateDistance(currentLat, currentLng, stop.latitude, stop.longitude);
        if (distance < minDistance) {
          minDistance = distance;
          nextStop = stop;
        }
      }

      res.status(200).json({
        error: false,
        message: 'Next stop retrieved successfully',
        data: nextStop
      });
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

      const trip = await Trip.findOne({ trip_id: tripId });
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

      const trip = await Trip.findOne({ trip_id: tripId });
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

      const user = await User.findOne({ end_user_id: childId });
      if (!user) {
        res.status(200).json({
          error: false,
          message: 'Child not found',
          data: null
        });
        return;
      }

      if (!user.assigned_vehicle_id) {
        res.status(200).json({
          error: false,
          message: 'No vehicle assigned',
          data: null
        });
        return;
      }

      const vehicle = await Vehicle.findOne({ vehicle_id: user.assigned_vehicle_id });
      if (!vehicle || !vehicle.standing_location) {
        res.status(200).json({
          error: false,
          message: 'Standing location not found',
          data: null
        });
        return;
      }

      res.status(200).json({
        error: false,
        message: 'Child location retrieved successfully',
        data: vehicle.standing_location
      });
    } catch (error) {
      next(error);
    }
  }

  static async getLocationHistory(req, res, next) {
    try {
      const PaginationHelper = require('../utils/paginationHelper');
      const { skip, limit, page, isPaginated } = req.pagination;
      const { childId, days = 1 } = req.query;
      const Vehicle = require('../models/Vehicle');

      const vehicle = await Vehicle.findOne({ driver_id: childId });
      if (!vehicle) {
        throw new CustomError('Vehicle not found', 404);
      }

      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const filter = {
        vehicle_id: vehicle.vehicle_id,
        timestamp: { $gte: startDate }
      };

      const total = await TrackingData.countDocuments(filter);
      let query = TrackingData.find(filter).sort({ timestamp: -1 });

      if (isPaginated) {
        query = query.skip(skip).limit(limit);
      }

      const trackingData = await query.lean();

      const response = PaginationHelper.formatPaginatedResponse(trackingData, total, page, limit);
      res.status(200).json({
        error: false,
        message: 'Location history retrieved successfully',
        ...response
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
        status: { $in: ['active', 'en_route', 'at_stop', 'delayed'] }
      });

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
      const PaginationHelper = require('../utils/paginationHelper');
      const { skip, limit, page, isPaginated } = req.pagination;
      const { unreadOnly = false } = req.query;

      const Notification = require('../models/Notification');
      const filter = { user_id: req.user.id };
      if (unreadOnly) filter.read = false;

      const total = await Notification.countDocuments(filter);
      let query = Notification.find(filter).sort({ createdAt: -1 });

      if (isPaginated) {
        query = query.skip(skip).limit(limit);
      }

      const notifications = await query.lean();

      const response = PaginationHelper.formatPaginatedResponse(notifications, total, page, limit);
      res.status(200).json({
        error: false,
        message: 'Notifications retrieved successfully',
        ...response
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

      const user = await User.findOne({ end_user_id: childId });
      if (!user) {
        throw new CustomError('Child not found', 404);
      }

      const vehicle = await Vehicle.findOne({ vehicle_id: user.assigned_vehicle_id });
      if (!vehicle || vehicle.current_trip_id !== tripId) {
        throw new CustomError('Vehicle not found or trip ID does not match', 404);
      }

      if (!vehicle.assigned_driver_id) {
        throw new CustomError('Driver not assigned to this vehicle', 404);
      }

      const driver = await User.findOne({ user_id: vehicle.assigned_driver_id });
      if (!driver) {
        throw new CustomError('Driver not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Driver contact retrieved successfully',
        data: {
          driver_id: driver.user_id,
          driver_name: driver.name,
          driver_phone: driver.phone_number,
          vehicle_number: vehicle.vehicle_number
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async initiateDriverCall(req, res, next) {
    try {

      // 🔍 Log Incoming Request
      // console.log("🔥 Incoming /parent/call-driver Request:");
      // console.log("Headers:", req.headers);
      // console.log("Body:", req.body);
      // console.log("Query:", req.query);

      const { tripId, childId } = req.body;

      if (!tripId || !childId) {
        throw new CustomError('Trip ID and child ID are required', 400);
      }

      const user = await User.findOne({ end_user_id: childId });
      if (!user) {
        throw new CustomError('Child not found', 404);
      }

      const vehicle = await Vehicle.findOne({ vehicle_id: user.assigned_vehicle_id });
      if (!vehicle || vehicle.current_trip_id !== tripId) {
        throw new CustomError('Vehicle not found or trip ID does not match', 404);
      }

      if (!vehicle.assigned_driver_id) {
        throw new CustomError('Driver not assigned to this vehicle', 404);
      }

      const driver = await User.findOne({ user_id: vehicle.assigned_driver_id });
      if (!driver) {
        throw new CustomError('Driver not found', 404);
      }

      const notification = await NotificationService.createNotification({
        user_id: driver.user_id,
        type: 'sos_alert',
        title: 'Call from Parent',
        message: `Parent of ${user.name} is calling you`,
        trip_id: tripId,
        priority: 'high'
      });

      res.status(200).json({
        error: false,
        message: 'Call initiated successfully',
        data: {
          call_id: notification._id,
          driver_phone: driver.phone_number,
          driver_name: driver.name
        }
      });
    } catch (error) {
      next(error);
    }
  }


  static async getProfile(req, res, next) {
    try {
      const userId = req.user.user_id || req.user.id;
      const profile = await UserService.getUserProfile(userId);

      res.status(200).json({
        error: false,
        message: 'Parent profile retrieved successfully',
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const { name, phone_number, email, sos_contact } = req.body;

      const updatePayload = {};
      if (typeof name !== 'undefined') {
        updatePayload.name = name;
      }
      if (typeof phone_number !== 'undefined') {
        updatePayload.phone_number = phone_number;
      }
      if (typeof email !== 'undefined') {
        updatePayload.email = email;
      }
      if (typeof sos_contact !== 'undefined') {
        updatePayload.sos_contact = sos_contact;
      }

      const updatedParent = await UserService.updateUser(req.user.user_id, updatePayload);

      res.status(200).json({
        error: false,
        message: 'Parent profile updated successfully',
        data: updatedParent
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

      const trip = await Trip.findOne({ trip_id: tripId });
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
        status: { $in: ['active', 'en_route', 'at_stop', 'delayed'] }
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

  static async sendCurrentStopUpdate(req, res, next) {
    try {
      const { tripId, childId } = req.body;

      if (!tripId || !childId) {
        throw new CustomError('Trip ID and child ID are required', 400);
      }

      const endUser = await EndUser.findOne({ end_user_id: childId });
      if (!endUser) {
        throw new CustomError('Child not found', 404);
      }

      const vehicle = await Vehicle.findOne({ vehicle_id: endUser.assigned_vehicle_id });
      if (!vehicle) {
        throw new CustomError('Vehicle not found', 404);
      }

      const scheduledTrip = await ScheduledTrip.findOne({ associated_trip_id: tripId });
      if (!scheduledTrip) {
        throw new CustomError('Trip not found', 404);
      }

      const parentFcmTokens = await ParentNotificationHelper.getParentFcmTokensByChildId(childId);
      const childInfo = await ParentNotificationHelper.getParentsByChildId(childId);

      const currentStop = scheduledTrip.route_points.find(stop => stop.status === 'arrived' || stop.status === 'at_stop');
      const vehicleInfo = await Vehicle.findOne({ vehicle_id: endUser.assigned_vehicle_id }).select('vehicle_number');

      const result = await sendCurrentStopNotification(
        parentFcmTokens,
        childInfo?.childName || 'Your Child',
        currentStop,
        vehicleInfo?.vehicle_number
      );

      res.status(200).json({
        error: false,
        message: 'Current stop notification sent successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async sendNextStopUpdate(req, res, next) {
    try {
      const { tripId, childId } = req.body;

      if (!tripId || !childId) {
        throw new CustomError('Trip ID and child ID are required', 400);
      }

      const endUser = await EndUser.findOne({ end_user_id: childId });
      if (!endUser) {
        throw new CustomError('Child not found', 404);
      }

      const scheduledTrip = await ScheduledTrip.findOne({ associated_trip_id: tripId });
      if (!scheduledTrip) {
        throw new CustomError('Trip not found', 404);
      }

      const parentFcmTokens = await ParentNotificationHelper.getParentFcmTokensByChildId(childId);
      const childInfo = await ParentNotificationHelper.getParentsByChildId(childId);

      const nextStop = scheduledTrip.route_points.find(stop => stop.status === 'pending' || stop.status === 'approaching');
      const vehicleInfo = await Vehicle.findOne({ vehicle_id: endUser.assigned_vehicle_id }).select('vehicle_number');

      const result = await sendNextStopNotification(
        parentFcmTokens,
        childInfo?.childName || 'Your Child',
        nextStop,
        vehicleInfo?.vehicle_number
      );

      res.status(200).json({
        error: false,
        message: 'Next stop notification sent successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async sendTripStatusUpdate(req, res, next) {
    try {
      const { tripId, childId, status, additionalInfo = {} } = req.body;

      if (!tripId || !childId || !status) {
        throw new CustomError('Trip ID, child ID, and status are required', 400);
      }

      const parentFcmTokens = await ParentNotificationHelper.getParentFcmTokensByChildId(childId);
      const childInfo = await ParentNotificationHelper.getParentsByChildId(childId);

      const result = await sendTripStatusNotification(
        parentFcmTokens,
        childInfo?.childName || 'Your Child',
        status,
        additionalInfo
      );

      res.status(200).json({
        error: false,
        message: 'Trip status notification sent successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async sendLiveTripUpdate(req, res, next) {
    try {
      const { tripId, childId, tripData } = req.body;

      if (!tripId || !childId || !tripData) {
        throw new CustomError('Trip ID, child ID, and trip data are required', 400);
      }

      const parentFcmTokens = await ParentNotificationHelper.getParentFcmTokensByChildId(childId);
      const childInfo = await ParentNotificationHelper.getParentsByChildId(childId);

      const result = await sendTripLiveUpdateNotification(
        parentFcmTokens,
        childInfo?.childName || 'Your Child',
        tripData,
        childId,
        tripId
      );

      res.status(200).json({
        error: false,
        message: 'Live trip update notification sent successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ParentController;
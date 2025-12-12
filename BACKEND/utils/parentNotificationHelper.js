const User = require('../models/User');
const EndUser = require('../models/EndUser');
const Trip = require('../models/Trip');
const logger = require('./logger');

class ParentNotificationHelper {
  static async getParentFcmTokensByChildId(childId) {
    try {
      const endUser = await EndUser.findOne({ end_user_id: childId }).select('user_id');
      if (!endUser) {
        logger.loggerWarn(`EndUser not found for child ID: ${childId}`);
        return [];
      }

      const childUser = await User.findOne({ user_id: endUser.user_id }).select('fcm_tokens');
      if (!childUser || !Array.isArray(childUser.fcm_tokens)) {
        return [];
      }

      return childUser.fcm_tokens;
    } catch (error) {
      logger.loggerError(`Error getting parent FCM tokens: ${error.message}`);
      return [];
    }
  }

  static async getParentFcmTokensByTripAndPassenger(tripId, childUserId) {
    try {
      const trip = await Trip.findOne({ trip_id: tripId });
      if (!trip) {
        logger.loggerWarn(`Trip not found: ${tripId}`);
        return [];
      }

      const passenger = trip.passengers.find(p => p.user_id.toString() === childUserId);
      if (!passenger || !passenger.parent_contact) {
        logger.loggerWarn(`Passenger or parent contact not found for trip ${tripId}`);
        return [];
      }

      const parentUser = await User.findOne({ email: passenger.parent_contact }).select('fcm_tokens');
      if (!parentUser || !Array.isArray(parentUser.fcm_tokens)) {
        return [];
      }

      return parentUser.fcm_tokens;
    } catch (error) {
      logger.loggerError(`Error getting parent FCM tokens by trip: ${error.message}`);
      return [];
    }
  }

  static async getParentFcmTokensByParentEmail(parentEmail) {
    try {
      const parentUser = await User.findOne({ email: parentEmail }).select('fcm_tokens');
      if (!parentUser || !Array.isArray(parentUser.fcm_tokens)) {
        return [];
      }

      return parentUser.fcm_tokens;
    } catch (error) {
      logger.loggerError(`Error getting parent FCM tokens by email: ${error.message}`);
      return [];
    }
  }

  static async getParentsByChildId(childId) {
    try {
      const endUser = await EndUser.findOne({ end_user_id: childId }).select('user_id');
      if (!endUser) {
        return null;
      }

      const childUser = await User.findOne({ user_id: endUser.user_id }).select('name');
      return {
        childId,
        childName: childUser?.name || 'Child',
        childUserId: endUser.user_id
      };
    } catch (error) {
      logger.loggerError(`Error getting parent info: ${error.message}`);
      return null;
    }
  }
}

module.exports = ParentNotificationHelper;

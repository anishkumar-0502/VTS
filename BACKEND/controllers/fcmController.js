const User = require('../models/User');
const { CustomError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const { isValidFCMToken } = require('../services/fcmValidationService');

class FCMController {
  static async registerFCMToken(req, res, next) {
    try {
      const { fcm_token } = req.body;
      const userId = req.user.user_id || req.user.id;

      if (!fcm_token) {
        throw new CustomError('FCM token is required', 400);
      }

      if (!isValidFCMToken(fcm_token)) {
        throw new CustomError(
          'Invalid FCM token format. Token must be at least 100 characters and contain only alphanumeric characters, hyphens, underscores, and colons.',
          400
        );
      }

      if (!userId) {
        throw new CustomError('User not authenticated', 401);
      }

      const user = await User.findOneAndUpdate(
        { user_id: userId },
        { 
          $addToSet: { fcm_tokens: fcm_token.trim() },
          $set: { fcm_token: fcm_token.trim() }
        },
        { new: true }
      ).select('user_id name email fcm_tokens');

      if (!user) {
        throw new CustomError('User not found', 404);
      }

      logger.loggerInfo(`FCM token registered for user ${userId}`);

      res.status(200).json({
        error: false,
        message: 'FCM token registered successfully',
        data: {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          fcm_token_count: user.fcm_tokens.length,
          fcm_tokens: user.fcm_tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async removeFCMToken(req, res, next) {
    try {
      const { fcm_token } = req.body;
      const userId = req.user.user_id || req.user.id;

      if (!fcm_token) {
        throw new CustomError('FCM token is required', 400);
      }

      if (!userId) {
        throw new CustomError('User not authenticated', 401);
      }

      const user = await User.findOneAndUpdate(
        { user_id: userId },
        { 
          $pull: { fcm_tokens: fcm_token.trim() }
        },
        { new: true }
      ).select('user_id name email fcm_tokens');

      if (!user) {
        throw new CustomError('User not found', 404);
      }

      logger.loggerInfo(`FCM token removed for user ${userId}`);

      res.status(200).json({
        error: false,
        message: 'FCM token removed successfully',
        data: {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          fcm_token_count: user.fcm_tokens.length,
          fcm_tokens: user.fcm_tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getFCMTokens(req, res, next) {
    try {
      const userId = req.user.user_id || req.user.id;

      if (!userId) {
        throw new CustomError('User not authenticated', 401);
      }

      const user = await User.findOne({ user_id: userId })
        .select('user_id name email fcm_token fcm_tokens');

      if (!user) {
        throw new CustomError('User not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'FCM tokens retrieved successfully',
        data: {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          fcm_token: user.fcm_token || null,
          fcm_tokens: user.fcm_tokens || [],
          fcm_token_count: (user.fcm_tokens || []).length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async clearAllFCMTokens(req, res, next) {
    try {
      const userId = req.user.user_id || req.user.id;

      if (!userId) {
        throw new CustomError('User not authenticated', 401);
      }

      const user = await User.findOneAndUpdate(
        { user_id: userId },
        { 
          fcm_tokens: [],
          fcm_token: null
        },
        { new: true }
      ).select('user_id name email fcm_tokens');

      if (!user) {
        throw new CustomError('User not found', 404);
      }

      logger.loggerInfo(`All FCM tokens cleared for user ${userId}`);

      res.status(200).json({
        error: false,
        message: 'All FCM tokens cleared successfully',
        data: {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          fcm_token_count: 0,
          fcm_tokens: []
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async registerMultipleFCMTokens(req, res, next) {
    try {
      const { fcm_tokens } = req.body;
      const userId = req.user.user_id || req.user.id;

      if (!Array.isArray(fcm_tokens) || fcm_tokens.length === 0) {
        throw new CustomError('FCM tokens must be a non-empty array', 400);
      }

      const validTokens = fcm_tokens
        .filter(token => isValidFCMToken(token))
        .map(token => token.trim());

      if (validTokens.length === 0) {
        throw new CustomError(
          'No valid FCM tokens provided. Each token must be at least 100 characters.',
          400
        );
      }

      if (!userId) {
        throw new CustomError('User not authenticated', 401);
      }

      const user = await User.findOneAndUpdate(
        { user_id: userId },
        { 
          $addToSet: { fcm_tokens: { $each: validTokens } },
          $set: { fcm_token: validTokens[0] }
        },
        { new: true }
      ).select('user_id name email fcm_tokens');

      if (!user) {
        throw new CustomError('User not found', 404);
      }

      logger.loggerInfo(`${validTokens.length} FCM tokens registered for user ${userId}`);

      res.status(200).json({
        error: false,
        message: `${validTokens.length} FCM tokens registered successfully`,
        data: {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          fcm_token_count: user.fcm_tokens.length,
          fcm_tokens: user.fcm_tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = FCMController;

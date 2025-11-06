const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const speedRecordingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    error: true,
    message: 'Too many speed records submitted. Please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (req.user && req.user.role === 'superadmin') {
      return true;
    }
    return false;
  },
  handler: (req, res) => {
    logger.loggerWarn(`Speed recording rate limit exceeded for user ${req.user.id}`);
    res.status(429).json({
      error: true,
      message: 'Too many speed records submitted. Please try again later.',
      retryAfter: 60
    });
  }
});

const sosAlertLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: {
    error: true,
    message: 'Too many SOS alerts submitted. Please try again in 5 minutes.',
    retryAfter: 300
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (req.user && req.user.role === 'superadmin') {
      return true;
    }
    return false;
  },
  handler: (req, res) => {
    logger.loggerWarn(`SOS alert rate limit exceeded for user ${req.user.id}`);
    res.status(429).json({
      error: true,
      message: 'Too many SOS alerts submitted. Please try again in 5 minutes.',
      retryAfter: 300
    });
  }
});

const speedViolationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: {
    error: true,
    message: 'Too many speed violation reports. Please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (req.user && req.user.role === 'superadmin') {
      return true;
    }
    return false;
  }
});

const callInitiationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    error: true,
    message: 'Too many call requests. Please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (req.user && req.user.role === 'superadmin') {
      return true;
    }
    return false;
  }
});

const locationUpdateLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 100,
  message: {
    error: true,
    message: 'Too many location updates. Please try again later.',
    retryAfter: 10
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (req.user && req.user.role === 'superadmin') {
      return true;
    }
    return false;
  }
});

const geofenceAlertLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    error: true,
    message: 'Too many geofence alerts. Please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (req.user && req.user.role === 'superadmin') {
      return true;
    }
    return false;
  }
});

const operatorApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    error: true,
    message: 'Too many requests to operator API. Please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (req.user && req.user.role === 'superadmin') {
      return true;
    }
    return false;
  }
});

const bulkOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    error: true,
    message: 'Too many bulk operations. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (req.user && req.user.role === 'superadmin') {
      return true;
    }
    return false;
  },
  handler: (req, res) => {
    logger.loggerWarn(`Bulk operation rate limit exceeded for user ${req.user.id}`);
    res.status(429).json({
      error: true,
      message: 'Too many bulk operations performed today. Please try again tomorrow.',
      retryAfter: 3600
    });
  }
});

const confirmationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    error: true,
    message: 'Too many confirmations. Please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (req.user && req.user.role === 'superadmin') {
      return true;
    }
    return false;
  }
});

const profileUpdateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    error: true,
    message: 'Too many profile updates. Please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  speedRecordingLimiter,
  sosAlertLimiter,
  speedViolationLimiter,
  callInitiationLimiter,
  locationUpdateLimiter,
  geofenceAlertLimiter,
  operatorApiLimiter,
  bulkOperationLimiter,
  confirmationLimiter,
  profileUpdateLimiter
};

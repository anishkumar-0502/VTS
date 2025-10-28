const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

const validateGPSData = [
  body().isArray().withMessage('Request body must be an array'),
  body('[0]').equals('2').withMessage('Message type must be "2" (request)'),
  body('[1]').isString().notEmpty().withMessage('Message ID is required'),
  body('[2]').isIn(['BootNotification', 'LocationUpdate', 'Heartbeat', 'StatusNotification']).withMessage('Invalid action'),
  body('[3].vehicle_id').isString().notEmpty().withMessage('Vehicle ID is required'),
  body('[3].latitude').if(body('[2]').equals('LocationUpdate')).isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('[3].longitude').if(body('[2]').equals('LocationUpdate')).isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('[3].speed_kmh').if(body('[2]').equals('LocationUpdate')).isFloat({ min: 0 }).optional().withMessage('Speed must be non-negative'),
  body('[3].course').if(body('[2]').equals('LocationUpdate')).isFloat({ min: 0, max: 360 }).optional().withMessage('Course must be between 0 and 360'),
  body('[3].satellites').if(body('[2]').equals('LocationUpdate')).isInt({ min: 0 }).optional().withMessage('Satellites must be non-negative'),
  body('[3].fix_quality').if(body('[2]').equals('LocationUpdate')).isInt({ min: 0 }).optional().withMessage('Fix quality must be non-negative'),
  body('[3].hdop').if(body('[2]').equals('LocationUpdate')).isFloat({ min: 0 }).optional().withMessage('HDOP must be non-negative')
];

const validateGpsData = (req, res, next) => {
  if (!Array.isArray(req.body)) {
    logger.warn('Invalid GPS request format', { ip: req.ip });
    return res.status(400).json(['4', 'unknown', {
      errorCode: 'FormatViolation',
      errorDescription: 'Request body must be an array'
    }]);
  }

  const [messageType, messageId, action, payload] = req.body;

  if (messageType !== '2') {
    return res.status(400).json(['4', messageId, {
      errorCode: 'FormatViolation',
      errorDescription: 'Message type must be "2"'
    }]);
  }

  if (action === 'LocationUpdate' && payload) {
    if (typeof payload.latitude !== 'number' || payload.latitude < -90 || payload.latitude > 90) {
      return res.status(400).json(['4', messageId, {
        errorCode: 'FormatViolation',
        errorDescription: 'Latitude must be between -90 and 90'
      }]);
    }

    if (typeof payload.longitude !== 'number' || payload.longitude < -180 || payload.longitude > 180) {
      return res.status(400).json(['4', messageId, {
        errorCode: 'FormatViolation',
        errorDescription: 'Longitude must be between -180 and 180'
      }]);
    }

    if (payload.speed_kmh !== undefined && typeof payload.speed_kmh !== 'number') {
      return res.status(400).json(['4', messageId, {
        errorCode: 'FormatViolation',
        errorDescription: 'Speed must be a number'
      }]);
    }

    if (payload.course !== undefined && (typeof payload.course !== 'number' || payload.course < 0 || payload.course > 360)) {
      return res.status(400).json(['4', messageId, {
        errorCode: 'FormatViolation',
        errorDescription: 'Course must be between 0 and 360'
      }]);
    }
  }

  next();
};

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors', { errors: errors.array(), ip: req.ip });
    return res.status(400).json(['4', req.body[1], {
      errorCode: 'FormatViolation',
      errorDescription: `Validation errors: ${JSON.stringify(errors.array())}`
    }]);
  }
  next();
};

module.exports = { validateGPSData, validateGpsData, handleValidationErrors };
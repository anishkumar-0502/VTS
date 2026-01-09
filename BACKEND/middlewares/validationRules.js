const { body, query, param, validationResult } = require('express-validator');
const PhoneFormatter = require('../utils/phoneFormatter');
const Vehicle = require('../models/Vehicle');
const mongoose = require('mongoose');
const { ENTITY_PREFIXES } = require('../utils/uuidUtils');

const validationErrorHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const [firstError] = errors.array();
    return res.status(400).json({
      error: true,
      message: firstError?.msg || 'Validation failed',
      field: firstError?.param
    });
  }
  next();
};

const UUID_SUFFIX_PATTERN = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildEntityIdPattern = (prefixes) => {
  const normalized = Array.isArray(prefixes) ? prefixes.filter(Boolean) : [prefixes].filter(Boolean);
  const unique = [...new Set(normalized)];
  const patternRoot = unique.length ? unique.map(escapeRegex).join('|') : '';
  return new RegExp(`^(?:${patternRoot})-${UUID_SUFFIX_PATTERN}$`);
};

const applyEntityIdValidator = (validator, prefixes, label, options = {}) => {
  const targetLabel = label || 'ID';
  const pattern = buildEntityIdPattern(prefixes);
  const optional = Boolean(options.optional);
  if (!optional) {
    validator.notEmpty().withMessage(`${targetLabel} is required`).bail();
  } else {
    validator.optional({ nullable: true, checkFalsy: true });
  }
  validator.isString().withMessage(`${targetLabel} must be a string`).bail();
  validator.customSanitizer((value) => (typeof value === 'string' ? value.trim() : value));
  return validator.matches(pattern).withMessage(`Invalid ${targetLabel} format`);
};

const entityIdParamRule = (field, prefixes, label, options = {}) => {
  const validator = param(field).trim();
  return applyEntityIdValidator(validator, prefixes, label, options);
};

const entityIdBodyRule = (field, prefixes, label, options = {}) => {
  const validator = body(field);
  return applyEntityIdValidator(validator, prefixes, label, options);
};

const optionalEntityIdBodyRule = (field, prefixes, label) => {
  return entityIdBodyRule(field, prefixes, label, { optional: true });
};

const userValidationRules = () => {
  return [
    // body('email')
    //   .isEmail()
    //   .withMessage('Invalid email format')
    //   .normalizeEmail(),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('phone_number')
      .notEmpty()
      .withMessage('Phone number is required')
      .custom(value => {
        const validation = PhoneFormatter.validatePhoneNumber(value, 'IN');
        if (!validation.valid) {
          throw new Error(validation.error);
        }
        return true;
      }),
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ];
};

const driverCreationRules = () => {
  return [
    ...userValidationRules(),
    body('license_number')
      .notEmpty()
      .withMessage('License number is required')
      .isLength({ min: 5 })
      .withMessage('License number must be at least 5 characters'),
    body('license_expiry')
      .optional()
      .isISO8601()
      .withMessage('License expiry must be a valid date'),
    optionalEntityIdBodyRule('assigned_vehicle_id', ENTITY_PREFIXES.VEHICLE, 'Assigned vehicle ID')
  ];
};

const parentCreationRules = () => {
  return [
    ...userValidationRules(),
    body('address')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Address must be at least 2 characters')
  ];
};

const endUserCreationRules = () => {
  return [
    ...userValidationRules(),
    body('sos_contact')
      .optional()
      .isObject()
      .withMessage('SOS contact must be an object'),
    body('sos_contact.name')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('SOS contact name must be at least 2 characters'),
    body('sos_contact.phone_number')
      .optional()
      .custom(value => {
        if (value) {
          const stringValue = typeof value === 'string' ? value : value.toString();
          const validation = PhoneFormatter.validatePhoneNumber(stringValue, 'IN');
          if (!validation.valid) {
            throw new Error(validation.error);
          }
        }
        return true;
      }),
    body('pickup_location')
      .optional()
      .isObject()
      .withMessage('Pickup location must be an object'),
    body('pickup_location.latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Pickup latitude must be between -90 and 90'),
    body('pickup_location.longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Pickup longitude must be between -180 and 180'),
    body('pickup_location.address')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Pickup address must be at least 2 characters'),
    body('pickup_location.name')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Pickup location name must be at least 2 characters'),
    body('dropoff_location')
      .optional()
      .isObject()
      .withMessage('Dropoff location must be an object'),
    body('dropoff_location.latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Dropoff latitude must be between -90 and 90'),
    body('dropoff_location.longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Dropoff longitude must be between -180 and 180'),
    body('dropoff_location.address')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Dropoff address must be at least 2 characters'),
    body('dropoff_location.name')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Dropoff location name must be at least 2 characters'),
    optionalEntityIdBodyRule('assigned_vehicle_id', ENTITY_PREFIXES.VEHICLE, 'Assigned vehicle ID')
  ];
};

const vehicleCreationRules = () => {
  return [
    body('vehicle_number')
      .trim()
      .notEmpty()
      .withMessage('Vehicle number is required')
      .matches(/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/)
      .withMessage('Invalid vehicle number format (e.g., DL01AB1234)'),
    body('vehicle_type')
      .trim()
      .notEmpty()
      .withMessage('Vehicle type is required')
      .isIn(['auto', 'car', 'bus', 'truck', 'van'])
      .withMessage('Invalid vehicle type'),
    body('capacity')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Capacity must be a number between 1 and 100'),
    body('registration_number')
      .optional()
      .trim()
      .isLength({ min: 5 })
      .withMessage('Registration number must be at least 5 characters')
  ];
};

const tripCreationRules = () => {
  return [
    body('vehicle_id')
      .notEmpty()
      .withMessage('Vehicle ID is required')
      .custom(async (value) => {
        if (mongoose.Types.ObjectId.isValid(value)) {
          const vehicle = await Vehicle.findById(value).select('_id').lean();
          if (vehicle) {
            return true;
          }
        }

        const vehicle = await Vehicle.findOne({ vehicle_id: value }).select('_id').lean();
        if (!vehicle) {
          throw new Error('Invalid vehicle ID');
        }

        return true;
      }),
    body('route_name')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Route name must be at least 2 characters'),
    body('start_location')
      .optional()
      .isObject()
      .withMessage('Start location must be an object'),
    body('start_location.latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    body('start_location.longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude')
  ];
};

const tripEndRules = () => {
  return [
    body('end_location')
      .notEmpty()
      .withMessage('End location is required')
      .isObject()
      .withMessage('End location must be an object'),
    body('end_location.latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    body('end_location.longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude'),
    body('distance_traveled')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Distance traveled must be a positive number')
  ];
};

const locationUpdateRules = () => {
  return [
    body('tripId')
      .optional()
      .isString()
      .withMessage('Trip ID must be a string')
      .notEmpty()
      .withMessage('Trip ID must not be empty'),
    body('deviceId')
      .optional()
      .isString()
      .withMessage('Device ID must be a string')
      .notEmpty()
      .withMessage('Device ID must not be empty'),
    body('recordedAt')
      .optional()
      .isISO8601()
      .withMessage('recordedAt must be a valid ISO8601 timestamp'),
    body('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    body('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude'),
    body('speed')
      .isFloat({ min: 0 })
      .withMessage('Speed must be a positive number'),
    body('heading')
      .optional()
      .isFloat({ min: 0, max: 360 })
      .withMessage('Heading must be between 0 and 360')
  ];
};

const speedRecordingRules = () => {
  return [
    body('tripId')
      .notEmpty()
      .withMessage('Trip ID is required')
      .isMongoId()
      .withMessage('Invalid trip ID'),
    body('currentSpeed')
      .notEmpty()
      .withMessage('Current speed is required')
      .isFloat({ min: 0 })
      .withMessage('Speed must be a positive number'),
    body('location')
      .optional()
      .isObject()
      .withMessage('Location must be an object')
  ];
};

const passengerStatusRules = () => {
  return [
    body('tripId')
      .notEmpty()
      .withMessage('Trip ID is required')
      .isMongoId()
      .withMessage('Invalid trip ID'),
    body('passengerId')
      .notEmpty()
      .withMessage('Passenger ID is required'),
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['picked_up', 'dropped'])
      .withMessage('Status must be either picked_up or dropped')
  ];
};

const stopChecklistRules = () => {
  return [
    body('tripId')
      .notEmpty()
      .withMessage('Trip ID is required')
      .isString()
      .withMessage('Trip ID must be a string'),
    body('stopId')
      .notEmpty()
      .withMessage('Stop ID is required')
      .isString()
      .withMessage('Stop ID must be a string'),
    body('itemId')
      .optional()
      .isString()
      .withMessage('itemId must be a string'),
    body('label')
      .optional()
      .isString()
      .withMessage('label must be a string'),
    body('required')
      .optional()
      .isBoolean()
      .withMessage('required must be a boolean'),
    body('completed')
      .optional()
      .isBoolean()
      .withMessage('completed must be a boolean'),
    body('notes')
      .optional()
      .isString()
      .withMessage('notes must be a string')
  ];
};

const stopPhotoNoteRules = () => {
  return [
    body('tripId')
      .notEmpty()
      .withMessage('Trip ID is required')
      .isString()
      .withMessage('Trip ID must be a string'),
    body('stopId')
      .notEmpty()
      .withMessage('Stop ID is required')
      .isString()
      .withMessage('Stop ID must be a string'),
    body('photoUrl')
      .notEmpty()
      .withMessage('Photo URL is required')
      .isString()
      .withMessage('Photo URL must be a string'),
    body('caption')
      .optional()
      .isString()
      .withMessage('caption must be a string')
  ];
};

const stopIncidentRules = () => {
  return [
    body('tripId')
      .notEmpty()
      .withMessage('Trip ID is required')
      .isString()
      .withMessage('Trip ID must be a string'),
    body('stopId')
      .notEmpty()
      .withMessage('Stop ID is required')
      .isString()
      .withMessage('Stop ID must be a string'),
    body('type')
      .optional()
      .isString()
      .withMessage('type must be a string'),
    body('severity')
      .optional()
      .isIn(['info', 'warning', 'critical'])
      .withMessage('severity must be info, warning, or critical'),
    body('description')
      .optional()
      .isString()
      .withMessage('description must be a string'),
    body('passengerId')
      .optional()
      .isString()
      .withMessage('passengerId must be a string'),
    body('photoUrls')
      .optional()
      .isArray()
      .withMessage('photoUrls must be an array'),
    body('photoUrls.*')
      .optional()
      .isString()
      .withMessage('photoUrls must contain strings'),
    body('resolvesBlocker')
      .optional()
      .isBoolean()
      .withMessage('resolvesBlocker must be a boolean'),
    body('resolved')
      .optional()
      .isBoolean()
      .withMessage('resolved must be a boolean'),
    body('resolutionNotes')
      .optional()
      .isString()
      .withMessage('resolutionNotes must be a string')
  ];
};

const confirmationRules = () => {
  return [
    body('tripId')
      .notEmpty()
      .withMessage('Trip ID is required')
      .isMongoId()
      .withMessage('Invalid trip ID'),
    body('childId')
      .notEmpty()
      .withMessage('Child ID is required')
  ];
};

const paginationRules = () => {
  return [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ];
};

const deviceRules = () => {
  return [
    body('device_id')
      .notEmpty()
      .withMessage('Device ID is required'),
    body('device_type')
      .notEmpty()
      .withMessage('Device type is required')
      .isIn(['gps', 'iot', 'mobile'])
      .withMessage('Invalid device type'),
    body('status')
      .optional()
      .isIn(['active', 'inactive', 'maintenance'])
      .withMessage('Invalid status')
  ];
};

const fcmTokenRules = () => {
  return [
    body('fcmToken')
      .notEmpty()
      .withMessage('FCM token is required')
      .isLength({ min: 10 })
      .withMessage('Invalid FCM token')
  ];
};

const bulkAssignmentRules = () => {
  return [
    body('assignments')
      .isArray({ min: 1 })
      .withMessage('Assignments must be a non-empty array'),
    body('assignments.*.driverId')
      .notEmpty()
      .withMessage('Driver ID is required for each assignment'),
    body('assignments.*.vehicleId')
      .notEmpty()
      .withMessage('Vehicle ID is required for each assignment')
  ];
};

const geofenceRules = () => {
  return [
    body('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    body('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude'),
    body('radius')
      .optional()
      .isInt({ min: 50, max: 5000 })
      .withMessage('Radius must be between 50 and 5000 meters')
  ];
};

const notificationPreferencesRules = () => {
  return [
    body('speed_alerts_enabled')
      .optional()
      .isBoolean()
      .withMessage('speed_alerts_enabled must be a boolean'),
    body('pickup_notification_enabled')
      .optional()
      .isBoolean()
      .withMessage('pickup_notification_enabled must be a boolean'),
    body('dropoff_notification_enabled')
      .optional()
      .isBoolean()
      .withMessage('dropoff_notification_enabled must be a boolean'),
    body('stop_notification_enabled')
      .optional()
      .isBoolean()
      .withMessage('stop_notification_enabled must be a boolean'),
    body('notification_advance_minutes')
      .optional()
      .isInt({ min: 2, max: 10 })
      .withMessage('notification_advance_minutes must be between 2 and 10')
  ];
};

const assignDriverToVehicleRules = () => {
  return [
    entityIdBodyRule('driver_id', [ENTITY_PREFIXES.DRIVER, ENTITY_PREFIXES.USER], 'Driver ID'),
    entityIdBodyRule('vehicle_id', ENTITY_PREFIXES.VEHICLE, 'Vehicle ID')
  ];
};

const assignDeviceToVehicleRules = () => {
  return [
    body('device_id')
      .notEmpty()
      .withMessage('Device ID is required')
      .bail()
      .isString()
      .withMessage('Device ID must be a string')
      .bail()
      .customSanitizer((value) => (typeof value === 'string' ? value.trim() : value)),
    entityIdBodyRule('vehicle_id', ENTITY_PREFIXES.VEHICLE, 'Vehicle ID')
  ];
};

const assignEndUserToVehicleRules = () => {
  return [
    body()
      .custom((value, { req }) => {
        const { end_user_id, endUserId, user_id, vehicle_id, vehicleId } = req.body;
        if (!end_user_id && !endUserId && !user_id) {
          throw new Error('End-user ID is required');
        }
        if (!vehicle_id && !vehicleId) {
          throw new Error('Vehicle ID is required');
        }
        return true;
      })
      .bail(),
    optionalEntityIdBodyRule('end_user_id', [ENTITY_PREFIXES.END_USER, ENTITY_PREFIXES.USER], 'End-user ID'),
    optionalEntityIdBodyRule('endUserId', [ENTITY_PREFIXES.END_USER, ENTITY_PREFIXES.USER], 'End-user ID'),
    optionalEntityIdBodyRule('user_id', ENTITY_PREFIXES.USER, 'User ID'),
    optionalEntityIdBodyRule('vehicle_id', ENTITY_PREFIXES.VEHICLE, 'Vehicle ID'),
    optionalEntityIdBodyRule('vehicleId', ENTITY_PREFIXES.VEHICLE, 'Vehicle ID')
  ];
};

const unassignEndUserFromVehicleRules = () => {
  return [
    body()
      .custom((value, { req }) => {
        const { end_user_id, endUserId, user_id } = req.body;
        if (!end_user_id && !endUserId && !user_id) {
          throw new Error('End-user ID is required');
        }
        return true;
      })
      .bail(),
    optionalEntityIdBodyRule('end_user_id', [ENTITY_PREFIXES.END_USER, ENTITY_PREFIXES.USER], 'End-user ID'),
    optionalEntityIdBodyRule('endUserId', [ENTITY_PREFIXES.END_USER, ENTITY_PREFIXES.USER], 'End-user ID'),
    optionalEntityIdBodyRule('user_id', ENTITY_PREFIXES.USER, 'User ID'),
    optionalEntityIdBodyRule('vehicle_id', ENTITY_PREFIXES.VEHICLE, 'Vehicle ID'),
    optionalEntityIdBodyRule('vehicleId', ENTITY_PREFIXES.VEHICLE, 'Vehicle ID')
  ];
};

module.exports = {
  validationErrorHandler,
  entityIdParamRule,
  entityIdBodyRule,
  optionalEntityIdBodyRule,
  userValidationRules,
  driverCreationRules,
  parentCreationRules,
  endUserCreationRules,
  vehicleCreationRules,
  tripCreationRules,
  tripEndRules,
  locationUpdateRules,
  speedRecordingRules,
  passengerStatusRules,
  stopChecklistRules,
  stopPhotoNoteRules,
  stopIncidentRules,
  confirmationRules,
  paginationRules,
  deviceRules,
  fcmTokenRules,
  bulkAssignmentRules,
  geofenceRules,
  notificationPreferencesRules,
  assignDriverToVehicleRules,
  assignDeviceToVehicleRules,
  assignEndUserToVehicleRules,
  unassignEndUserFromVehicleRules
};

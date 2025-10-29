const { body, query, param, validationResult } = require('express-validator');
const PhoneFormatter = require('../utils/phoneFormatter');

const validationErrorHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

const userValidationRules = () => {
  return [
    body('email')
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
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
    body('vehicle_id')
      .optional()
      .isMongoId()
      .withMessage('Invalid vehicle ID')
  ];
};

const parentCreationRules = () => {
  return [
    ...userValidationRules(),
    body('address')
      .optional()
      .trim()
      .isLength({ min: 5 })
      .withMessage('Address must be at least 5 characters')
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
          const validation = PhoneFormatter.validatePhoneNumber(value, 'IN');
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
      .isLength({ min: 5 })
      .withMessage('Pickup address must be at least 5 characters'),
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
      .isLength({ min: 5 })
      .withMessage('Dropoff address must be at least 5 characters'),
    body('dropoff_location.name')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Dropoff location name must be at least 2 characters')
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
      .isMongoId()
      .withMessage('Invalid vehicle ID'),
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

const locationUpdateRules = () => {
  return [
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

module.exports = {
  validationErrorHandler,
  userValidationRules,
  driverCreationRules,
  parentCreationRules,
  endUserCreationRules,
  vehicleCreationRules,
  tripCreationRules,
  locationUpdateRules,
  speedRecordingRules,
  passengerStatusRules,
  confirmationRules,
  paginationRules,
  deviceRules,
  fcmTokenRules,
  bulkAssignmentRules,
  geofenceRules,
  notificationPreferencesRules
};

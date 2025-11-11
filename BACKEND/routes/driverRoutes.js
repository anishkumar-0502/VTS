const express = require('express');
const router = express.Router();
const DriverController = require('../controllers/driverController');
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const PaginationHelper = require('../utils/paginationHelper');
const {
  validationErrorHandler,
  tripCreationRules,
  tripEndRules,
  locationUpdateRules,
  speedRecordingRules,
  passengerStatusRules,
  stopChecklistRules,
  stopPhotoNoteRules,
  stopIncidentRules,
  fcmTokenRules
} = require('../middlewares/validationRules');
const {
  speedRecordingLimiter,
  sosAlertLimiter,
  speedViolationLimiter
} = require('../middlewares/rateLimitRules');

router.use(authMiddleware, roleMiddleware(['driver']));
router.use(PaginationHelper.createPaginationMiddleware());

// ========== PROFILE MANAGEMENT ========== COMPLETED
router.get('/profile', DriverController.getProfile);
router.put('/profile/update', DriverController.updateProfile);
router.post('/profile/change-password', AuthController.changePassword);

// ========== HOME SCREEN - DAILY TRIPS ==========
router.get('/daily-trips', DriverController.getDailyTrips);
router.get('/available-trips', DriverController.getAvailableTrips);
router.post('/trips/select-start-end', DriverController.selectTripStartEnd);

// ========== ACTIVE TRIP - MANAGEMENT ==========
router.post('/trips/start', tripCreationRules(), validationErrorHandler, DriverController.startTrip);
router.get('/trips/active', DriverController.getActiveTrip);
router.post('/trips/location', locationUpdateRules(), validationErrorHandler, DriverController.recordLocationUpdate);
router.put('/trips/:tripId/end', tripEndRules(), validationErrorHandler, DriverController.endTrip);
router.get('/trips', DriverController.getTripHistory);
router.get('/trips/:tripId', DriverController.getTripDetails);

// ========== ACTIVE TRIP - PASSENGER MANAGEMENT ==========
router.post('/trips/passenger/update-status', passengerStatusRules(), validationErrorHandler, DriverController.updatePassengerStatus);
router.post('/trips/stop/checklist', stopChecklistRules(), validationErrorHandler, DriverController.updateStopChecklist);
router.post('/trips/stop/photo-note', stopPhotoNoteRules(), validationErrorHandler, DriverController.addStopPhotoNote);
router.post('/trips/stop/incident', stopIncidentRules(), validationErrorHandler, DriverController.recordStopIncident);

// ========== ACTIVE TRIP - SPEED MONITORING ==========
router.post('/speed/record', speedRecordingLimiter, speedRecordingRules(), validationErrorHandler, DriverController.recordSpeed);
router.put('/speed-alarm/settings', DriverController.updateSpeedAlarmSettings);
router.post('/speed-violation', speedViolationLimiter, speedRecordingRules(), validationErrorHandler, DriverController.addSpeedViolation);

// ========== EMERGENCY & SOS ==========
router.post('/sos', sosAlertLimiter, DriverController.reportSOS);

// ========== VEHICLE STATUS ==========
router.get('/vehicles/:vehicleId/status', DriverController.getVehicleStatus);

// ========== FCM - PUSH NOTIFICATIONS ==========
router.post('/fcm-token/register', fcmTokenRules(), validationErrorHandler, DriverController.registerFCMToken);
router.post('/fcm-token/unregister', fcmTokenRules(), validationErrorHandler, DriverController.unregisterFCMToken);

// ========== STATISTICS ==========
router.get('/stats', DriverController.getDriverStats);

// ========== SCHEDULED TRIPS ========== # TODO ## TOMORROW
router.get('/scheduled-trips', DriverController.getScheduledTrips);
router.get('/scheduled-trips/today', DriverController.getTodaysScheduledTrips);
router.post('/scheduled-trips/:scheduledTripId/start', DriverController.startScheduledTrip);

module.exports = router;

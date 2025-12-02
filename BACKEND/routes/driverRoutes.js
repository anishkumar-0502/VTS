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
// GET /profile - Retrieve driver profile details
router.get('/profile', DriverController.getProfile);
// PUT /profile/update - Update driver profile information
router.put('/profile/update', DriverController.updateProfile);
// POST /profile/change-password - Change driver account password
router.post('/profile/change-password', AuthController.changePassword);

// ========== HOME SCREEN - DAILY TRIPS ==========
// GET /daily-trips - Retrieve all trips assigned for today
router.get('/daily-trips', DriverController.getDailyTrips);
// GET /available-trips - Get list of available trips driver can select
router.get('/available-trips', DriverController.getAvailableTrips);
// POST /trips/select-start-end - Select/book a trip with start and end points
router.post('/trips/select-start-end', DriverController.selectTripStartEnd);

// ========== ACTIVE TRIP - MANAGEMENT ==========
// POST /trips/start - Initiate a new trip with validated data
router.post('/trips/start', tripCreationRules(), validationErrorHandler, DriverController.startTrip);
// GET /trips/active - Get currently active trip details for driver
router.get('/trips/active', DriverController.getActiveTrip);
// POST /trips/location - Record/update driver location during trip
router.post('/trips/location', locationUpdateRules(), validationErrorHandler, DriverController.recordLocationUpdate);
// PUT /trips/:tripId/end - End an active trip with completion data
router.put('/trips/:tripId/end', tripEndRules(), validationErrorHandler, DriverController.endTrip);
// GET /trips - Retrieve trip history/past trips for driver
router.get('/trips', DriverController.getTripHistory);
// GET /trips/:tripId - Get detailed information for a specific trip
router.get('/trips/:tripId', DriverController.getTripDetails);

// ========== ACTIVE TRIP - PASSENGER MANAGEMENT ==========
// POST /trips/passenger/update-status - Update passenger boarding/alighting status
router.post('/trips/passenger/update-status', passengerStatusRules(), validationErrorHandler, DriverController.updatePassengerStatus);
// POST /trips/stop/checklist - Submit stop checklist items (before/after stop)
router.post('/trips/stop/checklist', stopChecklistRules(), validationErrorHandler, DriverController.updateStopChecklist);
// POST /trips/stop/photo-note - Add photos and notes for a stop location
router.post('/trips/stop/photo-note', stopPhotoNoteRules(), validationErrorHandler, DriverController.addStopPhotoNote);
// POST /trips/stop/incident - Record any incidents/issues at a stop
router.post('/trips/stop/incident', stopIncidentRules(), validationErrorHandler, DriverController.recordStopIncident);

// ========== ACTIVE TRIP - SPEED MONITORING ==========
// POST /speed/record - Record vehicle speed during trip (rate limited)
router.post('/speed/record', speedRecordingLimiter, speedRecordingRules(), validationErrorHandler, DriverController.recordSpeed);
// PUT /speed-alarm/settings - Update driver's speed alarm threshold settings
router.put('/speed-alarm/settings', DriverController.updateSpeedAlarmSettings);
// POST /speed-violation - Log a speed violation incident (rate limited)
router.post('/speed-violation', speedViolationLimiter, speedRecordingRules(), validationErrorHandler, DriverController.addSpeedViolation);

// ========== EMERGENCY & SOS ==========
// POST /sos - Report emergency/SOS alert from driver (rate limited)
router.post('/sos', sosAlertLimiter, DriverController.reportSOS);

// ========== VEHICLE STATUS ==========
// GET /vehicles/:vehicleId/status - Get current vehicle status and metrics
router.get('/vehicles/:vehicleId/status', DriverController.getVehicleStatus);

// ========== FCM - PUSH NOTIFICATIONS ==========
// POST /fcm-token/register - Register FCM device token for push notifications
router.post('/fcm-token/register', fcmTokenRules(), validationErrorHandler, DriverController.registerFCMToken);
// POST /fcm-token/unregister - Unregister FCM device token
router.post('/fcm-token/unregister', fcmTokenRules(), validationErrorHandler, DriverController.unregisterFCMToken);

// ========== STATISTICS ==========
// GET /stats - Retrieve driver performance and trip statistics
router.get('/stats', DriverController.getDriverStats);

// ========== SCHEDULED TRIPS ========== # TODO ## TOMORROW
// GET /scheduled-trips - Get all scheduled trips for driver
router.get('/scheduled-trips', DriverController.getScheduledTrips);
// GET /scheduled-trips/today - Get scheduled trips for today
router.get('/scheduled-trips/today', DriverController.getTodaysScheduledTrips);
// POST /scheduled-trips/:scheduledTripId/start - Start a pre-scheduled trip
router.post('/scheduled-trips/:scheduledTripId/start', DriverController.startScheduledTrip);

module.exports = router;

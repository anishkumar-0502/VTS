const express = require('express');
const router = express.Router();
const ParentController = require('../controllers/parentController');
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const PaginationHelper = require('../utils/paginationHelper');
const {
  validationErrorHandler,
  confirmationRules,
  fcmTokenRules,
  geofenceRules,
  notificationPreferencesRules
} = require('../middlewares/validationRules');
const {
  sosAlertLimiter,
  callInitiationLimiter,
  confirmationLimiter
} = require('../middlewares/rateLimitRules');

router.use(authMiddleware, roleMiddleware(['parent']));
router.use(PaginationHelper.createPaginationMiddleware());

// ========== PROFILE MANAGEMENT ==========
// GET /profile - Retrieve parent profile details
router.get('/profile', ParentController.getProfile);
// PUT /profile/update - Update parent profile information
router.put('/profile/update', ParentController.updateProfile);
// POST /profile/change-password - Change parent account password
router.post('/profile/change-password', AuthController.changePassword);

// ========== HOME SCREEN - LIVE TRACKING ==========
// GET /current-trip - Get currently active trip details for child
router.get('/current-trip', ParentController.getCurrentTrip);
// GET /track-child - Track child's real-time location and vehicle status
router.get('/track-child', ParentController.trackChild);
// GET /next-stop - Get next scheduled stop for child's trip
router.get('/next-stop', ParentController.getNextStop);
// GET /passenger-status - Get child's current boarding/alighting status
router.get('/passenger-status', ParentController.getChildPassengerStatus);

// ========== HOME SCREEN - CONFIRMATIONS ==========
// POST /confirm-pickup - Confirm child pickup at stop location (rate limited)
router.post('/confirm-pickup', confirmationLimiter, confirmationRules(), validationErrorHandler, ParentController.confirmChildPickup);
// POST /confirm-dropoff - Confirm child dropoff at destination (rate limited)
router.post('/confirm-dropoff', confirmationLimiter, confirmationRules(), validationErrorHandler, ParentController.confirmChildDropoff);

// ========== HOME SCREEN - COMMUNICATION ==========
// GET /driver-contact - Get driver contact information and details
router.get('/driver-contact', ParentController.getDriverContact);
// POST /call-driver - Initiate call to driver (rate limited)
router.post('/call-driver', callInitiationLimiter, ParentController.initiateDriverCall);
// POST /sos-alert - Report emergency alert for child (rate limited)
router.post('/sos-alert', sosAlertLimiter, ParentController.reportSOSToOperator);

// ========== TRIP DETAILS ==========
// GET /trip-status - Get active trip status and details
router.get('/trip-status', ParentController.getActiveTripStatus);
// GET /location-history - Get location history for a trip
router.get('/location-history', ParentController.getLocationHistory);

// ========== NOTIFICATIONS ==========
// GET /notifications - Retrieve all parent notifications
router.get('/notifications', ParentController.getNotifications);
// PUT /notifications/:notificationId/read - Mark notification as read
router.put('/notifications/:notificationId/read', ParentController.markNotificationAsRead);
// GET /notifications/unread-count - Get count of unread notifications
router.get('/notifications/unread-count', ParentController.getUnreadCount);

// ========== NOTIFICATION PREFERENCES ==========
// GET /notification-preferences - Get parent notification preference settings
router.get('/notification-preferences', ParentController.getNotificationPreferences);
// PUT /notification-preferences - Update parent notification preferences
router.put('/notification-preferences', notificationPreferencesRules(), validationErrorHandler, ParentController.updateNotificationPreferences);

// ========== FCM - PUSH NOTIFICATIONS ==========
// POST /fcm-token/register - Register FCM device token for push notifications
router.post('/fcm-token/register', fcmTokenRules(), validationErrorHandler, ParentController.registerFCMToken);
// POST /fcm-token/unregister - Unregister FCM device token
router.post('/fcm-token/unregister', fcmTokenRules(), validationErrorHandler, ParentController.unregisterFCMToken);

// ========== SETTINGS ==========
// POST /speed-alerts - Enable/disable speed alert notifications
router.post('/speed-alerts', ParentController.enableSpeedAlerts);
// POST /geofence - Set geofence alerts for child's location
router.post('/geofence', geofenceRules(), validationErrorHandler, ParentController.setGeofence);

// ========== STATISTICS ==========
// GET /child-stats - Get child trip statistics and performance metrics
router.get('/child-stats', ParentController.getChildStats);

module.exports = router;

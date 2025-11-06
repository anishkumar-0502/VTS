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
router.get('/profile', ParentController.getProfile);
router.put('/profile/update', ParentController.updateProfile);
router.post('/profile/change-password', AuthController.changePassword);

// ========== HOME SCREEN - LIVE TRACKING ==========
router.get('/current-trip', ParentController.getCurrentTrip);
router.get('/track-child', ParentController.trackChild);
router.get('/next-stop', ParentController.getNextStop);
router.get('/passenger-status', ParentController.getChildPassengerStatus);

// ========== HOME SCREEN - CONFIRMATIONS ==========
router.post('/confirm-pickup', confirmationLimiter, confirmationRules(), validationErrorHandler, ParentController.confirmChildPickup);
router.post('/confirm-dropoff', confirmationLimiter, confirmationRules(), validationErrorHandler, ParentController.confirmChildDropoff);

// ========== HOME SCREEN - COMMUNICATION ==========
router.get('/driver-contact', ParentController.getDriverContact);
router.post('/call-driver', callInitiationLimiter, ParentController.initiateDriverCall);
router.post('/sos-alert', sosAlertLimiter, ParentController.reportSOSToOperator);

// ========== TRIP DETAILS ==========
router.get('/trip-status', ParentController.getActiveTripStatus);
router.get('/location-history', ParentController.getLocationHistory);

// ========== NOTIFICATIONS ==========
router.get('/notifications', ParentController.getNotifications);
router.put('/notifications/:notificationId/read', ParentController.markNotificationAsRead);
router.get('/notifications/unread-count', ParentController.getUnreadCount);

// ========== NOTIFICATION PREFERENCES ==========
router.get('/notification-preferences', ParentController.getNotificationPreferences);
router.put('/notification-preferences', notificationPreferencesRules(), validationErrorHandler, ParentController.updateNotificationPreferences);

// ========== FCM - PUSH NOTIFICATIONS ==========
router.post('/fcm-token/register', fcmTokenRules(), validationErrorHandler, ParentController.registerFCMToken);
router.post('/fcm-token/unregister', fcmTokenRules(), validationErrorHandler, ParentController.unregisterFCMToken);

// ========== SETTINGS ==========
router.post('/speed-alerts', ParentController.enableSpeedAlerts);
router.post('/geofence', geofenceRules(), validationErrorHandler, ParentController.setGeofence);

// ========== STATISTICS ==========
router.get('/child-stats', ParentController.getChildStats);

module.exports = router;

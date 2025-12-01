const express = require('express');
const router = express.Router();
const SuperadminController = require('../controllers/superadminController');
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const PaginationHelper = require('../utils/paginationHelper');
const {
  getAuditLogs,
  getAuditLogById,
  getAuditLogStats,
  clearAuditLogs
} = require('../middlewares/auditTrail');

router.use(authMiddleware, roleMiddleware(['superadmin']));
router.use(PaginationHelper.createPaginationMiddleware());

// ========== PROFILE MANAGEMENT ========== COMPLETED
router.get('/profile', SuperadminController.getOwnProfile);
router.put('/profile/update', SuperadminController.updateOwnProfile);
router.post('/profile/change-password', AuthController.changePassword);

// ========== ANALYTICS & DASHBOARD ========== // TODO - will be implement this later
router.get('/analytics/dashboard', SuperadminController.getDashboardAnalytics);
router.get('/tracking/live-data', SuperadminController.getGPSTracking);

// ========== MANAGE OPERATORS ========== COMPLETED
router.post('/operators/create', SuperadminController.createOperator);
router.get('/operators/list', SuperadminController.getOperators);
router.get('/operators/:operatorId/view', SuperadminController.getOperatorById);
router.put('/operators/:operatorId/update', SuperadminController.updateOperator);
router.put('/operators/:operatorId/deactivate', SuperadminController.toggleOperatorStatus);

// ========== MANAGE USERS ==========
router.post('/users/create', SuperadminController.createUser);
router.get('/users/list', SuperadminController.getAllUsers);
router.get('/users/:userId/view', SuperadminController.getUserById);
router.put('/users/:userId/update', SuperadminController.updateUser);
router.put('/users/:userId/deactivate', SuperadminController.toggleUserStatus);

// ========== MANAGE DEVICES ========== COMPLETED

router.post('/devices/create', SuperadminController.createDevice);
router.get('/devices/list', SuperadminController.getAllDevices);
router.get('/devices/:deviceId/view', SuperadminController.getDeviceById);
router.put('/devices/:deviceId/update', SuperadminController.updateDevice);
router.put('/devices/:deviceId/deactivate', SuperadminController.toggleDeviceStatus);

// ========= MANAGE DEVICE ASSIGNMENTS ========== COMPLETED
router.post('/assignments/device-to-operator', SuperadminController.assignDeviceToOperator);
router.post('/assignments/bulk-device-to-operator', SuperadminController.bulkAssignDevices);
router.post('/assignments/unassign-device-from-operator', SuperadminController.unassignDeviceFromOperator);
router.post('/assignments/unassign-bulk-device-from-operator', SuperadminController.bulkUnassignDevices);

// ========== MANAGE ROLES ========== COMPLETED
router.post('/roles/create', SuperadminController.createRole);
router.get('/roles/list', SuperadminController.getAllRoles);
router.get('/roles/:roleId/view', SuperadminController.getRoleById);
router.put('/roles/:roleId/update', SuperadminController.updateRole);
router.put('/roles/:roleId/deactivate', SuperadminController.toggleRoleStatus);

// ========== AUDIT TRAIL ==========  // TODO - will be implement this later

router.get('/audit-logs/list', getAuditLogs);
router.get('/audit-logs/:logId/view', getAuditLogById);
router.get('/audit-logs/stats/summary', getAuditLogStats);
router.post('/audit-logs/clear', clearAuditLogs);

// ========== SYSTEM STATISTICS ========== // TODO - will be implement this later

router.get('/stats/system', SuperadminController.getSystemStats);

// ========== DATA CLEANUP ==========
router.post('/cleanup/data', SuperadminController.cleanupData);

module.exports = router;

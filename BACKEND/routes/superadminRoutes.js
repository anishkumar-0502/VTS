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
// GET /profile - Retrieve superadmin profile details
router.get('/profile', SuperadminController.getOwnProfile);
// PUT /profile/update - Update superadmin profile information
router.put('/profile/update', SuperadminController.updateOwnProfile);
// POST /profile/change-password - Change superadmin account password
router.post('/profile/change-password', AuthController.changePassword);

// ========== ANALYTICS & DASHBOARD ========== // TODO - will be implement this later
// GET /analytics/dashboard - Get system-wide analytics and dashboard data
router.get('/analytics/dashboard', SuperadminController.getDashboardAnalytics);
// GET /tracking/live-data - Get live GPS tracking data for all vehicles
router.get('/tracking/live-data', SuperadminController.getGPSTracking);

// ========== MANAGE OPERATORS ========== COMPLETED
// POST /operators/create - Create a new operator account
router.post('/operators/create', SuperadminController.createOperator);
// GET /operators/list - Get list of all operators
router.get('/operators/list', SuperadminController.getOperators);
// GET /operators/:operatorId/view - Get specific operator details
router.get('/operators/:operatorId/view', SuperadminController.getOperatorById);
// PUT /operators/:operatorId/update - Update operator information
router.put('/operators/:operatorId/update', SuperadminController.updateOperator);
// PUT /operators/:operatorId/deactivate - Toggle operator active/inactive status
router.put('/operators/:operatorId/deactivate', SuperadminController.toggleOperatorStatus);

// ========== MANAGE USERS ==========
// POST /users/create - Create a new user account
router.post('/users/create', SuperadminController.createUser);
// GET /users/list - Get list of all users (drivers, parents, etc)
router.get('/users/list', SuperadminController.getAllUsers);
// GET /users/:userId/view - Get specific user details
router.get('/users/:userId/view', SuperadminController.getUserById);
// PUT /users/:userId/update - Update user information
router.put('/users/:userId/update', SuperadminController.updateUser);
// PUT /users/:userId/deactivate - Toggle user active/inactive status
router.put('/users/:userId/deactivate', SuperadminController.toggleUserStatus);

// ========== MANAGE DEVICES ========== COMPLETED
// POST /devices/create - Create a new device record
router.post('/devices/create', SuperadminController.createDevice);
// GET /devices/list - Get list of all devices
router.get('/devices/list', SuperadminController.getAllDevices);
// GET /devices/:deviceId/view - Get specific device details
router.get('/devices/:deviceId/view', SuperadminController.getDeviceById);
// PUT /devices/:deviceId/update - Update device information
router.put('/devices/:deviceId/update', SuperadminController.updateDevice);
// PUT /devices/:deviceId/deactivate - Toggle device active/inactive status
router.put('/devices/:deviceId/deactivate', SuperadminController.toggleDeviceStatus);

// ========= MANAGE DEVICE ASSIGNMENTS ========== COMPLETED
// POST /assignments/device-to-operator - Assign device to an operator
router.post('/assignments/device-to-operator', SuperadminController.assignDeviceToOperator);
// POST /assignments/bulk-device-to-operator - Bulk assign devices to operators
router.post('/assignments/bulk-device-to-operator', SuperadminController.bulkAssignDevices);
// POST /assignments/unassign-device-from-operator - Unassign device from operator
router.post('/assignments/unassign-device-from-operator', SuperadminController.unassignDeviceFromOperator);
// POST /assignments/unassign-bulk-device-from-operator - Bulk unassign devices from operators
router.post('/assignments/unassign-bulk-device-from-operator', SuperadminController.bulkUnassignDevices);

// ========== MANAGE ROLES ========== COMPLETED
// POST /roles/create - Create a new system role
router.post('/roles/create', SuperadminController.createRole);
// GET /roles/list - Get list of all roles
router.get('/roles/list', SuperadminController.getAllRoles);
// GET /roles/:roleId/view - Get specific role details and permissions
router.get('/roles/:roleId/view', SuperadminController.getRoleById);
// PUT /roles/:roleId/update - Update role information and permissions
router.put('/roles/:roleId/update', SuperadminController.updateRole);
// PUT /roles/:roleId/deactivate - Toggle role active/inactive status
router.put('/roles/:roleId/deactivate', SuperadminController.toggleRoleStatus);

// ========== AUDIT TRAIL ==========  // TODO - will be implement this later
// GET /audit-logs/list - Get system audit logs list
router.get('/audit-logs/list', getAuditLogs);
// GET /audit-logs/:logId/view - Get specific audit log details
router.get('/audit-logs/:logId/view', getAuditLogById);
// GET /audit-logs/stats/summary - Get audit log statistics summary
router.get('/audit-logs/stats/summary', getAuditLogStats);
// POST /audit-logs/clear - Clear audit logs from system
router.post('/audit-logs/clear', clearAuditLogs);

// ========== SYSTEM STATISTICS ========== // TODO - will be implement this later
// GET /stats/system - Get system-wide statistics and metrics
router.get('/stats/system', SuperadminController.getSystemStats);

// ========== DATA CLEANUP ==========
// POST /cleanup/data - Perform system data cleanup and maintenance
router.post('/cleanup/data', SuperadminController.cleanupData);

module.exports = router;

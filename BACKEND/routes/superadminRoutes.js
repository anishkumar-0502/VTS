const express = require('express');
const router = express.Router();
const SuperadminController = require('../controllers/superadminController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const {
  getAuditLogs,
  getAuditLogById,
  getAuditLogStats,
  clearAuditLogs
} = require('../middlewares/auditTrail');

router.use(authMiddleware, roleMiddleware(['superadmin']));

// ========== ANALYTICS & DASHBOARD ==========

/**
 * @swagger
 * /superadmin/analytics/dashboard:
 *   get:
 *     summary: Get dashboard analytics
 *     description: Retrieve comprehensive dashboard analytics including total operators, users, devices, and active vehicles
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 */
router.get('/analytics/dashboard', SuperadminController.getDashboardAnalytics);

/**
 * @swagger
 * /superadmin/tracking/live-data:
 *   get:
 *     summary: Get GPS tracking live data
 *     description: Retrieve real-time GPS tracking data with filters
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: operatorId
 *         schema:
 *           type: string
 *         description: Filter by operator ID
 *       - in: query
 *         name: vehicleId
 *         schema:
 *           type: string
 *         description: Filter by vehicle ID
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *         description: Filter by device ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of records to return
 *     responses:
 *       200:
 *         description: GPS tracking data retrieved successfully
 */
router.get('/tracking/live-data', SuperadminController.getGPSTracking);

// ========== MANAGE OPERATORS ==========

/**
 * @swagger
 * /superadmin/operators/create:
 *   post:
 *     summary: Create a new operator
 *     description: Create a new operator account with company details
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOperatorRequest'
 *     responses:
 *       201:
 *         description: Operator created successfully
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Operator with this email already exists
 */
router.post('/operators/create', SuperadminController.createOperator);

/**
 * @swagger
 * /superadmin/operators/list:
 *   get:
 *     summary: Get all operators
 *     description: Retrieve list of all active operators
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Operators retrieved successfully
 */
router.get('/operators/list', SuperadminController.getOperators);

/**
 * @swagger
 * /superadmin/operators/{operatorId}/view:
 *   get:
 *     summary: Get operator by ID
 *     description: Retrieve detailed information about a specific operator including vehicles, drivers, and devices
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: operatorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Operator ID
 *     responses:
 *       200:
 *         description: Operator retrieved successfully
 *       404:
 *         description: Operator not found
 */
router.get('/operators/:operatorId/view', SuperadminController.getOperatorById);

/**
 * @swagger
 * /superadmin/operators/{operatorId}/update:
 *   put:
 *     summary: Update operator information
 *     description: Update operator details
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: operatorId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               company_name:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Operator updated successfully
 *       404:
 *         description: Operator not found
 */
router.put('/operators/:operatorId/update', SuperadminController.updateOperator);

/**
 * @swagger
 * /superadmin/operators/{operatorId}/deactivate:
 *   put:
 *     summary: Toggle operator status
 *     description: Activate or deactivate an operator account
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: operatorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Operator status toggled successfully
 *       404:
 *         description: Operator not found
 */
router.put('/operators/:operatorId/deactivate', SuperadminController.toggleOperatorStatus);

// ========== MANAGE USERS ==========

/**
 * @swagger
 * /superadmin/users/create:
 *   post:
 *     summary: Create a new user
 *     description: Create a new user account with specified role and operator assignment
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone_number, role_id]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone_number:
 *                 type: string
 *               role_id:
 *                 type: integer
 *               operator_id:
 *                 type: string
 *                 description: Optional - for operator-specific users
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Missing required fields
 */
router.post('/users/create', SuperadminController.createUser);

/**
 * @swagger
 * /superadmin/users/list:
 *   get:
 *     summary: Get all users
 *     description: Retrieve list of all users with optional filtering
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role_id
 *         schema:
 *           type: integer
 *         description: Filter by role ID
 *       - in: query
 *         name: operator_id
 *         schema:
 *           type: string
 *         description: Filter by operator ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: boolean
 *         description: Filter by status (true/false)
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get('/users/list', SuperadminController.getAllUsers);

/**
 * @swagger
 * /superadmin/users/{userId}/view:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve detailed information about a specific user
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/users/:userId/view', SuperadminController.getUserById);

/**
 * @swagger
 * /superadmin/users/{userId}/update:
 *   put:
 *     summary: Update user information
 *     description: Update user details or reset password
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               reset_password:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 */
router.put('/users/:userId/update', SuperadminController.updateUser);

/**
 * @swagger
 * /superadmin/users/{userId}/deactivate:
 *   put:
 *     summary: Toggle user status
 *     description: Activate or deactivate a user account
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User status toggled successfully
 *       404:
 *         description: User not found
 */
router.put('/users/:userId/deactivate', SuperadminController.toggleUserStatus);

// ========== MANAGE DEVICES ==========

/**
 * @swagger
 * /superadmin/devices/create:
 *   post:
 *     summary: Create a new device
 *     description: Add a new GPS tracking device to the system
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDeviceRequest'
 *     responses:
 *       201:
 *         description: Device created successfully
 *       400:
 *         description: Missing required fields
 */
router.post('/devices/create', SuperadminController.createDevice);

/**
 * @swagger
 * /superadmin/devices/list:
 *   get:
 *     summary: Get all devices
 *     description: Retrieve list of all devices in the system
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Devices retrieved successfully
 */
router.get('/devices/list', SuperadminController.getAllDevices);

/**
 * @swagger
 * /superadmin/devices/{deviceId}/view:
 *   get:
 *     summary: Get device by ID
 *     description: Retrieve detailed information about a specific device
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device retrieved successfully
 *       404:
 *         description: Device not found
 */
router.get('/devices/:deviceId/view', SuperadminController.getDeviceById);

/**
 * @swagger
 * /superadmin/devices/{deviceId}/update:
 *   put:
 *     summary: Update device information
 *     description: Update device details like firmware version or SIM number
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device updated successfully
 *       404:
 *         description: Device not found
 */
router.put('/devices/:deviceId/update', SuperadminController.updateDevice);

/**
 * @swagger
 * /superadmin/devices/{deviceId}/deactivate:
 *   put:
 *     summary: Toggle device status
 *     description: Activate or deactivate a device
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device status toggled successfully
 *       404:
 *         description: Device not found
 */
router.put('/devices/:deviceId/deactivate', SuperadminController.toggleDeviceStatus);

/**
 * @swagger
 * /superadmin/devices/assign:
 *   post:
 *     summary: Assign device to operator
 *     description: Assign a single device to an operator
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [device_id, operator_id]
 *             properties:
 *               device_id:
 *                 type: string
 *               operator_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Device assigned successfully
 */
router.post('/devices/assign', SuperadminController.assignDeviceToOperator);

/**
 * @swagger
 * /superadmin/devices/bulk-assign:
 *   post:
 *     summary: Bulk assign devices to operator
 *     description: Assign multiple devices to an operator at once
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [device_ids, operator_id]
 *             properties:
 *               device_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               operator_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Devices bulk assigned successfully
 */
router.post('/devices/bulk-assign', SuperadminController.bulkAssignDevices);

// ========== MANAGE ROLES ==========

/**
 * @swagger
 * /superadmin/roles/create:
 *   post:
 *     summary: Create a new role
 *     description: Create a new user role with specific permissions
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRoleRequest'
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Missing required fields
 */
router.post('/roles/create', SuperadminController.createRole);

/**
 * @swagger
 * /superadmin/roles/list:
 *   get:
 *     summary: Get all roles
 *     description: Retrieve list of all roles in the system
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 */
router.get('/roles/list', SuperadminController.getAllRoles);

/**
 * @swagger
 * /superadmin/roles/{roleId}/view:
 *   get:
 *     summary: Get role by ID
 *     description: Retrieve detailed information about a specific role
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role retrieved successfully
 *       404:
 *         description: Role not found
 */
router.get('/roles/:roleId/view', SuperadminController.getRoleById);

/**
 * @swagger
 * /superadmin/roles/{roleId}/update:
 *   put:
 *     summary: Update role information
 *     description: Update role details or permissions
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       404:
 *         description: Role not found
 */
router.put('/roles/:roleId/update', SuperadminController.updateRole);

/**
 * @swagger
 * /superadmin/roles/{roleId}/deactivate:
 *   put:
 *     summary: Toggle role status
 *     description: Activate or deactivate a role
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role status toggled successfully
 *       404:
 *         description: Role not found
 */
router.put('/roles/:roleId/deactivate', SuperadminController.toggleRoleStatus);

// ========== AUDIT TRAIL ==========

/**
 * @swagger
 * /superadmin/audit-logs/list:
 *   get:
 *     summary: Get audit logs
 *     description: Retrieve system audit logs with optional pagination
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 */
router.get('/audit-logs/list', getAuditLogs);

/**
 * @swagger
 * /superadmin/audit-logs/{logId}/view:
 *   get:
 *     summary: Get audit log by ID
 *     description: Retrieve details of a specific audit log entry
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: logId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Audit log retrieved successfully
 *       404:
 *         description: Audit log not found
 */
router.get('/audit-logs/:logId/view', getAuditLogById);

/**
 * @swagger
 * /superadmin/audit-logs/stats/summary:
 *   get:
 *     summary: Get audit log statistics
 *     description: Retrieve summary statistics of audit logs
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit statistics retrieved successfully
 */
router.get('/audit-logs/stats/summary', getAuditLogStats);

/**
 * @swagger
 * /superadmin/audit-logs/clear:
 *   post:
 *     summary: Clear audit logs
 *     description: Clear all audit logs (use with caution)
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               confirm:
 *                 type: boolean
 *                 description: Confirmation flag to clear logs
 *     responses:
 *       200:
 *         description: Audit logs cleared successfully
 */
router.post('/audit-logs/clear', clearAuditLogs);

// ========== SYSTEM STATISTICS ==========

/**
 * @swagger
 * /superadmin/stats/system:
 *   get:
 *     summary: Get system statistics
 *     description: Retrieve comprehensive system statistics and performance metrics
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics retrieved successfully
 */
router.get('/stats/system', SuperadminController.getSystemStats);

module.exports = router;

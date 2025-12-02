const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const OperatorController = require('../controllers/operatorController');
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const PaginationHelper = require('../utils/paginationHelper');
const { bulkOperationLimiter } = require('../middlewares/rateLimitRules');
const {
    endUserCreationRules,
    validationErrorHandler,
    vehicleCreationRules,
    entityIdParamRule,
    entityIdBodyRule,
    optionalEntityIdBodyRule,
    assignDriverToVehicleRules,
    assignDeviceToVehicleRules,
    assignEndUserToVehicleRules,
    unassignEndUserFromVehicleRules
} = require('../middlewares/validationRules');
const { ENTITY_PREFIXES } = require('../utils/uuidUtils');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/bulk-imports/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedExts = ['.xlsx', '.xls', '.csv'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(fileExt)) {
        cb(null, true);
    } else {
        cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

router.use(authMiddleware, roleMiddleware(['operator']));
router.use(PaginationHelper.createPaginationMiddleware());

// ========== PROFILE MANAGEMENT ========== COMPLETED
// GET /profile - Retrieve operator profile details
router.get('/profile', OperatorController.getOwnProfile);
// PUT /profile/update - Update operator profile information
router.put('/profile/update', OperatorController.updateOwnProfile);
// POST /profile/change-password - Change operator account password
router.post('/profile/change-password', AuthController.changePassword);

// ========== ANALYTICS & DASHBOARD ========== // TODO - will be implement this later
// GET /analytics/dashboard - Get operator dashboard analytics
router.get('/analytics/dashboard', OperatorController.getDashboardAnalytics);
// GET /tracking/live-data - Get live GPS tracking data for operator's vehicles
router.get('/tracking/live-data', OperatorController.getLiveTracking);

// ========== MANAGE DRIVERS ========== COMPLETED
// GET /users/list - Get list of all users under operator
router.get('/users/list', OperatorController.getOperatorUsers);
// POST /drivers/create - Create a new driver
router.post(
    '/drivers/create',
    optionalEntityIdBodyRule('assigned_vehicle_id', ENTITY_PREFIXES.VEHICLE, 'Assigned vehicle ID'),
    validationErrorHandler,
    OperatorController.createDriver
);
// GET /drivers/list - Get list of all drivers under operator
router.get('/drivers/list', OperatorController.getDrivers);
// GET /drivers/:driverId/view - Get specific driver details
router.get(
    '/drivers/:driverId/view',
    entityIdParamRule('driverId', ENTITY_PREFIXES.DRIVER, 'Driver ID'),
    validationErrorHandler,
    OperatorController.getDriverById
);
// PUT /drivers/:driverId/update - Update driver information
router.put(
    '/drivers/:driverId/update',
    entityIdParamRule('driverId', ENTITY_PREFIXES.DRIVER, 'Driver ID'),
    optionalEntityIdBodyRule('assigned_vehicle_id', ENTITY_PREFIXES.VEHICLE, 'Assigned vehicle ID'),
    validationErrorHandler,
    OperatorController.updateDriver
);
// PUT /drivers/:driverId/deactivate - Deactivate driver account
router.put(
    '/drivers/:driverId/deactivate',
    entityIdParamRule('driverId', ENTITY_PREFIXES.DRIVER, 'Driver ID'),
    validationErrorHandler,
    OperatorController.deactivateDriver
);

// ========== MANAGE END-USERS (PARENTS) ========== COMPLETED
// POST /end-users/create - Create a new end-user (parent)
router.post('/end-users/create', endUserCreationRules(), validationErrorHandler, OperatorController.createEndUser);
// GET /end-users/list - Get list of all end-users (parents) under operator
router.get('/end-users/list', OperatorController.getEndUsers);
// GET /end-users/:userId/view - Get specific end-user (parent) details
router.get(
    '/end-users/:userId/view',
    entityIdParamRule('userId', [ENTITY_PREFIXES.USER, ENTITY_PREFIXES.END_USER], 'End-user ID'),
    validationErrorHandler,
    OperatorController.getEndUserById
);
// PUT /end-users/:userId/update - Update end-user (parent) information
router.put(
    '/end-users/:userId/update',
    entityIdParamRule('userId', [ENTITY_PREFIXES.USER, ENTITY_PREFIXES.END_USER], 'End-user ID'),
    endUserCreationRules(),
    validationErrorHandler,
    OperatorController.updateEndUser
);
// PUT /end-users/:userId/deactivate - Deactivate end-user (parent) account
router.put(
    '/end-users/:userId/deactivate',
    entityIdParamRule('userId', [ENTITY_PREFIXES.USER, ENTITY_PREFIXES.END_USER], 'End-user ID'),
    validationErrorHandler,
    OperatorController.deactivateEndUser
);
// POST /end-users/bulk-import - Bulk import end-users from file (rate limited)
router.post('/end-users/bulk-import', bulkOperationLimiter, upload.single('file'), OperatorController.bulkImportEndUsers);  // TODO - will be implement this later

// ========== MANAGE DEVICES ========== COMPLETED
// GET /devices/list - Get list of all devices assigned to operator
router.get('/devices/list', OperatorController.getDevices);
// GET /devices/:deviceId/view - Get specific device details
router.get('/devices/:deviceId/view', OperatorController.getDeviceById);
// PUT /devices/:deviceId/update - Update device information
router.put('/devices/:deviceId/update', OperatorController.updateDevice);
// PUT /devices/:deviceId/deactivate - Deactivate device
router.put('/devices/:deviceId/deactivate', OperatorController.deactivateDevice);

// ========== MANAGE VEHICLES ==========  COMPLETED
// POST /vehicles/create - Create a new vehicle
router.post(
    '/vehicles/create',
    optionalEntityIdBodyRule('driver_id', [ENTITY_PREFIXES.DRIVER, ENTITY_PREFIXES.USER], 'Driver ID'),
    vehicleCreationRules(),
    validationErrorHandler,
    OperatorController.createVehicle
);
// GET /vehicles/list - Get list of all vehicles under operator
router.get('/vehicles/list', OperatorController.getVehicles);
// GET /vehicles/:vehicleId/view - Get specific vehicle details
router.get(
    '/vehicles/:vehicleId/view',
    entityIdParamRule('vehicleId', ENTITY_PREFIXES.VEHICLE, 'Vehicle ID'),
    validationErrorHandler,
    OperatorController.getVehicleById
);
// PUT /vehicles/:vehicleId/update - Update vehicle information
router.put(
    '/vehicles/:vehicleId/update',
    entityIdParamRule('vehicleId', ENTITY_PREFIXES.VEHICLE, 'Vehicle ID'),
    optionalEntityIdBodyRule('driver_id', [ENTITY_PREFIXES.DRIVER, ENTITY_PREFIXES.USER], 'Driver ID'),
    vehicleCreationRules(),
    validationErrorHandler,
    OperatorController.updateVehicle
);
// PUT /vehicles/:vehicleId/deactivate - Deactivate vehicle
router.put(
    '/vehicles/:vehicleId/deactivate',
    entityIdParamRule('vehicleId', ENTITY_PREFIXES.VEHICLE, 'Vehicle ID'),
    validationErrorHandler,
    OperatorController.deactivateVehicle
);
// POST /vehicles/bulk-import - Bulk import vehicles from file
router.post('/vehicles/bulk-import', upload.single('file'), OperatorController.bulkImportVehicles); // TODO - will be implement this later

// ========== MANAGE DEVICE ASSIGNMENTS ========== COMPLETED
// POST /assignments/device-to-vehicle - Assign device to a vehicle
router.post(
    '/assignments/device-to-vehicle',
    assignDeviceToVehicleRules(),
    validationErrorHandler,
    OperatorController.assignDeviceToVehicle
);
// POST /assignments/bulk-devices-to-vehicle - Bulk assign devices to vehicles
router.post('/assignments/bulk-devices-to-vehicle', OperatorController.bulkAssignDevices); // TODO - will be implement this later

// ========== MANAGE DRIVER ASSIGNMENTS ========== COMPLETED
// POST /assignments/driver-to-vehicle - Assign driver to a vehicle
router.post(
    '/assignments/driver-to-vehicle',
    assignDriverToVehicleRules(),
    validationErrorHandler,
    OperatorController.assignDriverToVehicle
);
// POST /assignments/bulk-drivers-to-vehicle - Bulk assign drivers to vehicles
router.post('/assignments/bulk-drivers-to-vehicle', OperatorController.bulkAssignDrivers); // TODO - will be implement this later

// ========== MANAGE END-USER ASSIGNMENTS ========== COMPLETED
// POST /assignments/end-user-to-vehicle - Assign end-user to a vehicle
router.post(
    '/assignments/end-user-to-vehicle',
    assignEndUserToVehicleRules(),
    validationErrorHandler,
    OperatorController.assignEndUserToVehicle
);
// POST /assignments/unassign-end-user-from-vehicle - Unassign end-user from vehicle
router.post(
    '/assignments/unassign-end-user-from-vehicle',
    unassignEndUserFromVehicleRules(),
    validationErrorHandler,
    OperatorController.unassignEndUserFromVehicle
);

// ========== STATISTICS ========== // TODO - will be implement this later
// GET /stats/dashboard - Get operator dashboard statistics
router.get('/stats/dashboard', OperatorController.getOperatorStats);

// ========== MANAGE SCHEDULED TRIPS ========== COMPLETED
// POST /scheduled-trips/create - Create a new scheduled trip
router.post(
    '/scheduled-trips/create',
    entityIdBodyRule('vehicle_id', ENTITY_PREFIXES.VEHICLE, 'Vehicle ID'),
    entityIdBodyRule('driver_id', [ENTITY_PREFIXES.DRIVER, ENTITY_PREFIXES.USER], 'Driver ID'),
    validationErrorHandler,
    OperatorController.createScheduledTrip
);
// GET /scheduled-trips/list - Get list of all scheduled trips
router.get('/scheduled-trips/list', OperatorController.getScheduledTrips);
// GET /scheduled-trips/:scheduledTripId/view - Get specific scheduled trip details
router.get(
    '/scheduled-trips/:scheduledTripId/view',
    entityIdParamRule('scheduledTripId', ENTITY_PREFIXES.SCHEDULED_TRIP, 'Scheduled trip ID'),
    validationErrorHandler,
    OperatorController.getScheduledTripById
);
// PUT /scheduled-trips/:scheduledTripId/update - Update scheduled trip
router.put(
    '/scheduled-trips/:scheduledTripId/update',
    entityIdParamRule('scheduledTripId', ENTITY_PREFIXES.SCHEDULED_TRIP, 'Scheduled trip ID'),
    optionalEntityIdBodyRule('vehicle_id', ENTITY_PREFIXES.VEHICLE, 'Vehicle ID'),
    optionalEntityIdBodyRule('driver_id', [ENTITY_PREFIXES.DRIVER, ENTITY_PREFIXES.USER], 'Driver ID'),
    validationErrorHandler,
    OperatorController.updateScheduledTrip
);
// DELETE /scheduled-trips/:scheduledTripId/delete - Delete a scheduled trip
router.delete(
    '/scheduled-trips/:scheduledTripId/delete',
    entityIdParamRule('scheduledTripId', ENTITY_PREFIXES.SCHEDULED_TRIP, 'Scheduled trip ID'),
    validationErrorHandler,
    OperatorController.deleteScheduledTrip
);

module.exports = router;


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
router.get('/profile', OperatorController.getOwnProfile);
router.put('/profile/update', OperatorController.updateOwnProfile);
router.post('/profile/change-password', AuthController.changePassword);

// ========== ANALYTICS & DASHBOARD ========== // TODO - will be implement this later
router.get('/analytics/dashboard', OperatorController.getDashboardAnalytics);
router.get('/tracking/live-data', OperatorController.getLiveTracking);

// ========== MANAGE DRIVERS ========== COMPLETED
router.get('/users/list', OperatorController.getOperatorUsers);
router.post(
    '/drivers/create',
    optionalEntityIdBodyRule('assigned_vehicle_id', ENTITY_PREFIXES.VEHICLE, 'Assigned vehicle ID'),
    validationErrorHandler,
    OperatorController.createDriver
);
router.get('/drivers/list', OperatorController.getDrivers);
router.get(
    '/drivers/:driverId/view',
    entityIdParamRule('driverId', ENTITY_PREFIXES.DRIVER, 'Driver ID'),
    validationErrorHandler,
    OperatorController.getDriverById
);
router.put(
    '/drivers/:driverId/update',
    entityIdParamRule('driverId', ENTITY_PREFIXES.DRIVER, 'Driver ID'),
    optionalEntityIdBodyRule('assigned_vehicle_id', ENTITY_PREFIXES.VEHICLE, 'Assigned vehicle ID'),
    validationErrorHandler,
    OperatorController.updateDriver
);
router.put(
    '/drivers/:driverId/deactivate',
    entityIdParamRule('driverId', ENTITY_PREFIXES.DRIVER, 'Driver ID'),
    validationErrorHandler,
    OperatorController.deactivateDriver
);

// ========== MANAGE END-USERS (PARENTS) ========== COMPLETED
router.post('/end-users/create', endUserCreationRules(), validationErrorHandler, OperatorController.createEndUser);
router.get('/end-users/list', OperatorController.getEndUsers);
router.get(
    '/end-users/:userId/view',
    entityIdParamRule('userId', [ENTITY_PREFIXES.USER, ENTITY_PREFIXES.END_USER], 'End-user ID'),
    validationErrorHandler,
    OperatorController.getEndUserById
);
router.put(
    '/end-users/:userId/update',
    entityIdParamRule('userId', [ENTITY_PREFIXES.USER, ENTITY_PREFIXES.END_USER], 'End-user ID'),
    endUserCreationRules(),
    validationErrorHandler,
    OperatorController.updateEndUser
);
router.put(
    '/end-users/:userId/deactivate',
    entityIdParamRule('userId', [ENTITY_PREFIXES.USER, ENTITY_PREFIXES.END_USER], 'End-user ID'),
    validationErrorHandler,
    OperatorController.deactivateEndUser
);
router.post('/end-users/bulk-import', bulkOperationLimiter, upload.single('file'), OperatorController.bulkImportEndUsers);  // TODO - will be implement this later

// ========== MANAGE DEVICES ========== COMPLETED
router.get('/devices/list', OperatorController.getDevices);
router.get('/devices/:deviceId/view', OperatorController.getDeviceById);
router.put('/devices/:deviceId/update', OperatorController.updateDevice);
router.put('/devices/:deviceId/deactivate', OperatorController.deactivateDevice);

// ========== MANAGE VEHICLES ==========  COMPLETED
router.post(
    '/vehicles/create',
    optionalEntityIdBodyRule('driver_id', [ENTITY_PREFIXES.DRIVER, ENTITY_PREFIXES.USER], 'Driver ID'),
    vehicleCreationRules(),
    validationErrorHandler,
    OperatorController.createVehicle
);
router.get('/vehicles/list', OperatorController.getVehicles);
router.get(
    '/vehicles/:vehicleId/view',
    entityIdParamRule('vehicleId', ENTITY_PREFIXES.VEHICLE, 'Vehicle ID'),
    validationErrorHandler,
    OperatorController.getVehicleById
);
router.put(
    '/vehicles/:vehicleId/update',
    entityIdParamRule('vehicleId', ENTITY_PREFIXES.VEHICLE, 'Vehicle ID'),
    optionalEntityIdBodyRule('driver_id', [ENTITY_PREFIXES.DRIVER, ENTITY_PREFIXES.USER], 'Driver ID'),
    vehicleCreationRules(),
    validationErrorHandler,
    OperatorController.updateVehicle
);
router.put(
    '/vehicles/:vehicleId/deactivate',
    entityIdParamRule('vehicleId', ENTITY_PREFIXES.VEHICLE, 'Vehicle ID'),
    validationErrorHandler,
    OperatorController.deactivateVehicle
);
router.post('/vehicles/bulk-import', upload.single('file'), OperatorController.bulkImportVehicles); // TODO - will be implement this later

// ========== MANAGE DEVICE ASSIGNMENTS ========== COMPLETED
router.post(
    '/assignments/device-to-vehicle',
    assignDeviceToVehicleRules(),
    validationErrorHandler,
    OperatorController.assignDeviceToVehicle
);
router.post('/assignments/bulk-devices-to-vehicle', OperatorController.bulkAssignDevices); // TODO - will be implement this later

// ========== MANAGE DRIVER ASSIGNMENTS ========== COMPLETED
router.post(
    '/assignments/driver-to-vehicle',
    assignDriverToVehicleRules(),
    validationErrorHandler,
    OperatorController.assignDriverToVehicle
);
router.post('/assignments/bulk-drivers-to-vehicle', OperatorController.bulkAssignDrivers); // TODO - will be implement this later

// ========== MANAGE END-USER ASSIGNMENTS ========== COMPLETED
router.post(
    '/assignments/end-user-to-vehicle',
    assignEndUserToVehicleRules(),
    validationErrorHandler,
    OperatorController.assignEndUserToVehicle
);
router.post(
    '/assignments/unassign-end-user-from-vehicle',
    unassignEndUserFromVehicleRules(),
    validationErrorHandler,
    OperatorController.unassignEndUserFromVehicle
);

// ========== STATISTICS ========== // TODO - will be implement this later
router.get('/stats/dashboard', OperatorController.getOperatorStats);

// ========== MANAGE SCHEDULED TRIPS ========== COMPLETED
router.post(
    '/scheduled-trips/create',
    entityIdBodyRule('vehicle_id', ENTITY_PREFIXES.VEHICLE, 'Vehicle ID'),
    entityIdBodyRule('driver_id', [ENTITY_PREFIXES.DRIVER, ENTITY_PREFIXES.USER], 'Driver ID'),
    validationErrorHandler,
    OperatorController.createScheduledTrip
);
router.get('/scheduled-trips/list', OperatorController.getScheduledTrips);
router.get(
    '/scheduled-trips/:scheduledTripId/view',
    entityIdParamRule('scheduledTripId', ENTITY_PREFIXES.SCHEDULED_TRIP, 'Scheduled trip ID'),
    validationErrorHandler,
    OperatorController.getScheduledTripById
);
router.put(
    '/scheduled-trips/:scheduledTripId/update',
    entityIdParamRule('scheduledTripId', ENTITY_PREFIXES.SCHEDULED_TRIP, 'Scheduled trip ID'),
    optionalEntityIdBodyRule('vehicle_id', ENTITY_PREFIXES.VEHICLE, 'Vehicle ID'),
    optionalEntityIdBodyRule('driver_id', [ENTITY_PREFIXES.DRIVER, ENTITY_PREFIXES.USER], 'Driver ID'),
    validationErrorHandler,
    OperatorController.updateScheduledTrip
);
router.delete(
    '/scheduled-trips/:scheduledTripId/delete',
    entityIdParamRule('scheduledTripId', ENTITY_PREFIXES.SCHEDULED_TRIP, 'Scheduled trip ID'),
    validationErrorHandler,
    OperatorController.deleteScheduledTrip
);

module.exports = router;


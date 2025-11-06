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
const { endUserCreationRules, validationErrorHandler, vehicleCreationRules } = require('../middlewares/validationRules');

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
router.post('/drivers/create', OperatorController.createDriver);
router.get('/drivers/list', OperatorController.getDrivers);
router.get('/drivers/:driverId/view', OperatorController.getDriverById);
router.put('/drivers/:driverId/update', OperatorController.updateDriver);
router.put('/drivers/:driverId/deactivate', OperatorController.deactivateDriver);

// ========== MANAGE END-USERS (PARENTS) ========== COMPLETED
router.post('/end-users/create', endUserCreationRules(), validationErrorHandler, OperatorController.createEndUser);
router.get('/end-users/list', OperatorController.getEndUsers);
router.get('/end-users/:userId/view', OperatorController.getEndUserById);
router.put('/end-users/:userId/update', endUserCreationRules(), validationErrorHandler, OperatorController.updateEndUser);
router.put('/end-users/:userId/deactivate', OperatorController.deactivateEndUser);
router.post('/end-users/bulk-import', bulkOperationLimiter, upload.single('file'), OperatorController.bulkImportEndUsers);  // TODO - will be implement this later

// ========== MANAGE DEVICES ========== COMPLETED
router.get('/devices/list', OperatorController.getDevices);
router.get('/devices/:deviceId/view', OperatorController.getDeviceById);
router.put('/devices/:deviceId/update', OperatorController.updateDevice);
router.put('/devices/:deviceId/deactivate', OperatorController.deactivateDevice);

// ========== MANAGE VEHICLES ==========  COMPLETED
router.post('/vehicles/create', vehicleCreationRules(), validationErrorHandler, OperatorController.createVehicle);
router.get('/vehicles/list', OperatorController.getVehicles);
router.get('/vehicles/:vehicleId/view', OperatorController.getVehicleById);
router.put('/vehicles/:vehicleId/update', vehicleCreationRules(), validationErrorHandler, OperatorController.updateVehicle);
router.put('/vehicles/:vehicleId/deactivate', OperatorController.deactivateVehicle);
router.post('/vehicles/bulk-import', upload.single('file'), OperatorController.bulkImportVehicles); // TODO - will be implement this later

// ========== MANAGE DEVICE ASSIGNMENTS ========== COMPLETED
router.post('/assignments/device-to-vehicle', OperatorController.assignDeviceToVehicle);
router.post('/assignments/bulk-devices-to-vehicle', OperatorController.bulkAssignDevices); // TODO - will be implement this later

// ========== MANAGE DRIVER ASSIGNMENTS ========== COMPLETED
router.post('/assignments/driver-to-vehicle', OperatorController.assignDriverToVehicle);
router.post('/assignments/bulk-drivers-to-vehicle', OperatorController.bulkAssignDrivers); // TODO - will be implement this later

// ========== MANAGE END-USER ASSIGNMENTS ========== COMPLETED
router.post('/assignments/end-user-to-vehicle', OperatorController.assignEndUserToVehicle);
router.post('/assignments/unassign-end-user-from-vehicle', OperatorController.unassignEndUserFromVehicle);

// ========== STATISTICS ========== // TODO - will be implement this later
router.get('/stats/dashboard', OperatorController.getOperatorStats);

// ========== MANAGE SCHEDULED TRIPS ========== COMPLETED
router.post('/scheduled-trips/create', OperatorController.createScheduledTrip);
router.get('/scheduled-trips/list', OperatorController.getScheduledTrips);
router.get('/scheduled-trips/:scheduledTripId/view', OperatorController.getScheduledTripById);
router.put('/scheduled-trips/:scheduledTripId/update', OperatorController.updateScheduledTrip);
router.delete('/scheduled-trips/:scheduledTripId/delete', OperatorController.deleteScheduledTrip);

module.exports = router;


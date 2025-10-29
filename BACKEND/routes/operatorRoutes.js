const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const OperatorController = require('../controllers/operatorController');
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

// ========== ANALYTICS & DASHBOARD ==========
router.get('/analytics/dashboard', OperatorController.getDashboardAnalytics);
router.get('/tracking/live-data', OperatorController.getLiveTracking);

// ========== MANAGE DRIVERS ==========
router.post('/drivers/create', OperatorController.createDriver);
router.get('/drivers/list', OperatorController.getDrivers);
router.get('/drivers/:driverId/view', OperatorController.getDriverById);
router.put('/drivers/:driverId/update', OperatorController.updateDriver);
router.put('/drivers/:driverId/deactivate', OperatorController.deactivateDriver);
router.post('/drivers/bulk-import', bulkOperationLimiter, upload.single('file'), OperatorController.bulkImportDrivers);

// ========== MANAGE END-USERS (PARENTS) ==========
router.post('/end-users/create', endUserCreationRules(), validationErrorHandler, OperatorController.createEndUser);
router.get('/end-users/list', OperatorController.getEndUsers);
router.get('/end-users/:userId/view', OperatorController.getEndUserById);
router.put('/end-users/:userId/update', endUserCreationRules(), validationErrorHandler, OperatorController.updateEndUser);
router.put('/end-users/:userId/deactivate', OperatorController.deactivateEndUser);
router.post('/end-users/bulk-import', bulkOperationLimiter, upload.single('file'), OperatorController.bulkImportEndUsers);

// ========== MANAGE DEVICES ==========
router.post('/devices/create', OperatorController.createDevice);
router.get('/devices/list', OperatorController.getDevices);
router.get('/devices/:deviceId/view', OperatorController.getDeviceById);
router.put('/devices/:deviceId/update', OperatorController.updateDevice);
router.put('/devices/:deviceId/deactivate', OperatorController.deactivateDevice);
router.post('/devices/bulk-assign', OperatorController.bulkAssignDevices);

// ========== MANAGE VEHICLES ==========
router.post('/vehicles/create', vehicleCreationRules(), validationErrorHandler, OperatorController.createVehicle);
router.get('/vehicles/list', OperatorController.getVehicles);
router.get('/vehicles/:vehicleId/view', OperatorController.getVehicleById);
router.put('/vehicles/:vehicleId/update', vehicleCreationRules(), validationErrorHandler, OperatorController.updateVehicle);
router.put('/vehicles/:vehicleId/deactivate', OperatorController.deactivateVehicle);
router.post('/vehicles/assign-driver', OperatorController.assignDriverToVehicle);
router.post('/vehicles/bulk-assign-drivers', OperatorController.bulkAssignDrivers);
router.post('/vehicles/bulk-import', upload.single('file'), OperatorController.bulkImportVehicles);

// ========== MANAGE ASSIGNMENTS ==========
router.post('/assignments/device-to-vehicle', OperatorController.assignDeviceToVehicle);

// ========== PROFILE ==========
router.get('/profile', OperatorController.getOwnProfile);
router.put('/profile/update', OperatorController.updateOwnProfile);

// ========== STATISTICS ==========
router.get('/stats/dashboard', OperatorController.getOperatorStats);

module.exports = router;

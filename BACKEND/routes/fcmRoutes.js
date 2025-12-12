const express = require('express');
const router = express.Router();
const FCMController = require('../controllers/fcmController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/register-token', FCMController.registerFCMToken);
router.post('/register-tokens', FCMController.registerMultipleFCMTokens);
router.get('/tokens', FCMController.getFCMTokens);
router.post('/remove-token', FCMController.removeFCMToken);
router.post('/clear-all-tokens', FCMController.clearAllFCMTokens);

module.exports = router;

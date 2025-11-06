const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authLimiter } = require('../middlewares/rate-limit');

router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);

module.exports = router;

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authLimiter } = require('../middlewares/rate-limit');

// POST /register - Register a new user account (rate limited)
router.post('/register', authLimiter, AuthController.register);
// POST /login - Login user and return authentication token (rate limited)
router.post('/login', authLimiter, AuthController.login);

module.exports = router;

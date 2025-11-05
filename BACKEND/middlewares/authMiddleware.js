const { verifyToken } = require('../utils/jwtUtils');
const logger = require('../utils/logger');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.headers['x-token'];

    if (!token) {
      logger.loggerWarn('No token provided', { url: req.url, ip: req.ip });
      return res.status(401).json({ error: true, message: 'No token provided' });
    }

    const decoded = verifyToken(token);
    const userRecord = await User.findOne({ user_id: decoded.user_id }).lean();

    if (!userRecord) {
      logger.loggerWarn('Authenticated user not found', { user_id: decoded.user_id });
      return res.status(401).json({ error: true, message: 'User not found' });
    }

    req.user = {
      user_id: decoded.user_id,
      email: decoded.email,
      role_id: decoded.role_id,
      role_name: decoded.role_name,
      operator_id: userRecord.operator_id,
      assigned_vehicle_id: userRecord.assigned_vehicle_id
    };
    next();
  } catch (error) {
    logger.loggerWarn('Token verification failed', { error: error.message });
    res.status(401).json({ error: true, message: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;

const logger = require('../utils/logger');

const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      const userRoleName = req.user?.role_name;

      if (!userRoleName) {
        logger.loggerWarn('No role found in token', { userId: req.user?.user_id });
        return res.status(403).json({ error: true, message: 'Forbidden: No role found' });
      }

      if (!allowedRoles.includes(userRoleName)) {
        logger.loggerWarn('Insufficient permissions', { userRole: userRoleName, requiredRoles: allowedRoles });
        return res.status(403).json({ error: true, message: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      logger.loggerError('Role middleware error', error.message);
      res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
  };
};

module.exports = roleMiddleware;

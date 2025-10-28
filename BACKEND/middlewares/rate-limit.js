const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
      res.status(429).json({ error: 'Too Many Requests', message: 'Please try again later' });
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000
});

const webhookLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000,
  max: 10000
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5
});

module.exports = { apiLimiter, webhookLimiter, authLimiter, createRateLimiter };
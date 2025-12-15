const logger = require('../utils/logger');
const { CustomError } = require('./errorHandler');

const webhookValidation = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'] || req.body.api_key || req.query.api_key;
    const expectedKey = process.env.WEBHOOK_API_KEY || 'my-secret-key-123';

    // Check if apiKey matches expectedKey directly or if it's a Bearer token
    const isValid = apiKey === expectedKey || (apiKey && apiKey.startsWith('Bearer ') && apiKey.split(' ')[1] === expectedKey);

    // if (!isValid) {
    //   logger.loggerWarn(`Unauthorized webhook request. Received: ${apiKey ? '***' : 'none'}`);
    //   throw new CustomError('Unauthorized', 401);
    // }

    if (!Array.isArray(req.body)) {
      logger.loggerError('Invalid webhook payload format');
      throw new CustomError('Payload must be an array', 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = webhookValidation;

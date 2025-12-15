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
      if (typeof req.body === 'object' && req.body !== null) {
        // Normalize single object to array
        req.body = [req.body];
      } else {
        logger.loggerError(`Invalid webhook payload format. Expected: Array [] or Object {}. Received: ${JSON.stringify(req.body)}`);
        throw new CustomError('Payload must be an array or object', 400);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = webhookValidation;

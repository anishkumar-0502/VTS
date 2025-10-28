const express = require('express');
const router = express.Router();
const WebhookRouter = require('../webhooks/webhookRouter');
const logger = require('../utils/logger');
const { webhookLimiter } = require('../middlewares/rate-limit');

router.post('/', webhookLimiter, async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'] || req.body.api_key;
    const expectedKey = process.env.WEBHOOK_API_KEY || 'my-secret-key-123';

    if (apiKey !== expectedKey) {
      logger.loggerWarn('Unauthorized webhook request');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messageArray = req.body;

    if (!Array.isArray(messageArray)) {
      logger.loggerError('Invalid webhook payload format');
      return res.status(400).json({ error: 'Payload must be an array' });
    }

    const response = await WebhookRouter.routeTelemetryMessage(messageArray);

    logger.loggerSuccess(`Telemetry webhook processed: ${response.response.status}`);
    res.status(200).json(response.response);
  } catch (error) {
    logger.loggerError(`Telemetry webhook error: ${error.message}`);
    const statusCode = error.status || 500;
    const errorMessage = error.message || 'Internal server error';
    res.status(statusCode).json({ error: errorMessage });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const WebhookController = require('../controllers/webhookController');
const { webhookLimiter } = require('../middlewares/rate-limit');
const webhookValidation = require('../middlewares/webhookValidation');

router.post('/', webhookLimiter, webhookValidation, WebhookController.handleTelemetry);

module.exports = router;

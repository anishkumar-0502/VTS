const TelemetryHandler = require('../webhooks/handlers/telemetryHandler');
const logger = require('../utils/logger');

class WebhookController {
  static parseMessage(message) {
    if (typeof message === 'object' && message !== null) {
      if (message.message_type && message.tracker_id) {
        return {
          message_type: message.message_type,
          tracker_id: message.tracker_id,
          payload: { ...message }
        };
      }
    }
    return null;
  }

  static async handleTelemetry(req, res, next) {
    try {
      const messageArray = req.body;

      if (!Array.isArray(messageArray)) {
        logger.loggerError(`Invalid webhook payload format in Controller. Expected: Array []. Received: ${JSON.stringify(messageArray)}`);
        return res.status(400).json({
          error: true,
          message: 'Payload must be an array'
        });
      }

      const responses = [];

      for (const message of messageArray) {
        try {
          const parsed = WebhookController.parseMessage(message);
          
          if (!parsed) {
            responses.push({
              status: 'error',
              error: 'Invalid message format: requires message_type and tracker_id'
            });
            continue;
          }

          const { message_type, tracker_id, payload } = parsed;

          if (!message_type || !tracker_id) {
            responses.push({
              message_type,
              tracker_id,
              status: 'error',
              error: 'Missing message_type or tracker_id'
            });
            continue;
          }

          let response;

          switch (message_type) {
            case 'boot_notification':
              response = await TelemetryHandler.handleBootNotification({
                vehicle_id: tracker_id,
                ...payload
              });
              break;

            case 'location_update':
              response = await TelemetryHandler.handleLocationUpdate({
                tracker_id: tracker_id,
                ...payload
              });
              break;

            case 'heartbeat':
              response = await TelemetryHandler.handleHeartbeat({
                vehicle_id: tracker_id,
                ...payload
              });
              break;

            case 'status_notification':
              response = await TelemetryHandler.handleStatusNotification({
                vehicle_id: tracker_id,
                ...payload
              });
              break;

            default:
              responses.push({
                message_type,
                tracker_id,
                status: 'error',
                error: 'Unknown message type'
              });
              continue;
          }

          responses.push({
            message_type,
            tracker_id,
            status: 'success',
            data: response
          });
        } catch (error) {
          logger.loggerError(`Error processing message: ${error.message}`);
          responses.push({
            message_type,
            tracker_id: message.tracker_id || 'unknown',
            status: 'error',
            error: error.message
          });
        }
      }

      res.status(200).json({
        error: false,
        message: 'Telemetry processed',
        responses
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = WebhookController;

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
            const reason = 'Invalid message format: requires message_type and tracker_id';
            logger.loggerError(`Webhook Rejected: ${reason} | Payload: ${JSON.stringify(message)}`);
            responses.push({
              status: 'Rejected',
              error_code: 400,
              reason: reason,
              timestamp: new Date().toISOString()
            });
            continue;
          }

          const { message_type, tracker_id, payload } = parsed;

          if (!message_type || !tracker_id) {
            const reason = 'Missing message_type or tracker_id';
            logger.loggerError(`Webhook Rejected: ${reason} | Payload: ${JSON.stringify(message)}`);
            responses.push({
              message_type,
              tracker_id,
              status: 'Rejected',
              error_code: 400,
              reason: reason,
              timestamp: new Date().toISOString()
            });
            continue;
          }

          let response;

          switch (message_type) {
            case 'boot_notification':
            case 'BootNotification':
              response = await TelemetryHandler.handleBootNotification({
                vehicle_id: tracker_id,
                ...payload
              });
              break;

            case 'location_update':
            case 'LocationUpdate':
              response = await TelemetryHandler.handleLocationUpdate({
                tracker_id: tracker_id,
                ...payload
              });
              break;

            case 'heartbeat':
            case 'Heartbeat':
              response = await TelemetryHandler.handleHeartbeat({
                vehicle_id: tracker_id,
                ...payload
              });
              break;

            case 'status_notification':
            case 'StatusNotification':
              response = await TelemetryHandler.handleStatusNotification({
                vehicle_id: tracker_id,
                ...payload
              });
              break;

            default:
              const reason = 'Unknown message type';
              logger.loggerError(`Webhook Rejected: ${reason} | Type: ${message_type} | Tracker: ${tracker_id}`);
              responses.push({
                message_type,
                tracker_id,
                status: 'Rejected',
                error_code: 400,
                reason: reason,
                timestamp: new Date().toISOString()
              });
              continue;
          }

          responses.push({
            message_type,
            tracker_id,
            status: 'Accepted',
            error_code: 0,
            reason: 'Processed successfully',
            timestamp: new Date().toISOString(),
            data: response
          });
        } catch (error) {
          logger.loggerError(`Webhook Rejected: ${error.message} | Tracker: ${message.tracker_id || 'unknown'}`);
          responses.push({
            message_type,
            tracker_id: message.tracker_id || 'unknown',
            status: 'Rejected',
            error_code: error.status || error.statusCode || 500,
            reason: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Log the response sent to the client
      logger.loggerInfo(`Webhook response sent: ${JSON.stringify(responses)}`);

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

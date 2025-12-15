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
      let messageArray = req.body;

      // Accept both single object and array
      if (!Array.isArray(messageArray)) {
        if (typeof messageArray === 'object' && messageArray !== null) {
          messageArray = [messageArray];
        } else {
          logger.loggerError(`Invalid webhook payload format in Controller. Expected: Object {} or Array []. Received: ${JSON.stringify(messageArray)}`);
          return res.status(400).json({
            error: true,
            message: 'Payload must be an object or array',
            timestamp: new Date().toISOString()
          });
        }
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

          const successResponse = {
            message_type,
            tracker_id,
            status: 'Accepted',
            error_code: 0,
            reason: 'Processed successfully',
            timestamp: new Date().toISOString(),
            data: response
          };

          // Lift interval to top-level for BootNotification if present
          if (response && response.interval) {
            successResponse.interval = response.interval;
          }

          responses.push(successResponse);
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

      // Return single object if one message, array if multiple
      const responseBody = responses.length === 1 ? responses[0] : responses;

      res.status(200).json({
        error: false,
        message: 'Telemetry processed',
        timestamp: new Date().toISOString(),
        response: responseBody
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = WebhookController;

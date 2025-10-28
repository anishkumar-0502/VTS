const TelemetryHandler = require('./handlers/telemetryHandler');
const TelemetryValidator = require('./validators/telemetryValidator');
const logger = require('../utils/logger');

class WebhookRouter {
  static async routeTelemetryMessage(messageArray) {
    try {
      const { messageType, messageId, action, payload } = TelemetryValidator.validateTelemetryMessage(messageArray);

      logger.loggerWebhook(`Routing telemetry message`, { action, messageId, vehicleId: payload.vehicle_id });

      let response;

      switch (action) {
        case 'BootNotification':
          TelemetryValidator.validateBootNotification(payload);
          response = await TelemetryHandler.handleBootNotification(payload);
          break;

        case 'LocationUpdate':
          TelemetryValidator.validateLocationUpdate(payload);
          response = await TelemetryHandler.handleLocationUpdate(payload);
          break;

        case 'Heartbeat':
          TelemetryValidator.validateHeartbeat(payload);
          response = await TelemetryHandler.handleHeartbeat(payload);
          break;

        case 'StatusNotification':
          TelemetryValidator.validateStatusNotification(payload);
          response = await TelemetryHandler.handleStatusNotification(payload);
          break;

        default:
          throw {
            status: 400,
            message: `Unknown action: ${action}`
          };
      }

      return {
        messageType: 3,
        messageId,
        response: {
          status: 'Accepted',
          timestamp: new Date().toISOString(),
          ...response
        }
      };
    } catch (error) {
      logger.loggerError(`Telemetry routing error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = WebhookRouter;

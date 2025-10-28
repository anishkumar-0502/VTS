class TelemetryValidator {
  static validateBootNotification(payload) {
    const errors = [];

    if (!payload.vehicle_id) errors.push('vehicle_id is required');
    if (typeof payload.vehicle_id !== 'string') errors.push('vehicle_id must be a string');

    if (errors.length > 0) {
      throw {
        status: 400,
        message: 'Invalid BootNotification payload',
        errors
      };
    }

    return true;
  }

  static validateLocationUpdate(payload) {
    const errors = [];

    if (!payload.vehicle_id) errors.push('vehicle_id is required');
    if (typeof payload.vehicle_id !== 'string') errors.push('vehicle_id must be a string');

    if (payload.latitude === undefined) errors.push('latitude is required');
    if (payload.longitude === undefined) errors.push('longitude is required');

    if (typeof payload.latitude !== 'number' || payload.latitude < -90 || payload.latitude > 90) {
      errors.push('latitude must be a number between -90 and 90');
    }

    if (typeof payload.longitude !== 'number' || payload.longitude < -180 || payload.longitude > 180) {
      errors.push('longitude must be a number between -180 and 180');
    }

    if (payload.speed_kmh !== undefined && (typeof payload.speed_kmh !== 'number' || payload.speed_kmh < 0)) {
      errors.push('speed_kmh must be a non-negative number');
    }

    if (payload.course !== undefined && (typeof payload.course !== 'number' || payload.course < 0 || payload.course > 360)) {
      errors.push('course must be a number between 0 and 360');
    }

    if (!payload.timestamp) errors.push('timestamp is required');
    if (isNaN(Date.parse(payload.timestamp))) errors.push('timestamp must be a valid date');

    if (payload.battery_level !== undefined && (typeof payload.battery_level !== 'number' || payload.battery_level < 0 || payload.battery_level > 100)) {
      errors.push('battery_level must be a number between 0 and 100');
    }

    if (errors.length > 0) {
      throw {
        status: 400,
        message: 'Invalid LocationUpdate payload',
        errors
      };
    }

    return true;
  }

  static validateHeartbeat(payload) {
    const errors = [];

    if (!payload.vehicle_id) errors.push('vehicle_id is required');
    if (typeof payload.vehicle_id !== 'string') errors.push('vehicle_id must be a string');

    if (payload.battery_level !== undefined && (typeof payload.battery_level !== 'number' || payload.battery_level < 0 || payload.battery_level > 100)) {
      errors.push('battery_level must be a number between 0 and 100');
    }

    if (errors.length > 0) {
      throw {
        status: 400,
        message: 'Invalid Heartbeat payload',
        errors
      };
    }

    return true;
  }

  static validateStatusNotification(payload) {
    const errors = [];

    if (!payload.vehicle_id) errors.push('vehicle_id is required');
    if (typeof payload.vehicle_id !== 'string') errors.push('vehicle_id must be a string');

    const validStatuses = ['valid', 'invalid', 'no_fix', 'bad_fix'];
    if (payload.fix_status && !validStatuses.includes(payload.fix_status)) {
      errors.push(`fix_status must be one of: ${validStatuses.join(', ')}`);
    }

    if (errors.length > 0) {
      throw {
        status: 400,
        message: 'Invalid StatusNotification payload',
        errors
      };
    }

    return true;
  }

  static validateTelemetryMessage(messageArray) {
    if (!Array.isArray(messageArray)) {
      throw {
        status: 400,
        message: 'Telemetry message must be an array',
        errors: ['Expected array format [messageType, messageId, action, payload]']
      };
    }

    if (messageArray.length < 4) {
      throw {
        status: 400,
        message: 'Invalid telemetry message format',
        errors: ['Expected array with 4 elements: [messageType, messageId, action, payload]']
      };
    }

    let [messageType, messageId, action, payload] = messageArray;

    messageType = Number(messageType);
    if (![2, 3].includes(messageType)) {
      throw {
        status: 400,
        message: 'Invalid message type',
        errors: ['messageType must be 2 (request) or 3 (response)']
      };
    }

    if (typeof messageId !== 'string' && typeof messageId !== 'number') {
      throw {
        status: 400,
        message: 'Invalid message ID',
        errors: ['messageId must be a string or number']
      };
    }

    const validActions = ['BootNotification', 'LocationUpdate', 'Heartbeat', 'StatusNotification'];
    if (!validActions.includes(action)) {
      throw {
        status: 400,
        message: 'Invalid action',
        errors: [`action must be one of: ${validActions.join(', ')}`]
      };
    }

    if (typeof payload !== 'object' || payload === null) {
      throw {
        status: 400,
        message: 'Invalid payload',
        errors: ['payload must be an object']
      };
    }

    return { messageType, messageId, action, payload };
  }
}

module.exports = TelemetryValidator;

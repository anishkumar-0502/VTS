const dbService = require('../config/db');

const PREFIX = 'GPSOUT';

const deviceIdGenerator = {
  generateDeviceId: async () => {
    try {
      const db = await dbService.connectToDatabase();
      const lastDevice = await db.collection('gpsdevices')
        .findOne({}, { sort: { createdAt: -1 } });

      let nextNumber = 1;

      if (lastDevice && lastDevice.device_id) {
        const match = lastDevice.device_id.match(/GPSOUT(\d+)/);
        if (match && match[1]) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      return `${PREFIX}${nextNumber}`;
    } catch (error) {
      throw new Error(`Failed to generate device ID: ${error.message}`);
    }
  }
};

module.exports = deviceIdGenerator;

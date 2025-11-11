const Role = require('../models/Role');
const User = require('../models/User');
const Counter = require('../models/Counter');
const logger = require('../utils/logger');
const TelemetryHandler = require('../webhooks/handlers/telemetryHandler');

const DEFAULT_ROLES = [
  { role_id: 1, role_name: 'superadmin', description: 'Super Administrator', status: true },
  { role_id: 2, role_name: 'operator', description: 'Fleet Operator', status: true },
  { role_id: 3, role_name: 'driver', description: 'Vehicle Driver', status: true },
  { role_id: 4, role_name: 'parent', description: 'Parent/Guardian', status: true }
];

const DEFAULT_SUPERADMIN = {
  name: 'System Admin',
  email: 'admin@vts.com',
  phone_number: 9999999999,
  password: 'Admin@123',
  role_id: 1
};

const initializeRoles = async () => {
  try {
    const roleCount = await Role.countDocuments();

    if (roleCount === 0) {
      logger.loggerInfo('No roles found. Creating default roles...');

      await Role.insertMany(DEFAULT_ROLES);
      logger.loggerSuccess('Default roles created successfully');

      await Counter.findByIdAndUpdate(
        'role_id',
        { sequence_value: 4 },
        { upsert: true }
      );
      logger.loggerSuccess('Role counter initialized to 4');
    } else {
      logger.loggerDebug(`${roleCount} roles already exist. Skipping role initialization.`);
    }
  } catch (error) {
    logger.loggerError(`Error initializing roles: ${error.message}`);
    throw error;
  }
};

const initializeSuperAdmin = async () => {
  try {
    const superadminExists = await User.findOne({ role_id: 1 });

    if (!superadminExists) {
      logger.loggerInfo('No superadmin found. Creating default superadmin...');

      const superadmin = new User(DEFAULT_SUPERADMIN);
      await superadmin.save();

      logger.loggerSuccess('Default superadmin created successfully');
      logger.loggerInfo(`Superadmin Credentials - Email: ${DEFAULT_SUPERADMIN.email}, Password: ${DEFAULT_SUPERADMIN.password}`);
    } else {
      logger.loggerDebug('Superadmin already exists. Skipping superadmin initialization.');
    }
  } catch (error) {
    logger.loggerError(`Error initializing superadmin: ${error.message}`);
    throw error;
  }
};

const initializeDeviceStatusSnapshots = async () => {
  try {
    logger.loggerInfo('Synchronizing device status snapshots...');
    await TelemetryHandler.syncAllDeviceStatuses();
    logger.loggerSuccess('Device status snapshots synchronized');
  } catch (error) {
    logger.loggerError(`Device status synchronization failed: ${error.message}`);
    throw error;
  }
};

const initializeDatabase = async () => {
  try {
    logger.loggerInfo('Starting database initialization...');

    await initializeRoles();
    await initializeSuperAdmin();
    await initializeDeviceStatusSnapshots();

    logger.loggerSuccess('Database initialization completed successfully');
  } catch (error) {
    logger.loggerError(`Database initialization failed: ${error.message}`);
    throw error;
  }
};

module.exports = { initializeDatabase };

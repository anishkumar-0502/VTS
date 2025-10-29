const UserService = require('../services/userService');
const DeviceService = require('../services/deviceService');
const Role = require('../models/Role');
const Operator = require('../models/Operator');
const Device = require('../models/Device');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const TrackingData = require('../models/TrackingData');
const { CustomError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const { generateEmailBasedPassword } = require('../utils/passwordGenerator');
const { sendCredentialsEmail } = require('../middlewares/emailer');

class SuperadminController {
  static async getDashboardAnalytics(req, res, next) {
    try {
      const totalOperators = await Operator.countDocuments({ status: true });
      const totalUsers = await User.countDocuments({ status: true });
      const totalDevices = await Device.countDocuments({ status: true });
      const totalVehicles = await Vehicle.countDocuments({ current_status: { $ne: 'offline' } });
      const activeDevices = await Device.countDocuments({ status: true });
      const activeVehicles = await Vehicle.countDocuments({ current_status: 'active' });

      const recentTracking = await TrackingData.find().sort({ timestamp: -1 }).limit(10);
      const usersByRole = await User.aggregate([
        { $match: { status: true } },
        { $group: { _id: '$role_id', count: { $sum: 1 } } }
      ]);

      res.status(200).json({
        error: false,
        message: 'Dashboard analytics retrieved successfully',
        data: {
          totalOperators,
          totalUsers,
          totalDevices,
          totalVehicles,
          activeDevices,
          activeVehicles,
          usersByRole,
          recentTracking
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getGPSTracking(req, res, next) {
    try {
      const { operatorId, vehicleId, deviceId, limit = 50 } = req.query;

      const query = {};
      if (vehicleId) query.vehicle_id = vehicleId;
      if (deviceId) query.device_id = deviceId;

      let tracking = await TrackingData.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .populate('vehicle_id')
        .populate('device_id');

      if (operatorId) {
        const vehicles = await Vehicle.find({ operator_id: operatorId });
        const vehicleIds = vehicles.map(v => v._id);
        tracking = tracking.filter(t => vehicleIds.includes(t.vehicle_id._id));
      }

      res.status(200).json({
        error: false,
        message: 'GPS tracking data retrieved successfully',
        data: tracking
      });
    } catch (error) {
      next(error);
    }
  }

  static async createOperator(req, res, next) {
    let operatorRecord = null;
    try {
      const { name, email, phone_number, company_name, registration_number, address, city, state, postal_code, country } = req.body;

      const sanitizedEmail = email?.toLowerCase();
      if (!name || !sanitizedEmail || !phone_number) {
        throw new CustomError('Missing required fields', 400);
      }

      const existingOperator = await Operator.findOne({ email: sanitizedEmail });
      if (existingOperator) {
        throw new CustomError('Operator with this email already exists', 409);
      }

      const existingUser = await User.findOne({ email: sanitizedEmail });
      if (existingUser) {
        throw new CustomError('User with this email already exists', 409);
      }

      operatorRecord = await Operator.create({
        name,
        email: sanitizedEmail,
        phone: phone_number,
        company_name,
        registration_number,
        address,
        city,
        state,
        postal_code,
        country,
        status: true
      });

      const role = await Role.findOne({ role_name: 'operator' });
      if (!role) {
        throw new CustomError('Operator role not found', 404);
      }

      const password = generateEmailBasedPassword(sanitizedEmail);

      const user = await UserService.createUser({
        name,
        email: sanitizedEmail,
        phone_number,
        password,
        role_id: role.role_id,
        operator_id: operatorRecord.operator_id
      });

      await sendCredentialsEmail(sanitizedEmail, name, password, role.role_id);

      const operatorData = operatorRecord.toObject();

      res.status(201).json({
        error: false,
        message: 'Operator created successfully',
        data: { operator: operatorData, user, temp_password: password }
      });
    } catch (error) {
      if (operatorRecord) {
        try {
          await Operator.deleteOne({ operator_id: operatorRecord.operator_id });
        } catch (cleanupError) {
          logger.loggerError(`Cleanup failed for operator ${operatorRecord.operator_id}: ${cleanupError.message}`);
        }
      }

      if (error?.code === 11000) {
        if (error.keyPattern?.email) {
          return next(new CustomError('Operator with this email already exists', 409));
        }
        if (error.keyPattern?.phone) {
          return next(new CustomError('Operator with this phone number already exists', 409));
        }
      }

      next(error);
    }
  }

  static async getOperators(req, res, next) {
    try {
      const operators = await Operator.find({ status: true });
      res.status(200).json({
        error: false,
        message: 'Operators retrieved successfully',
        data: operators
      });
    } catch (error) {
      next(error);
    }
  }

  static async getOperatorById(req, res, next) {
    try {
      const operator = await Operator.findOne({ operator_id: req.params.operatorId });
      if (!operator) {
        throw new CustomError('Operator not found', 404);
      }

      const vehicles = await Vehicle.find({ operator_id: operator.operator_id });
      const drivers = await User.find({ operator_id: operator.operator_id, role_id: 3 });
      const devices = await Device.find({ assigned_operator_id: operator.operator_id });

      res.status(200).json({
        error: false,
        message: 'Operator retrieved successfully',
        data: {
          ...operator.toObject(),
          vehicles,
          drivers,
          devices,
          vehicle_count: vehicles.length,
          driver_count: drivers.length,
          device_count: devices.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateOperator(req, res, next) {
    try {
      const operator = await Operator.findOneAndUpdate({ operator_id: req.params.operatorId }, req.body, { new: true });
      if (!operator) {
        throw new CustomError('Operator not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Operator updated successfully',
        data: operator
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleOperatorStatus(req, res, next) {
    try {
      const operator = await Operator.findOne({ operator_id: req.params.operatorId });
      if (!operator) {
        throw new CustomError('Operator not found', 404);
      }

      operator.status = !operator.status;
      await operator.save();

      await User.updateMany({ operator_id: operator.operator_id }, { status: operator.status });

      res.status(200).json({
        error: false,
        message: 'Operator status toggled successfully',
        data: operator
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllUsers(req, res, next) {
    try {
      const { role_id, operator_id, status } = req.query;
      const query = {};
      if (role_id) query.role_id = parseInt(role_id);
      if (operator_id) query.operator_id = operator_id;
      if (status !== undefined) query.status = status === 'true';

      const users = await User.find(query);
      res.status(200).json({
        error: false,
        message: 'Users retrieved successfully',
        data: users
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req, res, next) {
    try {
      const user = await User.findOne({ user_id: req.params.userId });
      if (!user) {
        throw new CustomError('User not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'User retrieved successfully',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  static async createUser(req, res, next) {
    try {
      const { name, email, phone_number, role_id, operator_id } = req.body;

      if (!name || !email || !phone_number || !role_id) {
        throw new CustomError('Missing required fields', 400);
      }

      const password = generateEmailBasedPassword(email);

      const user = await UserService.createUser({
        name,
        email,
        phone_number,
        password,
        role_id,
        operator_id: operator_id || null
      });

      await sendCredentialsEmail(email, name, password, role_id);

      res.status(201).json({
        error: false,
        message: 'User created successfully',
        data: { user, temp_password: password }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(req, res, next) {
    try {
      const { password: incomingPassword, reset_password, ...rest } = req.body;
      const updatePayload = { ...rest };
      let tempPassword = null;

      if (reset_password || typeof incomingPassword !== 'undefined') {
        const existingUser = await User.findOne({ user_id: req.params.userId });
        if (!existingUser) {
          throw new CustomError('User not found', 404);
        }

        const emailForPassword = rest.email || existingUser.email;
        tempPassword = generateEmailBasedPassword(emailForPassword);
        updatePayload.password = tempPassword;
      }

      const user = await UserService.updateUser(req.params.userId, updatePayload);

      if (tempPassword) {
        await sendCredentialsEmail(user.email, user.name, tempPassword, user.role_id);
      }

      res.status(200).json({
        error: false,
        message: 'User updated successfully',
        data: tempPassword ? { user, temp_password: tempPassword } : user
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleUserStatus(req, res, next) {
    try {
      const user = await UserService.toggleUserStatus(req.params.userId);

      res.status(200).json({
        error: false,
        message: 'User status toggled successfully',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllDevices(req, res, next) {
    try {
      const devices = await Device.find();
      res.status(200).json({
        error: false,
        message: 'Devices retrieved successfully',
        data: devices
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDeviceById(req, res, next) {
    try {
      const device = await Device.findOne({ device_id: req.params.deviceId });
      if (!device) {
        throw new CustomError('Device not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Device retrieved successfully',
        data: device
      });
    } catch (error) {
      next(error);
    }
  }

  static async createDevice(req, res, next) {
    try {
      const { device_id, imei, device_type, assigned_operator_id, sim_number, firmware_version } = req.body;

      if (!imei) {
        throw new CustomError('IMEI is required', 400);
      }

      if (!device_id) {
        throw new CustomError('device_id is required', 400);
      }

      const devicePayload = {
        device_id,
        imei,
        device_type: device_type || 'gps_tracker',
        sim_number,
        firmware_version,
        status: true
      };

      if (assigned_operator_id) {
        devicePayload.assigned_operator_id = assigned_operator_id;
      }

      const device = await DeviceService.createDevice(devicePayload);

      res.status(201).json({
        error: false,
        message: 'Device created successfully',
        data: device
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateDevice(req, res, next) {
    try {
      const device = await Device.findOneAndUpdate({ device_id: req.params.deviceId }, req.body, { new: true });
      if (!device) {
        throw new CustomError('Device not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Device updated successfully',
        data: device
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleDeviceStatus(req, res, next) {
    try {
      const device = await Device.findOne({ device_id: req.params.deviceId });
      if (!device) {
        throw new CustomError('Device not found', 404);
      }

      device.status = !device.status;
      await device.save();

      res.status(200).json({
        error: false,
        message: 'Device status toggled successfully',
        data: device
      });
    } catch (error) {
      next(error);
    }
  }

  static async assignDeviceToOperator(req, res, next) {
    try {
      const { device_id, operator_id } = req.body;

      if (!device_id || !operator_id) {
        throw new CustomError('device_id and operator_id are required', 400);
      }

      const device = await Device.findOneAndUpdate(
        { device_id },
        { assigned_operator_id: operator_id, assigned_date: new Date() },
        { new: true }
      );

      if (!device) {
        throw new CustomError('Device not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Device assigned to operator successfully',
        data: device
      });
    } catch (error) {
      next(error);
    }
  }

  static async bulkAssignDevices(req, res, next) {
    try {
      const { assignments } = req.body;

      if (!Array.isArray(assignments) || assignments.length === 0) {
        throw new CustomError('assignments array is required', 400);
      }

      const results = [];
      for (const { device_id, operator_id } of assignments) {
        try {
          const device = await Device.findOneAndUpdate(
            { device_id },
            { assigned_operator_id: operator_id, assigned_date: new Date() },
            { new: true }
          );
          results.push({ device_id, operator_id, status: 'success', device });
        } catch (err) {
          results.push({ device_id, operator_id, status: 'failed', error: err.message });
        }
      }

      res.status(200).json({
        error: false,
        message: 'Bulk device assignment completed',
        data: results
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllRoles(req, res, next) {
    try {
      const roles = await Role.find();
      res.status(200).json({
        error: false,
        message: 'Roles retrieved successfully',
        data: roles
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRoleById(req, res, next) {
    try {
      const role = await Role.findOne({ role_id: req.params.roleId });
      if (!role) {
        throw new CustomError('Role not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Role retrieved successfully',
        data: role
      });
    } catch (error) {
      next(error);
    }
  }

  static async createRole(req, res, next) {
    try {
      const { role_name, permissions, description } = req.body;

      if (!role_name) {
        throw new CustomError('Role name is required', 400);
      }

      const existingRole = await Role.findOne({ role_name });
      if (existingRole) {
        throw new CustomError('Role already exists', 400);
      }

      const role = new Role({
        role_name,
        permissions: permissions || [],
        description,
        status: true
      });

      await role.save();

      res.status(201).json({
        error: false,
        message: 'Role created successfully',
        data: role
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateRole(req, res, next) {
    try {
      const role = await Role.findOneAndUpdate(
        { role_id: req.params.roleId },
        req.body,
        { new: true }
      );

      if (!role) {
        throw new CustomError('Role not found', 404);
      }

      res.status(200).json({
        error: false,
        message: 'Role updated successfully',
        data: role
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleRoleStatus(req, res, next) {
    try {
      const role = await Role.findOne({ role_id: req.params.roleId });
      if (!role) {
        throw new CustomError('Role not found', 404);
      }

      role.status = !role.status;
      await role.save();

      res.status(200).json({
        error: false,
        message: 'Role status toggled successfully',
        data: role
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSystemStats(req, res, next) {
    try {
      const totalOperators = await Operator.countDocuments({ status: true });
      const totalUsers = await User.countDocuments({ status: true });
      const totalDevices = await Device.countDocuments({ status: true });
      const totalVehicles = await Vehicle.countDocuments();
      const activeDevices = await Device.countDocuments({ status: true });
      const activeVehicles = await Vehicle.countDocuments({ current_status: 'active' });

      res.status(200).json({
        error: false,
        message: 'System stats retrieved successfully',
        data: {
          totalOperators,
          totalUsers,
          totalDevices,
          totalVehicles,
          activeDevices,
          activeVehicles
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SuperadminController;

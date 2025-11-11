const User = require('../models/User');
const Role = require('../models/Role');
const Operator = require('../models/Operator');
const Driver = require('../models/Driver');
const EndUser = require('../models/EndUser');
const Vehicle = require('../models/Vehicle');
const logger = require('../utils/logger');
const { generateToken } = require('../utils/jwtUtils');
const { generateEmailBasedPassword } = require('../utils/passwordGenerator');
const { CustomError } = require('../middlewares/errorHandler');

class UserService {
  static async createUser(userData) {
    try {
      const existingUser = await User.findOne({ $or: [{ email: userData.email }, { phone_number: userData.phone_number }] });
      if (existingUser) {
        throw new CustomError('User with this email or phone already exists', 409);
      }

      const role = await Role.findOne({ role_id: userData.role_id });
      if (!role) {
        throw new CustomError('Role not found', 404);
      }

      const user = new User({
        ...userData
      });

      await user.save();
      logger.loggerInfo(`User created: ${user.email}`);
      return user;
    } catch (error) {
      logger.loggerError(`Error creating user: ${error.message}`);
      throw error;
    }
  }

  static async getUserById(userId) {
    try {
      const user = await User.findOne({ user_id: userId }).populate('operator_id').populate('assigned_vehicle_id');
      if (!user) {
        throw new CustomError('User not found', 404);
      }
      return user;
    } catch (error) {
      logger.loggerError(`Error fetching user: ${error.message}`);
      throw error;
    }
  }

  static async loginUser(email, password, expectedRoleId) {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        throw new CustomError('User not found', 404);
      }

      if (!user.status) {
        throw new CustomError('User account is disabled', 403);
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new CustomError('Invalid password', 401);
      }

      if (typeof expectedRoleId !== 'undefined' && Number(expectedRoleId) !== user.role_id) {
        throw new CustomError('Role does not match this account', 400);
      }

      user.last_login = new Date();
      await user.save();

      const role = await Role.findOne({ role_id: user.role_id });

      const token = generateToken({
        user_id: user.user_id,
        email: user.email,
        role_id: user.role_id,
        role_name: role?.role_name || 'driver'
      });

      let roleDetailsKey = null;
      let roleDetailsData = null;

      if (user.role_id === 1) {
        roleDetailsKey = 'superadmin_details';
        roleDetailsData = {
          user_id: user.user_id,
          name: user.name,
          email: user.email
        };
      } else if (user.role_id === 2) {
        roleDetailsKey = 'operator_details';
        if (user.operator_id) {
          roleDetailsData = await Operator.findOne({ operator_id: user.operator_id })
            .select('-__v')
            .lean();
        }
      } else if (user.role_id === 3) {
        roleDetailsKey = 'driver_details';
        roleDetailsData = await Driver.findOne({ user_id: user.user_id })
          .select('-__v')
          .lean();
      } else {
        roleDetailsKey = 'user_details';
        roleDetailsData = {
          user_id: user.user_id,
          name: user.name,
          email: user.email
        };
      }

      const roleDetails = roleDetailsKey
        ? { key: roleDetailsKey, data: roleDetailsData }
        : null;

      logger.loggerInfo(`User logged in: ${user.email}`);
      return { user, token, roleDetails };
    } catch (error) {
      logger.loggerError(`Error logging in user: ${error.message}`);
      throw error;
    }
  }

  static async getUserProfile(userInput) {
    try {
      if (!userInput) {
        throw new CustomError('User not found', 404);
      }

      let userRecord = null;

      if (typeof userInput === 'string') {
        userRecord = await User.findOne({ user_id: userInput }).lean();
      } else if (typeof userInput === 'object' && typeof userInput.toObject === 'function') {
        userRecord = userInput.toObject();
      } else if (typeof userInput === 'object' && userInput.user_id) {
        userRecord = { ...userInput };
      }

      if (!userRecord) {
        throw new CustomError('User not found', 404);
      }

      delete userRecord.password;
      delete userRecord.__v;

      const role = await Role.findOne({ role_id: userRecord.role_id }).select('role_name role_id').lean();

      const profile = {
        ...userRecord,
        role_name: role?.role_name || null
      };

      profile.operator_details = null;
      profile.associated_operators = [];

      if (userRecord.role_id === 2) {
        const { primaryOperator, operators } = await this.buildOperatorAssociations(userRecord);
        profile.operator_details = primaryOperator;
        profile.associated_operators = operators;
      } else if (userRecord.operator_id) {
        const operatorDoc = await Operator.findOne({ operator_id: userRecord.operator_id }).select('-__v').lean();
        if (operatorDoc) {
          profile.operator_details = operatorDoc;
          profile.associated_operators = [operatorDoc];
        }
      }

      if (userRecord.role_id === 3) {
        const driverProfile = await Driver.findOne({ user_id: userRecord.user_id }).select('-__v').lean();
        const vehicleIdentifier = driverProfile?.assigned_vehicle_id || userRecord.assigned_vehicle_id;
        let assignedVehicle = null;

        if (vehicleIdentifier) {
          assignedVehicle = await Vehicle.findOne({ vehicle_id: vehicleIdentifier }).select('-__v').lean();
        }

        profile.driver_profile = driverProfile;
        profile.assigned_vehicle = assignedVehicle;
      }

      if (userRecord.role_id === 4) {
        const endUserProfile = await EndUser.findOne({ user_id: userRecord.user_id }).lean();
        profile.end_user_profile = endUserProfile || null;

        const associatedProfiles = await User.find({ end_user_id: userRecord.end_user_id })
          .select('user_id name email phone_number assigned_vehicle_id status')
          .lean();

        profile.associated_users = associatedProfiles;
      }

      return profile;
    } catch (error) {
      logger.loggerError(`Error building user profile: ${error.message}`);
      throw error;
    }
  }

  static async buildOperatorAssociations(userRecord) {
    const conditions = [];

    if (userRecord.operator_id) {
      conditions.push({ operator_id: userRecord.operator_id });
    }

    if (userRecord.email) {
      conditions.push({ email: userRecord.email });
    }

    conditions.push({ admin_user_id: userRecord.user_id });

    const operators = conditions.length
      ? await Operator.find({ $or: conditions }).select('-__v').lean()
      : [];

    const uniqueOperators = [];
    const seen = new Set();

    operators.forEach((operator) => {
      if (operator?.operator_id && !seen.has(operator.operator_id)) {
        seen.add(operator.operator_id);
        uniqueOperators.push(operator);
      }
    });

    let primaryOperator = null;

    if (userRecord.operator_id && seen.has(userRecord.operator_id)) {
      primaryOperator = uniqueOperators.find((operator) => operator.operator_id === userRecord.operator_id) || null;
    }

    if (!primaryOperator && uniqueOperators.length) {
      primaryOperator = uniqueOperators[0];
    }

    return {
      primaryOperator,
      operators: uniqueOperators
    };
  }

  static async updateUser(userId, updateData) {
    try {
      const user = await User.findOne({ user_id: userId });
      if (!user) {
        throw new CustomError('User not found', 404);
      }

      Object.keys(updateData).forEach((key) => {
        user[key] = updateData[key];
      });

      await user.save();
      await this.syncRoleSpecificProfile(user, updateData);
      logger.loggerInfo(`User updated: ${user.email}`);
      return user;
    } catch (error) {
      logger.loggerError(`Error updating user: ${error.message}`);
      throw error;
    }
  }

  static async syncRoleSpecificProfile(user, updateData) {
    if (user.role_id === 2) {
      const operatorUpdate = {};
      if (Object.prototype.hasOwnProperty.call(updateData, 'name')) {
        operatorUpdate.name = user.name;
      }
      if (Object.prototype.hasOwnProperty.call(updateData, 'email')) {
        operatorUpdate.email = user.email;
      }
      if (Object.prototype.hasOwnProperty.call(updateData, 'phone_number')) {
        operatorUpdate.phone = user.phone_number != null ? String(user.phone_number) : null;
      }

      if (Object.keys(operatorUpdate).length) {
        const criteria = [{ admin_user_id: user.user_id }];
        if (user.operator_id) {
          criteria.push({ operator_id: user.operator_id });
        }
        if (user.email) {
          criteria.push({ email: user.email });
        }

        if (criteria.length) {
          await Operator.updateMany({ $or: criteria }, { $set: operatorUpdate });
        }
      }
    }

    if (user.role_id === 3) {
      const driverUpdate = {};
      if (Object.prototype.hasOwnProperty.call(updateData, 'name')) {
        driverUpdate.name = user.name;
      }
      if (Object.prototype.hasOwnProperty.call(updateData, 'email')) {
        driverUpdate.email = user.email;
      }
      if (Object.prototype.hasOwnProperty.call(updateData, 'phone_number')) {
        driverUpdate.phone_number = user.phone_number;
      }
      if (Object.prototype.hasOwnProperty.call(updateData, 'assigned_vehicle_id')) {
        driverUpdate.assigned_vehicle_id = user.assigned_vehicle_id;
      }

      if (Object.keys(driverUpdate).length) {
        await Driver.findOneAndUpdate({ user_id: user.user_id }, { $set: driverUpdate });
      }
    }

    if (user.role_id === 4) {
      const endUserUpdate = {};
      if (Object.prototype.hasOwnProperty.call(updateData, 'sos_contact')) {
        endUserUpdate.sos_contact = user.sos_contact;
      }
      if (Object.prototype.hasOwnProperty.call(updateData, 'assigned_vehicle_id')) {
        endUserUpdate.assigned_vehicle_id = user.assigned_vehicle_id;
      }
      if (Object.prototype.hasOwnProperty.call(updateData, 'pickup_location')) {
        endUserUpdate.pickup_location = user.pickup_location;
      }
      if (Object.prototype.hasOwnProperty.call(updateData, 'dropoff_location')) {
        endUserUpdate.dropoff_location = user.dropoff_location;
      }

      if (Object.keys(endUserUpdate).length) {
        await EndUser.findOneAndUpdate({ user_id: user.user_id }, { $set: endUserUpdate });
      }
    }
  }

  static async deleteUser(userId) {
    try {
      const user = await User.findOneAndDelete({ user_id: userId });
      if (!user) {
        throw new CustomError('User not found', 404);
      }
      logger.loggerInfo(`User deleted: ${user.email}`);
      return user;
    } catch (error) {
      logger.loggerError(`Error deleting user: ${error.message}`);
      throw error;
    }
  }

  static async getAllUsers(filters = {}) {
    try {
      const query = {};
      if (filters.role_id) query.role_id = filters.role_id;
      if (filters.operator_id) query.operator_id = filters.operator_id;
      if (filters.status !== undefined) query.status = filters.status;

      const users = await User.find(query).populate('operator_id');
      return users;
    } catch (error) {
      logger.loggerError(`Error fetching users: ${error.message}`);
      throw error;
    }
  }

  static async changePassword(userId, oldPassword, newPassword) {
    try {
      const user = await User.findOne({ user_id: userId });
      if (!user) {
        throw new CustomError('User not found', 404);
      }

      const isPasswordValid = await user.comparePassword(oldPassword);
      if (!isPasswordValid) {
        throw new CustomError('Old password is incorrect', 400);
      }

      user.password = newPassword;
      await user.save();
      logger.loggerInfo(`Password changed for user: ${user.email}`);
      return user;
    } catch (error) {
      logger.loggerError(`Error changing password: ${error.message}`);
      throw error;
    }
  }

  static async resetPassword(userId) {
    try {
      const user = await User.findOne({ user_id: userId });
      if (!user) {
        throw new Error('User not found');
      }

      const newPassword = generateEmailBasedPassword(user.email);
      user.password = newPassword;
      await user.save();

      logger.loggerInfo(`Password reset for user: ${user.email}`);
      return { user, tempPassword: newPassword };
    } catch (error) {
      logger.loggerError(`Error resetting password: ${error.message}`);
      throw error;
    }
  }

  static async toggleUserStatus(userId) {
    try {
      const user = await User.findOne({ user_id: userId });
      if (!user) {
        throw new CustomError('User not found', 404);
      }

      user.status = !user.status;
      await user.save();
      logger.loggerInfo(`User status toggled: ${user.email}`);
      return user;
    } catch (error) {
      logger.loggerError(`Error toggling user status: ${error.message}`);
      throw error;
    }
  }
}

module.exports = UserService;

const User = require('../models/User');
const Role = require('../models/Role');
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
      const user = await User.findOne({ user_id: userId }).populate('operator_id').populate('vehicle_id');
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

      logger.loggerInfo(`User logged in: ${user.email}`);
      return { user, token };
    } catch (error) {
      logger.loggerError(`Error logging in user: ${error.message}`);
      throw error;
    }
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
      logger.loggerInfo(`User updated: ${user.email}`);
      return user;
    } catch (error) {
      logger.loggerError(`Error updating user: ${error.message}`);
      throw error;
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

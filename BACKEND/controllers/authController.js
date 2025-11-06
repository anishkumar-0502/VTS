const UserService = require('../services/userService');
const { CustomError } = require('../middlewares/errorHandler');
const Role = require('../models/Role');
const logger = require('../utils/logger');

class AuthController {
  static async register(req, res, next) {
    try {
      const { name, email, phone_number, password, role_name } = req.body;

      if (!name || !email || !phone_number || !password) {
        throw new CustomError('Missing required fields', 400);
      }

      const role = await Role.findOne({ role_name: role_name || 'driver' });
      if (!role) {
        throw new CustomError('Role not found', 400);
      }

      const user = await UserService.createUser({
        name,
        email,
        phone_number,
        password,
        role_id: role.role_id
      });

      res.status(201).json({
        error: false,
        message: 'User registered successfully',
        data: {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          phone_number: user.phone_number,
          role_name: role.role_name
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password, role_id: expectedRoleId } = req.body;

      if (!email || !password || typeof expectedRoleId === 'undefined') {
        throw new CustomError('Email, password, and role_id are required', 400);
      }

      const { user, token, roleDetails } = await UserService.loginUser(email, password, expectedRoleId);

      const role = await Role.findOne({ role_id: user.role_id });

      const responseData = {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        role_id: user.role_id,
        role_name: role?.role_name || 'driver',
        token
      };

      if (roleDetails?.key) {
        responseData[roleDetails.key] = roleDetails.data;
      }

      res.status(200).json({
        error: false,
        message: 'Login successful',
        data: responseData
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req, res, next) {
    try {
      const profile = await UserService.getUserProfile(req.user.user_id);

      res.status(200).json({
        error: false,
        message: 'Profile retrieved successfully',
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const { name, phone_number, sos_contact, profile_image } = req.body;

      const user = await UserService.updateUser(req.user.user_id, {
        name,
        phone_number,
        sos_contact,
        profile_image
      });

      res.status(200).json({
        error: false,
        message: 'Profile updated successfully',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        throw new CustomError('Old and new passwords are required', 400);
      }

      await UserService.changePassword(req.user.user_id, oldPassword, newPassword);

      res.status(200).json({
        error: false,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;

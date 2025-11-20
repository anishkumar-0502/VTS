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
      } else if (user.role_id === 4) {
        // For parents, include full profile with vehicle and operator details
        roleDetailsKey = 'user_details';
        const profile = await this.getUserProfile(user.user_id);
        roleDetailsData = profile;
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
        // Clean up operator data
        if (primaryOperator) {
          const { _id, __v, createdAt, updatedAt, ...cleanPrimary } = primaryOperator;
          profile.operator_details = cleanPrimary;
        }
        profile.associated_operators = operators.map(op => {
          const { _id, __v, createdAt, updatedAt, ...cleanOp } = op;
          return cleanOp;
        });
      } else if (userRecord.operator_id) {
        const operatorDoc = await Operator.findOne({ operator_id: userRecord.operator_id })
          .select('operator_id name email phone registration_number address city state postal_code country status subscription_plan')
          .lean();
        if (operatorDoc) {
          const { _id, __v, createdAt, updatedAt, ...cleanOperator } = operatorDoc;
          profile.operator_details = cleanOperator;
          profile.associated_operators = [cleanOperator];
        }
      }

      if (userRecord.role_id === 3) {
        const driverProfile = await Driver.findOne({ user_id: userRecord.user_id })
          .select('driver_id user_id assigned_vehicle_id license_number license_expiry status')
          .lean();
        const vehicleIdentifier = driverProfile?.assigned_vehicle_id || userRecord.assigned_vehicle_id;
        let assignedVehicle = null;

        if (vehicleIdentifier) {
          assignedVehicle = await Vehicle.findOne({ vehicle_id: vehicleIdentifier })
            .select('vehicle_id vehicle_number vehicle_type route_name capacity current_status assigned_driver_id route_points standing_location registration_number color seating_capacity')
            .lean();
          if (assignedVehicle) {
            const { _id, __v, createdAt, updatedAt, ...cleanVehicle } = assignedVehicle;
            assignedVehicle = cleanVehicle;
          }
        }

        if (driverProfile) {
          const { _id, __v, createdAt, updatedAt, ...cleanDriver } = driverProfile;
          profile.driver_profile = cleanDriver;
        }
        profile.assigned_vehicle = assignedVehicle;
      }

      if (userRecord.role_id === 4) {
        const endUserProfile = await EndUser.findOne({ user_id: userRecord.user_id }).lean();

        if (endUserProfile) {
          // For parents, use EndUser data as the main profile with essential fields only
          profile.end_user_id = endUserProfile.end_user_id;
          profile.operator_id = endUserProfile.operator_id;
          profile.assigned_vehicle_id = endUserProfile.assigned_vehicle_id;
          profile.sos_contact = endUserProfile.sos_contact;
          profile.pickup_location = endUserProfile.pickup_location;
          profile.dropoff_location = endUserProfile.dropoff_location;
          profile.status = endUserProfile.status;

          // Include essential vehicle details for parents
          if (endUserProfile.assigned_vehicle_id) {
            const vehicle = await Vehicle.findOne({ vehicle_id: endUserProfile.assigned_vehicle_id })
              .select('vehicle_id vehicle_number vehicle_type route_name capacity current_status assigned_driver_id route_points standing_location registration_number color seating_capacity')
              .lean();
            if (vehicle) {
              // Clean up vehicle data
              const { _id, __v, createdAt, updatedAt, ...cleanVehicle } = vehicle;
              profile.vehicle_details = cleanVehicle;
            } else {
              profile.vehicle_details = null;
            }
          }

          // Include essential operator details for parents
          if (endUserProfile.operator_id) {
            const operator = await Operator.findOne({ operator_id: endUserProfile.operator_id })
              .select('operator_id name email phone registration_number address city state postal_code country status subscription_plan')
              .lean();
            if (operator) {
              // Clean up operator data
              const { _id, __v, createdAt, updatedAt, ...cleanOperator } = operator;
              profile.operator_details = cleanOperator;
            } else {
              profile.operator_details = null;
            }
          }
        }

        // Clean up end_user_profile
        if (endUserProfile) {
          const { _id, __v, createdAt, updatedAt, ...cleanEndUser } = endUserProfile;
          profile.end_user_profile = cleanEndUser;
        } else {
          profile.end_user_profile = null;
        }

        // Clean up associated_users
        const associatedProfiles = await User.find({ end_user_id: userRecord.end_user_id })
          .select('user_id name email phone_number assigned_vehicle_id status')
          .lean();

        profile.associated_users = associatedProfiles.map(user => {
          const { _id, __v, createdAt, updatedAt, ...cleanUser } = user;
          return cleanUser;
        });
      }

      // Clean up the main profile to remove MongoDB internal fields
      const { _id, __v, createdAt, updatedAt, last_login, ...cleanProfile } = profile;
      return cleanProfile;
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

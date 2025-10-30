const xlsx = require('xlsx');
const csv = require('csv-parse/sync');
const logger = require('../utils/logger');
const PhoneFormatter = require('../utils/phoneFormatter');
const User = require('../models/User');
const { generateEmailBasedPassword } = require('../utils/passwordGenerator');
const Driver = require('../models/Driver');

class BulkImportService {
  static async parseExcelFile(filePath) {
    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);

      logger.loggerInfo(`Parsed Excel file: ${filePath} with ${data.length} rows`);
      return data;
    } catch (error) {
      logger.loggerError(`Error parsing Excel file: ${error.message}`);
      throw error;
    }
  }

  static async parseCsvFile(filePath) {
    try {
      const fs = require('fs');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      logger.loggerInfo(`Parsed CSV file: ${filePath} with ${data.length} rows`);
      return data;
    } catch (error) {
      logger.loggerError(`Error parsing CSV file: ${error.message}`);
      throw error;
    }
  }

  static async validateBulkUserData(users, roleId, operatorId) {
    try {
      const results = {
        valid: [],
        invalid: [],
        duplicates: []
      };

      const seenEmails = new Set();
      const existingUsers = await User.find(
        { email: { $in: users.map(u => u.email) } },
        { email: 1 }
      );
      const existingEmails = new Set(existingUsers.map(u => u.email));

      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const errors = [];

        if (!user.email || !user.email.trim()) {
          errors.push('Email is required');
        } else if (!this.isValidEmail(user.email)) {
          errors.push('Invalid email format');
        } else if (existingEmails.has(user.email)) {
          results.duplicates.push({
            row: i + 2,
            email: user.email,
            reason: 'Email already exists in system'
          });
          continue;
        } else if (seenEmails.has(user.email)) {
          results.duplicates.push({
            row: i + 2,
            email: user.email,
            reason: 'Duplicate email in import file'
          });
          continue;
        }

        if (!user.name || !user.name.trim()) {
          errors.push('Name is required');
        }

        if (!user.phone_number || !user.phone_number.trim()) {
          errors.push('Phone number is required');
        } else {
          const phoneValidation = PhoneFormatter.validatePhoneNumber(
            user.phone_number,
            'IN'
          );
          if (!phoneValidation.valid) {
            errors.push(phoneValidation.error);
          }
        }

        let pickupLocation = null;
        let dropoffLocation = null;

        if (roleId === 3) {
          if (!user.license_number || !user.license_number.trim()) {
            errors.push('License number is required for drivers');
          }
        }

        if (roleId === 4) {
          if (user.pickup_latitude || user.pickup_longitude) {
            if (!user.pickup_latitude || !user.pickup_longitude) {
              errors.push('Both pickup latitude and longitude are required');
            } else {
              const pickupLat = parseFloat(user.pickup_latitude);
              const pickupLng = parseFloat(user.pickup_longitude);
              if (isNaN(pickupLat) || pickupLat < -90 || pickupLat > 90) {
                errors.push('Invalid pickup latitude');
              } else if (isNaN(pickupLng) || pickupLng < -180 || pickupLng > 180) {
                errors.push('Invalid pickup longitude');
              } else {
                pickupLocation = {
                  latitude: pickupLat,
                  longitude: pickupLng,
                  address: user.pickup_address?.trim() || '',
                  name: user.pickup_name?.trim() || ''
                };
              }
            }
          }

          if (user.dropoff_latitude || user.dropoff_longitude) {
            if (!user.dropoff_latitude || !user.dropoff_longitude) {
              errors.push('Both dropoff latitude and longitude are required');
            } else {
              const dropoffLat = parseFloat(user.dropoff_latitude);
              const dropoffLng = parseFloat(user.dropoff_longitude);
              if (isNaN(dropoffLat) || dropoffLat < -90 || dropoffLat > 90) {
                errors.push('Invalid dropoff latitude');
              } else if (isNaN(dropoffLng) || dropoffLng < -180 || dropoffLng > 180) {
                errors.push('Invalid dropoff longitude');
              } else {
                dropoffLocation = {
                  latitude: dropoffLat,
                  longitude: dropoffLng,
                  address: user.dropoff_address?.trim() || '',
                  name: user.dropoff_name?.trim() || ''
                };
              }
            }
          }
        }

        if (errors.length === 0) {
          seenEmails.add(user.email);
          const validUser = {
            email: user.email,
            name: user.name.trim(),
            phone_number: PhoneFormatter.formatPhoneNumber(user.phone_number, 'IN'),
            roleId,
            operatorId,
            rowNumber: i + 2
          };

          if (roleId === 4) {
            if (pickupLocation) validUser.pickup_location = pickupLocation;
            if (dropoffLocation) validUser.dropoff_location = dropoffLocation;
          }

          if (roleId === 3) {
            validUser.assigned_vehicle_id = user.assigned_vehicle_id?.trim() || null;
            validUser.license_number = user.license_number?.trim() || null;
            validUser.license_expiry = user.license_expiry ? new Date(user.license_expiry) : null;
          }

          results.valid.push(validUser);
        } else {
          results.invalid.push({
            row: i + 2,
            email: user.email,
            errors
          });
        }
      }

      return results;
    } catch (error) {
      logger.loggerError(`Error validating bulk user data: ${error.message}`);
      throw error;
    }
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static async importUsers(validUsers, roleId, operatorId) {
    try {
      const createdUsers = [];
      const errors = [];

      for (const userData of validUsers) {
        try {
          const existingUser = await User.findOne({ email: userData.email });
          if (existingUser) {
            errors.push({
              email: userData.email,
              error: 'User with this email already exists'
            });
            continue;
          }

          const password = generateEmailBasedPassword(userData.email);
          const hashedPassword = require('bcryptjs').hashSync(password, 10);

          const userObj = {
            email: userData.email,
            name: userData.name,
            phone_number: userData.phone_number,
            password: hashedPassword,
            role_id: roleId,
            operator_id: operatorId,
            status: true
          };

          if (roleId === 4) {
            if (userData.pickup_location) {
              userObj.pickup_location = userData.pickup_location;
            }
            if (userData.dropoff_location) {
              userObj.dropoff_location = userData.dropoff_location;
            }
          }

          const newUser = new User(userObj);
          await newUser.save();

          if (roleId === 3) {
            await Driver.create({
              user_id: newUser.user_id,
              operator_id: operatorId,
              assigned_vehicle_id: userData.assigned_vehicle_id || null,
              license_number: userData.license_number || null,
              license_expiry: userData.license_expiry || null,
              status: true
            });
          }

          createdUsers.push({
            email: userData.email,
            name: userData.name,
            password,
            userId: newUser.user_id
          });

          logger.loggerInfo(`Created user from bulk import: ${userData.email}`);
        } catch (error) {
          logger.loggerError(`Error creating user ${userData.email}: ${error.message}`);
          errors.push({
            email: userData.email,
            error: error.message
          });
        }
      }

      return {
        created: createdUsers,
        errors,
        summary: {
          totalCreated: createdUsers.length,
          totalErrors: errors.length
        }
      };
    } catch (error) {
      logger.loggerError(`Error importing users: ${error.message}`);
      throw error;
    }
  }

  static async validateBulkVehicleData(vehicles, operatorId) {
    try {
      const results = {
        valid: [],
        invalid: [],
        duplicates: []
      };

      const seenNumbers = new Set();
      const Vehicle = require('../models/Vehicle');
      const existingVehicles = await Vehicle.find(
        { vehicle_number: { $in: vehicles.map(v => v.vehicle_number) } },
        { vehicle_number: 1 }
      );
      const existingNumbers = new Set(existingVehicles.map(v => v.vehicle_number));

      for (let i = 0; i < vehicles.length; i++) {
        const vehicle = vehicles[i];
        const errors = [];

        if (!vehicle.vehicle_number || !vehicle.vehicle_number.trim()) {
          errors.push('Vehicle number is required');
        } else if (existingNumbers.has(vehicle.vehicle_number)) {
          results.duplicates.push({
            row: i + 2,
            vehicle_number: vehicle.vehicle_number,
            reason: 'Vehicle number already exists'
          });
          continue;
        } else if (seenNumbers.has(vehicle.vehicle_number)) {
          results.duplicates.push({
            row: i + 2,
            vehicle_number: vehicle.vehicle_number,
            reason: 'Duplicate vehicle number in import file'
          });
          continue;
        }

        if (!vehicle.vehicle_type || !vehicle.vehicle_type.trim()) {
          errors.push('Vehicle type is required');
        }

        if (vehicle.capacity && isNaN(parseInt(vehicle.capacity))) {
          errors.push('Capacity must be a number');
        }

        let routePoints = [];
        if (vehicle.route_points_json) {
          try {
            routePoints = JSON.parse(vehicle.route_points_json);
            if (!Array.isArray(routePoints)) {
              errors.push('route_points_json must be a valid JSON array');
            } else {
              for (let j = 0; j < routePoints.length; j++) {
                const point = routePoints[j];
                if (!point.latitude || !point.longitude) {
                  errors.push(`Route point ${j + 1} missing latitude or longitude`);
                } else {
                  const lat = parseFloat(point.latitude);
                  const lng = parseFloat(point.longitude);
                  if (isNaN(lat) || lat < -90 || lat > 90) {
                    errors.push(`Route point ${j + 1} has invalid latitude`);
                  } else if (isNaN(lng) || lng < -180 || lng > 180) {
                    errors.push(`Route point ${j + 1} has invalid longitude`);
                  }
                }
              }
            }
          } catch (err) {
            errors.push('Invalid JSON format for route_points_json');
          }
        }

        if (errors.length === 0) {
          seenNumbers.add(vehicle.vehicle_number);
          const validVehicle = {
            vehicle_number: vehicle.vehicle_number.trim(),
            vehicle_type: vehicle.vehicle_type.trim(),
            capacity: parseInt(vehicle.capacity) || 50,
            registration_number: vehicle.registration_number?.trim(),
            route_name: vehicle.route_name?.trim(),
            color: vehicle.color?.trim(),
            seating_capacity: vehicle.seating_capacity ? parseInt(vehicle.seating_capacity) : null,
            operator_id: operatorId,
            rowNumber: i + 2
          };

          if (routePoints.length > 0) {
            validVehicle.route_points = routePoints.map((point, idx) => ({
              name: point.name?.trim() || `Stop ${idx + 1}`,
              latitude: parseFloat(point.latitude),
              longitude: parseFloat(point.longitude),
              order: point.order || idx + 1,
              arrival_time: point.arrival_time ? new Date(point.arrival_time) : null
            }));
          }

          results.valid.push(validVehicle);
        } else {
          results.invalid.push({
            row: i + 2,
            vehicle_number: vehicle.vehicle_number,
            errors
          });
        }
      }

      return results;
    } catch (error) {
      logger.loggerError(`Error validating bulk vehicle data: ${error.message}`);
      throw error;
    }
  }

  static async importVehicles(validVehicles, operatorId) {
    try {
      const Vehicle = require('../models/Vehicle');
      const createdVehicles = [];
      const errors = [];

      for (const vehicleData of validVehicles) {
        try {
          const existingVehicle = await Vehicle.findOne({
            vehicle_number: vehicleData.vehicle_number
          });

          if (existingVehicle) {
            errors.push({
              vehicle_number: vehicleData.vehicle_number,
              error: 'Vehicle with this number already exists'
            });
            continue;
          }

          const vehicleObj = {
            vehicle_number: vehicleData.vehicle_number,
            vehicle_type: vehicleData.vehicle_type,
            capacity: vehicleData.capacity,
            registration_number: vehicleData.registration_number,
            route_name: vehicleData.route_name,
            color: vehicleData.color,
            seating_capacity: vehicleData.seating_capacity,
            operator_id: operatorId,
            current_status: 'idle'
          };

          if (vehicleData.route_points && vehicleData.route_points.length > 0) {
            vehicleObj.route_points = vehicleData.route_points;
          }

          const newVehicle = new Vehicle(vehicleObj);
          await newVehicle.save();

          createdVehicles.push({
            vehicle_number: vehicleData.vehicle_number,
            vehicle_type: vehicleData.vehicle_type,
            vehicleId: newVehicle._id,
            route_points_count: vehicleData.route_points ? vehicleData.route_points.length : 0
          });

          logger.loggerInfo(`Created vehicle from bulk import: ${vehicleData.vehicle_number}`);
        } catch (error) {
          logger.loggerError(`Error creating vehicle ${vehicleData.vehicle_number}: ${error.message}`);
          errors.push({
            vehicle_number: vehicleData.vehicle_number,
            error: error.message
          });
        }
      }

      return {
        created: createdVehicles,
        errors,
        summary: {
          totalCreated: createdVehicles.length,
          totalErrors: errors.length
        }
      };
    } catch (error) {
      logger.loggerError(`Error importing vehicles: ${error.message}`);
      throw error;
    }
  }

  static getFileExtension(fileName) {
    return fileName.split('.').pop().toLowerCase();
  }

  static async processImportFile(filePath, fileType, dataType) {
    try {
      let data;

      if (fileType === 'xlsx' || fileType === 'xls') {
        data = await this.parseExcelFile(filePath);
      } else if (fileType === 'csv') {
        data = await this.parseCsvFile(filePath);
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No data found in file');
      }

      return data;
    } catch (error) {
      logger.loggerError(`Error processing import file: ${error.message}`);
      throw error;
    }
  }
}

module.exports = BulkImportService;

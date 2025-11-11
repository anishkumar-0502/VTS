const logger = require('./logger');
const jwt = require('jsonwebtoken');
const Device = require('../models/Device');
const Vehicle = require('../models/Vehicle');

class SocketManager {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map();
    this.vehicleTracking = new Map();
    this.tripSubscriptions = new Map();
    this.locationBuffer = new Map();
    this.liveTrackingSubscribers = new Map();

    this.setupMiddleware();
    this.setupSocketListeners();
  }

  setupMiddleware() {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('No auth token'));

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        socket.operatorId = decoded.operator_id;
        next();
      } catch (err) {
        logger.error(`Socket auth failed: ${err.message}`);
        next(new Error('Invalid token'));
      }
    });
  }

  setupSocketListeners() {
    this.io.on('connection', (socket) => {
      logger.info(`[${socket.userRole}:${socket.userId}] connected: ${socket.id}`);
      
      socket.join(`${socket.userRole}:${socket.operatorId}`);
      this.connectedUsers.set(socket.id, {
        userId: socket.userId,
        role: socket.userRole,
        operatorId: socket.operatorId,
        connectedAt: new Date()
      });

      socket.on('subscribe_live_tracking', async (payload = {}) => {
        try {
          const filters = this.normalizeLiveTrackingFilters(payload);
          this.liveTrackingSubscribers.set(socket.id, filters);
          socket.join('live_tracking');
          if (filters.operatorId) {
            socket.join(`operator:${filters.operatorId}`);
          }
          if (filters.deviceId) {
            socket.join(`device:${filters.deviceId}`);
          }
          logger.info(`[${socket.userRole}:${socket.userId}] subscribed to live tracking ${JSON.stringify(filters)}`);
          socket.emit('tracking_subscribed', { status: 'subscribed', filters });
          await this.pushInitialLiveTrackingSnapshot(socket, filters);
        } catch (error) {
          logger.error(`Failed to subscribe live tracking for ${socket.id}: ${error.message}`);
          socket.emit('error', 'Failed to subscribe to live tracking');
        }
      });

      socket.on('unsubscribe_live_tracking', () => {
        socket.leave('live_tracking');
        this.liveTrackingSubscribers.delete(socket.id);
        logger.info(`[${socket.userRole}:${socket.userId}] unsubscribed from live tracking`);
        socket.emit('unsubscribe_live_tracking', { status: 'unsubscribed' });
      });

      socket.on('subscribe_trip', ({ tripId, childId }) => {
        socket.join(`trip:${tripId}`);
        if (!this.tripSubscriptions.has(tripId)) {
          this.tripSubscriptions.set(tripId, new Set());
        }
        this.tripSubscriptions.get(tripId).add(socket.userId);
        logger.info(`[${socket.userRole}:${socket.userId}] subscribed to trip:${tripId}`);
        socket.emit('trip_subscribed', { tripId, status: 'subscribed' });
      });

      socket.on('unsubscribe_trip', ({ tripId }) => {
        socket.leave(`trip:${tripId}`);
        if (this.tripSubscriptions.has(tripId)) {
          this.tripSubscriptions.get(tripId).delete(socket.userId);
        }
        logger.info(`[${socket.userRole}:${socket.userId}] unsubscribed from trip:${tripId}`);
      });

      socket.on('location_update', (data) => {
        const { tripId, latitude, longitude, speed, heading } = data;
        if (!tripId) return;

        const locationData = {
          userId: socket.userId,
          tripId,
          location: { latitude, longitude },
          speed,
          heading,
          timestamp: new Date()
        };

        this.locationBuffer.set(tripId, locationData);
        this.io.to(`trip:${tripId}`).emit('vehicle_location', locationData);
        this.io.to(`operator:${socket.operatorId}`).emit('fleet_update', locationData);
      });

      socket.on('speed_violation', (data) => {
        const { tripId, speed, speedLimit } = data;
        this.io.to(`trip:${tripId}`).emit('speed_alert', {
          driverId: socket.userId,
          currentSpeed: speed,
          speedLimit,
          severity: speed > speedLimit ? 'HIGH' : 'WARNING',
          timestamp: new Date()
        });
      });

      socket.on('passenger_update', (data) => {
        const { tripId, passengerId, status, stop } = data;
        this.io.to(`trip:${tripId}`).emit('passenger_status_change', {
          passengerId,
          status,
          stop,
          timestamp: new Date()
        });
      });

      socket.on('confirm_action', (data) => {
        const { tripId, action, passengerId } = data;
        this.io.to(`trip:${tripId}`).emit('confirmation_update', {
          action,
          passengerId,
          parentId: socket.userId,
          timestamp: new Date()
        });
      });

      socket.on('sos_alert', (data) => {
        const { tripId, location, message } = data;
        this.io.to(`operator:${socket.operatorId}`).emit('sos_notification', {
          userId: socket.userId,
          userRole: socket.userRole,
          tripId,
          location,
          message,
          timestamp: new Date()
        });
      });

      socket.on('join_admin', () => {
        socket.join('admin');
        logger.info(`[${socket.userRole}:${socket.userId}] admin joined`);
      });

      socket.on('disconnect', () => {
        this.connectedUsers.delete(socket.id);
        this.liveTrackingSubscribers.delete(socket.id);
        logger.info(`[${socket.userRole}:${socket.userId}] disconnected: ${socket.id}`);
      });

      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}: ${error.message}`);
      });
    });
  }

  emitToTrip(tripId, event, data) {
    this.io.to(`trip:${tripId}`).emit(event, data);
  }

  emitToOperator(operatorId, event, data) {
    this.io.to(`operator:${operatorId}`).emit(event, data);
  }

  emitToDriver(driverId, event, data) {
    this.io.to(`driver:${driverId}`).emit(event, data);
  }

  emitToParent(parentId, event, data) {
    this.io.to(`parent:${parentId}`).emit(event, data);
  }

  emitToAdmin(event, data) {
    this.io.to('admin').emit(event, data);
  }

  normalizeLiveTrackingFilters(payload = {}) {
    const filters = {};
    const operatorId = payload.operatorId || payload.operator_id || payload.operator;
    const deviceId = payload.deviceId || payload.device_id || payload.device;

    if (typeof operatorId === 'string' && operatorId.trim()) {
      filters.operatorId = operatorId.trim();
    }

    if (typeof deviceId === 'string' && deviceId.trim()) {
      filters.deviceId = deviceId.trim();
    }

    return filters;
  }

  async pushInitialLiveTrackingSnapshot(socket, filters) {
    try {
      const query = {};
      if (filters.deviceId) {
        query.device_id = filters.deviceId;
      } else if (filters.operatorId) {
        query.assigned_operator_id = filters.operatorId;
      } else {
        query.status = true;
      }

      const limit = filters.deviceId ? 1 : (filters.operatorId ? 100 : 200);

      const devices = await Device.find(query)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .select('device_id assigned_operator_id assigned_vehicle_id status battery_level last_signal last_location last_speed last_course')
        .lean();

      if (!devices.length) {
        return;
      }

      const vehicleIds = devices
        .map((device) => device.assigned_vehicle_id)
        .filter((value, index, array) => value && array.indexOf(value) === index);

      let vehicleMap = new Map();
      if (vehicleIds.length) {
        const vehicles = await Vehicle.find({ vehicle_id: { $in: vehicleIds } })
          .select('vehicle_id vehicle_number')
          .lean();
        vehicleMap = new Map(vehicles.map((vehicle) => [vehicle.vehicle_id, vehicle]));
      }

      devices.forEach((device) => {
        const location = device.last_location;
        if (!location || location.latitude == null || location.longitude == null) {
          return;
        }

        const vehicle = device.assigned_vehicle_id ? vehicleMap.get(device.assigned_vehicle_id) : null;
        const timestamp = location.timestamp || device.last_signal || new Date();

        const payload = {
          gpsDeviceId: device.device_id,
          vehicleId: device.assigned_vehicle_id || device.device_id,
          latitude: location.latitude,
          longitude: location.longitude,
          altitude: 0,
          speed: device.last_speed ?? 0,
          course: device.last_course ?? 0,
          timestamp: new Date(timestamp).toISOString(),
          device: {
            status: device.status ?? true,
            battery_level: device.battery_level ?? null,
            last_signal: device.last_signal ? new Date(device.last_signal).toISOString() : null
          },
          vehicle_number: vehicle?.vehicle_number || device.assigned_vehicle_id || device.device_id,
          operatorId: device.assigned_operator_id || null
        };

        socket.emit('live_tracking_update', payload);
      });
    } catch (error) {
      logger.error(`Failed to push initial live tracking snapshot: ${error.message}`);
    }
  }

  emitLiveTrackingUpdate(update) {
    this.liveTrackingSubscribers.forEach((filters, socketId) => {
      const clientSocket = this.io.sockets.sockets.get(socketId);
      if (!clientSocket) {
        this.liveTrackingSubscribers.delete(socketId);
        return;
      }

      if (filters.operatorId && filters.operatorId !== (update.operatorId || null)) {
        return;
      }

      if (filters.deviceId && filters.deviceId !== (update.gpsDeviceId || update.device?.id || null)) {
        return;
      }

      clientSocket.emit('live_tracking_update', update);
    });
  }

  broadcastLocationUpdate(vehicleId, gpsDeviceId, trackingData, gpsDevice) {
    const operatorId = gpsDevice ? gpsDevice.assigned_operator_id || null : null;
    const timestamp = trackingData.timestamp ? new Date(trackingData.timestamp).toISOString() : new Date().toISOString();
    const lastSignal = gpsDevice?.last_signal ? new Date(gpsDevice.last_signal).toISOString() : null;
    const data = {
      vehicleId,
      gpsDeviceId,
      latitude: trackingData.latitude,
      longitude: trackingData.longitude,
      speed: trackingData.speed,
      ignition_status: trackingData.ignition_status,
      timestamp,
      course: trackingData.course || 0,
      altitude: trackingData.altitude || 0,
      device: gpsDevice ? {
        id: gpsDevice.device_id || gpsDevice._id,
        status: gpsDevice.status,
        battery_level: gpsDevice.battery_level,
        last_signal: lastSignal
      } : null,
      vehicle_number: trackingData.vehicle_number || trackingData.vehicleNumber || gpsDevice?.assigned_vehicle_id || vehicleId,
      operatorId
    };

    this.io.to('admin').emit('location_update', data);
    this.io.to(`vehicle:${vehicleId}`).emit('location_update', data);
    this.io.to(`device:${gpsDeviceId}`).emit('location_update', data);
    this.emitLiveTrackingUpdate(data);
  }

  broadcastLiveTracking(trackingData) {
    this.io.to('live_tracking').emit('live_tracking_update', trackingData);
  }

  broadcastOperatorTracking(operatorId, trackingData) {
    const roomId = `operator:${operatorId}`;
    this.io.to(roomId).emit('operator_tracking_update', trackingData);
  }

  broadcastDeviceLocationUpdate(deviceId, owner_id, locationData) {
    const data = {
      deviceId,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      battery_level: locationData.battery_level,
      connection_status: locationData.connection_status,
      timestamp: new Date().toISOString(),
      speed: locationData.speed || 0,
      course: locationData.course || 0
    };

    this.io.to(`device:${deviceId}`).emit('device_location_update', data);
    this.io.to(`parent:${owner_id}`).emit('device_location_update', data);
    this.io.to('admin').emit('device_location_update', data);
  }

  broadcastVehicleStatus(vehicleId, status) {
    const statusData = {
      vehicleId,
      status,
      timestamp: new Date().toISOString()
    };

    this.io.to('admin').emit('vehicle_status_changed', statusData);
    this.io.to(`vehicle:${vehicleId}`).emit('status_changed', statusData);
  }

  broadcastAlert(alert) {
    const alertData = {
      alertId: alert.id,
      vehicleId: alert.vehicle_id,
      type: alert.alert_type,
      description: alert.description,
      timestamp: alert.timestamp
    };

    this.io.to('admin').emit('new_alert', alertData);
    this.io.to(`vehicle:${alert.vehicle_id}`).emit('alert', alertData);
  }

  broadcastSpeedAlert(tripId, operatorId, speed, speedLimit, driverId) {
    const alertData = {
      tripId,
      driverId,
      currentSpeed: speed,
      speedLimit,
      severity: speed > speedLimit ? 'HIGH' : 'WARNING',
      timestamp: new Date()
    };

    this.io.to(`trip:${tripId}`).emit('speed_alert', alertData);
    this.io.to(`operator:${operatorId}`).emit('driver_speed_alert', alertData);
  }

  broadcastPassengerUpdate(tripId, operatorId, passengerId, status, stop) {
    const updateData = {
      tripId,
      passengerId,
      status,
      stop,
      timestamp: new Date()
    };

    this.io.to(`trip:${tripId}`).emit('passenger_status_change', updateData);
    this.io.to(`operator:${operatorId}`).emit('trip_passenger_update', updateData);
  }

  broadcastSOSAlert(tripId, operatorId, location, userRole, userId) {
    const sosData = {
      tripId,
      userId,
      userRole,
      location,
      timestamp: new Date()
    };

    this.io.to(`operator:${operatorId}`).emit('sos_alert', sosData);
    this.io.to('admin').emit('system_sos_alert', sosData);
  }

  notifyETAUpdate(tripId, nextStop, distanceKm, etaMinutes) {
    this.io.to(`trip:${tripId}`).emit('eta_update', {
      nextStop,
      distanceKm: distanceKm.toFixed(2),
      etaMinutes,
      updatedAt: new Date()
    });
  }

  getConnectedUsersCount() {
    return this.io.engine.clientsCount || 0;
  }

  getConnectedUsers() {
    return Array.from(this.connectedUsers.entries()).map(([id, data]) => ({
      socketId: id,
      ...data
    }));
  }

  getConnectedUsersByRole(role) {
    return Array.from(this.connectedUsers.entries())
      .filter(([_, data]) => data.role === role)
      .map(([id, data]) => ({ socketId: id, ...data }));
  }

  getConnectedOperatorUsers(operatorId) {
    return Array.from(this.connectedUsers.entries())
      .filter(([_, data]) => data.operatorId === operatorId)
      .map(([id, data]) => ({ socketId: id, ...data }));
  }

  getTripSubscribers(tripId) {
    return this.tripSubscriptions.get(tripId) || new Set();
  }

  getLocationBuffer(tripId) {
    return this.locationBuffer.get(tripId);
  }
}

module.exports = SocketManager;

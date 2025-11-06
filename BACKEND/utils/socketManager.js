const logger = require('./logger');
const jwt = require('jsonwebtoken');

class SocketManager {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map();
    this.vehicleTracking = new Map();
    this.tripSubscriptions = new Map();
    this.locationBuffer = new Map();

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

  broadcastLocationUpdate(vehicleId, gpsDeviceId, trackingData, gpsDevice) {
    const data = {
      vehicleId,
      gpsDeviceId,
      latitude: trackingData.latitude,
      longitude: trackingData.longitude,
      speed: trackingData.speed,
      ignition_status: trackingData.ignition_status,
      timestamp: trackingData.timestamp,
      course: trackingData.course || 0,
      altitude: trackingData.altitude || 0,
      device: gpsDevice ? {
        status: gpsDevice.status,
        battery_level: gpsDevice.battery_level,
        last_signal: gpsDevice.last_signal
      } : null
    };

    this.io.to('admin').emit('location_update', data);
    this.io.to(`vehicle:${vehicleId}`).emit('location_update', data);
    this.io.to(`device:${gpsDeviceId}`).emit('location_update', data);
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

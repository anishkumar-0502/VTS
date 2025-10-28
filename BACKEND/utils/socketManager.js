const logger = require('./logger');

class SocketManager {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map();
    this.vehicleTracking = new Map();

    this.setupSocketListeners();
  }

  setupSocketListeners() {
    this.io.on('connection', (socket) => {
      logger.info(`User connected: ${socket.id}`);

      socket.on('join_admin', () => {
        socket.join('admin');
        logger.info(`Admin joined: ${socket.id}`);
      });

      socket.on('join_operator', (operatorId) => {
        socket.join(`operator_${operatorId}`);
        this.connectedUsers.set(socket.id, { type: 'operator', id: operatorId });
        logger.info(`Operator ${operatorId} joined: ${socket.id}`);
      });

      socket.on('join_driver', (driverId) => {
        socket.join(`driver_${driverId}`);
        this.connectedUsers.set(socket.id, { type: 'driver', id: driverId });
        logger.info(`Driver ${driverId} joined: ${socket.id}`);
      });

      socket.on('join_app_user', (userId) => {
        socket.join(`app_user_${userId}`);
        this.connectedUsers.set(socket.id, { type: 'app_user', id: userId });
        logger.info(`App user ${userId} joined: ${socket.id}`);
      });

      socket.on('watch_vehicle', (vehicleId) => {
        socket.join(`vehicle_${vehicleId}`);
        logger.debug(`Watching vehicle ${vehicleId}`);
      });

      socket.on('watch_device', (deviceId) => {
        socket.join(`device_${deviceId}`);
        logger.debug(`Watching device ${deviceId}`);
      });

      socket.on('disconnect', () => {
        this.connectedUsers.delete(socket.id);
        logger.info(`User disconnected: ${socket.id}`);
      });

      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  emitToAdmin(event, data) {
    this.io.to('admin').emit(event, data);
  }

  emitToOperator(operatorId, event, data) {
    this.io.to(`operator_${operatorId}`).emit(event, data);
  }

  emitToDriver(driverId, event, data) {
    this.io.to(`driver_${driverId}`).emit(event, data);
  }

  emitToVehicle(vehicleId, event, data) {
    this.io.to(`vehicle_${vehicleId}`).emit(event, data);
  }

  emitToAppUser(userId, event, data) {
    this.io.to(`app_user_${userId}`).emit(event, data);
  }

  emitToDevice(deviceId, event, data) {
    this.io.to(`device_${deviceId}`).emit(event, data);
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
    this.io.to(`vehicle_${vehicleId}`).emit('location_update', data);
    this.io.to(`device_${gpsDeviceId}`).emit('location_update', data);
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

    this.io.to(`device_${deviceId}`).emit('device_location_update', data);
    this.io.to(`app_user_${owner_id}`).emit('device_location_update', data);
    this.io.to('admin').emit('device_location_update', data);
  }

  broadcastVehicleStatus(vehicleId, status) {
    const statusData = {
      vehicleId,
      status,
      timestamp: new Date().toISOString()
    };

    this.io.to('admin').emit('vehicle_status_changed', statusData);
    this.io.to(`vehicle_${vehicleId}`).emit('status_changed', statusData);
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
    this.io.to(`vehicle_${alert.vehicle_id}`).emit('alert', alertData);
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
}

module.exports = SocketManager;

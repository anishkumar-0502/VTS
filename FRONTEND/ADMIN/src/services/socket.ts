import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface GPSDeviceInfo {
  status: boolean;
  battery_level?: number; 
  last_signal?: string;
}

interface LocationUpdateData {
  vehicleId?: string;
  gpsDeviceId?: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  timestamp?: string;
  course?: number;
  altitude?: number;
  ignition_status?: boolean;
  device?: GPSDeviceInfo | null;
}

interface LiveTrackingUpdate {
  vehicleId?: string;
  trackerId?: string;
  gpsDeviceId?: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  timestamp?: string;
  course?: number;
  altitude?: number;
  ignition_status?: boolean;
  device?: GPSDeviceInfo | null;
  vehicleNumber?: string;
  vehicle_number?: string;
}

type EventCallback = (data: unknown) => void;

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private isConnecting = false;

  connect() {
    if (this.socket?.connected || this.isConnecting) return;

    this.isConnecting = true;
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');

    console.log('Connecting to Socket.io at:', SOCKET_URL);

    this.socket = io(SOCKET_URL, {
      auth: {
        token: token || ''
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.isConnecting = false;
      this.emit('connected', { socketId: this.socket?.id });
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.emit('disconnected', null);
    });

    this.socket.on('location_update', (data: LocationUpdateData) => {
      console.log('Location update received from socket.io:', data);
      this.emit('location_update', data);
    });

    this.socket.on('live_tracking_update', (data: LiveTrackingUpdate) => {
      console.log('Live tracking update received from socket.io:', data);
      this.emit('live_tracking_update', data);
    });

    this.socket.on('tracking_subscribed', (data: unknown) => {
      console.log('Subscribed to live tracking stream:', data);
      this.emit('tracking_subscribed', data);
    });

    this.socket.on('unsubscribe_live_tracking', (data: unknown) => {
      console.log('Unsubscribed from live tracking stream');
      this.emit('unsubscribe_live_tracking', data);
    });

    this.socket.on('error', (error: string | Error) => {
      console.error('Socket error:', error);
      this.emit('error', error);
    });

    this.socket.on('connect_error', (error: string | Error) => {
      console.error('Socket connection error:', error);
      this.isConnecting = false;
      this.emit('error', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
    }
  }

  joinAdmin() {
    if (this.socket?.connected) {
      this.socket.emit('join_admin');
      console.log('Joined admin room');
    } else {
      console.warn('Socket not connected, cannot join admin room');
    }
  }

  subscribeLiveTracking(filters?: { operatorId?: string; vehicleId?: string; deviceId?: string }) {
    if (this.socket?.connected) {
      this.socket.emit('subscribe_live_tracking', filters ?? {});
      console.log('Subscribed to live tracking with filters:', filters ?? {});
    } else {
      console.warn('Socket not connected, cannot subscribe to live tracking');
    }
  }

  unsubscribeLiveTracking() {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe_live_tracking');
      console.log('Requested live tracking unsubscribe');
    }
  }

  watchVehicle(vehicleId: string) {
    if (this.socket?.connected) {
      this.socket.emit('watch_vehicle', vehicleId);
      console.log('Watching vehicle:', vehicleId);
    }
  }

  unwatchVehicle() {
    if (this.socket) {
      this.socket.off('location_update');
    }
  }

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
    console.log(`Registered listener for event: ${event}`);
  }

  off(event: string, callback?: EventCallback) {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
    } else {
      this.listeners.delete(event);
    }
  }

  private emit(event: string, data: unknown) {
    const callbacks = this.listeners.get(event);
    if (callbacks && callbacks.size > 0) {
      console.log(`Emitting ${event} to ${callbacks.size} listeners`);
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
export type { LocationUpdateData, LiveTrackingUpdate };

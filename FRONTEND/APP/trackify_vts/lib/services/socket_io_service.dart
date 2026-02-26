import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:shared_preferences/shared_preferences.dart';
import '../core/core.dart';

typedef FrameUpdateCallback = void Function(dynamic data);
typedef ConnectionStateCallback = void Function(bool isConnected);

class SocketIOService {
  static final SocketIOService _instance = SocketIOService._internal();
  IO.Socket? socket;
  bool _isConnected = false;
  bool _isDisposed = false;
  String? _filterVehicleId;
  String? _filterTripId;
  final List<FrameUpdateCallback> _frameUpdateListeners = [];
  final List<ConnectionStateCallback> _connectionStateListeners = [];
  SocketIOService._internal();

  factory SocketIOService() {
    return _instance;
  }

  bool get isConnected => _isConnected;

  void addFrameUpdateListener(FrameUpdateCallback callback) {
    if (!_frameUpdateListeners.contains(callback)) {
      _frameUpdateListeners.add(callback);
      print(
        '[SocketIO] ✅ Frame listener added (total: ${_frameUpdateListeners.length})',
      );
    }
  }

  void removeFrameUpdateListener(FrameUpdateCallback callback) {
    _frameUpdateListeners.remove(callback);
    print(
      '[SocketIO] ❌ Frame listener removed (total: ${_frameUpdateListeners.length})',
    );
  }

  void addConnectionStateListener(ConnectionStateCallback callback) {
    if (!_connectionStateListeners.contains(callback)) {
      _connectionStateListeners.add(callback);
      callback(_isConnected);
      print(
        '[SocketIO] ✅ Connection state listener added (total: ${_connectionStateListeners.length})',
      );
    }
  }

  void removeConnectionStateListener(ConnectionStateCallback callback) {
    _connectionStateListeners.remove(callback);
    print(
      '[SocketIO] ❌ Connection state listener removed (total: ${_connectionStateListeners.length})',
    );
  }

  void _notifyFrameUpdateListeners(dynamic data) {
    for (final listener in _frameUpdateListeners) {
      try {
        listener(data);
      } catch (e) {
        print('[SocketIO] ⚠️ Error in frame update listener: $e');
      }
    }
  }

  void _notifyConnectionStateListeners(bool isConnected) {
    for (final listener in _connectionStateListeners) {
      try {
        listener(isConnected);
      } catch (e) {
        print('[SocketIO] ⚠️ Error in connection state listener: $e');
      }
    }
  }

  void setVehicleFilter(String vehicleId) {
    _filterVehicleId = vehicleId;
    print('═══════════════════════════════════════════════════════════');
    print('[SocketIO] 🔍 FILTER SET - Vehicle ID: $vehicleId');
    print('═══════════════════════════════════════════════════════════');

    if (_isConnected && socket != null) {
      socket?.emit("subscribe_live_tracking", {"vehicle_id": vehicleId});
      print('[SocketIO] ✅ Re-subscribed to vehicle: $vehicleId');
    }
  }

  void setTripFilter(String tripId) {
    _filterTripId = tripId;
    print('═══════════════════════════════════════════════════════════');
    print('[SocketIO] 🚀 TRIP FILTER SET - Trip ID: $tripId');
    print('═══════════════════════════════════════════════════════════');

    if (_isConnected && socket != null) {
      socket?.emit("subscribe_trip", {"tripId": tripId});
      print('[SocketIO] ✅ Subscribed to trip room: $tripId');
    }
  }

  void clearTripFilter() {
    if (_filterTripId != null && _isConnected && socket != null) {
      socket?.emit("unsubscribe_trip", {"tripId": _filterTripId});
    }
    _filterTripId = null;
    print('═══════════════════════════════════════════════════════════');
    print('[SocketIO] 🔄 TRIP FILTER CLEARED');
    print('═══════════════════════════════════════════════════════════');
  }

  void clearVehicleFilter() {
    _filterVehicleId = null;
    print('═══════════════════════════════════════════════════════════');
    print('[SocketIO] 🔄 FILTER CLEARED - Showing all frames');
    print('═══════════════════════════════════════════════════════════');
  }

  Future<void> initialize({String? authToken}) async {
    try {
      print('🔌 Attempting Socket.IO connection...');
      String? token = authToken;
      if (token == null || token.isEmpty) {
        token = await _getAuthToken();
      }

      if (token.isEmpty) {
        print('[SocketIO] ❌ NO AUTH TOKEN - Socket.IO initialization failed');
        return;
      }
      _connectSocket(token);
    } catch (e, stackTrace) {
      print('[SocketIO] ❌ INITIALIZATION ERROR');
      print('[SocketIO] Error: $e');
      print('[SocketIO] StackTrace: $stackTrace');
    }
  }

  Future<String> _getAuthToken() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString('token') ?? '';
    } catch (e) {
      return '';
    }
  }

  void _connectSocket(String authToken) {
    print('🔌 Attempting Socket.IO connection...');

    _disconnectSocket();

    Future.delayed(const Duration(milliseconds: 200), () {
      if (_isDisposed) return;

      print('🔌 Creating new Socket.IO instance...');
      socket = IO.io(
        trackify_vts.socketUrl,
        IO.OptionBuilder()
            .setTransports(['websocket'])
            .setPath('/socket.io')
            .enableReconnection()
            .setReconnectionDelay(2000)
            .setReconnectionAttempts(20)
            .setTimeout(8000)
            .setAuth({'token': authToken})
            .setExtraHeaders({'Authorization': 'Bearer $authToken'})
            .disableAutoConnect()
            .build(),
      );

      print('🔌 Connecting socket...');
      socket?.connect();

      print('🔌 Socket instance created, registering listeners...');
      _setupSocketListeners();
    });
  }

  void _disconnectSocket() {
    if (socket == null) return;
    try {
      print('🔌 Cleaning up existing socket...');
      socket?.clearListeners();
      if (socket?.connected ?? false) {
        print('🔌 Disconnecting socket...');
        socket?.disconnect();
      }
      socket?.dispose();
    } catch (e) {
      print('[SocketIO] Error disconnecting: $e');
    }
  }

  void _setupSocketListeners() {
    if (_isDisposed || socket == null) return;

    socket!.onConnect((_) {
      print('✅ Socket.IO connected successfully!');
      _isConnected = true;
      _notifyConnectionStateListeners(true);
      socket?.emit("join_admin");
      socket?.emit("subscribe_live_tracking", {"vehicle_id": _filterVehicleId});
      if (_filterTripId != null) {
        socket?.emit("subscribe_trip", {"tripId": _filterTripId});
        print('[SocketIO] ✅ Restored trip subscription: $_filterTripId');
      }
    });

    socket!.onConnectError((e) {
      print('❌ Socket.IO connection error: $e');
      _isConnected = false;
      _notifyConnectionStateListeners(false);
    });

    socket!.onError((e) {
      print('❌ Socket.IO error: $e');
      _isConnected = false;
      _notifyConnectionStateListeners(false);
    });

    socket!.onDisconnect((reason) {
      print('⚠️ Socket.IO disconnected: $reason');
      _isConnected = false;
      _notifyConnectionStateListeners(false);
    });

    socket!.onAny((event, payload) {
      print('═══════════════════════════════════════════════════════════');
      print('🔌 ALL FRAMES - Event: $event');

      // Handle wrapped payload structure
      dynamic data = payload;
      if (payload is Map && payload.containsKey('data')) {
        data = payload['data'];
        print('📦 Wrapped Data Extracted');
      }

      print('📦 Data: $data');
      print('═══════════════════════════════════════════════════════════');

      if (_filterVehicleId != null || _filterTripId != null) {
        _checkAndPrintMatchedFrame(event, data);
      }
    });

    // Handle new trip updation event (Live Tracking)
    socket!.on('trp_updation', (payload) {
      final data = _unwrapData(payload, 'trp_updation');
      _handleFrameData(data);
      _updateVehicleLocation(data);
      _notifyFrameUpdateListeners(data);
    });

    socket!.on('live_tracking_update', (payload) {
      final data = _unwrapData(payload, 'live_tracking_update');
      _handleFrameData(data);
      _updateVehicleLocation(data);
      _notifyFrameUpdateListeners(data);
    });

    socket!.on("frame", (payload) {
      final data = _unwrapData(payload, 'frame');
      _handleFrameData(data);
      _updateVehicleLocation(data);
      _notifyFrameUpdateListeners(data);
    });

    socket!.on('frames', (payload) {
      final data = _unwrapData(payload, 'frames');
      print('[SocketIO] Received "frames" event (plural)');
      _handleFrameData(data);
      if (data is List) {
        for (var frame in data) {
          _updateVehicleLocation(frame);
          _notifyFrameUpdateListeners(frame);
        }
      } else {
        _updateVehicleLocation(data);
        _notifyFrameUpdateListeners(data);
      }
    });

    socket!.on('vehicle_data', (payload) {
      final data = _unwrapData(payload, 'vehicle_data');
      print('[SocketIO] Received "vehicle_data" event');
      _handleFrameData(data);
      _updateVehicleLocation(data);
      _notifyFrameUpdateListeners(data);
    });

    socket!.on('tracking_data', (payload) {
      final data = _unwrapData(payload, 'tracking_data');
      print('[SocketIO] Received "tracking_data" event');
      _handleFrameData(data);
      _updateVehicleLocation(data);
      _notifyFrameUpdateListeners(data);
    });

    socket!.on('vehicle_location_update', (payload) {
      final data = _unwrapData(payload, 'vehicle_location_update');
      print('[SocketIO] Received "vehicle_location_update" event');
      _handleFrameData(data);
      _updateVehicleLocation(data);
      _notifyFrameUpdateListeners(data);
    });

    socket!.on('trip_started', (payload) {
      final data = _unwrapData(payload, 'trip_started');
      print('═══════════════════════════════════════════════════════════');
      print('🚀 TRIP STARTED FRAME RECEIVED');
      print('📦 Data: $data');
      print('═══════════════════════════════════════════════════════════');

      _notifyFrameUpdateListeners(data);
    });

    socket!.on('trip_ended', (payload) {
      final data = _unwrapData(payload, 'trip_ended');
      print('═══════════════════════════════════════════════════════════');
      print('🏁 TRIP ENDED FRAME RECEIVED');
      print('📦 Data: $data');
      print('═══════════════════════════════════════════════════════════');

      _notifyFrameUpdateListeners(data);
    });

    socket!.on('stop_arrived', (payload) {
      final data = _unwrapData(payload, 'stop_arrived');
      print('═══════════════════════════════════════════════════════════');
      print('📍 STOP ARRIVED FRAME RECEIVED');
      print('📦 Data: $data');
      print('═══════════════════════════════════════════════════════════');

      _notifyFrameUpdateListeners(data);
    });

    socket!.on('stop_departed', (payload) {
      final data = _unwrapData(payload, 'stop_departed');
      print('═══════════════════════════════════════════════════════════');
      print('↗️ STOP DEPARTED FRAME RECEIVED');
      print('📦 Data: $data');
      print('═══════════════════════════════════════════════════════════');

      _notifyFrameUpdateListeners(data);
    });

    // New Trip Progress Events
    socket!.on('source_reached', (payload) {
      final data = _unwrapData(payload, 'source_reached');
      _notifyFrameUpdateListeners(data);
    });

    socket!.on('destination_reached', (payload) {
      final data = _unwrapData(payload, 'destination_reached');
      _notifyFrameUpdateListeners(data);
    });

    socket!.on('stop_status_update', (payload) {
      final data = _unwrapData(payload, 'stop_status_update');
      _notifyFrameUpdateListeners(data);
    });

    socket!.on('trip_status_update', (payload) {
      final data = _unwrapData(payload, 'trip_status_update');
      _notifyFrameUpdateListeners(data);
    });
  }

  // Helper to extract data from the {event, data} wrapper sent by backend
  dynamic _unwrapData(dynamic payload, String defaultType) {
    if (payload is Map && payload.containsKey('data')) {
      var data = payload['data'];
      // Ensure data has a type for consumers that rely on it
      if (data is Map && !data.containsKey('type')) {
        data['type'] = payload['event'] ?? defaultType;
      }
      return data;
    }
    return payload;
  }

  void _checkAndPrintMatchedFrame(String event, dynamic data) {
    try {
      if (data is Map) {
        final vehicleId =
            data['vehicleId'] ??
            data['vehicle_id'] ??
            data['id'] ??
            data['vehicle'] ??
            data['vehicleNumber'];
        final tripId =
            data['tripId'] ?? data['trip_id'] ?? data['scheduled_trip_id'];

        bool matched = false;
        if (_filterVehicleId != null && vehicleId == _filterVehicleId)
          matched = true;
        if (_filterTripId != null && tripId == _filterTripId) matched = true;

        if (matched) {
          print(
            '╔═══════════════════════════════════════════════════════════╗',
          );
          print('║                  ✅ MATCHED FRAME                         ║');
          print(
            '╚═══════════════════════════════════════════════════════════╝',
          );
          print(
            '🔍 Event: $event | Vehicle Filter: $_filterVehicleId | Trip Filter: $_filterTripId',
          );
          print('📦 Data: $data');
          print('═══════════════════════════════════════════════════════════');
        }
      } else if (data is List) {
        final matchedItems = data.where((item) {
          if (item is Map) {
            final vehicleId =
                item['vehicleId'] ??
                item['vehicle_id'] ??
                item['id'] ??
                item['vehicle'] ??
                item['vehicleNumber'];
            final tripId =
                item['tripId'] ?? item['trip_id'] ?? item['scheduled_trip_id'];

            if (_filterVehicleId != null && vehicleId == _filterVehicleId)
              return true;
            if (_filterTripId != null && tripId == _filterTripId) return true;
          }
          return false;
        }).toList();

        if (matchedItems.isNotEmpty) {
          print(
            '╔═══════════════════════════════════════════════════════════╗',
          );
          print(
            '║          ✅ MATCHED ${matchedItems.length} FRAME(S)                        ║',
          );
          print(
            '╚═══════════════════════════════════════════════════════════╝',
          );
          print('🔍 Event: $event | Vehicle ID: $_filterVehicleId');
          for (var item in matchedItems) {
            print('📦 Data: $item');
          }
          print('═══════════════════════════════════════════════════════════');
        }
      }
    } catch (e, stackTrace) {
      print('[SocketIO] ❌ Error checking matched frame: $e');
      print('[SocketIO] StackTrace: $stackTrace');
    }
  }

  void _handleFrameData(dynamic data) {
    try {
      print('╔═══════════════════════════════════════════════════════════╗');
      print('║                    📨 FRAME RECEIVED                      ║');
      print('╚═══════════════════════════════════════════════════════════╝');
      print('[SocketIO] Raw Data: $data');
      print('[SocketIO] Data Type: ${data.runtimeType}');

      if (data is Map) {
        print('┌─ FRAME CONTENTS ─────────────────────────────────────────┐');
        data.forEach((key, value) {
          print('[SocketIO]   ├─ $key: $value');
        });
        print('└─────────────────────────────────────────────────────────┘');

        final vehicleId =
            data['vehicleId'] ??
            data['vehicle_id'] ??
            data['id'] ??
            data['vehicle'] ??
            data['vehicleNumber'];
        if (vehicleId != null) {
          print(
            '╔═══════════════════════════════════════════════════════════╗',
          );
          print('[SocketIO] ✅ FRAME BY VEHICLE ID: $vehicleId');
          print(
            '╚═══════════════════════════════════════════════════════════╝',
          );
          print('[SocketIO] Complete Frame Data:');
          print(data.toString());
        }
      } else if (data is List) {
        print('[SocketIO] Frame is a list with ${data.length} items');
        for (int i = 0; i < data.length; i++) {
          print(
            '┌─ ITEM $i ─────────────────────────────────────────────────┐',
          );
          print('[SocketIO] ${data[i]}');
          print('└─────────────────────────────────────────────────────────┘');

          if (data[i] is Map) {
            final vehicleId =
                data[i]['vehicleId'] ??
                data[i]['vehicle_id'] ??
                data[i]['id'] ??
                data[i]['vehicle'] ??
                data[i]['vehicleNumber'];
            if (vehicleId != null) {
              print(
                '╔═══════════════════════════════════════════════════════════╗',
              );
              print('[SocketIO] ✅ FRAME[$i] BY VEHICLE ID: $vehicleId');
              print(
                '╚═══════════════════════════════════════════════════════════╝',
              );
              print('[SocketIO] Frame Data: ${data[i]}');
            }
          }
        }
      } else {
        print('[SocketIO] Frame Data (String): $data');
      }
      print('═══════════════════════════════════════════════════════════');
    } catch (e, stackTrace) {
      print('[SocketIO] ❌ Error handling frame data: $e');
      print('[SocketIO] StackTrace: $stackTrace');
    }
  }

  void _updateVehicleLocation(dynamic data) {
    try {
      if (data is! Map) return;

      final vehicleId =
          data['vehicleId'] ??
          data['vehicle_id'] ??
          data['id'] ??
          data['vehicle'] ??
          data['vehicleNumber'];
      final latitude = data['latitude'];
      final longitude = data['longitude'];
      final heading = data['heading'];

      if (vehicleId == null || latitude == null || longitude == null) {
        return;
      }

      if (_filterVehicleId != null && vehicleId != _filterVehicleId) {
        return;
      }

      print('═══════════════════════════════════════════════════════════');
      print('[SocketIO] 📍 VEHICLE LOCATION UPDATE');
      print('[SocketIO] Vehicle: $vehicleId');
      print('[SocketIO] Location: Lat=$latitude, Lng=$longitude');
      if (heading != null) print('[SocketIO] Heading: $heading');
      print('═══════════════════════════════════════════════════════════');
    } catch (e, stackTrace) {
      print('[SocketIO] ❌ Error updating vehicle location: $e');
      print('[SocketIO] StackTrace: $stackTrace');
    }
  }

  void filterFramesByVehicleId(String vehicleId, dynamic frameData) {
    try {
      print('╔═══════════════════════════════════════════════════════════╗');
      print('[SocketIO] 🔍 FILTERING FRAMES BY VEHICLE ID: $vehicleId');
      print('╚═══════════════════════════════════════════════════════════╝');

      if (frameData is Map) {
        if (frameData['vehicleId'] == vehicleId ||
            frameData['vehicle_id'] == vehicleId ||
            frameData['id'] == vehicleId) {
          print('[SocketIO] ✓ MATCHED VEHICLE ID: $vehicleId');
          print('[SocketIO] Frame: $frameData');
        }
      } else if (frameData is List) {
        final matchedFrames = frameData.where((frame) {
          if (frame is Map) {
            return frame['vehicleId'] == vehicleId ||
                frame['vehicle_id'] == vehicleId ||
                frame['id'] == vehicleId;
          }
          return false;
        }).toList();

        if (matchedFrames.isNotEmpty) {
          print(
            '[SocketIO] ✓ FOUND ${matchedFrames.length} FRAMES FOR VEHICLE: $vehicleId',
          );
          for (var frame in matchedFrames) {
            print('[SocketIO] Frame: $frame');
          }
        } else {
          print('[SocketIO] ✗ No frames found for vehicle: $vehicleId');
        }
      }
      print('═══════════════════════════════════════════════════════════');
    } catch (e, stackTrace) {
      print('[SocketIO] Error filtering frames: $e');
      print('[SocketIO] StackTrace: $stackTrace');
    }
  }

  void testConnection() {
    print('═══════════════════════════════════════════════════════════');
    print('[SocketIO] 🧪 CONNECTION TEST');
    print(
      '[SocketIO] Status: ${_isConnected ? '✅ CONNECTED' : '❌ DISCONNECTED'}',
    );
    print('[SocketIO] Socket ID: ${socket?.id ?? "N/A"}');
    print('[SocketIO] Server: ${trackify_vts.socketUrl}');
    print('═══════════════════════════════════════════════════════════');
  }

  void emitTestFrame(String vehicleId) {
    try {
      if (!_isConnected || socket == null) {
        print('[SocketIO] ❌ Not connected. Cannot emit test frame.');
        return;
      }

      final testFrame = {
        'vehicleId': vehicleId,
        'timestamp': DateTime.now().toIso8601String(),
        'latitude': 40.7128,
        'longitude': -74.0060,
        'speed': 45.5,
        'heading': 180,
        'status': 'active',
        'test': true,
      };

      print('═══════════════════════════════════════════════════════════');
      print('[SocketIO] 🧪 EMITTING TEST FRAME FOR VEHICLE: $vehicleId');
      print('[SocketIO] Frame: $testFrame');
      print('═══════════════════════════════════════════════════════════');

      socket?.emit('frame', testFrame);
    } catch (e) {
      print('[SocketIO] ❌ Error emitting test frame: $e');
    }
  }

  Future<void> reconnect({String? authToken}) async {
    print('[SocketIO] 🔄 Manual reconnect requested');
    final token = authToken ?? await _getAuthToken();
    if (token.isEmpty) {
      print('[SocketIO] ❌ NO AUTH TOKEN - Cannot reconnect');
      return;
    }
    _connectSocket(token);
  }

  void disconnect() {
    print('[SocketIO] 🔌 Disconnecting socket...');
    _disconnectSocket();
    _isConnected = false;
    _isDisposed = false;
  }

  void dispose() {
    print('[SocketIO] 🗑️ Disposing socket service...');
    _isDisposed = true;
    _disconnectSocket();
  }
}

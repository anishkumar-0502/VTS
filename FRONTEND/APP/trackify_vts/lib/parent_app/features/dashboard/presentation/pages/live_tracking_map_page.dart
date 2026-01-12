import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../../core/core.dart';
import '../../../profile/domain/models/parent_profile_model.dart';

class LiveTrackingMapPage extends StatefulWidget {
  final TrackChild trackChildData;

  const LiveTrackingMapPage({
    super.key,
    required this.trackChildData,
  });

  @override
  State<LiveTrackingMapPage> createState() => _LiveTrackingMapPageState();
}

class _LiveTrackingMapPageState extends State<LiveTrackingMapPage> {
  IO.Socket? socket;
  late MapController mapController;
  LatLng? currentChildLocation;
  bool _isDisposed = false;
  bool _isConnected = false;
  bool _userHasZoomed = false;
  DateTime? _lastUserInteraction;

  @override
  void initState() {
    super.initState();
    _isConnected = false;
    mapController = MapController();
    _extractInitialLocation();
    _loadTokenAndConnect();
  }

  void _extractInitialLocation() {
    if (widget.trackChildData.location.latitude != 0.0 &&
        widget.trackChildData.location.longitude != 0.0) {
      currentChildLocation = LatLng(
        widget.trackChildData.location.latitude,
        widget.trackChildData.location.longitude,
      );

      // Center map on initial location
      if (!_userHasZoomed) {
        mapController.move(currentChildLocation!, 15.0);
      }
    }
  }

  Future<void> _loadTokenAndConnect() async {
    final authToken = await _getAuthToken();
    _connectSocket(authToken);
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
    debugPrint('🔌 Attempting Socket.IO connection for child tracking...');

    _disconnectSocket();

    Future.delayed(const Duration(milliseconds: 200), () {
      if (_isDisposed) return;

      debugPrint('🔌 Creating new Socket.IO instance...');
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

      debugPrint('🔌 Connecting socket...');
      socket?.connect();

      debugPrint('🔌 Socket instance created, registering listeners...');
      _setupSocketListeners();
    });
  }

  void _disconnectSocket() {
    if (socket != null) {
      debugPrint('🔌 Cleaning up existing socket...');
      socket?.clearListeners();
      if (socket?.connected ?? false) {
        debugPrint('🔌 Disconnecting socket...');
        socket?.disconnect();
      }
      socket?.dispose();
      socket = null;
    }
  }

  void _setupSocketListeners() {
    if (socket == null || _isDisposed) return;

    socket?.onConnect((_) {
      debugPrint('✅ Socket.IO connected successfully!');
      if (!_isDisposed) setState(() => _isConnected = true);
      socket?.emit("join_parent");
      socket?.emit("subscribe_child_tracking", {
        "child_id": widget.trackChildData.child.name, // Using child name as identifier
      });
    });

    socket?.onConnectError((e) {
      debugPrint('❌ Socket.IO connection error: $e');
      if (!_isDisposed) setState(() => _isConnected = false);
    });

    socket?.onError((e) {
      debugPrint('❌ Socket.IO error: $e');
      if (!_isDisposed) setState(() => _isConnected = false);
    });

    socket?.onDisconnect((reason) {
      debugPrint('⚠️ Socket.IO disconnected: $reason');
      if (!_isDisposed) setState(() => _isConnected = false);
    });

    socket?.on("child_location_update", (data) {
      if (data is Map &&
          data["child_id"] == widget.trackChildData.child.name) {
        LatLng? newLocation;
        if (data["latitude"] != null && data["longitude"] != null) {
          newLocation = LatLng(
            double.parse(data["latitude"].toString()),
            double.parse(data["longitude"].toString()),
          );
        }

        if (!_isDisposed) setState(() {
          currentChildLocation = newLocation;
        });

        if (newLocation != null) {
          bool shouldAutoZoom = !_userHasZoomed ||
              (_lastUserInteraction != null &&
                  DateTime.now().difference(_lastUserInteraction!).inSeconds > 30);

          if (shouldAutoZoom) {
            mapController.move(newLocation, 15.0);
            _userHasZoomed = false;
          }
        }
      }
    });
  }

  @override
  void dispose() {
    debugPrint('🧹 Cleaning up LiveTrackingMapPage...');
    _isDisposed = true;
    _disconnectSocket();
    currentChildLocation = null;
    _isConnected = false;
    _userHasZoomed = false;
    _lastUserInteraction = null;
    mapController.dispose();
    debugPrint('🧹 LiveTrackingMapPage cleanup complete');
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final Color primaryColor = Theme.of(context).colorScheme.primary;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: primaryColor,
        title: Text(
          "Live Tracking - ${widget.trackChildData.child.name}",
          style: const TextStyle(color: Colors.white),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          // Connection indicator
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: _isConnected ? Colors.green : Colors.red,
              shape: BoxShape.circle,
            ),
            child: Icon(
              _isConnected ? Icons.wifi : Icons.wifi_off,
              color: Colors.white,
              size: 16,
            ),
          ),
        ],
      ),
      body: FlutterMap(
        mapController: mapController,
        options: MapOptions(
          initialCenter: currentChildLocation ?? const LatLng(20.0, 78.0),
          initialZoom: 15,
          onPositionChanged: (position, hasGesture) {
            if (hasGesture) {
              _userHasZoomed = true;
              _lastUserInteraction = DateTime.now();
            }
          },
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            subdomains: const ['a', 'b', 'c'],
            userAgentPackageName: 'com.trackify.parent',
          ),
          MarkerLayer(
            markers: [
              if (currentChildLocation != null)
                Marker(
                  width: 40,
                  height: 40,
                  point: currentChildLocation!,
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: primaryColor,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                      boxShadow: [
                        BoxShadow(
                          color: primaryColor.withOpacity(0.5),
                          blurRadius: 8,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: const Icon(Icons.child_care, color: Colors.white, size: 18),
                  ),
                ),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'zoom_in',
        mini: true,
        backgroundColor: primaryColor,
        onPressed: () {
          final center = currentChildLocation ?? mapController.camera.center;
          final newZoom = mapController.camera.zoom + 1;
          mapController.move(center, newZoom);
        },
        child: Image.asset(
          'assets/icons/zoom-in.png',
          width: 20,
          height: 20,
          color: Colors.white,
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      persistentFooterButtons: [
        Row(
          children: [
            Expanded(
              child: FloatingActionButton(
                heroTag: 'zoom_out',
                mini: true,
                backgroundColor: primaryColor,
                onPressed: () {
                  final center = currentChildLocation ?? mapController.camera.center;
                  final newZoom = mapController.camera.zoom - 1;
                  mapController.move(center, newZoom);
                },
                child: Image.asset(
                  'assets/icons/zoom-out.png',
                  width: 20,
                  height: 20,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
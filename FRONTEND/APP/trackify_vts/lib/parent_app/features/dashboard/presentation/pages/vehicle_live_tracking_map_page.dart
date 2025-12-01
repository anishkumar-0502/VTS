import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:get/get.dart';

import '../../../../../core/core.dart';
import '../../../../../services/open_route_service.dart';
import '../../../../Sessionhandler/session_controller.dart';
import '../../../profile/domain/models/parent_profile_model.dart';
import '../../domain/models/trip_details_models.dart' as trip_models;
import '../../domain/repositories/trip_details_repository.dart';

class VehicleLiveTrackingMapPage extends StatelessWidget {
  final CurrentTrip tripData;

  const VehicleLiveTrackingMapPage({
    super.key,
    required this.tripData,
  });

  @override
  Widget build(BuildContext context) {
    final sessionController = Get.find<SessionController>();
    final Color primaryColor = Theme.of(context).colorScheme.primary;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: primaryColor,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Live Tracking",
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              tripData.vehicle.vehicleNumber,
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
      body: FutureBuilder<trip_models.TripDetailsResponse>(
        future: TripDetailsRepository().getTripDetails(
          sessionController.token.value,
          tripData.tripId,
        ),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError || !snapshot.hasData || snapshot.data!.error) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(
                    snapshot.data?.message ?? 'Failed to load trip details',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 16),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => Get.back(),
                    child: const Text('Go Back'),
                  ),
                ],
              ),
            );
          }

          final tripDetails = snapshot.data!.data!.trip;
          return VehicleTrackingMap(
            tripDetails: tripDetails,
            primaryColor: primaryColor,
          );
        },
      ),
    );
  }
}

class VehicleTrackingMap extends StatefulWidget {
  final trip_models.DetailedTrip tripDetails;
  final Color primaryColor;

  const VehicleTrackingMap({
    super.key,
    required this.tripDetails,
    required this.primaryColor,
  });

  @override
  State<VehicleTrackingMap> createState() => _VehicleTrackingMapState();
}

class _VehicleTrackingMapState extends State<VehicleTrackingMap> {
  IO.Socket? socket;
  late MapController mapController;
  LatLng? currentVehicleLocation;
  bool _isDisposed = false;
  bool _isConnected = false;
  bool _userHasZoomed = false;
  DateTime? _lastUserInteraction;
  List<LatLng> routePolyline = [];
  bool _isLoadingRoute = false;

  @override
  void initState() {
    super.initState();
    _isConnected = false;
    mapController = MapController();
    _extractInitialLocation();
    _loadRoute();
    _loadTokenAndConnect();
  }

  void _extractInitialLocation() {
    // Use vehicle's current latitude/longitude from trip data
    if (widget.tripDetails.vehicleId.latitude != 0.0 &&
        widget.tripDetails.vehicleId.longitude != 0.0) {
      currentVehicleLocation = LatLng(
        widget.tripDetails.vehicleId.latitude,
        widget.tripDetails.vehicleId.longitude,
      );
    }
  }

  Future<void> _loadRoute() async {
    if (_isDisposed) return;

    setState(() => _isLoadingRoute = true);

    try {
      final routeService = OpenRouteService(trackify_vts.openRouteServiceApiKey);

      // Create route points: start -> route points -> end
      final routePoints = <LatLng>[];

      // Add start location
      routePoints.add(LatLng(
        widget.tripDetails.startLocation.latitude,
        widget.tripDetails.startLocation.longitude,
      ));

      // Add route points
      for (final point in widget.tripDetails.routePoints) {
        routePoints.add(LatLng(point.latitude, point.longitude));
      }

      // Add end location
      routePoints.add(LatLng(
        widget.tripDetails.endLocation.latitude,
        widget.tripDetails.endLocation.longitude,
      ));

      if (routePoints.length >= 2) {
        routePolyline = await routeService.getRouteThrough(routePoints);
      }

      // Fit map to show entire route
      if (routePolyline.isNotEmpty && !_userHasZoomed) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!_isDisposed) {
            final bounds = LatLngBounds.fromPoints(routePolyline);
            mapController.fitCamera(
              CameraFit.bounds(bounds: bounds, padding: const EdgeInsets.all(50)),
            );
          }
        });
      }
    } catch (e) {
      print('Error loading route: $e');
      // Fallback to straight line
      routePolyline = [
        LatLng(widget.tripDetails.startLocation.latitude, widget.tripDetails.startLocation.longitude),
        LatLng(widget.tripDetails.endLocation.latitude, widget.tripDetails.endLocation.longitude),
      ];
    }

    if (!_isDisposed) {
      setState(() => _isLoadingRoute = false);
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
    print('🔌 Attempting Socket.IO connection for vehicle tracking...');

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
    if (socket != null) {
      print('🔌 Cleaning up existing socket...');
      socket?.clearListeners();
      if (socket?.connected ?? false) {
        print('🔌 Disconnecting socket...');
        socket?.disconnect();
      }
      socket?.dispose();
      socket = null;
    }
  }

  void _setupSocketListeners() {
    if (socket == null || _isDisposed) return;

    socket?.onConnect((_) {
      print('✅ Socket.IO connected successfully!');
      if (!_isDisposed) setState(() => _isConnected = true);
      socket?.emit("join_parent");
      socket?.emit("subscribe_live_tracking", {});
    });

    socket?.onConnectError((e) {
      print('❌ Socket.IO connection error: $e');
      if (!_isDisposed) setState(() => _isConnected = false);
    });

    socket?.onError((e) {
      print('❌ Socket.IO error: $e');
      if (!_isDisposed) setState(() => _isConnected = false);
    });

    socket?.onDisconnect((reason) {
      print('⚠️ Socket.IO disconnected: $reason');
      if (!_isDisposed) setState(() => _isConnected = false);
    });

    socket?.on("live_tracking_update", (data) {
      if (data is Map && data["vehicleId"] == widget.tripDetails.vehicleId.vehicleId) {
        LatLng? newLocation;
        if (data["latitude"] != null && data["longitude"] != null) {
          final lat = double.tryParse(data["latitude"].toString());
          final lng = double.tryParse(data["longitude"].toString());
          if (lat != null && lng != null) {
            newLocation = LatLng(lat, lng);
          }
        }

        if (!_isDisposed) {
          setState(() {
            currentVehicleLocation = newLocation;
          });
        }

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
    print('🧹 Cleaning up VehicleTrackingMap...');
    _isDisposed = true;
    _disconnectSocket();
    currentVehicleLocation = null;
    _isConnected = false;
    _userHasZoomed = false;
    _lastUserInteraction = null;
    mapController.dispose();
    print('🧹 VehicleTrackingMap cleanup complete');
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        FlutterMap(
          mapController: mapController,
          options: MapOptions(
            initialCenter: currentVehicleLocation ??
                LatLng(widget.tripDetails.startLocation.latitude, widget.tripDetails.startLocation.longitude),
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
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            ),
            if (routePolyline.isNotEmpty)
              PolylineLayer(
                polylines: [
                  Polyline(
                    points: routePolyline,
                    color: widget.primaryColor.withOpacity(0.7),
                    strokeWidth: 4,
                  ),
                ],
              ),
            MarkerLayer(
              markers: [
                // Start location marker
                Marker(
                  width: 40,
                  height: 40,
                  point: LatLng(
                    widget.tripDetails.startLocation.latitude,
                    widget.tripDetails.startLocation.longitude,
                  ),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.green,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                    child: const Icon(Icons.play_arrow, color: Colors.white, size: 18),
                  ),
                ),

                // End location marker
                Marker(
                  width: 40,
                  height: 40,
                  point: LatLng(
                    widget.tripDetails.endLocation.latitude,
                    widget.tripDetails.endLocation.longitude,
                  ),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                    child: const Icon(Icons.stop, color: Colors.white, size: 18),
                  ),
                ),

                // Route points markers
                for (final point in widget.tripDetails.routePoints)
                  Marker(
                    width: 35,
                    height: 35,
                    point: LatLng(point.latitude, point.longitude),
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Colors.orange,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                      child: Text(
                        '${point.order}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),

                // Current vehicle location marker
                if (currentVehicleLocation != null)
                  Marker(
                    width: 40,
                    height: 40,
                    point: currentVehicleLocation!,
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: widget.primaryColor,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                        boxShadow: [
                          BoxShadow(
                            color: widget.primaryColor.withOpacity(0.5),
                            blurRadius: 8,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: Image.asset(
                        "assets/icons/bus.png",
                        color: Colors.white,
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),

        // Loading indicator
        if (_isLoadingRoute)
          Container(
            color: Colors.black.withOpacity(0.3),
            child: const Center(
              child: CircularProgressIndicator(),
            ),
          ),

        // Connection status indicator
        Positioned(
          top: 16,
          right: 16,
          child: Container(
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
        ),

        // Zoom buttons
        Positioned(
          bottom: 80,
          right: 16,
          child: Column(
            children: [
              // ZOOM IN
              GestureDetector(
                onTap: () {
                  final center = currentVehicleLocation ?? mapController.camera.center;
                  mapController.move(center, mapController.camera.zoom + 1);
                },
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: widget.primaryColor,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: const [
                      BoxShadow(
                        blurRadius: 6,
                        color: Colors.black26,
                        offset: Offset(0, 2),
                      )
                    ],
                  ),
                  child: Image.asset(
                    'assets/icons/zoom-in.png',
                    width: 20,
                    height: 20,
                    color: Colors.white,
                  ),
                ),
              ),

              const SizedBox(height: 12),

              // ZOOM OUT
              GestureDetector(
                onTap: () {
                  final center = currentVehicleLocation ?? mapController.camera.center;
                  mapController.move(center, mapController.camera.zoom - 1);
                },
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: widget.primaryColor,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: const [
                      BoxShadow(
                        blurRadius: 6,
                        color: Colors.black26,
                        offset: Offset(0, 2),
                      )
                    ],
                  ),
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
        ),
      ],
    );
  }
}
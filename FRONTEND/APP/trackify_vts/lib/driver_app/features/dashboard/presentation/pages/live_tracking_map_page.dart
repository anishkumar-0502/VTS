import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

import '../../data/api.dart';
import '../../../../../core/core.dart';
import '../../../../../services/open_route_service.dart';
import '../../../../../utilities/widgets/status_banner.dart';

class LiveTrackingMapPage extends StatefulWidget {
  final String? assignedVehicleId;
  final List<dynamic>? routePoints;
  final List<dynamic>? stops;
  final Color? primaryColor;
  final String? tripId;

  const LiveTrackingMapPage({
    super.key,
    this.assignedVehicleId,
    this.routePoints,
    this.stops,
    this.primaryColor,
    this.tripId,
  });

  @override
  State<LiveTrackingMapPage> createState() => _LiveTrackingMapPageState();
}

class _LiveTrackingMapPageState extends State<LiveTrackingMapPage> {
  IO.Socket? socket;
  late MapController mapController;
  late OpenRouteService _routeService;
  LatLng? currentLocation;
  String? currentFrameData;
  String? assignedVehicleId;
  bool _isDisposed = false;
  List<LatLng> routePolyline = [];
  List<({LatLng point, String? label, int? order})> stopsList = [];
  LatLng? startPoint;
  LatLng? endPoint;
  bool _isLoadingRoute = false;
  bool _userHasZoomed = false;
  DateTime? _lastUserInteraction;
  bool _isConnected = false;
  bool _isSosLoading = false;

  final List<String> _sosReasons = [
    'Vehicle breakdown',
    'Accident/Collision',
    'Medical emergency',
    'Out of fuel',
    'Traffic congestion',
    'Weather hazard',
    'Road hazard',
    'Other emergency',
  ];

  @override
  void initState() {
    super.initState();
    _isConnected = false;
    mapController = MapController();
    _routeService = OpenRouteService(trackify_vts.openRouteServiceApiKey);
    assignedVehicleId = widget.assignedVehicleId;
    _extractRouteData();
    _loadTokenAndConnect();
  }

  Future<void> _extractRouteData() async {
    if (widget.routePoints != null && widget.routePoints!.isNotEmpty) {
      final rawPoints = widget.routePoints!
          .map((p) => LatLng(
            p.latitude,
            p.longitude,
          ))
          .toList();

      if (rawPoints.length >= 2) {
        if (!_isDisposed) setState(() => _isLoadingRoute = true);

        try {
          // Get proper road route using OpenRouteService
          routePolyline = await _routeService.getRouteThrough(rawPoints);
        } catch (e) {
          // Fallback to straight line if routing fails
          routePolyline = rawPoints;
        }

        if (!_isDisposed) setState(() => _isLoadingRoute = false);
      } else {
        // If only one point or none, use as-is
        routePolyline = rawPoints;
      }

      if (routePolyline.isNotEmpty) {
        startPoint = routePolyline.first;
        endPoint = routePolyline.last;

        // Fit map bounds to show the entire route
        if (routePolyline.length > 1 && !_userHasZoomed) {
          final bounds = LatLngBounds.fromPoints(routePolyline);
          mapController.fitCamera(
            CameraFit.bounds(bounds: bounds, padding: const EdgeInsets.all(50)),
          );
        }
      }
    }

    if (widget.stops != null && widget.stops!.isNotEmpty) {
      stopsList = widget.stops!
          .map((s) => (
            point: LatLng(
              (s.latitude as num).toDouble(),
              (s.longitude as num).toDouble(),
            ),
            label: s.label as String?,
            order: s.order as int?,
          ))
          .toList();
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
    if (socket != null) {
      print('🔌 Cleaning up existing socket (connected: ${socket?.connected})...');
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
      socket?.emit("join_admin");
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
      if (data is Map && data["vehicleId"] == assignedVehicleId) {
        LatLng? newLocation;
        if (data["latitude"] != null && data["longitude"] != null) {
          newLocation = LatLng(
            double.parse(data["latitude"].toString()),
            double.parse(data["longitude"].toString()),
          );
        }

        if (!_isDisposed) setState(() {
          currentLocation = newLocation;
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

    socket?.on("frame", (data) {
      bool shouldUpdate = false;
      if (data is Map && (data["vehicleId"] == assignedVehicleId || data["vehicleId"] == null)) {
        shouldUpdate = data.containsKey('frame');
      } else if (data is String) {
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        if (!_isDisposed) setState(() {
          if (data is Map && data.containsKey('frame')) {
            currentFrameData = data['frame'];
          } else if (data is String) {
            currentFrameData = data;
          }
        });
      }
    });
  }

  Future<void> _callSos(String reason) async {
    print('🚨 SOS Call initiated');
    print('📍 Trip ID: ${widget.tripId}');
    print('📍 Vehicle ID: ${widget.assignedVehicleId}');
    print('📍 Current Location: ${currentLocation?.latitude}, ${currentLocation?.longitude}');
    print('📝 Reason: $reason');

    if (widget.tripId == null || widget.assignedVehicleId == null || currentLocation == null) {
      showStatusBanner(
        'Missing trip ID, vehicle ID, or location',
        Colors.red,
        Icons.error_outline,
      );
      return;
    }

    if (!_isDisposed) {
      setState(() => _isSosLoading = true);
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';

      print('🔗 Sending SOS to: ${trackify_vts.baseUrl}/driver/sos');
      final response = await http.post(
        Uri.parse('${trackify_vts.baseUrl}/driver/sos'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'trip_id': widget.tripId,
          'vehicle_id': widget.assignedVehicleId,
          'location': {
            'latitude': currentLocation!.latitude,
            'longitude': currentLocation!.longitude,
          },
          'reason': reason,
        }),
      );

      print('✅ Response Status: ${response.statusCode}');

      if (!_isDisposed) {
        if (response.statusCode == 200 || response.statusCode == 201) {
          print('✅ SOS sent successfully!');
          print('📋 Response: ${response.body}');
          showStatusBanner(
            'Emergency SOS sent successfully!',
            Colors.green,
            Icons.check_circle_outline,
          );
        } else {
          print('❌ SOS failed with status: ${response.statusCode}');
          print('📋 Response: ${response.body}');
          final errorData = jsonDecode(response.body);
          throw Exception(errorData['message'] ?? 'Failed to send SOS');
        }
      }
    } catch (e) {
      print('❌ SOS Error: ${e.toString()}');
      if (!_isDisposed) {
        showStatusBanner(
          'Error sending SOS: ${e.toString()}',
          Colors.red,
          Icons.warning_amber_rounded,
        );
      }
    } finally {
      if (!_isDisposed) {
        setState(() => _isSosLoading = false);
      }
    }
  }

  void _showSosReasonDialog() {
    String? selectedReason;

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          backgroundColor: Colors.white,
          child: StatefulBuilder(
            builder: (context, setState) {
              return Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    /// ---------- HEADER ----------
                    Row(
                      children: [

                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Emergency SOS',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Colors.red.shade700,
                              ),
                            ),
                            Text(
                              'Select emergency reason',
                              style: TextStyle(color: Colors.grey.shade600),
                            ),
                          ],
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    /// ---------- DROPDOWN ----------
                    DropdownButtonFormField<String>(
                      decoration: InputDecoration(
                        labelText: "Select reason",
                        labelStyle: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: Colors.black,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Colors.grey.shade400),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Colors.red.shade700, width: 1.4),
                        ),
                        contentPadding:
                        const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                      ),
                      icon: Icon(Icons.arrow_drop_down, color: Colors.red.shade700),
                      value: selectedReason,
                      items: _sosReasons
                          .map(
                            (reason) => DropdownMenuItem(
                          value: reason,
                          child: Text(reason),
                        ),
                      )
                          .toList(),
                      onChanged: (value) {
                        setState(() => selectedReason = value);
                      },
                    ),

                    const SizedBox(height: 28),

                    /// ---------- BUTTONS ----------
                    Row(
                      children: [
                        Expanded(
                          child: TextButton(
                            onPressed: () => Navigator.pop(context),
                            child: const Text(
                              'Cancel',
                              style: TextStyle(
                                color: Colors.blue,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.red.shade700,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            onPressed: selectedReason == null
                                ? null
                                : () {
                              Navigator.pop(context);
                              _callSos(selectedReason!);
                            },
                            child: const Text(
                              'Send SOS',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }


  @override
  void dispose() {
    print('🧹 Cleaning up LiveTrackingMapPage...');
    _isDisposed = true;
    _disconnectSocket();
    currentLocation = null;
    currentFrameData = null;
    _isConnected = false;
    _userHasZoomed = false;
    _lastUserInteraction = null;
    mapController.dispose();
    print('🧹 LiveTrackingMapPage cleanup complete');
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final Color primaryColor = widget.primaryColor ?? Theme.of(context).colorScheme.primary;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: primaryColor,
        title: const Text("Live Tracking", style: TextStyle(color: Colors.white)),
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
      body: Stack(
        children: [
          FlutterMap(
            mapController: mapController,
            options: MapOptions(
              initialCenter: currentLocation ?? startPoint ?? const LatLng(20.0, 78.0),
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
                      color: primaryColor.withOpacity(0.6),
                      strokeWidth: 4,
                    ),
                  ],
                ),
              MarkerLayer(
                markers: [
                  if (startPoint != null)
                    Marker(
                      width: 36,
                      height: 36,
                      point: startPoint!,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: Colors.green,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: const Icon(Icons.play_arrow, color: Colors.white, size: 16),
                      ),
                    ),
                  if (endPoint != null)
                    Marker(
                      width: 36,
                      height: 36,
                      point: endPoint!,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: const Icon(Icons.stop_circle, color: Colors.white, size: 16),
                      ),
                    ),
                  for (final stop in stopsList)
                    Marker(
                      width: 45,
                      height: 60,
                      point: stop.point,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                            decoration: BoxDecoration(
                              color: Colors.orange,
                              borderRadius: BorderRadius.circular(3),
                            ),
                            child: Text(
                              '${stop.order ?? ''}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Container(
                            padding: const EdgeInsets.all(3),
                            decoration: BoxDecoration(
                              color: Colors.orange,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 1),
                            ),
                            child: const Icon(Icons.location_on, color: Colors.white, size: 12),
                          ),
                        ],
                      ),
                    ),
                  if (currentLocation != null)
                    Marker(
                      width: 40,
                      height: 40,
                      point: currentLocation!,
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
                        child: const Icon(Icons.location_on, color: Colors.white, size: 18),
                      ),
                    ),
                ],
              ),
            ],
          ),
          if (_isLoadingRoute)
            Container(
              color: Colors.black.withOpacity(0.3),
              child: const Center(
                child: CircularProgressIndicator(),
              ),
            ),
          Positioned(
            right: 16,
            bottom: 32,
            child: Column(
              children: [
                if (_isConnected)
                  FloatingActionButton(
                    heroTag: 'sos_button',
                    mini: true,
                    backgroundColor: Colors.red,
                    onPressed: _isSosLoading ? null : _showSosReasonDialog,
                    child: _isSosLoading
                        ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                        : Image.asset(
                      'assets/icons/sos.png',
                      width: 18,
                      height: 18,
                      color: Colors.white,
                    ),
                  ),
                if (_isConnected) const SizedBox(height: 12),
                FloatingActionButton(
                  heroTag: 'zoom_in',
                  mini: true,
                  backgroundColor: primaryColor,
                  onPressed: () {
                    final center = currentLocation ?? mapController.camera.center;
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
                const SizedBox(height: 12),
                FloatingActionButton(
                  heroTag: 'zoom_out',
                  mini: true,
                  backgroundColor: primaryColor,
                  onPressed: () {
                    final center = currentLocation ?? mapController.camera.center;
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
              ],
            ),
          ),
        ],
      ),
    );
  }
}

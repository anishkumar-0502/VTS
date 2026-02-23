import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:math';

import '../../../../../core/core.dart';
import '../../../../../services/socket_io_service.dart';
import '../../../../../services/open_route_service.dart';
import '../../../../../utilities/widgets/status_banner.dart';

class LiveTrackingMapPage extends StatefulWidget {
  final String? assignedVehicleId;
  final List<dynamic>? routePoints;
  final List<dynamic>? stops;
  final Color? primaryColor;
  final String? tripId;
  final dynamic endLocation;

  const LiveTrackingMapPage({
    super.key,
    this.assignedVehicleId,
    this.routePoints,
    this.stops,
    this.primaryColor,
    this.tripId,
    this.endLocation,
  });

  @override
  State<LiveTrackingMapPage> createState() => _LiveTrackingMapPageState();
}

class _LiveTrackingMapPageState extends State<LiveTrackingMapPage>
    with TickerProviderStateMixin {
  late MapController mapController;
  late OpenRouteService _routeService;
  late SocketIOService _socketIOService;
  LatLng? currentLocation;
  String? currentFrameData;
  String? assignedVehicleId;
  bool _isDisposed = false;
  List<LatLng> routePolyline = [];
  List<LatLng> initialRoutePolyline = [];
  List<({LatLng point, String? label, int? order})> stopsList = [];
  LatLng? startPoint;
  LatLng? endPoint;
  bool _isLoadingRoute = false;
  bool _isCalculatingRoute = false;
  bool _userHasZoomed = false;
  DateTime? _lastUserInteraction;
  bool _isConnected = false;
  bool _isSosLoading = false;
  double vehicleHeading = 0.0;
  LatLng? _lastSnappedVehicleLocation;
  LatLng? _snappedEndLocation;
  static const double _minDistanceKmForRouteUpdate = 0.15;
  static const double _minDistanceKmFarOffRoute = 0.5;
  late FrameUpdateCallback _frameUpdateCallback;
  late AnimationController _pulseAnimationController;
  late Animation<double> _pulseAnimation;
  late ConnectionStateCallback _connectionStateCallback;

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
    _socketIOService = SocketIOService();
    assignedVehicleId = widget.assignedVehicleId;
    
    _pulseAnimationController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    )..repeat();
    
    _pulseAnimation = Tween<double>(begin: 1.0, end: 0.4).animate(
      CurvedAnimation(parent: _pulseAnimationController, curve: Curves.easeInOut),
    );
    
    _extractRouteData();
    _setupSocketListener();
    _fitMapToRoute();
  }

  void _fitMapToRoute() {
    Future.delayed(const Duration(milliseconds: 500), () {
      if (!_isDisposed && routePolyline.length > 1) {
        final bounds = LatLngBounds.fromPoints(routePolyline);
        mapController.fitCamera(
          CameraFit.bounds(bounds: bounds, padding: const EdgeInsets.all(100)),
        );
      }
    });
  }

  int _findClosestIndexOnRoute(LatLng location) {
    if (initialRoutePolyline.isEmpty) return 0;
    
    int closestIndex = 0;
    double minDistance = double.infinity;
    
    for (int i = 0; i < initialRoutePolyline.length; i++) {
      final distance = _calculateDistanceKm(location, initialRoutePolyline[i]);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    
    return closestIndex;
  }

  Future<void> _snapAndRecalculateRoute(LatLng vehicleLocation) async {
    if (_isDisposed || _isCalculatingRoute) return;

    if (_lastSnappedVehicleLocation != null &&
        _calculateDistanceKm(vehicleLocation, _lastSnappedVehicleLocation!) <
            _minDistanceKmForRouteUpdate) {
      return;
    }

    if (initialRoutePolyline.isEmpty) {
      return;
    }

    _isCalculatingRoute = true;

    try {
      final snappedVehicle = await _routeService.snapToRoad(vehicleLocation);
      
      final closestIndex = _findClosestIndexOnRoute(snappedVehicle);
      final closestPoint = initialRoutePolyline[closestIndex];
      final distanceOffRoute = _calculateDistanceKm(snappedVehicle, closestPoint);

      if (distanceOffRoute > _minDistanceKmFarOffRoute) {
        if (!_isDisposed) setState(() => _isLoadingRoute = true);

        try {
          LatLng? effectiveEnd = _snappedEndLocation;
          if (effectiveEnd == null && endPoint != null) {
            effectiveEnd = await _routeService.snapToRoad(endPoint!);
            _snappedEndLocation = effectiveEnd;
          }

          if (effectiveEnd != null) {
            final newPolyline = await _routeService.getRouteThrough([
              snappedVehicle,
              effectiveEnd,
            ]);

            final travelledSegment = initialRoutePolyline.sublist(0, closestIndex + 1);

            if (!_isDisposed) {
              setState(() {
                routePolyline = [...travelledSegment, ...newPolyline];
                _lastSnappedVehicleLocation = snappedVehicle;
                _isLoadingRoute = false;
              });
            }

            print('[LiveTrackingMapPage] ✅ Route recalculated (far off): travelled ${travelledSegment.length}');
          } else {
            if (!_isDisposed) setState(() => _isLoadingRoute = false);
          }
        } catch (e) {
          print('[LiveTrackingMapPage] ❌ Route recalculation error: $e');
          if (!_isDisposed) setState(() => _isLoadingRoute = false);
        }
      } else {
        final travelledRoute = initialRoutePolyline.sublist(0, closestIndex + 1);
        final remainingRoute = closestIndex + 1 < initialRoutePolyline.length
            ? initialRoutePolyline.sublist(closestIndex + 1)
            : [];

        if (!_isDisposed) {
          setState(() {
            routePolyline = [...travelledRoute, ...remainingRoute];
            _lastSnappedVehicleLocation = snappedVehicle;
          });
        }

        print('[LiveTrackingMapPage] ✅ Route updated: travelled ${travelledRoute.length}, remaining ${remainingRoute.length}');
      }
    } catch (e) {
      print('[LiveTrackingMapPage] ❌ Route update error: $e');
    } finally {
      _isCalculatingRoute = false;
    }
  }

  void _setupSocketListener() {
    if (assignedVehicleId != null && assignedVehicleId!.isNotEmpty) {
      print('[LiveTrackingMapPage] 🎯 Setting vehicle filter: $assignedVehicleId');
      _socketIOService.setVehicleFilter(assignedVehicleId!);
      
      _connectionStateCallback = (isConnected) {
        if (!_isDisposed) {
          setState(() {
            _isConnected = isConnected;
          });
        }
      };
      _socketIOService.addConnectionStateListener(_connectionStateCallback);
      
      _frameUpdateCallback = (data) {
        if (!_isDisposed && data is Map) {
          final lat = data['latitude'];
          final lng = data['longitude'];
          final heading = data['course'] ?? data['heading'];

          if (lat != null && lng != null) {
            final newLocation = LatLng(
              double.parse(lat.toString()),
              double.parse(lng.toString()),
            );

            if (!_isDisposed) {
              setState(() {
                currentLocation = newLocation;
                if (heading != null) {
                  vehicleHeading = double.parse(heading.toString());
                }
              });
            }

            _snapAndRecalculateRoute(newLocation);

            bool shouldAutoZoom = !_userHasZoomed ||
                (_lastUserInteraction != null &&
                    DateTime.now().difference(_lastUserInteraction!).inSeconds > 30);

            if (shouldAutoZoom && !_isDisposed) {
              mapController.move(newLocation, 15.0);
              _userHasZoomed = false;
            }

            print('[LiveTrackingMapPage] 📍 Vehicle updated: ${newLocation.latitude}, ${newLocation.longitude}');
          }
        }
      };
      
      _socketIOService.addFrameUpdateListener(_frameUpdateCallback);
    }
  }

  Future<void> _extractRouteData() async {
    if (!_isDisposed) setState(() => _isLoadingRoute = true);

    try {
      if (widget.endLocation != null) {
        endPoint = LatLng(
          (widget.endLocation.latitude as num).toDouble(),
          (widget.endLocation.longitude as num).toDouble(),
        );
      }

      if (widget.routePoints != null && widget.routePoints!.length >= 2) {
        final rawPoints = widget.routePoints!
            .map((p) => LatLng(p.latitude, p.longitude))
            .toList();

        startPoint = rawPoints.first;
        _lastSnappedVehicleLocation = startPoint;

        final pointsToRoute = List<LatLng>.from(rawPoints);
        
        if (endPoint != null && 
            (rawPoints.isEmpty || 
             rawPoints.last.latitude != endPoint!.latitude || 
             rawPoints.last.longitude != endPoint!.longitude)) {
          pointsToRoute.add(endPoint!);
        }

        routePolyline = await _routeService.getRouteThrough(pointsToRoute);
        initialRoutePolyline = List.from(routePolyline);

        if (endPoint != null) {
          _snappedEndLocation = await _routeService.snapToRoad(endPoint!);
        }

        print('[LiveTrackingMapPage] ✅ Initial route loaded: ${routePolyline.length} points (${pointsToRoute.length} waypoints)');
        _fitMapToRoute();
      } else if (endPoint != null) {
        _snappedEndLocation = await _routeService.snapToRoad(endPoint!);
      }
    } catch (e) {
      print('[LiveTrackingMapPage] ❌ Route extraction error: $e');
    } finally {
      if (!_isDisposed) setState(() => _isLoadingRoute = false);
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

  double _calculateDistanceKm(LatLng p1, LatLng p2) {
    const R = 6371;
    final dLat = _toRad(p2.latitude - p1.latitude);
    final dLon = _toRad(p2.longitude - p1.longitude);
    final lat1Rad = _toRad(p1.latitude);
    final lat2Rad = _toRad(p2.latitude);
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1Rad) * cos(lat2Rad) * sin(dLon / 2) * sin(dLon / 2);
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return R * c;
  }

  double _toRad(double deg) => deg * (pi / 180.0);

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
    print('[LiveTrackingMapPage] 🧹 Cleaning up...');
    _isDisposed = true;
    _socketIOService.clearVehicleFilter();
    _socketIOService.removeFrameUpdateListener(_frameUpdateCallback);
    _socketIOService.removeConnectionStateListener(_connectionStateCallback);
    currentLocation = null;
    _lastSnappedVehicleLocation = null;
    _snappedEndLocation = null;
    currentFrameData = null;
    _isConnected = false;
    _userHasZoomed = false;
    _isCalculatingRoute = false;
    _lastUserInteraction = null;
    routePolyline.clear();
    initialRoutePolyline.clear();
    mapController.dispose();
    _pulseAnimationController.dispose();
    print('[LiveTrackingMapPage] 🧹 Cleanup complete');
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final Color primaryColor = widget.primaryColor ?? Theme.of(context).colorScheme.primary;
    final mediaQuery = MediaQuery.of(context);
    final double width = mediaQuery.size.width;
    final double scale = width / 375.0;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: primaryColor,
        title: const Text("Live Tracking", style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
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
                urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                subdomains: const ['a', 'b', 'c'],
                userAgentPackageName: 'com.trackify.driver',
              ),
              if (routePolyline.isNotEmpty)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: routePolyline,
                      color: Colors.blue,
                      strokeWidth: 5 * scale,
                      strokeCap: StrokeCap.round,
                      strokeJoin: StrokeJoin.round,
                    ),
                  ],
                ),
              MarkerLayer(
                markers: [
                  if (startPoint != null)
                    Marker(
                      width: 40 * scale,
                      height: 40 * scale,
                      point: startPoint!,
                      child: Icon(Icons.location_on, color: Colors.green, size: 40 * scale),
                    ),
                  if (endPoint != null)
                    Marker(
                      width: 40 * scale,
                      height: 40 * scale,
                      point: endPoint!,
                      child: Icon(Icons.location_on, color: Colors.red, size: 40 * scale),
                    ),
                  for (final stop in stopsList)
                    Marker(
                      width: 30 * scale,
                      height: 30 * scale,
                      point: stop.point,
                      child: Container(
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(blurRadius: 2, color: Colors.black26)
                          ],
                        ),
                        child: Center(
                          child: Text(
                            '${stop.order ?? ''}',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 12 * scale,
                            ),
                          ),
                        ),
                      ),
                    ),
                  if (currentLocation != null)
                    Marker(
                      width: 50 * scale,
                      height: 50 * scale,
                      point: currentLocation!,
                      child: Transform.rotate(
                        angle: (vehicleHeading) * (3.14159 / 180),
                        child: Container(
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                blurRadius: 4,
                                color: Colors.black26,
                              ),
                            ],
                          ),
                          child: Icon(
                            Icons.navigation,
                            color: Colors.blueAccent,
                            size: 30 * scale,
                          ),
                        ),
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
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              margin: EdgeInsets.all(12 * scale),
              padding: EdgeInsets.symmetric(horizontal: 16 * scale, vertical: 12 * scale),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F5E9),
                border: Border.all(
                  color: Colors.green,
                  width: 2,
                ),
                borderRadius: BorderRadius.circular(12 * scale),
              ),
              child: Row(
                children: [
                  AnimatedBuilder(
                    animation: _pulseAnimation,
                    builder: (context, child) {
                      return Opacity(
                        opacity: _pulseAnimation.value,
                        child: Container(
                          width: 10 * scale,
                          height: 10 * scale,
                          decoration: const BoxDecoration(
                            color: Colors.green,
                            shape: BoxShape.circle,
                          ),
                        ),
                      );
                    },
                  ),
                  SizedBox(width: 10 * scale),
                  Text(
                    'Live Data Streaming...',
                    style: TextStyle(
                      color: Colors.green,
                      fontWeight: FontWeight.w600,
                      fontSize: 13 * scale,
                    ),
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            right: 16 * scale,
            bottom: 32 * scale,
            child: Column(
              children: [
                if (_isConnected)
                  FloatingActionButton(
                    heroTag: 'sos_button',
                    mini: true,
                    backgroundColor: Colors.red,
                    onPressed: _isSosLoading ? null : _showSosReasonDialog,
                    child: _isSosLoading
                        ? SizedBox(
                          width: 18 * scale,
                          height: 18 * scale,
                          child: const CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                        : Icon(Icons.emergency_share, size: 20 * scale,color: Colors.white,),
                  ),
                if (_isConnected) SizedBox(height: 12 * scale),
                Container(
                  decoration: BoxDecoration(
                    color: primaryColor,
                    borderRadius: BorderRadius.circular(12 * scale),
                  ),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () {
                        final center = currentLocation ?? mapController.camera.center;
                        final newZoom = mapController.camera.zoom + 1;
                        mapController.move(center, newZoom);
                      },
                      borderRadius: BorderRadius.circular(12 * scale),
                      child: Padding(
                        padding: EdgeInsets.all(12 * scale),
                        child: Image.asset('assets/icons/zoom-in.png', height: 25 * scale,color: Colors.white,),
                      ),
                    ),
                  ),
                ),
                SizedBox(height: 12 * scale),
                Container(
                  decoration: BoxDecoration(
                    color: primaryColor,
                    borderRadius: BorderRadius.circular(12 * scale),
                  ),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () {
                        final center = currentLocation ?? mapController.camera.center;
                        final newZoom = mapController.camera.zoom - 1;
                        mapController.move(center, newZoom);
                      },
                      borderRadius: BorderRadius.circular(12 * scale),
                      child: Padding(
                        padding: EdgeInsets.all(12 * scale),
                        child: Image.asset('assets/icons/zoom-out.png', height: 25 * scale,color: Colors.white,),
                      ),
                    ),
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

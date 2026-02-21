import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:get/get.dart';
import 'dart:async';
import 'dart:math';
import 'dart:convert';
import 'dart:ui';
import 'package:latlong2/latlong.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../live-tracking/domain/models/live_tracking_model.dart';
import '../controllers/parent_home_controller.dart';
import 'package:geocoding/geocoding.dart';
import '../../../../shared/index.dart';
import '../../../../Sessionhandler/session_controller.dart';
import '../../../../../core/core.dart';
import '../../../profile/presentation/pages/parent_profile_page.dart';
import '../../../profile/presentation/bindings/parent_profile_binding.dart';

Future<String> getAddressFromLatLng(double lat, double lng) async {
  try {
    if (lat == 0.0 && lng == 0.0) {
      return "Location unavailable (0, 0)";
    }
    List<Placemark> placemarks = await placemarkFromCoordinates(lat, lng);

    if (placemarks.isNotEmpty) {
      final p = placemarks.first;
      return "${p.street}, "
          "${p.subLocality}, "
          "${p.locality}, "
          "${p.administrativeArea}, "
          "${p.postalCode}";
    }
  } catch (e) {
    // Silent catch for geocoding errors
  }

  return "Unknown Location";
}

Widget buildLocationRow(trackChildData, trip) {
  return Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Text(
        'Location',
        style: TextStyle(fontSize: 13, color: Colors.grey[600]),
      ),
      FutureBuilder<String>(
        future: () async {
          double? lat;
          double? lng;

          if (trackChildData?.location != null) {
            lat = trackChildData!.location.latitude;
            lng = trackChildData.location.longitude;
          } else if (trip.currentLocation != null) {
            lat = trip.currentLocation!.latitude;
            lng = trip.currentLocation!.longitude;
          }

          if (lat == null || lng == null) {
            return "N/A";
          }

          if (lat == 0.0 && lng == 0.0) {
            return "Location data unavailable (0, 0)";
          }

          return await getAddressFromLatLng(lat, lng);
        }(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Text(
              "Loading...",
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            );
          }

          if (snapshot.hasError) {
            return const Text(
              "Error loading address",
              style: TextStyle(fontSize: 13, color: Colors.red),
            );
          }

          if (!snapshot.hasData || snapshot.data == 'N/A') {
            return const Text(
              "N/A",
              style: TextStyle(fontSize: 13),
            );
          }

          return SizedBox(
            width: 200,
            child: Text(
              snapshot.data!,
              textAlign: TextAlign.right,
              overflow: TextOverflow.ellipsis,
              maxLines: 2,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          );
        },
      ),
    ],
  );
}

void showAddressPopup(BuildContext context, String title, String address, Color primaryColor) {
  showDialog(
    context: context,
    builder: (BuildContext context) {
      return Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        elevation: 8,
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            color: Colors.white,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: primaryColor.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.location_on,
                  color: primaryColor,
                  size: 28,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                title,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: primaryColor,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                address,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  color: Colors.black87,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryColor,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text(
                    'Close',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    },
  );
}

class SwipeUpCallButton extends StatefulWidget {
  final VoidCallback onCall;
  final Color primaryColor;

  const SwipeUpCallButton({
    super.key,
    required this.onCall,
    required this.primaryColor,
  });

  @override
  State<SwipeUpCallButton> createState() => _SwipeUpCallButtonState();
}

class _SwipeUpCallButtonState extends State<SwipeUpCallButton>
    with SingleTickerProviderStateMixin {
  double _dragOffset = 0;
  static const double _maxDrag = 100;

  late AnimationController _arrowController;

  @override
  void initState() {
    super.initState();

    _arrowController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _arrowController.dispose();
    super.dispose();
  }

  void _onDragUpdate(DragUpdateDetails details) {
    setState(() {
      _dragOffset -= details.delta.dy;
      _dragOffset = _dragOffset.clamp(0, _maxDrag);
    });
  }

  void _onDragEnd(DragEndDetails details) {
    if (_dragOffset > _maxDrag * 0.7) {
      widget.onCall();
    }
    setState(() => _dragOffset = 0);
  }

  Widget _buildBlinkingArrow(int index) {
    return AnimatedBuilder(
      animation: _arrowController,
      builder: (_, __) {
        /// stagger effect
        final double phase = (_arrowController.value - index * 0.2) % 1.0;

        final opacity = phase < 0.5
            ? Curves.easeOut.transform(phase * 2)
            : Curves.easeIn.transform((1 - phase) * 2);

        return Opacity(
          opacity: (_dragOffset > 10) ? 0 : opacity,
          child: Icon(
            Icons.keyboard_arrow_up_rounded,
            color: widget.primaryColor.withOpacity(0.7 - index * 0.15),
            size: 30,
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        /// 🔼 BLINKING ARROWS
        Column(
          children: [
            _buildBlinkingArrow(0),
            _buildBlinkingArrow(1),
            _buildBlinkingArrow(2),
          ],
        ),

        const SizedBox(height: 10),

        /// 🔵 SWIPE BUTTON
        GestureDetector(
          onVerticalDragUpdate: _onDragUpdate,
          onVerticalDragEnd: _onDragEnd,
          child: Transform.translate(
            offset: Offset(0, -_dragOffset),
            child: Container(
              height: 85,
              width: 85,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: widget.primaryColor,
                boxShadow: [
                  BoxShadow(
                    color: widget.primaryColor.withOpacity(0.15),
                    blurRadius: 30,
                    offset: const Offset(0, 14),
                  ),
                ],
              ),
              child: const Icon(
                Icons.call_rounded,
                color: Colors.white,
                size: 48,
              ),
            ),
          ),
        ),

        const SizedBox(height: 12),

        const Text(
          'Swipe up to make a call',
          style: TextStyle(
            fontSize: 13,
            color: Colors.black54,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}


class VehicleInfoDialog extends StatefulWidget {
  final double latitude;
  final double longitude;
  final Color primaryColor;
  final String? address;
  final DateTime? timestamp;
  final String? vehicleId;
  final String? vehicleNumber;

  const VehicleInfoDialog({
    super.key,
    required this.latitude,
    required this.longitude,
    required this.primaryColor,
    this.address,
    this.timestamp,
    this.vehicleId,
    this.vehicleNumber,
  });

  @override
  State<VehicleInfoDialog> createState() => _VehicleInfoDialogState();
}

class _VehicleInfoDialogState extends State<VehicleInfoDialog> {
  String? _address;
  bool _isLoadingAddress = false;
  late ParentHomeController controller;

  @override
  void initState() {
    super.initState();
    _address = widget.address;
    
    try {
      controller = Get.find<ParentHomeController>(tag: 'home');
    } catch (e) {
      debugPrint('❌ [VehicleInfoDialog] Failed to find ParentHomeController: $e');
    }
    
    if (_address == null) {
      _fetchAddress();
    }
  }

  Future<void> _fetchAddress() async {
    if (_isLoadingAddress) return;
    _fetchAddressForCoordinates(widget.latitude, widget.longitude);
  }

  Future<void> _fetchAddressForCoordinates(double lat, double lng) async {
    if (_isLoadingAddress) return;
    _isLoadingAddress = true;

    try {
      final address = await getAddressFromLatLng(lat, lng);
      if (mounted) {
        setState(() {
          _address = address;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _address ??= 'Unable to fetch address';
        });
      }
    } finally {
      _isLoadingAddress = false;
    }
  }

  String _formatTimestamp(DateTime time) {
    final year = time.year;
    final month = time.month.toString().padLeft(2, '0');
    final day = time.day.toString().padLeft(2, '0');
    final hour = time.hour.toString().padLeft(2, '0');
    final minute = time.minute.toString().padLeft(2, '0');
    final second = time.second.toString().padLeft(2, '0');
    final microsecond = time.microsecond.toString().padLeft(6, '0');
    
    return '$year-$month-$day $hour:$minute:$second.$microsecond';
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 8,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: Colors.white,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: widget.primaryColor.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.location_on,
                color: widget.primaryColor,
                size: 28,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Location',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: widget.primaryColor,
              ),
            ),
            const SizedBox(height: 20),
            Obx(() {
              double latitude = widget.latitude;
              double longitude = widget.longitude;
              
              if (widget.vehicleId != null && 
                  controller.vehicleLocations.containsKey(widget.vehicleId)) {
                final location = controller.vehicleLocations[widget.vehicleId];
                if (location != null) {
                  latitude = location.latitude;
                  longitude = location.longitude;
                  
                  if (_address == null || _address == 'Loading address...' || _address == 'Unable to fetch address') {
                    _fetchAddressForCoordinates(latitude, longitude);
                  }
                }
              }
              
              return Text(
                _address ?? 'Loading address...',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  height: 1.5,
                ),
                maxLines: 4,
                overflow: TextOverflow.ellipsis,
              );
            }),
            const SizedBox(height: 20),
            Obx(() {
              controller.vehicleNumbers.toString();
              
              String displayVehicleNumber = widget.vehicleNumber ?? 'Vehicle';
              if (displayVehicleNumber == 'N/A') displayVehicleNumber = 'Vehicle';
              
              if (widget.vehicleId != null && 
                  controller.vehicleNumbers.containsKey(widget.vehicleId)) {
                final vn = controller.vehicleNumbers[widget.vehicleId];
                if (vn != null && vn.isNotEmpty && vn != 'N/A') {
                  displayVehicleNumber = vn;
                }
              }
              
              return Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Vehicle Number',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  Text(
                    displayVehicleNumber,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: widget.primaryColor,
                    ),
                  ),
                ],
              );
            }),
            const SizedBox(height: 20),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Timestamp',
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 8),
                Obx(() {
                  controller.vehicleTimestamps.toString();
                  controller.vehicleLocations.toString();
                  
                  DateTime displayTime = DateTime.now();
                  
                  String? matchedVehicleId = widget.vehicleId;
                  
                  if (matchedVehicleId != null && 
                      controller.vehicleTimestamps.containsKey(matchedVehicleId)) {
                    final ts = controller.vehicleTimestamps[matchedVehicleId];
                    if (ts != null) {
                      displayTime = ts;
                      debugPrint("🕐 [VehicleInfoDialog] Using live timestamp for $matchedVehicleId: $displayTime");
                    }
                  } else if (matchedVehicleId == null) {
                    for (final vid in controller.vehicleLocations.keys) {
                      final loc = controller.vehicleLocations[vid];
                      if (loc != null && 
                          loc.latitude == widget.latitude && 
                          loc.longitude == widget.longitude) {
                        matchedVehicleId = vid;
                        final ts = controller.vehicleTimestamps[vid];
                        if (ts != null) {
                          displayTime = ts;
                          debugPrint("🕐 [VehicleInfoDialog] Found matching vehicle $vid with timestamp: $displayTime");
                        }
                        break;
                      }
                    }
                  }
                  
                  if (displayTime == DateTime.now() && widget.timestamp != null) {
                    displayTime = widget.timestamp!;
                  }
                  
                  return Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                    decoration: BoxDecoration(
                      color: widget.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: widget.primaryColor.withValues(alpha: 0.3),
                        width: 1,
                      ),
                    ),
                    child: Text(
                      _formatTimestamp(displayTime),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: widget.primaryColor,
                        fontFamily: 'monospace',
                      ),
                    ),
                  );
                }),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: widget.primaryColor,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text(
                  'Close',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class CurrentLocationMapWithSocket extends StatefulWidget {
  final LatLng initialLocation;
  final Color primaryColor;
  final String? vehicleNumber;
  final String? vehicleId;

  const CurrentLocationMapWithSocket({
    super.key,
    required this.initialLocation,
    required this.primaryColor,
    this.vehicleNumber,
    this.vehicleId,
  });

  @override
  State<CurrentLocationMapWithSocket> createState() => _CurrentLocationMapWithSocketState();
}

class _CurrentLocationMapWithSocketState extends State<CurrentLocationMapWithSocket> with TickerProviderStateMixin {
  late MapController mapController;
  LatLng? currentLocation;
  LatLng? animatedLocation;
  bool _isDisposed = false;
  DateTime? lastMovementTime;
  final List<LatLng> locationHistory = [];
  late ParentHomeController controller;
  late AnimationController _animationController;
  late Animation<double> _animation;
  LatLng? _previousLocation;

  @override
  void initState() {
    super.initState();
    try {
      controller = Get.find<ParentHomeController>(tag: 'home');
    } catch (e) {
      debugPrint('❌ [CurrentLocationMapWithSocket] Failed to find ParentHomeController: $e');
      rethrow;
    }
    mapController = controller.mapController;
    _animationController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );
    _animation = Tween<double>(begin: 0.0, end: 1.0).animate(_animationController);
    
    currentLocation = widget.initialLocation;
    animatedLocation = widget.initialLocation;
    _previousLocation = widget.initialLocation;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_isDisposed && controller.shouldAutoZoomOnFirstLogin()) {
        // Use smooth animation for initial focus
        _animateMapMove(widget.initialLocation, 15.0);
        controller.markAutoZoomComplete();
      } else if (!_isDisposed) {
        // Even if not first login, animate to location on load for "focus over start location" effect
        _animateMapMove(widget.initialLocation, 15.0);
      }
    });
  }

  double _calculateDistance(LatLng point1, LatLng point2) {
    const p = 0.017453292519943295;
    final a = 0.5 - 
        (cos((point2.latitude - point1.latitude) * p) / 2) +
        (cos(point1.latitude * p) * cos(point2.latitude * p) *
            (1 - cos((point2.longitude - point1.longitude) * p)) / 2);
    return 12742 * asin(sqrt(a));
  }

  LatLng _interpolate(LatLng from, LatLng to, double t) {
    final lat = from.latitude + (to.latitude - from.latitude) * t;
    final lng = from.longitude + (to.longitude - from.longitude) * t;
    return LatLng(lat, lng);
  }

  void _animateToNewLocation(LatLng newLocation) {
    if (_isDisposed || _previousLocation == null) return;
    
    _animationController.reset();
    _animation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.linear),
    );

    _animation.addListener(() {
      if (!_isDisposed && mounted) {
        setState(() {
          animatedLocation = _interpolate(_previousLocation!, newLocation, _animation.value);
        });
      }
    });

    _animation.addStatusListener((status) {
      if (status == AnimationStatus.completed && !_isDisposed) {
        _previousLocation = newLocation;
      }
    });

    _animationController.forward();
  }

  void _animateMapMove(LatLng destLocation, double destZoom) {
    if (_isDisposed) return;
    
    final latTween = Tween<double>(
      begin: mapController.camera.center.latitude,
      end: destLocation.latitude,
    );
    final lngTween = Tween<double>(
      begin: mapController.camera.center.longitude,
      end: destLocation.longitude,
    );
    final zoomTween = Tween<double>(
      begin: mapController.camera.zoom,
      end: destZoom,
    );

    final controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    
    final animation = CurvedAnimation(
      parent: controller,
      curve: Curves.fastOutSlowIn,
    );

    controller.addListener(() {
      if (!_isDisposed && mounted) {
        mapController.move(
          LatLng(latTween.evaluate(animation), lngTween.evaluate(animation)),
          zoomTween.evaluate(animation),
        );
      }
    });

    animation.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        controller.dispose();
      } else if (status == AnimationStatus.dismissed) {
        controller.dispose();
      }
    });

    controller.forward();
  }


  @override
  void dispose() {
    _isDisposed = true;
    _animationController.dispose();
    super.dispose();
  }


  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final double scale = (controller.currentZoom.value / 13.0).clamp(0.6, 2.0);
      final vehicleLoc = controller.vehicleLocation.value ?? 
                            controller.vehicleLocations[widget.vehicleId] ?? 
                            currentLocation;
      
      if (vehicleLoc != null && currentLocation != vehicleLoc) {
        currentLocation = vehicleLoc;
        lastMovementTime = DateTime.now();
        if (locationHistory.isEmpty || 
            _calculateDistance(locationHistory.last, vehicleLoc) > 0.0001) {
          locationHistory.add(vehicleLoc);
        }
        
        _animateToNewLocation(vehicleLoc);
      }

      final displayLocation = animatedLocation ?? vehicleLoc ?? currentLocation ?? widget.initialLocation;
      
      return FlutterMap(
        mapController: mapController,
        options: MapOptions(
          initialCenter: displayLocation,
          initialZoom: 13.0,
          backgroundColor: Colors.grey[100]!,
          interactionOptions: const InteractionOptions(
            flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
          ),
          onPositionChanged: (position, hasGesture) {
            if (position.zoom != null) {
              controller.currentZoom.value = position.zoom!;
            }
          },
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            subdomains: const ['a', 'b', 'c'],
            userAgentPackageName: 'com.trackify.parent',
          ),
          PolylineLayer(
            polylines: [
              if (controller.routePolylinePoints.isNotEmpty)
                Polyline(
                  points: controller.routePolylinePoints,
                  color: Colors.white,
                  strokeWidth: 6.0 * scale,
                ),
              if (controller.routePolylinePoints.isNotEmpty)
                Polyline(
                  points: controller.routePolylinePoints,
                  color: widget.primaryColor,
                  strokeWidth: 3.5 * scale,
                ),
              if (controller.routePolylinePoints.isEmpty && locationHistory.isNotEmpty)
                Polyline(
                  points: locationHistory,
                  color: widget.primaryColor,
                  strokeWidth: 3.5 * scale,
                ),
            ],
          ),
          MarkerLayer(
            markers: [
              if (controller.targetLocation.value != null)
                Marker(
                  width: 40 * scale,
                  height: 40 * scale,
                  point: controller.targetLocation.value!,
                  alignment: Alignment.center,
                  child: Image.asset(
                    'assets/icons/homemarker.png',
                    width: 40 * scale,
                    height: 40 * scale,
                  ),
                ),
              
              // Vehicle Marker (Mirrored from Driver App)
              Marker(
                width: 50.0 * scale,
                height: 50.0 * scale,
                point: displayLocation,
                alignment: Alignment.center,
                child: GestureDetector(
                  onTap: () {

                  },
                  child: Transform.rotate(
                    angle: (controller.vehicleHeading.value != 0.0 
                        ? controller.vehicleHeading.value 
                        : (controller.vehicleHeadings[widget.vehicleId] ?? 0.0)) * (pi / 180),
                    child: Container(
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(blurRadius: 4, color: Colors.black26)
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
              ),
            ],
          ),
        ],
      );
    });
  }
}

Widget _buildShimmerLoading(Color primaryColor) {
  return const DashboardPageSkeleton();
}

class LiveTripMap extends StatefulWidget {
  final ParentLiveTripData tripData;
  final ParentHomeController controller;
  final Color primaryColor;
  final Function(MapController) onMapCreated;

  const LiveTripMap({
    super.key,
    required this.tripData,
    required this.controller,
    required this.primaryColor,
    required this.onMapCreated,
  });

  @override
  State<LiveTripMap> createState() => _LiveTripMapState();
}

class _LiveTripMapState extends State<LiveTripMap> with TickerProviderStateMixin {
  late MapController mapController;
  bool _isDisposed = false;
  AnimationController? _animationController;

  @override
  void initState() {
    super.initState();
    mapController = widget.controller.mapController;
    widget.onMapCreated(mapController);
    
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_isDisposed) {
        final startLocation = widget.controller.vehicleLocation.value ?? widget.tripData.startLocation;
        _animateMapMove(startLocation, 13.0);
      }
    });

    // Listen for live location updates and animate/move map if it's the first time
    widget.controller.vehicleLocation.listen((location) {
      if (location != null && !_isDisposed && mounted) {
        // If the user hasn't interacted much or we want to follow, we could animate here.
        // For now, let's just ensure we have the latest location for markers.
        // If you want to auto-follow:
        // _animateMapMove(location, mapController.camera.zoom);
      }
    });
  }

  @override
  void dispose() {
    _isDisposed = true;
    _animationController?.dispose();
    super.dispose();
  }

  void _animateMapMove(LatLng destLocation, double destZoom) {
    if (_isDisposed) return;
    
    _animationController?.dispose();

    final latTween = Tween<double>(
      begin: mapController.camera.center.latitude,
      end: destLocation.latitude,
    );
    final lngTween = Tween<double>(
      begin: mapController.camera.center.longitude,
      end: destLocation.longitude,
    );
    final zoomTween = Tween<double>(
      begin: mapController.camera.zoom,
      end: destZoom,
    );

    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    
    final animation = CurvedAnimation(
      parent: _animationController!,
      curve: Curves.fastOutSlowIn,
    );

    _animationController!.addListener(() {
      if (!_isDisposed && mounted) {
        mapController.move(
          LatLng(latTween.evaluate(animation), lngTween.evaluate(animation)),
          zoomTween.evaluate(animation),
        );
      }
    });

    _animationController!.forward();
  }

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final currentLocation = widget.controller.vehicleLocation.value;
      
      return FlutterMap(
        mapController: mapController,
        options: MapOptions(
          initialCenter: currentLocation ?? widget.tripData.startLocation,
          initialZoom: 13.0,
          backgroundColor: Colors.grey[100]!,
          interactionOptions: const InteractionOptions(
            flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
          ),
          onPositionChanged: (position, hasGesture) {
            if (position.zoom != null) {
              widget.controller.currentZoom.value = position.zoom!;
            }
          },
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            subdomains: const ['a', 'b', 'c'],
            userAgentPackageName: 'com.trackify.parent',
          ),
          Obx(() {
            final double scale = (widget.controller.currentZoom.value / 13.0).clamp(0.6, 2.0);
            final routePoints = widget.controller.routePolylinePoints;
            
            final fullRoute = [
              widget.tripData.startLocation,
              ...widget.tripData.timeline.map((stop) => stop.location),
              widget.tripData.endLocation,
            ];
            
            if (routePoints.isEmpty) {
              return PolylineLayer(
                polylines: [
                  Polyline(
                    points: fullRoute,
                    color: widget.primaryColor.withValues(alpha: 0.12),
                    strokeWidth: 2.5 * scale,
                  ),
                ],
              );
            }
            return PolylineLayer(
              polylines: [
                Polyline(
                  points: routePoints,
                  color: Colors.white,
                  strokeWidth: 6.0 * scale,
                ),
                Polyline(
                  points: routePoints,
                  color: widget.primaryColor,
                  strokeWidth: 3.5 * scale,
                ),
              ],
            );
          }),
          Obx(() {
            final double scale = (widget.controller.currentZoom.value / 13.0).clamp(0.6, 2.0);
            final vehicleLocation = widget.controller.vehicleLocation.value;
            final vehicleHeading = widget.controller.vehicleHeading.value;

            final isTargetStart = widget.controller.targetLocation.value != null &&
                (widget.tripData.startLocation.latitude - widget.controller.targetLocation.value!.latitude).abs() < 0.0001 &&
                (widget.tripData.startLocation.longitude - widget.controller.targetLocation.value!.longitude).abs() < 0.0001;

            final isTargetEnd = widget.controller.targetLocation.value != null &&
                (widget.tripData.endLocation.latitude - widget.controller.targetLocation.value!.latitude).abs() < 0.0001 &&
                (widget.tripData.endLocation.longitude - widget.controller.targetLocation.value!.longitude).abs() < 0.0001;

            return MarkerLayer(
              markers: [
                // Start Location Marker
                if (!isTargetStart)
                  Marker(
                    width: 40 * scale,
                    height: 40 * scale,
                    point: widget.tripData.startLocation,
                    alignment: Alignment.center,
                    child: GestureDetector(
                      onTap: () async {
                        final address = await getAddressFromLatLng(
                          widget.tripData.startLocation.latitude,
                          widget.tripData.startLocation.longitude,
                        );
                        if (!mounted) return;
                        showAddressPopup(context, 'Start Location', address, widget.primaryColor);
                      },
                      child: Icon(Icons.location_on, color: Colors.green, size: 40 * scale),
                    ),
                  ),

                // End Location Marker
                if (!isTargetEnd)
                  Marker(
                    width: 40 * scale,
                    height: 40 * scale,
                    point: widget.tripData.endLocation,
                    alignment: Alignment.center,
                    child: GestureDetector(
                      onTap: () async {
                        final address = await getAddressFromLatLng(
                          widget.tripData.endLocation.latitude,
                          widget.tripData.endLocation.longitude,
                        );
                        if (!mounted) return;
                        showAddressPopup(context, 'End Location', address, widget.primaryColor);
                      },
                      child: Icon(Icons.location_on, color: Colors.red, size: 40 * scale),
                    ),
                  ),

                // Stop Markers (Numbered)
                ...widget.tripData.timeline.asMap().entries.map((entry) {
                  final index = entry.key + 1;
                  final stop = entry.value;
                  final isTargetStop = widget.controller.targetLocation.value != null &&
                      (stop.location.latitude - widget.controller.targetLocation.value!.latitude).abs() < 0.0001 &&
                      (stop.location.longitude - widget.controller.targetLocation.value!.longitude).abs() < 0.0001;

                  return Marker(
                    point: stop.location,
                    width: isTargetStop ? 40 * scale : 30 * scale,
                    height: isTargetStop ? 40 * scale : 30 * scale,
                    alignment: Alignment.center,
                    child: GestureDetector(
                      onTap: () async {
                        final address = await getAddressFromLatLng(
                          stop.location.latitude,
                          stop.location.longitude,
                        );
                        if (!mounted) return;
                        showAddressPopup(context, isTargetStop ? 'Your Location' : 'Stop $index', address, widget.primaryColor);
                      },
                      child: isTargetStop
                          ? Image.asset(
                              'assets/icons/homemarker.png',
                              width: 40 * scale,
                              height: 40 * scale,
                            )
                          : Container(
                              decoration: const BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(blurRadius: 2, color: Colors.black26)
                                ],
                              ),
                              child: Center(
                                child: Text(
                                  '$index',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12 * scale,
                                    color: Colors.black,
                                    fontFamily: 'Poppins',
                                  ),
                                ),
                              ),
                            ),
                    ),
                  );
                }),

                // Vehicle Marker (Live) - PLOTTED EXACTLY LIKE DRIVER APP SNIPPET
                if (vehicleLocation != null)
                  Marker(
                    point: vehicleLocation,
                    width: 50 * scale,
                    height: 50 * scale,
                    alignment: Alignment.center,
                    child: GestureDetector(
                      onTap: () {

                      },
                      child: Transform.rotate(
                        angle: vehicleHeading * (3.14159 / 180),
                        child: Container(
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(blurRadius: 4, color: Colors.black26)
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
                  ),


              ],
            );
          }),
        ],
      );
    });
  }
}

class ParentHomePage extends GetView<ParentHomeController> {
  ParentHomePage({super.key});
  
  @override
  String? get tag => 'home';

  void _zoomIn() {
    controller.zoomIn();
  }

  void _zoomOut() {
    controller.zoomOut();
  }


  Widget _buildZoomButton(String imagePath, VoidCallback onPressed) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.blue[200],
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 6,
            spreadRadius: 0,
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Image.asset(
              imagePath,
              width: 20,
              height: 20,
              color: Colors.blue[800],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFullscreenButton(VoidCallback onPressed) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.blue[200],
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 6,
            spreadRadius: 0,
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Icon(
              Icons.fullscreen,
              color: Colors.blue[800],
              size: 20,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildExitFullscreenButton(VoidCallback onPressed) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.blue[200],
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 6,
            spreadRadius: 0,
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Icon(
              Icons.fullscreen_exit,
              color: Colors.blue[800],
              size: 20,
            ),
          ),
        ),
      ),
    );
  }

    Widget _buildChildLocationButton(VoidCallback onPressed) {
      return Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 6,
              spreadRadius: 0,
            ),
          ],
          border: Border.all(color: Colors.blue[200]!, width: 1.5),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onPressed,
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Icon(
                Icons.my_location,
                color: Colors.blue[400],
                size: 20,
              ),
            ),
          ),
        ),
      );
    }

  Widget _buildSOSButton(BuildContext context, Color primaryColor) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.red[100],
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 6,
            spreadRadius: 0,
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _showSOSDialog(context, primaryColor),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Image.asset(
              'assets/icons/sos.png',
              width: 20,
              height: 20,
              color: Colors.red[800],
            ),
          ),
        ),
      ),
    );
  }



  Future<void> _showSOSDialog(BuildContext context, Color primaryColor) async {
    try {
      showGeneralDialog(
        context: context,
        barrierDismissible: false,
        barrierColor: Colors.black.withOpacity(0.25),
        transitionDuration: const Duration(milliseconds: 450),

        /// 🔥 Slide-up animation
        transitionBuilder: (context, animation, _, child) {
          final value =
              Curves.easeOutCubic.transform(animation.value) - 1.0;

          return Transform.translate(
            offset: Offset(0, value * -300),
            child: Opacity(
              opacity: animation.value,
              child: child,
            ),
          );
        },

        pageBuilder: (_, __, ___) {
          return Scaffold(
            backgroundColor: Colors.white,
            appBar: AppBar(
              backgroundColor: Colors.white,
              elevation: 0,
              leading: IconButton(
                icon: const Icon(Icons.arrow_back_ios_new, color: Colors.black),
                onPressed: () => Navigator.pop(context),
              ),
              title: const Text(
                'Emergency Assistance',
                style: TextStyle(color: Colors.black),
              ),
              centerTitle: true,
            ),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(28),
                    boxShadow: [
                      BoxShadow(
                        color: primaryColor.withOpacity(0.12),
                        blurRadius: 20,
                        offset: const Offset(0, 12),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      /// 🔵 Title
                      const Text(
                        'Need Immediate Help?',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w700,
                          color: Colors.black,
                        ),
                      ),

                      const SizedBox(height: 12),

                      /// Subtitle
                      const Text(
                        'Swipe up to instantly contact the\n'
                            'registered emergency number for\n'
                            'your child.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.black54,
                          height: 1.5,
                        ),
                      ),

                      const SizedBox(height: 30),

                      /// 🔥 Swipe Button
                      Obx(() {
                        final sosContact =
                            controller.parentProfile.value?.sosContact;

                        return SwipeUpCallButton(
                          primaryColor: primaryColor,
                          onCall: () async {
                            if (sosContact == null) return;

                            final phoneNumber = sosContact.phoneNumber
                                .toString()
                                .replaceAll(RegExp(r'[^\d+]'), '');

                            if (phoneNumber.isEmpty) return;

                            final status =
                            await Permission.phone.request();

                            if (status.isDenied) return;

                            if (status.isPermanentlyDenied) {
                              openAppSettings();
                              return;
                            }

                            final uri = Uri.parse('tel:$phoneNumber');
                            await launchUrl(
                              uri,
                              mode: LaunchMode.externalApplication,
                            );
                          },
                        );
                      }),

                      const SizedBox(height: 24),

                      /// Info
                      const Text(
                        'Use this option only if your child\n'
                            'requires immediate assistance during\n'
                            'the vehicle trip.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.black45,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      );

      await controller.fetchParentProfile();
    } catch (e) {
      debugPrint('Error showing SOS dialog: $e');
    }
  }

  Future<void> _showCallDriverDialog(BuildContext context, Color primaryColor) async {
    try {
      final isFetching = true.obs;
      final driverName = ''.obs;
      final driverPhone = ''.obs;
      final vehicleNumber = ''.obs;
      final errorMessage = ''.obs;

      _fetchDriverContactData(isFetching, driverName, driverPhone, vehicleNumber, errorMessage);

      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (BuildContext context) {
          return Dialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            elevation: 12,
            backgroundColor: Colors.transparent,
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.2),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Colors.green.shade400, Colors.green.shade600],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.green.withValues(alpha: 0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.phone_in_talk,
                      color: Colors.white,
                      size: 32,
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Contact Driver',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Connect with your child\'s school bus driver',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[600],
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Obx(() {
                    if (isFetching.value) {
                      return Container(
                        padding: const EdgeInsets.all(20),
                        child: const Center(
                          child: CircularProgressIndicator(
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.green),
                          ),
                        ),
                      );
                    }

                    if (errorMessage.value.isNotEmpty) {
                      return Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.red.withValues(alpha: 0.05),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.red.withValues(alpha: 0.1)),
                        ),
                        child: Text(
                          errorMessage.value,
                          style: const TextStyle(
                            fontSize: 14,
                            color: Colors.red,
                            fontWeight: FontWeight.w500,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      );
                    }

                    if (driverName.value.isEmpty) {
                      return const SizedBox.shrink();
                    }

                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.blue.withValues(alpha: 0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.person, color: Colors.blue, size: 20),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Driver Name',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      driverName.value,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.black87,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            child: Divider(height: 1, color: Colors.grey.shade200),
                          ),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: primaryColor.withValues(alpha: 0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(Icons.directions_bus, color: primaryColor, size: 20),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Vehicle Number',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      vehicleNumber.value,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.black87,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  }),
                  const SizedBox(height: 32),
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton(
                      onPressed: () async {
                        if (driverPhone.value.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Invalid phone number')),
                          );
                          return;
                        }

                        _initiateCallWithBackend();

                        String phoneNumber = driverPhone.value;
                        phoneNumber = phoneNumber.replaceAll(RegExp(r'[^\d+]'), '');

                        final permissionStatus = await Permission.phone.request();

                        if (permissionStatus.isDenied) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Phone permission denied')),
                            );
                          }
                          return;
                        }

                        if (permissionStatus.isPermanentlyDenied) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Please enable phone permission in settings')),
                            );
                          }
                          openAppSettings();
                          return;
                        }

                        final Uri url = Uri.parse("tel:$phoneNumber");

                        if (!await launchUrl(
                          url,
                          mode: LaunchMode.externalApplication,
                        )) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text("Could not launch phone")),
                            );
                          }
                        } else {
                          if (context.mounted) {
                            Navigator.pop(context);
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        elevation: 4,
                        shadowColor: Colors.green.withValues(alpha: 0.4),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.call, color: Colors.white, size: 22),
                          SizedBox(width: 10),
                          Text(
                            'Call Now',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      'Cancel',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey[600],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      );
    } catch (e) {
      debugPrint('Error showing call driver dialog: $e');
    }
  }

  Future<void> _fetchDriverContactData(
    RxBool isFetching,
    RxString driverName,
    RxString driverPhone,
    RxString vehicleNumber,
    RxString errorMessage,
  ) async {
    try {
      isFetching.value = true;
      errorMessage.value = '';

      // Check if we already have the driver data in the current trip
      final trip = controller.currentTrip.value;
      if (trip != null && trip.driver != null) {
        debugPrint('✅ Using driver data from currentTrip model');
        driverName.value = trip.driver!.name;
        driverPhone.value = trip.driver!.phone;
        vehicleNumber.value = trip.vehicle.vehicleNumber;
        isFetching.value = false;
        return;
      }

      final token = Get.find<SessionController>().token.value;
      final tripData = controller.tripMapData.value;

      if (token.isEmpty || tripData == null) {
        errorMessage.value = 'Unable to fetch driver details';
        return;
      }

      final tripId = tripData.associatedTripId;
      final childId = controller.parentProfile.value?.endUserId ?? 
                     Get.find<SessionController>().parentData.value?['end_user_id']?.toString() ?? '';

      if (childId.isEmpty) {
        errorMessage.value = 'Missing child ID';
        return;
      }

      // Collect all potential IDs to try
      final List<String> idsToTry = [];
      if (tripId.isNotEmpty) idsToTry.add(tripId);
      if (tripData.scheduledTripId != null && 
          tripData.scheduledTripId!.isNotEmpty && 
          !idsToTry.contains(tripData.scheduledTripId)) {
        idsToTry.add(tripData.scheduledTripId!);
      }
      if (tripData.vehicleId.isNotEmpty && !idsToTry.contains(tripData.vehicleId)) {
        idsToTry.add(tripData.vehicleId);
      }

      if (idsToTry.isEmpty) {
        errorMessage.value = 'Missing trip or vehicle ID';
        return;
      }

      final baseUrl = trackify_vts.baseUrl;
      bool success = false;

      for (final id in idsToTry) {
        final url = Uri.parse('$baseUrl/parent/driver-contact?tripId=$id&childId=$childId');
        debugPrint('🔍 [DriverContact] Attempting ID: $id');

        try {
          final response = await http.get(
            url,
            headers: {
              'Authorization': 'Bearer $token',
              'Content-Type': 'application/json',
            },
          ).timeout(const Duration(seconds: 10));

          debugPrint('📡 [DriverContact] ID: $id -> Status: ${response.statusCode}');

          if (response.statusCode == 200) {
            final jsonBody = json.decode(response.body);
            final data = jsonBody['data'] as Map<String, dynamic>?;

            if (data != null) {
              driverName.value = data['driver_name']?.toString() ?? 'Unknown';
              driverPhone.value = data['driver_phone']?.toString() ?? '';
              vehicleNumber.value = data['vehicle_number']?.toString() ?? 'N/A';
              success = true;
              debugPrint('✅ [DriverContact] Success for ID: $id');
              break; 
            }
          }
        } catch (e) {
          debugPrint('⚠️ [DriverContact] Error for ID $id: $e');
        }
      }

      if (!success) {
        errorMessage.value = 'Failed to fetch driver contact details';
      }
    } catch (e) {
      debugPrint('❌ [DriverContact] Critical error: $e');
      errorMessage.value = 'Error: ${e.toString()}';
    } finally {
      isFetching.value = false;
    }
  }

  Future<void> _initiateCallWithBackend() async {
    try {
      final token = Get.find<SessionController>().token.value;
      final tripData = controller.tripMapData.value;

      if (token.isEmpty || tripData == null) {
        debugPrint('Error: Token or trip data missing');
        return;
      }

      final tripId = tripData.associatedTripId;
      final childId = controller.parentProfile.value?.endUserId ?? 
                     Get.find<SessionController>().parentData.value?['end_user_id']?.toString() ?? '';

      if (childId.isEmpty) {
        debugPrint('Error: Missing child ID');
        return;
      }

      // Collect all potential IDs to try
      final List<String> idsToTry = [];
      if (tripId.isNotEmpty) idsToTry.add(tripId);
      if (tripData.scheduledTripId != null && 
          tripData.scheduledTripId!.isNotEmpty && 
          !idsToTry.contains(tripData.scheduledTripId)) {
        idsToTry.add(tripData.scheduledTripId!);
      }
      if (tripData.vehicleId.isNotEmpty && !idsToTry.contains(tripData.vehicleId)) {
        idsToTry.add(tripData.vehicleId);
      }

      if (idsToTry.isEmpty) {
        debugPrint('Error: Missing trip or vehicle ID');
        return;
      }

      final baseUrl = trackify_vts.baseUrl;
      final url = Uri.parse('$baseUrl/parent/call-driver');
      bool success = false;

      for (final id in idsToTry) {
        final requestBody = {
          'tripId': id,
          'childId': childId,
        };

        debugPrint('🔍 [CallDriver] Attempting with ID: $id');

        try {
          final response = await http.post(
            url,
            headers: {
              'Authorization': 'Bearer $token',
              'Content-Type': 'application/json',
            },
            body: json.encode(requestBody),
          ).timeout(const Duration(seconds: 15));

          debugPrint('📡 [CallDriver] ID: $id -> Status: ${response.statusCode}');

          if (response.statusCode == 200) {
            final jsonBody = json.decode(response.body);
            final data = jsonBody['data'] as Map<String, dynamic>?;
            
            debugPrint('✅ [CallDriver] Success for ID: $id');
            debugPrint('Call ID: ${data?['call_id']}');
            success = true;
            break;
          }
        } catch (e) {
          debugPrint('⚠️ [CallDriver] Error for ID $id: $e');
        }
      }

      if (!success) {
        debugPrint('❌ [CallDriver] All attempts failed');
      }
    } catch (e) {
      debugPrint('❌ [CallDriver] Critical error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;

    try {
      Get.find<ParentHomeController>(tag: 'home');
    } catch (e) {
      debugPrint('❌ [ParentHomePage] Controller not found: $e - Registering now');
      try {
        Get.put<ParentHomeController>(
          ParentHomeController(),
          tag: 'home',
          permanent: true,
        );
        debugPrint('✅ [ParentHomePage] ParentHomeController registered');
      } catch (regError) {
        debugPrint('❌ [ParentHomePage] Failed to register controller: $regError');
      }
    }

    return ParentAppLayout(
      navbarCurrentIndex: 0,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: const Color(0xFF2764FF),
        title: Padding(
          padding: const EdgeInsets.only(left: 8.0, top: 8.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                'Trackit',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  letterSpacing: 0.8,
                  fontFamily: 'Poppins',
                ),
              ),
              const SizedBox(height: 2),
              const Text(
                'Live Tracking',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: Colors.white70,
                  letterSpacing: 0.5,
                  fontFamily: 'Poppins',
                ),
              ),
            ],
          ),
        ),
        toolbarHeight: 75,
        surfaceTintColor: Colors.transparent,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8.0, top: 8.0),
            child: IconButton(
              icon: const Icon(Icons.refresh, color: Colors.white, size: 28),
              onPressed: () {
                controller.refreshAllData();
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 16.0, top: 8.0),
            child: Obx(() {
              final parentName = controller.parentProfile.value?.name ?? 'P';
              final firstLetter = parentName.isNotEmpty 
                  ? parentName[0].toUpperCase()  
                  : 'P';
              
              return GestureDetector(
                onTap: () => Get.to(
                  () => const ParentProfilePage(),
                  binding: ParentProfileBinding(),
                  transition: Transition.rightToLeft,
                  duration: const Duration(milliseconds: 350),
                ),
                child: ClipOval(
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                    child: Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.25),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.4),
                          width: 1.5,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          firstLetter,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                            fontFamily: 'Poppins',
                            shadows: [
                              Shadow(
                                color: Colors.black.withValues(alpha: 0.3),
                                blurRadius: 4,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
        ],
      ),
      body: Obx(() {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (controller.isInitializationComplete.value) {
            controller.triggerPageVisibilityRefresh();
          }
        });
        
        if (!controller.isInitializationComplete.value || controller.isFetchingTripMap.value) {
          return _buildShimmerLoading(primaryColor);
        }

        return Container(
          color: Colors.grey[50],
          child: Stack(
            children: [
              _buildPageContent(context, primaryColor),

              Obx(() {
                final tripData = controller.tripMapData.value;
                if (tripData == null) {
                  return const SizedBox.shrink();
                }

                String formatTimeWithAmPm(String time) {
                  try {
                    if (time.isEmpty || time == 'N/A') return '--:--';
                    
                    // Handle HH:mm format
                    if (time.contains(':') && !time.contains('-')) {
                      final parts = time.split(':');
                      int hour = int.parse(parts[0]);
                      int minute = int.parse(parts[1]);
                      final amPm = hour >= 12 ? 'PM' : 'AM';
                      hour = hour % 12 == 0 ? 12 : hour % 12;
                      return '$hour:${minute.toString().padLeft(2, '0')} $amPm';
                    }

                    final dt = DateTime.parse(time);
                    final hour = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
                    final minute = dt.minute.toString().padLeft(2, '0');
                    final amPm = dt.hour >= 12 ? 'PM' : 'AM';
                    return '$hour:$minute $amPm';
                  } catch (_) {
                    return time.isNotEmpty ? time : '--:--';
                  }
                }

                String startTime = formatTimeWithAmPm(tripData.scheduledStartTime);

                return Positioned(
                top: 0,
                left: 12,
                right: 12,
                child: Container(
                  margin: const EdgeInsets.only(top: 12),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.08),
                        blurRadius: 10,
                        spreadRadius: 0,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.route, color: Color(0xFF2764FF), size: 24),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    tripData.routeName,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      fontFamily: 'Poppins',
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                if (controller.isUpcomingTrip.value)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.orange.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(4),
                                      border: Border.all(
                                        color: Colors.orange,
                                        width: 1,
                                      ),
                                    ),
                                    child: const Text(
                                      'Upcoming Trip',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w500,
                                        color: Colors.orange,
                                        fontFamily: 'Poppins',
                                      ),
                                    ),
                                  )
                                else if (tripData.associatedTripId.isNotEmpty)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.green.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(4),
                                      border: Border.all(
                                        color: Colors.green,
                                        width: 1,
                                      ),
                                    ),
                                    child: const Text(
                                      'Active Trip',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w500,
                                        color: Colors.green,
                                        fontFamily: 'Poppins',
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Start Time: $startTime',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                                fontFamily: 'Poppins',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
              }),



              Obx(() {
                if (controller.tripMapData.value != null) {
                  return const SizedBox.shrink();
                }

                String greeting = 'Good Morning';
                final hour = DateTime.now().hour;
                if (hour >= 12 && hour < 17) {
                  greeting = 'Good Afternoon';
                } else if (hour >= 17) {
                  greeting = 'Good Evening';
                }

                final parentName = controller.parentProfile.value?.name ?? 'Parent';

                return Positioned(
                  top: 0,
                  left: 12,
                  right: 12,
                  child: Container(
                    margin: const EdgeInsets.only(top: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.08),
                          blurRadius: 10,
                          spreadRadius: 0,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          greeting,
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                            fontFamily: 'Poppins',
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          parentName,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                            fontFamily: 'Poppins',
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
              
              Obx(() {
                final isCollapsed = controller.isRouteStopsCollapsed.value;
                final hasTripData = controller.tripMapData.value != null;
                
                if (!hasTripData) return const SizedBox.shrink();

                return AnimatedPositioned(
                  duration: const Duration(milliseconds: 400),
                  curve: Curves.easeInOutCubic,
                  bottom: isCollapsed ? -MediaQuery.of(context).size.height * 0.4 : 0,
                  left: 0,
                  right: 0,
                  child: _buildRouteStopsCard(context, primaryColor),
                );
              }),

              Obx(() {
                if (controller.tripMapData.value == null || !controller.isRouteStopsCollapsed.value) {
                  return const SizedBox.shrink();
                }
                return Positioned(
                  bottom: 20,
                  right: 16,
                  child: GestureDetector(
                    onTap: () => controller.toggleRouteStops(),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: primaryColor,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: primaryColor.withValues(alpha: 0.3),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.route_rounded,
                        color: Colors.white,
                        size: 28,
                      ),
                    ),
                  ),
                );
              }),

              Obx(() {
                final isCollapsed = controller.isRouteStopsCollapsed.value;
                return AnimatedPositioned(
                  duration: const Duration(milliseconds: 400),
                  curve: Curves.easeInOutCubic,
                  bottom: isCollapsed ? 90 : 320,
                  left: 16,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _buildSOSButton(context, primaryColor),
                      const SizedBox(height: 8),
                      _buildFullscreenButton(() {
                        Get.dialog(
                          Dialog(
                            insetPadding: EdgeInsets.zero,
                            child: Container(
                              color: Colors.grey[50],
                              child: Stack(
                                children: [
                                  Obx(() {
                                    if (controller.tripMapData.value != null) {
                                      return _buildFullScreenMap(context, controller.tripMapData.value!, primaryColor);
                                    }
                                    final currentLocation = controller.vehicleLocation.value;
                                    if (currentLocation != null) {
                                      return _buildCurrentLocationMap(context, currentLocation, primaryColor);
                                    }
                                    return Container(
                                      color: Colors.grey[100],
                                      child: const Center(
                                        child: Text('No trip data available'),
                                      ),
                                    );
                                  }),
                                  Positioned(
                                    bottom: 16,
                                    right: 16,
                                    child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        _buildZoomButton('assets/icons/zoom-in.png', () {
                                          _zoomIn();
                                        }),
                                        const SizedBox(height: 8),
                                        _buildZoomButton('assets/icons/zoom-out.png', () {
                                          _zoomOut();
                                        }),
                                        const SizedBox(height: 8),
                                        _buildExitFullscreenButton(() {
                                          Get.back();
                                        }),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }),
                    ],
                  ),
                );
              }),

              Obx(() {
                final isCollapsed = controller.isRouteStopsCollapsed.value;
                return AnimatedPositioned(
                  duration: const Duration(milliseconds: 400),
                  curve: Curves.easeInOutCubic,
                  bottom: isCollapsed ? 90 : 320,
                  right: 16,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _buildZoomButton('assets/icons/zoom-in.png', () {
                        _zoomIn();
                      }),
                      const SizedBox(height: 8),
                      _buildZoomButton('assets/icons/zoom-out.png', () {
                        _zoomOut();
                      }),
                      const SizedBox(height: 8),
                      _buildChildLocationButton(() {
                        controller.focusOnVehicle();
                      }),
                    ],
                  ),
                );
              }),
            ],
          ),
        );
      }),
    );
  }

  Widget _buildPageContent(BuildContext context, Color primaryColor) {
    if (controller.tripMapData.value != null) {
      return _buildFullScreenMap(context, controller.tripMapData.value!, primaryColor);
    }

    final currentLocation = controller.vehicleLocation.value;
    if (currentLocation != null) {
      return _buildCurrentLocationMap(context, currentLocation, primaryColor);
    }

    if (controller.assignedVehicleId != null &&
        controller.vehicleLocations.containsKey(controller.assignedVehicleId)) {
      return _buildCurrentLocationMap(
        context,
        controller.vehicleLocations[controller.assignedVehicleId]!,
        primaryColor,
      );
    }

    return _buildNoActiveTripView();
  }

  Widget _buildNoActiveTripView() {
    return Container(
      color: Colors.white,
      width: double.infinity,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Image.asset(
            'assets/images/nodata.png',
            width: 200,
            height: 200,
            fit: BoxFit.contain,
          ),
          const SizedBox(height: 24),
          const Text(
            'No Active Trip',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'There is no ongoing trip at the moment.',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[600],
              fontFamily: 'Poppins',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFullScreenMap(BuildContext context, ParentLiveTripData tripData, Color primaryColor) {
    return LiveTripMap(
      tripData: tripData,
      controller: controller,
      primaryColor: primaryColor,
      onMapCreated: (mapController) {
        // Map controller is now managed by the ParentHomeController
      },
    );
  }

  Widget _buildCurrentLocationMap(BuildContext context, LatLng currentLocation, Color primaryColor) {
    return CurrentLocationMapWithSocket(
      initialLocation: currentLocation,
      primaryColor: primaryColor,
      vehicleNumber: controller.assignedVehicleNumber ?? 'Unknown',
      vehicleId: controller.assignedVehicleId,
    );
  }

  final Map<String, Future<String>> _addressCache = {};

  Widget _buildRouteStopsCard(BuildContext context, Color primaryColor) {
    return Obx(() {
      final tripData = controller.tripMapData.value;
      
      if (tripData == null) {
        _addressCache.clear();
        return const SizedBox.shrink();
      }
      
      return GestureDetector(
        onVerticalDragEnd: (details) {
          if (details.primaryVelocity! > 500) {
            controller.isRouteStopsCollapsed.value = true;
          }
        },
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(24),
              topRight: Radius.circular(24),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.15),
                blurRadius: 20,
                spreadRadius: 2,
                offset: const Offset(0, -4),
              ),
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 8,
                spreadRadius: 0,
                offset: const Offset(0, -1),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Drag Handle
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(top: 12),
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Row(
                        //   mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        //   children: [
                        //     Text(
                        //       controller.isUpcomingTrip.value ? 'Upcoming Route' : 'Active Route',
                        //       style: TextStyle(
                        //         fontSize: 12,
                        //         fontWeight: FontWeight.w500,
                        //         color: Colors.grey[600],
                        //         letterSpacing: 0.5,
                        //         fontFamily: 'Poppins',
                        //       ),
                        //     ),
                        //     if (controller.isUpcomingTrip.value)
                        //       Container(
                        //         padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        //         decoration: BoxDecoration(
                        //           color: Colors.orange.withValues(alpha: 0.1),
                        //           borderRadius: BorderRadius.circular(4),
                        //           border: Border.all(
                        //             color: Colors.orange,
                        //             width: 1,
                        //           ),
                        //         ),
                        //         child: const Text(
                        //           'Upcoming Trip',
                        //           style: TextStyle(
                        //             fontSize: 10,
                        //             fontWeight: FontWeight.w500,
                        //             color: Colors.orange,
                        //             fontFamily: 'Poppins',
                        //           ),
                        //         ),
                        //       )
                        //     else if (tripData.associatedTripId.isNotEmpty)
                        //       Container(
                        //         padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        //         decoration: BoxDecoration(
                        //           color: Colors.green.withValues(alpha: 0.1),
                        //           borderRadius: BorderRadius.circular(4),
                        //           border: Border.all(
                        //             color: Colors.green,
                        //             width: 1,
                        //           ),
                        //         ),
                        //         child: const Text(
                        //           'Active Trip',
                        //           style: TextStyle(
                        //             fontSize: 10,
                        //             fontWeight: FontWeight.w500,
                        //             color: Colors.green,
                        //             fontFamily: 'Poppins',
                        //           ),
                        //         ),
                        //       ),
                        //   ],
                        // ),
                        // const SizedBox(height: 4),
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                tripData.routeName,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.black87,
                                  letterSpacing: -0.3,
                                  fontFamily: 'Poppins',
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 5),
                            GestureDetector(
                              onTap: () => _showCallDriverDialog(context, primaryColor),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: Colors.green.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.call,
                                      color: Colors.green[700],
                                      size: 14,
                                    ),
                                    const SizedBox(width: 5),
                                    Text(
                                      'Call Driver',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.green[700],
                                        fontFamily: 'Poppins',
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Obx(() => IconButton(
                    onPressed: controller.isFetchingTripMap.value ? null : () => controller.refreshCurrentTrip(),
                    iconSize: 20,
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    icon: controller.isFetchingTripMap.value 
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                        : Icon(Icons.refresh, color: primaryColor),
                    tooltip: 'Refresh Trip Data',
                  )),
                ],
              ),
            ),
            Divider(height: 1, color: Colors.grey[200], indent: 20, endIndent: 20),
            if (tripData.timeline.isNotEmpty)
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.25,
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                  itemCount: tripData.timeline.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 4),
                itemBuilder: (context, index) {
                  final stop = tripData.timeline[index];
                  final isLast = index == tripData.timeline.length - 1;
                  final isTargetStop = controller.targetLocation.value != null &&
                      (stop.location.latitude - controller.targetLocation.value!.latitude).abs() < 0.0001 &&
                      (stop.location.longitude - controller.targetLocation.value!.longitude).abs() < 0.0001;

                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Timeline indicator
                      Column(
                        children: [
                          if (isTargetStop)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 2),
                              child: Image.asset(
                                'assets/icons/homemarker.png',
                                width: 18,
                                height: 18,
                              ),
                            )
                          else
                            Container(
                              width: 10,
                              height: 10,
                              margin: const EdgeInsets.symmetric(vertical: 4),
                              decoration: BoxDecoration(
                                color: primaryColor,
                                shape: BoxShape.circle,
                              ),
                            ),
                          if (!isLast)
                            Container(
                              width: 2,
                              height: 32,
                              color: primaryColor.withValues(alpha: 0.3),
                            ),
                        ],
                      ),
                      const SizedBox(width: 14),

                      // Stop content
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            border: Border(
                              bottom: BorderSide(
                                color: Colors.grey.shade200,
                              ),
                            ),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      stop.name,
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.black87,
                                        fontFamily: 'Poppins',
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),

                                    if (stop.landmark.isNotEmpty)
                                      Text(
                                        'Landmark: ${stop.landmark}',
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: Colors.grey[400],
                                          fontFamily: 'Poppins',
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              if (stop.scheduledTime.isNotEmpty)
                                Text(
                                  'Estimated: ${stop.scheduledTime}',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.grey[600],
                                    fontFamily: 'Poppins',
                                  ),
                                ),
                              Icon(
                                Icons.chevron_right,
                                color: Colors.grey.shade400,
                                size: 22,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  });
}
}

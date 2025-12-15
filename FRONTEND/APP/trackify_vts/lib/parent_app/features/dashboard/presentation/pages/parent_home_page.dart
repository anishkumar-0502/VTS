import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:get/get.dart';
import 'dart:async';
import 'dart:math';
import 'dart:convert';
import 'dart:ui';
import 'package:latlong2/latlong.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shimmer/shimmer.dart';

import '../../../live-tracking/domain/models/live_tracking_model.dart';
import '../controllers/parent_home_controller.dart';
import 'package:geocoding/geocoding.dart';
import '../../../../shared/index.dart';
import 'package:trackify_vts/shared/widgets/modern_dialog.dart';
import '../../../live-tracking/presentation/pages/child_location_tracking_page.dart';
import '../../../live-tracking/presentation/bindings/child_location_tracking_binding.dart';
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
      print('❌ [VehicleInfoDialog] Failed to find ParentHomeController: $e');
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
          if (_address == null) {
            _address = 'Unable to fetch address';
          }
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
              
              String displayVehicleNumber = widget.vehicleNumber ?? 'N/A';
              
              if (widget.vehicleId != null && 
                  controller.vehicleNumbers.containsKey(widget.vehicleId)) {
                final vn = controller.vehicleNumbers[widget.vehicleId];
                if (vn != null && vn.isNotEmpty) {
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
                      print("🕐 [VehicleInfoDialog] Using live timestamp for $matchedVehicleId: $displayTime");
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
                          print("🕐 [VehicleInfoDialog] Found matching vehicle $vid with timestamp: $displayTime");
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

class _VehicleInfoLabelWidget extends StatefulWidget {
  final String vehicleNumber;
  final DateTime? baseTime;
  final Color primaryColor;
  final ParentHomeController controller;
  final String? vehicleId;

  const _VehicleInfoLabelWidget({
    required this.vehicleNumber,
    required this.baseTime,
    required this.primaryColor,
    required this.controller,
    this.vehicleId,
  });

  @override
  State<_VehicleInfoLabelWidget> createState() => _VehicleInfoLabelWidgetState();
}

class _VehicleInfoLabelWidgetState extends State<_VehicleInfoLabelWidget> {
  late Timer _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  String _getDisplayTime() {
    DateTime? displayTime;
    
    if (widget.vehicleId != null) {
      final controllerTimestamp = widget.controller.vehicleTimestamps[widget.vehicleId];
      if (controllerTimestamp != null) {
        displayTime = controllerTimestamp;
      }
    }
    
    if (displayTime == null && widget.baseTime != null) {
      displayTime = widget.baseTime;
    }
    
    if (displayTime == null) {
      return 'N/A';
    }
    
    final now = DateTime.now();
    final difference = now.difference(displayTime);
    final elapsedSeconds = difference.inSeconds;
    
    final updatedTime = displayTime.add(Duration(seconds: elapsedSeconds));
    return '${updatedTime.hour.toString().padLeft(2, '0')}:${updatedTime.minute.toString().padLeft(2, '0')}:${updatedTime.second.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      if (widget.vehicleId != null && widget.controller.vehicleTimestamps.containsKey(widget.vehicleId)) {
        widget.controller.vehicleTimestamps[widget.vehicleId];
      }
      
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: widget.primaryColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white, width: 1),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 4,
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              widget.vehicleNumber,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              _getDisplayTime(),
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.w500,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      );
    });
  }
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
    mapController = MapController();
    _animationController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );
    _animation = Tween<double>(begin: 0.0, end: 1.0).animate(_animationController);
    
    try {
      controller = Get.find<ParentHomeController>(tag: 'home');
    } catch (e) {
      print('❌ [CurrentLocationMapWithSocket] Failed to find ParentHomeController: $e');
      rethrow;
    }
    currentLocation = widget.initialLocation;
    animatedLocation = widget.initialLocation;
    _previousLocation = widget.initialLocation;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_isDisposed && controller.shouldAutoZoomOnFirstLogin()) {
        mapController.move(widget.initialLocation, 15.0);
        controller.markAutoZoomComplete();
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

  void _showVehicleInfoPopup(BuildContext context) {
    double latitude = animatedLocation?.latitude ?? currentLocation?.latitude ?? 0.0;
    double longitude = animatedLocation?.longitude ?? currentLocation?.longitude ?? 0.0;
    
    String? vehicleNumber;
    if (widget.vehicleId != null && controller.vehicleNumbers.containsKey(widget.vehicleId)) {
      vehicleNumber = controller.vehicleNumbers[widget.vehicleId];
    }
    
    print("🔍 [_showVehicleInfoPopup] Vehicle ID: ${widget.vehicleId}");
    print("🔍 [_showVehicleInfoPopup] Vehicle Number: $vehicleNumber");
    print("🔍 [_showVehicleInfoPopup] Timestamp: $lastMovementTime");

    showDialog(
      context: context,
      builder: (BuildContext context) {
        return VehicleInfoDialog(
          latitude: latitude,
          longitude: longitude,
          primaryColor: widget.primaryColor,
          timestamp: lastMovementTime,
          vehicleId: widget.vehicleId,
          vehicleNumber: vehicleNumber,
        );
      },
    );
  }

  void _showOldVehicleInfoPopup(BuildContext context) {
    String vehicleNumber = widget.vehicleNumber ?? 'Unknown Vehicle';
    String movementTime = lastMovementTime != null
        ? '${lastMovementTime!.hour.toString().padLeft(2, '0')}:${lastMovementTime!.minute.toString().padLeft(2, '0')}:${lastMovementTime!.second.toString().padLeft(2, '0')}'
        : 'N/A';
    String movementDate = lastMovementTime != null
        ? '${lastMovementTime!.day}/${lastMovementTime!.month}/${lastMovementTime!.year}'
        : 'N/A';

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
                    color: widget.primaryColor.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.directions_bus,
                    color: widget.primaryColor,
                    size: 28,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Vehicle Information',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: widget.primaryColor,
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Vehicle Number',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      vehicleNumber,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: widget.primaryColor,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Movement Date',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      movementDate,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Movement Time',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      movementTime,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
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
      },
    );
  }

  @override
  void dispose() {
    _isDisposed = true;
    _animationController.dispose();
    mapController.dispose();
    super.dispose();
  }

  Marker _buildVehicleInfoMarker(LatLng displayLocation) {
    String displayVehicleNumber = widget.vehicleNumber ?? 'Vehicle';
    
    if (widget.vehicleId != null) {
      if (controller.vehicleNumbers.containsKey(widget.vehicleId)) {
        final vn = controller.vehicleNumbers[widget.vehicleId];
        if (vn != null && vn.isNotEmpty) {
          displayVehicleNumber = vn;
        }
      }
    }
    
    return Marker(
      width: 140.0,
      height: 60.0,
      point: displayLocation,
      alignment: Alignment.topCenter,
      child: Transform.translate(
        offset: const Offset(0, -65),
        child: _VehicleInfoLabelWidget(
          vehicleNumber: displayVehicleNumber,
          baseTime: lastMovementTime,
          primaryColor: widget.primaryColor,
          controller: controller,
          vehicleId: widget.vehicleId,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final vehicleLocation = controller.currentVehicleLocation.value ?? 
                            controller.vehicleLocations[widget.vehicleId] ?? 
                            currentLocation;
      
      if (vehicleLocation != null && currentLocation != vehicleLocation) {
        currentLocation = vehicleLocation;
        lastMovementTime = DateTime.now();
        if (locationHistory.isEmpty || 
            _calculateDistance(locationHistory.last, vehicleLocation) > 0.0001) {
          locationHistory.add(vehicleLocation);
        }
        
        _animateToNewLocation(vehicleLocation);
      }

      final displayLocation = animatedLocation ?? vehicleLocation ?? currentLocation ?? widget.initialLocation;
      
      return FlutterMap(
        mapController: mapController,
        options: MapOptions(
          initialCenter: displayLocation,
          initialZoom: 13.0,
          backgroundColor: Colors.grey[100]!,
          interactionOptions: const InteractionOptions(
            flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
          ),
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.example.trackifyvts',
            tileSize: 256,
          ),
          PolylineLayer(
            polylines: [
              if (controller.routePolylinePoints.isNotEmpty)
                Polyline(
                  points: controller.routePolylinePoints,
                  color: Colors.white,
                  strokeWidth: 6.0,
                ),
              if (controller.routePolylinePoints.isNotEmpty)
                Polyline(
                  points: controller.routePolylinePoints,
                  color: widget.primaryColor.withValues(alpha: 0.20),
                  strokeWidth: 3.5,
                ),
              if (controller.routePolylinePoints.isEmpty && locationHistory.isNotEmpty)
                Polyline(
                  points: locationHistory,
                  color: Colors.white,
                  strokeWidth: 6.0,
                ),
              if (controller.routePolylinePoints.isEmpty && locationHistory.isNotEmpty)
                Polyline(
                  points: locationHistory,
                  color: widget.primaryColor.withValues(alpha: 0.20),
                  strokeWidth: 3.5,
                ),
            ],
          ),
          MarkerLayer(
            markers: [
              if (displayLocation != null)
                Marker(
                  width: 50.0,
                  height: 50.0,
                  point: displayLocation,
                  child: GestureDetector(
                    onTap: () {
                      _showVehicleInfoPopup(context);
                    },
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: widget.primaryColor,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 3),
                        boxShadow: [
                          BoxShadow(
                            color: widget.primaryColor.withValues(alpha: 0.6),
                            blurRadius: 12,
                            spreadRadius: 3,
                          ),
                        ],
                      ),
                      child: const Icon(Icons.directions_bus, color: Colors.white, size: 24),
                    ),
                  ),
                ),
              if (displayLocation != null)
                _buildVehicleInfoMarker(displayLocation),
            ],
          ),
        ],
      );
    });
  }
}

class _LocationPinPainter extends CustomPainter {
  final Color color;

  _LocationPinPainter(this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    canvas.drawCircle(Offset(size.width / 2, size.height / 2), size.width / 2, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

Widget _buildShimmerLoading(Color primaryColor) {
  return const DashboardPageSkeleton();
}

class ParentHomePage extends GetView<ParentHomeController> {
  ParentHomePage({super.key});
  
  @override
  String? get tag => 'home';

  final RxBool showRouteBanner = false.obs;
  Timer? _bannerTimer;

  void _showRouteBannerTemporarily() {
    _bannerTimer?.cancel();
    showRouteBanner.value = true;
    _bannerTimer = Timer(const Duration(seconds: 5), () {
      showRouteBanner.value = false;
    });
  }

  late MapController _mapController;

  void _zoomIn() {
    if (_mapController != null) {
      _mapController.move(_mapController.camera.center, _mapController.camera.zoom + 1);
    }
  }

  void _zoomOut() {
    if (_mapController != null) {
      _mapController.move(_mapController.camera.center, _mapController.camera.zoom - 1);
    }
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

  void _showAssignedVehicleInfoPopup(BuildContext context, Color primaryColor) {
    final vehicleLocation = controller.assignedVehicleId != null 
        ? controller.vehicleLocations[controller.assignedVehicleId]
        : null;
    
    final vehicleTimestamp = controller.assignedVehicleId != null 
        ? controller.vehicleTimestamps[controller.assignedVehicleId]
        : null;
    
    final vehicleNumber = controller.assignedVehicleNumber ?? 
        (controller.assignedVehicleId != null 
          ? controller.vehicleNumbers[controller.assignedVehicleId]
          : null);
    
    double latitude = vehicleLocation?.latitude ?? 0.0;
    double longitude = vehicleLocation?.longitude ?? 0.0;

    showDialog(
      context: context,
      builder: (BuildContext context) {
        return VehicleInfoDialog(
          latitude: latitude,
          longitude: longitude,
          primaryColor: primaryColor,
          timestamp: vehicleTimestamp,
          vehicleId: controller.assignedVehicleId,
          vehicleNumber: vehicleNumber,
        );
      },
    );
  }

  Future<void> _showSOSDialog(BuildContext context, Color primaryColor) async {
    try {
      showDialog(
        context: context,
        barrierDismissible: false,
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
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.red.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Image.asset(
                          'assets/icons/sos.png',
                          width: 24,
                          height: 24,
                          color: Colors.red[800],
                        ),
                      ),
                      Expanded(
                        child: Align(
                          alignment: Alignment.center,
                          child: const Text(
                            'SOS Contact',
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w600,
                              color: Colors.black87,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Obx(() {
                    final sosContact = controller.parentProfile.value?.sosContact;
                    
                    if (sosContact == null) {
                      return const Text(
                        'Loading SOS contact...',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey,
                        ),
                      );
                    }
                    
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          sosContact.name,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          sosContact.phoneNumber.toString(),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: Colors.red[700],
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    );
                  }),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: ModernDialogButton(
                      label: 'Call',
                      icon: Icons.call,
                      backgroundColor: Colors.red,
                      onPressed: () async {
                        final sosContact = controller.parentProfile.value?.sosContact;
                        if (sosContact != null) {
                          String phoneNumber = sosContact.phoneNumber.toString();
                          phoneNumber = phoneNumber.replaceAll(RegExp(r'[^\d+]'), '');
                          
                          if (phoneNumber.isEmpty) {
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Invalid phone number')),
                              );
                            }
                            return;
                          }
                          
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
}

                        }
                      },
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: ModernDialogButton(
                      label: 'Close',
                      icon: Icons.close,
                      backgroundColor: Colors.grey[600]!,
                      onPressed: () => Navigator.pop(context),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      );

      await controller.fetchParentProfile();
    } catch (e) {
      print('Error showing SOS dialog: $e');
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
                      color: Colors.green.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.phone,
                      color: Colors.green,
                      size: 32,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Call Driver',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.green,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Obx(() {
                    if (isFetching.value) {
                      return const SizedBox(
                        height: 60,
                        child: Center(
                          child: CircularProgressIndicator(),
                        ),
                      );
                    }

                    if (errorMessage.value.isNotEmpty) {
                      return Text(
                        errorMessage.value,
                        style: const TextStyle(
                          fontSize: 16,
                          color: Colors.red,
                        ),
                        textAlign: TextAlign.center,
                      );
                    }

                    if (driverName.value.isEmpty) {
                      return const Text(
                        'Loading driver contact...',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey,
                        ),
                      );
                    }

                    return Column(
                      children: [
                        Text(
                          driverName.value,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: Colors.black87,
                          ),
                          textAlign: TextAlign.center,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.phone, color: Colors.green, size: 18),
                            const SizedBox(width: 8),
                            Text(
                              driverPhone.value,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w500,
                                color: Colors.green,
                                letterSpacing: 1,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.directions_bus, color: Colors.blue, size: 18),
                            const SizedBox(width: 8),
                            Text(
                              vehicleNumber.value,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w500,
                                color: Colors.blue,
                              ),
                            ),
                          ],
                        ),
                      ],
                    );
                  }),
                  const SizedBox(height: 32),
                  SizedBox(
                    width: double.infinity,
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
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.call, color: Colors.white),
                          const SizedBox(width: 8),
                          const Text(
                            'Call Driver',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        side: const BorderSide(color: Colors.grey),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text(
                        'Close',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey,
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
    } catch (e) {
      print('Error showing call driver dialog: $e');
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

      final token = Get.find<SessionController>().token.value;
      final tripData = controller.tripMapData.value;

      if (token.isEmpty || tripData == null) {
        errorMessage.value = 'Unable to fetch driver details';
        return;
      }

      final tripId = tripData.associatedTripId;
      final childId = Get.find<SessionController>().parentData.value?['end_user_id']?.toString() ?? '';

      if (tripId.isEmpty || childId.isEmpty) {
        errorMessage.value = 'Missing trip or child ID';
        return;
      }

      final baseUrl = trackify_vts.baseUrl;
      final url = Uri.parse('$baseUrl/parent/driver-contact?tripId=$tripId&childId=$childId');

      final response = await http.get(
        url,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final jsonBody = json.decode(response.body);
        final data = jsonBody['data'] as Map<String, dynamic>?;

        if (data != null) {
          driverName.value = data['driver_name']?.toString() ?? 'Unknown';
          driverPhone.value = data['driver_phone']?.toString() ?? '';
          vehicleNumber.value = data['vehicle_number']?.toString() ?? 'N/A';
        } else {
          errorMessage.value = 'No driver data found';
        }
      } else {
        errorMessage.value = 'Failed to fetch driver contact';
      }
    } catch (e) {
      print('Error fetching driver contact: $e');
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
        print('Error: Token or trip data missing');
        return;
      }

      final tripId = tripData.associatedTripId;
      final childId = Get.find<SessionController>().parentData.value?['end_user_id']?.toString() ?? '';

      if (tripId.isEmpty || childId.isEmpty) {
        print('Error: Missing trip or child ID');
        return;
      }

      final baseUrl = trackify_vts.baseUrl;
      final url = Uri.parse('$baseUrl/parent/call-driver');
      final requestBody = {
        'tripId': tripId,
        'childId': childId,
      };

      print('═══════════════════════════════════════════════════════');
      print('📞 CALLING DRIVER');
      print('═══════════════════════════════════════════════════════');
      print('URL: $url');
      print('Request Body: ${json.encode(requestBody)}');

      final response = await http.post(
        url,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode(requestBody),
      ).timeout(const Duration(seconds: 15));

      print('Status Code: ${response.statusCode}');
      print('Response Body: ${response.body}');

      if (response.statusCode == 200) {
        final jsonBody = json.decode(response.body);
        final data = jsonBody['data'] as Map<String, dynamic>?;
        
        print('\n✅ CALL INITIATED SUCCESSFULLY');
        print('Call ID: ${data?['call_id']}');
        print('Driver Phone: ${data?['driver_phone']}');
        print('Driver Name: ${data?['driver_name']}');
        print('═══════════════════════════════════════════════════════\n');
      } else {
        print('❌ Failed to initiate call with backend');
        print('═══════════════════════════════════════════════════════\n');
      }
    } catch (e) {
      print('❌ Error initiating call with backend: $e');
      print('═══════════════════════════════════════════════════════\n');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;

    try {
      Get.find<ParentHomeController>(tag: 'home');
    } catch (e) {
      print('❌ [ParentHomePage] Controller not found: $e - Registering now');
      try {
        Get.put<ParentHomeController>(
          ParentHomeController(),
          tag: 'home',
          permanent: true,
        );
        print('✅ [ParentHomePage] ParentHomeController registered');
      } catch (regError) {
        print('❌ [ParentHomePage] Failed to register controller: $regError');
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
                'Trackify',
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
              Positioned(
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
                  child: Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: Colors.green[500],
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.green.withValues(alpha: 0.5),
                              blurRadius: 4,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'Trip Active',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey[800],
                          fontFamily: 'Poppins',
                        ),
                      ),
                      const Spacer(),
                      Text(
                        'Real-time tracking enabled',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: Colors.grey[500],
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              
              _buildPageContent(context, primaryColor),

              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: _buildRouteStopsCard(context, primaryColor),
              ),

              Positioned(
                bottom: 300,
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
                                  final currentLocation = controller.currentVehicleLocation.value;
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
              ),

              Positioned(
                bottom: 300,
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
         final controller = Get.find<ParentHomeController>(tag: 'home'); 

    // Assuming the child ID is available in the parentProfile
    final childId = controller.parentProfile.value?.endUserId; 

    if (childId != null && childId.isNotEmpty) {
      // ... rest of the navigation logic
      Get.to(
        () => const ChildLocationTrackingPage(), 
        binding: ChildLocationTrackingBinding(),
        arguments: {
          'childId': childId,
        },
        transition: Transition.rightToLeft,
        duration: const Duration(milliseconds: 350),
      );
    } else {
      Get.snackbar('Error', 'Child ID not found for tracking.', snackPosition: SnackPosition.BOTTOM);
    }
        }),
                  ],
                ),
              ),
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

    final currentLocation = controller.currentVehicleLocation.value;
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

    return Container(
      color: Colors.grey[100],
      child: const Center(
        child: Text('No trip data available'),
      ),
    );
  }

  Widget _buildFullScreenMap(BuildContext context, ParentLiveTripData tripData, Color primaryColor) {
    final mapController = MapController();
    _mapController = mapController;
    
    return Obx(() {
      final currentLocation = controller.currentVehicleLocation.value;
      
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (currentLocation != null) {
          mapController.move(currentLocation, 13.0);
        }
      });
      
      return FlutterMap(
        mapController: mapController,
        options: MapOptions(
          initialCenter: currentLocation ?? tripData.startLocation,
          initialZoom: currentLocation != null ? 13.0 : 13.0,
          backgroundColor: Colors.grey[100]!,
          interactionOptions: const InteractionOptions(
            flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
          ),
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.example.trackifyvts',
            tileSize: 256,
          ),
          Obx(() {
            final routePoints = controller.routePolylinePoints;
            final currentVehicleLocation = controller.currentVehicleLocation.value;
            
            final fullRoute = [
              tripData.startLocation,
              ...tripData.timeline.map((stop) => stop.location),
              tripData.endLocation,
            ];
            
            if (routePoints.isEmpty) {
              return PolylineLayer(
                polylines: [
                  Polyline(
                    points: fullRoute,
                    color: primaryColor.withValues(alpha: 0.12),
                    strokeWidth: 2.5,
                  ),
                ],
              );
            }
            return PolylineLayer(
              polylines: [
                Polyline(
                  points: routePoints,
                  color: Colors.white,
                  strokeWidth: 6.0,
                ),
                Polyline(
                  points: routePoints,
                  color: primaryColor.withValues(alpha: 0.20),
                  strokeWidth: 3.5,
                ),
              ],
            );
          }),
          Obx(() {
            final markers = <Marker>[
              Marker(
                width: 32.0,
                height: 32.0,
                point: tripData.startLocation,
                alignment: Alignment.center,
                child: GestureDetector(
                  onTap: () async {
                    final address = await getAddressFromLatLng(
                      tripData.startLocation.latitude,
                      tripData.startLocation.longitude,
                    );
                    showAddressPopup(context, 'Start Location', address, primaryColor);
                  },
                  child: const Icon(
                    Icons.location_on,
                    color: Colors.green,
                    size: 32,
                  ),
                ),
              ),
              ...tripData.timeline.asMap().entries.map((entry) {
                final index = entry.key + 1;
                final stop = entry.value;
                return Marker(
                  width: 32.0,
                  height: 32.0,
                  point: stop.location,
                  alignment: Alignment.center,
                  child: GestureDetector(
                    onTap: () async {
                      final address = await getAddressFromLatLng(
                        stop.location.latitude,
                        stop.location.longitude,
                      );
                      showAddressPopup(context, 'Stop $index', address, primaryColor);
                    },
                    child: const Icon(
                      Icons.location_on,
                      color: Colors.blue,
                      size: 32,
                    ),
                  ),
                );
              }),
              Marker(
                width: 32.0,
                height: 32.0,
                point: tripData.endLocation,
                alignment: Alignment.center,
                child: GestureDetector(
                  onTap: () async {
                    final address = await getAddressFromLatLng(
                      tripData.endLocation.latitude,
                      tripData.endLocation.longitude,
                    );
                    showAddressPopup(context, 'End Location', address, primaryColor);
                  },
                  child: const Icon(
                    Icons.location_on,
                    color: Colors.red,
                    size: 32,
                  ),
                ),
              ),
              if (controller.assignedVehicleId != null &&
                  controller.vehicleLocations.containsKey(controller.assignedVehicleId)) ...[
                Marker(
                  width: 50.0,
                  height: 50.0,
                  point: controller.vehicleLocations[controller.assignedVehicleId]!,
                  child: GestureDetector(
                    onTap: () {
                      _showAssignedVehicleInfoPopup(context, primaryColor);
                    },
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: primaryColor.withValues(alpha: 0.7),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 3),
                        boxShadow: [
                          BoxShadow(
                            color: primaryColor.withValues(alpha: 0.3),
                            blurRadius: 12,
                            spreadRadius: 3,
                          ),
                        ],
                      ),
                      child: const Icon(Icons.directions_bus, color: Colors.white, size: 24),
                    ),
                  ),
                ),
                Marker(
                  width: 100.0,
                  height: 30.0,
                  point: controller.vehicleLocations[controller.assignedVehicleId]!,
                  alignment: Alignment.topCenter,
                  child: Transform.translate(
                    offset: const Offset(0, -35),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: primaryColor,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white, width: 1),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.3),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                      child: Text(
                        controller.assignedVehicleNumber ?? 'Vehicle',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                ),
              ],
            ];
            return MarkerLayer(markers: markers);
          }),
        ],
      );
    });
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

  Future<String> _getCachedAddress(double lat, double lng) {
    final key = '${lat}_$lng';
    if (!_addressCache.containsKey(key)) {
      _addressCache[key] = getAddressFromLatLng(lat, lng);
    }
    return _addressCache[key]!;
  }

  Widget _buildRouteStopsCard(BuildContext context, Color primaryColor) {
    return Obx(() {
      final tripData = controller.tripMapData.value;
      
      if (tripData == null) {
        _addressCache.clear();
        return const SizedBox.shrink();
      }
      
      return Container(
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
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 14),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Active Route',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: Colors.grey[600],
                            letterSpacing: 0.5,
                            fontFamily: 'Poppins',
                          ),
                        ),
                        const SizedBox(height: 4),
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
                ],
              ),
            ),
            Divider(height: 1, color: Colors.grey[200], indent: 20, endIndent: 20),
            if (tripData.timeline.isNotEmpty)
              SizedBox(
                height: 200,
                child: ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                  scrollDirection: Axis.horizontal,
                  itemCount: tripData.timeline.length,
                  itemBuilder: (context, index) {
                    final stop = tripData.timeline[index];
                    final isActive = index == 0;
                    
                    return Padding(
                      padding: const EdgeInsets.only(right: 14),
                      child: Container(
                        width: 200,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(14),
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: isActive
                                ? [
                                    Colors.green.withValues(alpha: 0.6),
                                    Colors.green.withValues(alpha: 0.3),
                                  ]
                                : [
                                    Colors.blue.withValues(alpha: 0.5),
                                    Colors.blue.withValues(alpha: 0.2),
                                  ],
                          ),
                        ),
                        padding: const EdgeInsets.all(1.5),
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12.5),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: isActive ? 0.08 : 0.05),
                                blurRadius: 12,
                                spreadRadius: 0,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: primaryColor.withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(
                                          color: primaryColor.withValues(alpha: 0.2),
                                          width: 0.5,
                                        ),
                                      ),
                                      child: Text(
                                        'Stop ${index + 1}',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                          color: primaryColor,
                                          letterSpacing: 0.4,
                                          fontFamily: 'Poppins',
                                        ),
                                      ),
                                    ),
                                    const Spacer(),
                                    if (isActive)
                                      Container(
                                        width: 8,
                                        height: 8,
                                        decoration: BoxDecoration(
                                          color: Colors.green[500],
                                          shape: BoxShape.circle,
                                          boxShadow: [
                                            BoxShadow(
                                              color: Colors.green.withValues(alpha: 0.4),
                                              blurRadius: 6,
                                              spreadRadius: 1,
                                            ),
                                          ],
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  stop.name,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.black87,
                                    letterSpacing: -0.3,
                                    fontFamily: 'Poppins',
                                    height: 1.2,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 8),
                                FutureBuilder<String>(
                                  future: _getCachedAddress(
                                    stop.location.latitude,
                                    stop.location.longitude,
                                  ),
                                  builder: (context, snapshot) {
                                    if (snapshot.connectionState == ConnectionState.waiting) {
                                      return Text(
                                        'Loading...',
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: Colors.grey[400],
                                          fontWeight: FontWeight.w500,
                                          fontFamily: 'Poppins',
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      );
                                    }
                                    
                                    final address = snapshot.data ?? 'Unknown location';
                                    return Text(
                                      address,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: Colors.grey[500],
                                        fontWeight: FontWeight.w500,
                                        height: 1.35,
                                        fontFamily: 'Poppins',
                                      ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    );
                                  },
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
      );
    });
  }
}

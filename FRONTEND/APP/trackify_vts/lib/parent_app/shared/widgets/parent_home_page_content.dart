import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'dart:async';
import 'dart:math';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geocoding/geocoding.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../features/dashboard/presentation/controllers/parent_home_controller.dart';
import '../../features/dashboard/presentation/pages/parent_home_page.dart';
import '../../features/live-tracking/domain/models/live_tracking_model.dart';

class ParentHomePageContent extends GetView<ParentHomeController> {
  ParentHomePageContent({super.key});

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
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.emergency,
                      color: Colors.red,
                      size: 32,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'SOS Contact',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.red,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Obx(() {
                    final sosContact = controller.parentProfile.value?.sosContact;
                    
                    if (sosContact == null) {
                      return const Text(
                        'Loading SOS contact...',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey,
                        ),
                      );
                    }
                    
                    return Column(
                      children: [
                        Text(
                          sosContact.name,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          sosContact.phoneNumber.toString(),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                            color: Colors.grey,
                            letterSpacing: 1,
                          ),
                        ),
                      ],
                    );
                  }),
                  const SizedBox(height: 32),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
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
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
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
                            'Call',
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

      await controller.fetchParentProfile();
    } catch (e) {
      debugPrint('Error showing SOS dialog: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      controller.triggerPageVisibilityRefresh();
    });

    return Stack(
      children: [
        Obx(() {
          if (controller.tripMapData.value != null) {
            return _buildFullScreenMap(context, controller.tripMapData.value!, primaryColor);
          }

          if (controller.assignedVehicleId != null &&
              controller.vehicleLocations.containsKey(controller.assignedVehicleId)) {
            return _buildCurrentLocationMap(
              context,
              controller.vehicleLocations[controller.assignedVehicleId]!,
              primaryColor,
            );
          }

          final currentLocation = controller.currentVehicleLocation.value;
          if (currentLocation != null) {
            return _buildCurrentLocationMap(context, currentLocation, primaryColor);
          }

          if (controller.isFetchingTripMap.value) {
            return Container(
              color: Colors.grey[200],
              child: const Center(child: CircularProgressIndicator()),
            );
          }

          return Container(
            color: Colors.grey[200],
            child: const Center(
              child: Text('No trip data available'),
            ),
          );
        }),
        Positioned(
          bottom: 5,
          right: 5,
          child: GestureDetector(
            onTap: () => _showSOSDialog(context, primaryColor),
            child: Container(
              width: 50,
              height: 55,
              decoration: BoxDecoration(
                color: Colors.red,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.red.withValues(alpha: 0.5),
                    blurRadius: 16,
                    spreadRadius: 4,
                  ),
                ],
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () => _showSOSDialog(context, primaryColor),
                  borderRadius: BorderRadius.circular(45),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.emergency,
                          color: Colors.white,
                          size: 30,
                        ),
                        const SizedBox(height: 1),
                        const Text(
                          'SOS',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
        Positioned(
          bottom: 65,
          left: 0,
          right: 0,
          child: Obx(() {
            if (controller.tripMapData.value != null && showRouteBanner.value) {
              final tripData = controller.tripMapData.value!;
              final startTime = tripData.scheduledStartTime;
              return AnimatedOpacity(
                opacity: showRouteBanner.value ? 1.0 : 0.0,
                duration: const Duration(milliseconds: 200),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: primaryColor,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.2),
                        blurRadius: 12,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              tripData.routeName,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Start Time: $startTime',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.white70,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }
            return const SizedBox.shrink();
          }),
        ),
        Positioned(
          bottom: 5,
          left: 5,
          child: Obx(() {
            if (controller.tripMapData.value != null) {
              return GestureDetector(
                onTap: _showRouteBannerTemporarily,
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.15),
                        blurRadius: 12,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: Icon(
                    Icons.home,
                    color: primaryColor,
                    size: 28,
                  ),
                ),
              );
            }
            return const SizedBox.shrink();
          }),
        ),
      ],
    );
  }

  Widget _buildFullScreenMap(BuildContext context, ParentLiveTripData tripData, Color primaryColor) {
    return Obx(() {
      final currentLocation = controller.currentVehicleLocation.value;
      final double scale = (controller.currentZoom.value / 13.0).clamp(0.6, 2.0);
      
      return FlutterMap(
        options: MapOptions(
          initialCenter: currentLocation ?? tripData.startLocation,
          initialZoom: 13.0,
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
          Obx(() {
            final double innerScale = (controller.currentZoom.value / 13.0).clamp(0.6, 2.0);
            final routePoints = controller.routePolylinePoints;
            
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
                    color: primaryColor.withValues(alpha: 0.3),
                    strokeWidth: 2.5 * innerScale,
                  ),
                ],
              );
            }
            return PolylineLayer(
              polylines: [
                Polyline(
                  points: routePoints,
                  color: Colors.white,
                  strokeWidth: 6.0 * innerScale,
                ),
                Polyline(
                  points: routePoints,
                  color: primaryColor,
                  strokeWidth: 3.5 * innerScale,
                ),
              ],
            );
          }),
          Obx(() {
            final double innerScale = (controller.currentZoom.value / 13.0).clamp(0.6, 2.0);
            final isTargetStart = controller.targetLocation.value != null &&
                (tripData.startLocation.latitude - controller.targetLocation.value!.latitude).abs() < 0.0001 &&
                (tripData.startLocation.longitude - controller.targetLocation.value!.longitude).abs() < 0.0001;

            final isTargetEnd = controller.targetLocation.value != null &&
                (tripData.endLocation.latitude - controller.targetLocation.value!.latitude).abs() < 0.0001 &&
                (tripData.endLocation.longitude - controller.targetLocation.value!.longitude).abs() < 0.0001;

            final markers = <Marker>[
              if (!isTargetStart)
                Marker(
                  width: 40.0 * innerScale,
                  height: 40.0 * innerScale,
                  point: tripData.startLocation,
                  child: GestureDetector(
                    onTap: () async {
                      final address = await getAddressFromLatLng(
                        tripData.startLocation.latitude,
                        tripData.startLocation.longitude,
                      );
                      showAddressPopup(context, 'Start Location', address, primaryColor);
                    },
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.green,
                        borderRadius: BorderRadius.circular(50),
                        border: Border.all(color: Colors.white, width: 2),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.2),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                      child: Icon(Icons.location_on, color: Colors.white, size: 20 * innerScale),
                    ),
                  ),
                ),
              ...tripData.timeline.asMap().entries.map((entry) {
                final index = entry.key + 1;
                final stop = entry.value;
                final isTargetStop = controller.targetLocation.value != null &&
                    (stop.location.latitude - controller.targetLocation.value!.latitude).abs() < 0.0001 &&
                    (stop.location.longitude - controller.targetLocation.value!.longitude).abs() < 0.0001;

                return Marker(
                  width: 40.0 * innerScale,
                  height: 40.0 * innerScale,
                  point: stop.location,
                  child: GestureDetector(
                    onTap: () async {
                      final address = await getAddressFromLatLng(
                        stop.location.latitude,
                        stop.location.longitude,
                      );
                      showAddressPopup(context, isTargetStop ? 'Your Location' : 'Stop $index', address, primaryColor);
                    },
                    child: isTargetStop
                        ? Image.asset(
                            'assets/icons/homemarker.png',
                            width: 40.0 * innerScale,
                            height: 40.0 * innerScale,
                          )
                        : Container(
                            decoration: BoxDecoration(
                              color: Colors.orange,
                              borderRadius: BorderRadius.circular(50),
                              border: Border.all(color: Colors.white, width: 2),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.2),
                                  blurRadius: 4,
                                ),
                              ],
                            ),
                            child: Center(
                              child: Text(
                                index.toString(),
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14 * innerScale,
                                ),
                              ),
                            ),
                          ),
                  ),
                );
              }),
              if (!isTargetEnd)
                Marker(
                  width: 40.0 * innerScale,
                  height: 40.0 * innerScale,
                  point: tripData.endLocation,
                  child: GestureDetector(
                    onTap: () async {
                      final address = await getAddressFromLatLng(
                        tripData.endLocation.latitude,
                        tripData.endLocation.longitude,
                      );
                      showAddressPopup(context, 'End Location', address, primaryColor);
                    },
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(50),
                        border: Border.all(color: Colors.white, width: 2),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.2),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                      child: Icon(Icons.location_on, color: Colors.white, size: 20 * innerScale),
                    ),
                  ),
                ),
              if (controller.assignedVehicleId != null &&
                  controller.vehicleLocations.containsKey(controller.assignedVehicleId)) ...[
                Marker(
                  width: 50.0 * innerScale,
                  height: 50.0 * innerScale,
                  point: controller.vehicleLocations[controller.assignedVehicleId]!,
                  child: GestureDetector(
                    onTap: () {
                      _showAssignedVehicleInfoPopup(context, primaryColor);
                    },
                    child: Transform.rotate(
                      angle: (controller.vehicleHeadings[controller.assignedVehicleId] ?? 0.0) * (pi / 180),
                      child: Container(
                        padding: EdgeInsets.all(6 * innerScale),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.2),
                              blurRadius: 4 * innerScale,
                            ),
                          ],
                        ),
                        child: Icon(
                          Icons.navigation,
                          color: Colors.blueAccent,
                          size: 30 * innerScale,
                        ),
                      ),
                    ),
                  ),
                ),
                Marker(
                  width: 100.0 * innerScale,
                  height: 30.0 * innerScale,
                  point: controller.vehicleLocations[controller.assignedVehicleId]!,
                  alignment: Alignment.topCenter,
                  child: Transform.translate(
                    offset: Offset(0, -35 * innerScale),
                    child: Container(
                      padding: EdgeInsets.symmetric(horizontal: 8 * innerScale, vertical: 4 * innerScale),
                      decoration: BoxDecoration(
                        color: primaryColor,
                        borderRadius: BorderRadius.circular(12 * innerScale),
                        border: Border.all(color: Colors.white, width: 1),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.3),
                            blurRadius: 4 * innerScale,
                          ),
                        ],
                      ),
                      child: Text(
                        controller.assignedVehicleNumber ?? 'Vehicle',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11 * innerScale,
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
}

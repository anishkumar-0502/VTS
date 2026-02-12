  import 'package:flutter/material.dart';
  import 'package:flutter_map/flutter_map.dart';
  import 'package:get/get.dart';
  import 'package:latlong2/latlong.dart';

  import '../controllers/child_location_tracking_controller.dart';
  import '../../../../shared/widgets/shimmer_skeletons.dart';

  class ChildLocationTrackingPage extends GetView<ChildLocationTrackingController> {
    const ChildLocationTrackingPage({Key? key}) : super(key: key);

    @override
    Widget build(BuildContext context) {
      final theme = Theme.of(context);
      final primaryColor = theme.colorScheme.primary;

      return Scaffold(
        extendBodyBehindAppBar: true,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: Container(
            margin: const EdgeInsets.only(left: 16, top: 8, bottom: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.black87),
              onPressed: () => Get.back(),
              iconSize: 20,
            ),
          ),
          title: Container(
             padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Colors.green,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                const Text(
                  "Child Location",
                  style: TextStyle(
                    color: Colors.black87,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          centerTitle: true,
        ),
        body: Obx(() {
          if (controller.isLoading.value) {
            return const LocationTrackingPageSkeleton();
          }

          if (controller.errorMessage.isNotEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.red.withValues(alpha: 0.05),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.location_off_rounded, color: Colors.red.shade400, size: 48),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Tracking Unavailable',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.red.shade700
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      controller.errorMessage.value.toLowerCase().contains('server') ||
                          controller.errorMessage.value.toLowerCase().contains('error')
                          ? 'Tracking is currently unavailable. Please try again later.'
                          : controller.errorMessage.value,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 16,
                        height: 1.5,
                      ),
                    ),

                    const SizedBox(height: 25),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => Get.back(),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primaryColor,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                        child: const Text('Go Back', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }

          final childLocation = controller.childLocationLatLng.value;
          if (childLocation == null) {
            return const Center(child: Text('No location data available'));
          }

          final standingLocation = controller.childStandingLocation.value;

  // Use WidgetsBinding to move the map camera after the widget tree is built.
  // Fixed Code
  if (standingLocation != null) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Zoom in (e.g., to level 16.0) and center on the standing location
      // The mapController is guaranteed to be ready here because we are in a post-frame callback
      controller.mapController.move(standingLocation, 16.0);
    });
  }

          return Stack(
            children: [
              // Map
              _buildMap(controller.mapController, childLocation, primaryColor),
              
              // Bottom overlay
              Positioned(
                bottom: 30,
                left: 16,
                right: 16,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Location card
                    _buildLocationCard(
                      icon: Icons.my_location_rounded,
                      title: "CURRENT LOCATION",
                      subtitle: controller.childLocationName.value,
                      address: controller.childLocationAddress.value,
                      color: primaryColor,
                      primaryColor: primaryColor,
                    ),
                    const SizedBox(height: 12),
                    
                    // Next stop info
                    Obx(() {
                      if (controller.nextStopName.value.isEmpty) {
                        return const SizedBox.shrink();
                      }
                      return Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.08),
                              blurRadius: 16,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: const BoxDecoration(
                                color: Color(0xFFFFF4E5),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.flag_rounded,
                                color: Color(0xFFFF9800),
                                size: 22,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'NEXT STOP',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF9E9E9E),
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    controller.nextStopName.value,
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.black87,
                                    ),
                                  ),
                                  if (controller.nextStopAddress.value.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 2),
                                      child: Text(
                                        controller.nextStopAddress.value,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey[600],
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ],
          );
        }),
      );
    }

    Widget _buildMap(MapController mapController, LatLng childLocation, Color primaryColor) {
      return Obx(() {
        final double scale = (controller.currentZoom.value / 13.0).clamp(0.6, 2.0);
        
        return FlutterMap(
          mapController: mapController, 
          options: MapOptions(
            initialCenter: childLocation,
            initialZoom: 14.0,
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
            MarkerLayer(
              markers: [
                if (controller.childStandingLocation.value != null)
                  Marker(
                    width: 50 * scale,
                    height: 50 * scale,
                    point: controller.childStandingLocation.value!,
                    child: Image.asset(
                      'assets/icons/homemarker.png',
                      width: 50 * scale,
                      height: 50 * scale,
                    ),
                  ),
                Marker(
                  width: 50 * scale,
                  height: 50 * scale,
                  point: childLocation,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(
                        width: 50 * scale,
                        height: 50 * scale,
                        decoration: BoxDecoration(
                          color: primaryColor.withValues(alpha: 0.2),
                          shape: BoxShape.circle,
                        ),
                      ),
                      Container(
                        width: 40 * scale,
                        height: 40 * scale,
                        decoration: BoxDecoration(
                          color: primaryColor,
                          borderRadius: BorderRadius.circular(50),
                          border: Border.all(color: Colors.white, width: 3 * scale),
                          boxShadow: [
                            BoxShadow(
                              color: primaryColor.withValues(alpha: 0.4),
                              blurRadius: 8 * scale,
                              spreadRadius: 2 * scale,
                            ),
                          ],
                        ),
                        child: Icon(
                          Icons.location_on,
                          color: Colors.white,
                          size: 20 * scale,
                        ),
                      ),
                    ],
                  ),
                ),
                if (controller.nextStopLatLng.value != null)
                  Marker(
                    width: 50.0 * scale,
                    height: 50.0 * scale,
                    point: controller.nextStopLatLng.value!,
                    alignment: Alignment.center,
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFFFF9800),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 3 * scale),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFFF9800).withValues(alpha: 0.5),
                            blurRadius: 12 * scale,
                            spreadRadius: 3 * scale,
                          ),
                        ],
                      ),
                      child: Icon(
                        Icons.flag_rounded,
                        color: Colors.white,
                        size: 24 * scale
                      ),
                    ),
                  ),
              ],
            ),
          ],
        );
      });
    }

    Widget _buildLocationCard({
      required IconData icon,
      required String title,
      required String subtitle,
      required String address,
      required Color color,
      required Color primaryColor,
    }) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF9E9E9E),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle.isNotEmpty ? subtitle : 'Current Location',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  if (address.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        address,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
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

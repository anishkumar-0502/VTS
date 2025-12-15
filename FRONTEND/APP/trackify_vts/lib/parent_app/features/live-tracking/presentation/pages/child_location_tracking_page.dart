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
        appBar: AppBar(
          backgroundColor: primaryColor,
          iconTheme: const IconThemeData(color: Colors.white),
          title: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "Child Location",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                "Live Tracking",
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
        body: Obx(() {
          if (controller.isLoading.value) {
            return const LocationTrackingPageSkeleton();
          }

          if (controller.errorMessage.isNotEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.error_outline, color: Colors.red.shade700, size: 48),
                    const SizedBox(height: 16),
                    Text(
                      controller.errorMessage.value,
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.red.shade700, fontSize: 16),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () => Get.back(),
                      child: const Text('Go Back'),
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
              // Header info overlay
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      // Child location card
                      _buildLocationCard(
                        icon: Icons.location_on,
                        title: "Current Location",
                        subtitle: controller.childLocationName.value,
                        address: controller.childLocationAddress.value,
                        color: Colors.blue,
                        primaryColor: primaryColor,
                      ),
                      const SizedBox(height: 12),
                    ],
                  ),
                ),
              ),

              // Next stop info at bottom
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Obx(() {
                  if (controller.nextStopName.value.isEmpty) {
                    return const SizedBox.shrink();
                  }
                  return Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(20),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 12,
                          offset: const Offset(0, -4),
                        ),
                      ],
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Next Stop',
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.orange.shade50,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: Colors.orange.shade200,
                                width: 1,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: Colors.orange,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: const Icon(
                                        Icons.pin_drop,
                                        color: Colors.white,
                                        size: 20,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            controller.nextStopName.value,
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            controller.nextStopAddress.value,
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: Colors.grey.shade600,
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],
                      ),
                    ),
                  );
                }),
              ),
            ],
          );
        }),
      );
    }

  Widget _buildMap(MapController mapController, LatLng childLocation, Color primaryColor) {
        return FlutterMap(
      mapController: mapController, 
      options: MapOptions(
        initialCenter: childLocation,
        initialZoom: 14.0,
        interactionOptions: const InteractionOptions(
          flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
        ),
      ),
        children: [
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.example.trackifyvts',
          ),
          // Route polyline
          Obx(() {
            if (controller.routePolylinePoints.isNotEmpty) {
              return PolylineLayer(
                polylines: [
                  Polyline(
                    points: controller.routePolylinePoints,
                    color: Colors.blue,
                    strokeWidth: 3.0,
                  ),
                ],
              );
            }
            return const SizedBox.shrink();
          }),
          // Child location marker
          MarkerLayer(
            markers: [
              Marker(
                width: 50,
                height: 50,
                point: childLocation,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Pulsing circle background
                    Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        color: Colors.blue.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                    ),
                    // Main marker
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Colors.blue,
                        borderRadius: BorderRadius.circular(50),
                        border: Border.all(color: Colors.white, width: 3),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.blue.withOpacity(0.4),
                            blurRadius: 8,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.location_on,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                  ],
                ),
              ),
              // Next stop marker (if available)
                if (controller.nextStopLatLng.value != null)
              Marker(
                width: 50.0,
                height: 50.0,
                point: controller.nextStopLatLng.value!,
                alignment: Alignment.center,
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.9),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 3),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.orange.withOpacity(0.5),
                        blurRadius: 12,
                        spreadRadius: 3,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.pin_drop,
                    color: Colors.white,
                    size: 28
                  ),
                ),
              ),
            ],
          ),
        ],
      );
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
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Colors.grey,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle.isNotEmpty ? subtitle : 'Current Location',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    address,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey.shade600,
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

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:get/get.dart';
import '../controllers/driver_home_map_controller.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shimmer/shimmer.dart';

import 'package:trackify_vts/driver_app/features/dashboard/presentation/pages/driver_dashboard_page.dart';
import 'package:trackify_vts/driver_app/features/dashboard/presentation/controllers/driver_dashboard_controller.dart';
import 'package:trackify_vts/driver_app/features/profile/presentation/controllers/driver_profile_controller.dart';
import '../widgets/slide_action_button.dart';

class DriverHomeMapPage extends StatelessWidget {
  const DriverHomeMapPage({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(DriverHomeMapController());

    return Stack(
      children: [
        /// ================= MAP =================
        Builder(
          builder: (context) {
            // Determine initial center once
            LatLng center = const LatLng(11.1271, 78.6569);
            if (controller.startLocation.value != null) {
              center = controller.startLocation.value!;
            }

            return FlutterMap(
              mapController: controller.mapController,
              options: MapOptions(
                initialCenter: center,
                initialZoom: 13,
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.trackify.vts',
                ),

                // Reactive Polyline Layer
                Obx(() {
                  final points = controller.routePolyline;
                  if (points.isEmpty) return const SizedBox.shrink();
                  
                  return PolylineLayer(
                    polylines: [
                      Polyline(
                        points: points,
                        color: Colors.blue,
                        strokeWidth: 5,
                        strokeCap: StrokeCap.round,
                        strokeJoin: StrokeJoin.round,
                      ),
                    ],
                  );
                }),

                // Reactive Marker Layer
                Obx(() {
                  final stops = controller.stops;
                  final start = controller.startLocation.value;
                  final end = controller.endLocation.value;

                  return MarkerLayer(
                    markers: [
                      if (start != null)
                        Marker(
                          point: start,
                          width: 40,
                          height: 40,
                          child: const Icon(Icons.location_on,
                              color: Colors.green, size: 40),
                        ),

                      if (end != null)
                        Marker(
                          point: end,
                          width: 40,
                          height: 40,
                          child: const Icon(Icons.location_on,
                              color: Colors.red, size: 40),
                        ),

                      if (controller.vehicleLocation.value != null)
                        Marker(
                          point: controller.vehicleLocation.value!,
                          width: 50,
                          height: 50,
                          child: Transform.rotate(
                            angle: (controller.vehicleHeading.value) * (3.14159 / 180),
                            child: Container(
                              decoration: const BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                      blurRadius: 4, color: Colors.black26)
                                ],
                              ),
                              child: const Icon(
                                Icons.navigation,
                                color: Colors.blueAccent,
                                size: 30,
                              ),
                            ),
                          ),
                        ),

                      ...stops.map(
                            (stop) => Marker(
                          point: LatLng(stop.latitude, stop.longitude),
                          width: 30,
                          height: 30,
                          child: Container(
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                    blurRadius: 2, color: Colors.black26)
                              ],
                            ),
                            child: Center(
                              child: Text(
                                '${stop.order}',
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 12),
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
          }
        ),

        /// ================= TRIP INFO OVERLAY =================
        Positioned(
          top: 10,
          right: 16,
          left: 16,
          child: Obx(() {
            if (controller.isLoading.value) {
              return Shimmer.fromColors(
                baseColor: Colors.grey[300]!,
                highlightColor: Colors.grey[100]!,
                child: Container(
                  height: 70,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              );
            }

            final activeTrip = controller.activeTrip.value;
            final scheduledTrips = controller.scheduledTrips;

            String routeName = 'No Trip Selected';
            String startTime = '--:--';

// Helper function to format time with AM/PM
            String formatTimeWithAmPm(String time) {
              try {
                final dt = DateTime.parse(time);

                final hour = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
                final minute = dt.minute.toString().padLeft(2, '0');
                final amPm = dt.hour >= 12 ? 'PM' : 'AM';

                return '$hour:$minute $amPm';
              } catch (_) {
                return time.isNotEmpty ? time : '--:--';
              }
            }

            if (activeTrip != null && scheduledTrips.isNotEmpty) {
              final trip = scheduledTrips.first;
              routeName = trip.routeName;
              startTime = formatTimeWithAmPm(trip.scheduledStartTime);

            } else if (scheduledTrips.isNotEmpty) {
              final trip = scheduledTrips.first;
              routeName = trip.routeName;
              startTime = formatTimeWithAmPm(trip.scheduledStartTime);
            }


            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                boxShadow: const [
                  BoxShadow(
                    color: Colors.black26,
                    blurRadius: 8,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  const Icon(Icons.route, color: Colors.blue),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          routeName,
                          style: GoogleFonts.poppins(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Start Time: $startTime',
                          style: GoogleFonts.poppins(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
        ),

        /// ================= FLOATING BUTTONS =================
        Positioned(
          top: 90,
          right: 16,
          child: Column(
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  FloatingActionButton.small(
                    onPressed: () {
                      // ✅ Refresh dashboard data
                      final dashboardController = Get.put(DriverDashboardController());
                      dashboardController.refreshAllData();

                      // ✅ Refresh profile data
                      final profileController = Get.put(DriverProfileController());
                      profileController.fetchProfile(showLoading: false);

                      Get.to(() => Scaffold(
                        appBar: AppBar(
                          backgroundColor: Colors.white,
                          elevation: 0,
                          title: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Image.asset(
                                'assets/icons/home.png',
                                height: 20,
                                width: 20,
                                color: Colors.black, // remove if original color needed
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Home',
                                style: GoogleFonts.poppins(
                                  color: Colors.black,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 18,
                                ),
                              ),
                            ],
                          ),
                          leading: IconButton(
                            icon: const Icon(
                              Icons.arrow_back_ios,
                              color: Colors.black,
                              size: 20,
                            ),
                            onPressed: () {
                              dashboardController.refreshAllData();
                              profileController.fetchProfile(showLoading: false);
                              if (Get.isRegistered<DriverHomeMapController>()) {
                                Get.find<DriverHomeMapController>().loadData();
                              }
                              Get.back();
                            },
                          ),
                          actions: [
                            IconButton(
                              icon: const Icon(Icons.logout_rounded, color: Colors.red),
                              onPressed: () {
                                profileController.confirmLogout(Get.context!);
                              },
                            ),
                            const SizedBox(width: 8),
                          ],
                        ),
                        body: const DriverDashboardPage(),
                      ));
                    },
                    backgroundColor: Colors.white,
                    heroTag: 'dashboard_nav_btn',
                    child:  Image.asset('assets/icons/home.png', color: Colors.blue,height: 20,),
                  ),
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                    ),
                  ),
                ],
              ),

            ],
          ),
        ),
        Positioned(
          bottom: 200,
          right: 16,
          child: Column(
            children: [

              const SizedBox(height: 16),
              FloatingActionButton.small(
                onPressed: controller.zoomIn,
                backgroundColor: Colors.white,
                heroTag: 'zoom_in_btn',
                child:  Image.asset('assets/icons/zoom-in.png', color: Colors.blue,height: 25,),
              ),
              const SizedBox(height: 10),
              FloatingActionButton.small(
                onPressed: controller.zoomOut,
                backgroundColor: Colors.white,
                heroTag: 'zoom_out_btn',
                child:  Image.asset('assets/icons/zoom-out.png', color: Colors.blue,height: 25,),              ),
            ],
          ),
        ),

        /// ================= BOTTOM SHEET =================
        DraggableScrollableSheet(
          initialChildSize: 0.25,
          minChildSize: 0.25,
          maxChildSize: 0.85,
          snap: true,
          snapSizes: const [0.25, 0.5, 0.85],
          builder: (context, scrollController) {
            final isExpanded = false.obs;
            
            return Obx(
                  () => Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(24)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      offset: const Offset(0, -5),
                    ),
                  ],
                ),
                child: SingleChildScrollView(
                  controller: scrollController,
                  child: Column(
                    children: [
                      Container(
                        margin: const EdgeInsets.symmetric(vertical: 12),
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.grey[300],
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
            
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            GestureDetector(
                              onTap: () {
                                isExpanded.value = !isExpanded.value;
                              },
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      if (controller.isLoading.value)
                                        Shimmer.fromColors(
                                          baseColor: Colors.grey[300]!,
                                          highlightColor: Colors.grey[100]!,
                                          child: Container(
                                            width: 150,
                                            height: 24,
                                            decoration: BoxDecoration(
                                              color: Colors.white,
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                          ),
                                        )
                                      else
                                        Text(
                                          '${controller.stops.length} Destinations',
                                          style: GoogleFonts.poppins(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      const SizedBox(height: 5),
                                      Row(
                                        children: [
                                          Image.asset('assets/icons/tap.png',height: 22,),
                                          const SizedBox(width: 5,),
                                          Text(
                                            'Tap to see details',
                                            style: GoogleFonts.poppins(
                                              fontSize: 13,
                                              color: Colors.grey[600],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                  if (!controller.isLoading.value && controller.stops.isNotEmpty)
                                    Icon(
                                      isExpanded.value ? Icons.expand_less : Icons.expand_more,
                                      color: Colors.blue,
                                      size: 28,
                                    ),
                                ],
                              ),
                            ),

                          ],
                        ),
                      ),
            
                      const SizedBox(height: 12),
                      const Divider(height: 1),

                      AnimatedSize(
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                        child: isExpanded.value
                            ? ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                          itemCount: controller.stops.length,
                          itemBuilder: (context, index) {
                            final stop = controller.stops[index];
                            final isLast = index == controller.stops.length - 1;

                            return Padding(
                              // ✅ Equal spacing between rows
                              padding: const EdgeInsets.only(bottom: 16),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  // Timeline
                                  Column(
                                    children: [
                                      Container(
                                        width: 10,
                                        height: 10,
                                        decoration: const BoxDecoration(
                                          color: Colors.blue,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                      if (!isLast)
                                        Container(
                                          width: 2,
                                          height: 32, // ✅ equal connector spacing
                                          color: Colors.grey[300],
                                        ),
                                    ],
                                  ),

                                  const SizedBox(width: 16),

                                  // Stop name
                                  Expanded(
                                    child: Text(
                                      stop.name,
                                      style: GoogleFonts.poppins(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),

                                  // ✅ Forward arrow at end
                                  const Icon(
                                    Icons.chevron_right,
                                    color: Colors.grey,
                                    size: 22,
                                  ),
                                ],
                              ),
                            );
                          },
                        )
                            : const SizedBox.shrink(),
                      ),


                      Container(
                        padding: const EdgeInsets.all(5),
                        width: double.infinity,
                        child: Obx(() {
                          final isActive = controller.activeTrip.value != null;
                          return SlideActionButton(
                            text: isActive ? 'SLIDE TO STOP TRIP' : 'SLIDE TO START TRIP',
                            color: isActive ? Colors.redAccent : Colors.blueAccent,
                            iconColor: isActive ? Colors.redAccent : Colors.blueAccent,
                            onSlideCompleted: () {
                              final tripId = controller.activeTrip.value?.tripId ?? 
                                             controller.scheduledTrips.firstOrNull?.scheduledTripId;
                              
                              if (tripId != null) {
                                if (isActive) {
                                  controller.stopTrip(tripId);
                                } else {
                                  controller.startTrip(tripId);
                                }
                              }
                            },
                          );
                        }),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}

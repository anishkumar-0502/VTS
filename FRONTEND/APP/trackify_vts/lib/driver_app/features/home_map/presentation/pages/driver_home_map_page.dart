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

    // Responsive Variables
    final mediaQuery = MediaQuery.of(context);
    final double width = mediaQuery.size.width;
    final double height = mediaQuery.size.height;
    final double scale = width / 375.0; // Base width of 375px
    final double topPadding = mediaQuery.viewPadding.top;

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
                  urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                  subdomains: const ['a', 'b', 'c'],
                  userAgentPackageName: 'com.trackify.driver',
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
                        strokeWidth: 5 * scale,
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
                          width: 40 * scale,
                          height: 40 * scale,
                          child: Icon(Icons.location_on,
                              color: Colors.green, size: 40 * scale),
                        ),

                      if (end != null)
                        Marker(
                          point: end,
                          width: 40 * scale,
                          height: 40 * scale,
                          child: Icon(Icons.location_on,
                              color: Colors.red, size: 40 * scale),
                        ),

                      if (controller.vehicleLocation.value != null)
                        Marker(
                          point: controller.vehicleLocation.value!,
                          width: 50 * scale,
                          height: 50 * scale,
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
                              child: Icon(
                                Icons.navigation,
                                color: Colors.blueAccent,
                                size: 30 * scale,
                              ),
                            ),
                          ),
                        ),

                      ...stops.map(
                            (stop) => Marker(
                          point: LatLng(stop.latitude, stop.longitude),
                          width: 30 * scale,
                          height: 30 * scale,
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
                                style: TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 12 * scale),
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
          top: topPadding + (10 * scale),
          right: 16 * scale,
          left: 16 * scale,
          child: Obx(() {
            if (controller.isLoading.value) {
              return Shimmer.fromColors(
                baseColor: Colors.grey[300]!,
                highlightColor: Colors.grey[100]!,
                child: Container(
                  height: 70 * scale,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14 * scale),
                  ),
                ),
              );
            }

            final activeTrip = controller.activeTrip.value;
            final scheduledTrips = controller.scheduledTrips;

            String routeName = 'No Trip Selected';
            String startTime = '--:--';
            String tripStatus = 'No Trip'; // Added tripStatus

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

            if (activeTrip != null) {
              final trip = scheduledTrips.first;
              routeName = trip.routeName;
              startTime = formatTimeWithAmPm(trip.scheduledStartTime);
              tripStatus = 'Active Trip';
            } else if (scheduledTrips.isNotEmpty) {
              final trip = scheduledTrips.first;
              routeName = trip.routeName;
              startTime = formatTimeWithAmPm(trip.scheduledStartTime);
              tripStatus = 'Upcoming Trip';
            }


            return Container(
              padding: EdgeInsets.symmetric(horizontal: 16 * scale, vertical: 12 * scale),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14 * scale),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black26,
                    blurRadius: 8 * scale,
                    offset: Offset(0, 4 * scale),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Icon(Icons.route, color: Colors.blue, size: 24 * scale),
                  SizedBox(width: 12 * scale),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                routeName,
                                style: GoogleFonts.poppins(
                                  fontSize: 14 * scale,
                                  fontWeight: FontWeight.w600,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                             Container(
                              padding: EdgeInsets.symmetric(horizontal: 8 * scale, vertical: 2 * scale),
                              decoration: BoxDecoration(
                                color: tripStatus == 'Active Trip' ? Colors.green.withOpacity(0.1) : Colors.orange.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(4 * scale),
                                border: Border.all(
                                  color: tripStatus == 'Active Trip' ? Colors.green : Colors.orange,
                                  width: 1 * scale,
                                ),
                              ),
                              child: Text(
                                tripStatus,
                                style: GoogleFonts.poppins(
                                  fontSize: 10 * scale,
                                  fontWeight: FontWeight.w500,
                                  color: tripStatus == 'Active Trip' ? Colors.green : Colors.orange,
                                ),
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: 4 * scale),
                        Text(
                          'Start Time: $startTime',
                          style: GoogleFonts.poppins(
                            fontSize: 12 * scale,
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
          top: topPadding + (90 * scale),
          right: 16 * scale,
          child: Column(
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  SizedBox(
                    width: 48 * scale, // Slightly larger touch target
                    height: 48 * scale,
                    child: Obx(() {
                      return FloatingActionButton(
                        mini: true,
                        onPressed: controller.isDashboardLoading.value ? null : () async {
                          controller.isDashboardLoading.value = true;
                          
                          try {
                            // ✅ Refresh dashboard data
                            // Use the correct tag 'driver_dashboard' to match DriverDashboardPage
                            final dashboardController = Get.isRegistered<DriverDashboardController>(tag: 'driver_dashboard')
                                ? Get.find<DriverDashboardController>(tag: 'driver_dashboard')
                                : Get.put(DriverDashboardController(), tag: 'driver_dashboard');
                                
                            await dashboardController.refreshAllData();
          
                            // ✅ Refresh profile data
                            final profileController = Get.isRegistered<DriverProfileController>(tag: 'driver_profile')
                                ? Get.find<DriverProfileController>(tag: 'driver_profile')
                                : Get.put(DriverProfileController(), tag: 'driver_profile');
                            
                            await profileController.fetchProfile(showLoading: false);
          
                            Get.to(() => Scaffold(
                              appBar: AppBar(
                                backgroundColor: Theme.of(context).colorScheme.primary,
                                elevation: 0,
                                title: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Image.asset(
                                      'assets/icons/home.png',
                                      height: 20 * scale,
                                      width: 20 * scale,
                                      color: Colors.white,
                                    ),
                                    SizedBox(width: 8 * scale),
                                    Text(
                                      'Home',
                                      style: GoogleFonts.poppins(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w600,
                                        fontSize: 18 * scale,
                                      ),
                                    ),
                                  ],
                                ),
                                leading: IconButton(
                                  icon: Icon(
                                    Icons.arrow_back_ios,
                                    color: Colors.white,
                                    size: 20 * scale,
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
                                    icon: Icon(Icons.logout_rounded, color: Colors.white, size: 24 * scale),
                                    onPressed: () {
                                      profileController.confirmLogout(Get.context!);
                                    },
                                  ),
                                  SizedBox(width: 8 * scale),
                                ],
                              ),
                              body: Builder(
                                builder: (context) {
                                  // Force refresh when body builds
                                  WidgetsBinding.instance.addPostFrameCallback((_) {
                                    dashboardController.refreshAllData();
                                  });
                                  return const DriverDashboardPage();
                                }
                              ),
                            ));
                          } finally {
                            controller.isDashboardLoading.value = false;
                          }
                        },
                        backgroundColor: Colors.white,
                        heroTag: 'dashboard_nav_btn',
                        child: controller.isDashboardLoading.value
                          ? Padding(
                              padding: EdgeInsets.all(10 * scale),
                              child: CircularProgressIndicator(
                                strokeWidth: 2 * scale,
                                color: Colors.blue,
                              ),
                            )
                          : Image.asset('assets/icons/home.png', color: Colors.blue, height: 20 * scale),
                      );
                    }),
                  ),
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Container(
                      width: 12 * scale,
                      height: 12 * scale,
                      decoration: BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2 * scale),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        
        Positioned(
          bottom: (height * 0.25) + (20 * scale),
          right: 16 * scale,
          child: Column(
            children: [
              SizedBox(height: 16 * scale),
              SizedBox(
                width: 40 * scale,
                height: 40 * scale,
                child: FloatingActionButton(
                  mini: true,
                  onPressed: controller.zoomIn,
                  backgroundColor: Colors.white,
                  heroTag: 'zoom_in_btn',
                  child: Image.asset('assets/icons/zoom-in.png', color: Colors.blue, height: 25 * scale),
                ),
              ),
              SizedBox(height: 10 * scale),
              SizedBox(
                 width: 40 * scale,
                 height: 40 * scale,
                 child: FloatingActionButton(
                  mini: true,
                  onPressed: controller.zoomOut,
                  backgroundColor: Colors.white,
                  heroTag: 'zoom_out_btn',
                  child: Image.asset('assets/icons/zoom-out.png', color: Colors.blue, height: 25 * scale),
                ),
              ),
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
                  BorderRadius.vertical(top: Radius.circular(24 * scale)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10 * scale,
                      offset: Offset(0, -5 * scale),
                    ),
                  ],
                ),
                child: SingleChildScrollView(
                  controller: scrollController,
                  child: Column(
                    children: [
                      Container(
                        margin: EdgeInsets.symmetric(vertical: 12 * scale),
                        width: 40 * scale,
                        height: 4 * scale,
                        decoration: BoxDecoration(
                          color: Colors.grey[300],
                          borderRadius: BorderRadius.circular(2 * scale),
                        ),
                      ),
            
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: 20 * scale),
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
                                            width: 150 * scale,
                                            height: 24 * scale,
                                            decoration: BoxDecoration(
                                              color: Colors.white,
                                              borderRadius: BorderRadius.circular(4 * scale),
                                            ),
                                          ),
                                        )
                                      else
                                        Text(
                                          '${controller.stops.length} Destinations',
                                          style: GoogleFonts.poppins(
                                            fontSize: 16 * scale,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      SizedBox(height: 5 * scale),
                                      Row(
                                        children: [
                                          Image.asset('assets/icons/tap.png', height: 22 * scale),
                                          SizedBox(width: 5 * scale),
                                          Text(
                                            'Tap to see details',
                                            style: GoogleFonts.poppins(
                                              fontSize: 13 * scale,
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
                                      size: 28 * scale,
                                    ),
                                ],
                              ),
                            ),

                          ],
                        ),
                      ),
            
                      SizedBox(height: 12 * scale),
                      const Divider(height: 1),

                      AnimatedSize(
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                        child: isExpanded.value
                            ? ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          padding: EdgeInsets.symmetric(horizontal: 20 * scale, vertical: 12 * scale),
                          itemCount: controller.stops.length,
                          itemBuilder: (context, index) {
                            final stop = controller.stops[index];
                            final isLast = index == controller.stops.length - 1;

                            return Padding(
                              // ✅ Equal spacing between rows
                              padding: EdgeInsets.only(bottom: 16 * scale),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  // Timeline
                                  Column(
                                    children: [
                                      Container(
                                        width: 10 * scale,
                                        height: 10 * scale,
                                        decoration: const BoxDecoration(
                                          color: Colors.blue,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                      if (!isLast)
                                        Container(
                                          width: 2 * scale,
                                          height: 32 * scale, // ✅ equal connector spacing
                                          color: Colors.grey[300],
                                        ),
                                    ],
                                  ),

                                  SizedBox(width: 16 * scale),

                                  // Stop name and Landmark
                                  Expanded(
                                    child: Row(
                                      children: [

                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              stop.name,
                                              style: GoogleFonts.poppins(
                                                fontSize: 14 * scale,
                                                fontWeight: FontWeight.w500,
                                              ),

                                            ),
                                            // Text(
                                            //   stop.landmark ?? '',                                              style: GoogleFonts.poppins(
                                            //     fontSize: 14 * scale,
                                            //     fontWeight: FontWeight.w500,
                                            //   ),
                                            //
                                            // ),

                                          ],
                                        ),
                                        // Text(
                                        //  stop.approximateReachTime ?? '--',
                                        //   style: GoogleFonts.poppins(
                                        //     fontSize: 14 * scale,
                                        //     fontWeight: FontWeight.w500,
                                        //   ),
                                        //
                                        // ),
                                      ],
                                    ),
                                  ),

                                  // Approximate Reach Time
                                  if (stop.approximateReachTime != null && stop.approximateReachTime!.isNotEmpty)
                                    Padding(
                                      padding: EdgeInsets.only(right: 8 * scale),
                                      child: Text(
                                        stop.approximateReachTime!,
                                        style: GoogleFonts.poppins(
                                          fontSize: 12 * scale,
                                          color: Colors.blueAccent,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),

                                  // ✅ Forward arrow at end
                                  Icon(
                                    Icons.chevron_right,
                                    color: Colors.grey,
                                    size: 22 * scale,
                                  ),
                                ],
                              ),
                            );
                          },
                        )
                            : const SizedBox.shrink(),
                      ),


                      Container(
                        padding: EdgeInsets.all(5 * scale),
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

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../../core/Network/InternetStatusNotifier.dart';
import '../../../../Sessionhandler/session_controller.dart';
import '../../../profile/domain/models/parent_profile_model.dart';
import '../../../profile/presentation/controllers/parent_profile_controller.dart';
import '../../../profile/presentation/pages/parent_profile_page.dart';
import '../controllers/parent_home_controller.dart';
import 'package:geocoding/geocoding.dart';
import 'vehicle_live_tracking_map_page.dart';


String _getInitials(String name) {
  final parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  } else if (parts.isNotEmpty) {
    return parts[0][0].toUpperCase();
  }
  return '';
}

/// Helper function to convert lat/lng to a readable address
Future<String> getAddressFromLatLng(double lat, double lng) async {
  try {
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
    print("Error fetching address: $e");
  }

  return "Unknown Location";
}

/// Your updated Location Row widget
Widget buildLocationRow(trackChildData, trip) {
  return Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Text(
        'Location',
        style: TextStyle(fontSize: 13, color: Colors.grey[600]),
      ),

      /// Fetch address using FutureBuilder
      FutureBuilder<String>(
        future: () async {
          if (trackChildData?.location != null) {
            return await getAddressFromLatLng(
              trackChildData!.location.latitude,
              trackChildData.location.longitude,
            );
          } else if (trip.currentLocation != null) {
            return await getAddressFromLatLng(
              trip.currentLocation!.latitude,
              trip.currentLocation!.longitude,
            );
          }
          return "N/A";
        }(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Text(
              "Loading...",
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            );
          }

          if (!snapshot.hasData) {
            return const Text(
              "N/A",
              style: TextStyle(fontSize: 13),
            );
          }

          return SizedBox(
            width: 200, // prevents overflow
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

class ParentHomePage extends GetView<ParentHomeController> {
  const ParentHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final sessionController = Get.find<SessionController>();
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final isWide = MediaQuery.of(context).size.width > 600;


    return Scaffold(
      appBar: AppBar(
        title: const Text('Parent Home'),
          actions: [
            IconButton(
              onPressed: () async {
                controller.tripError.value = '';
                controller.trackChildError.value = '';
                controller.refreshCurrentTrip();
              },
              icon: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: primaryColor.withOpacity(0.08),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.refresh,
                  color: primaryColor,
                  size: 20,
                ),
              ),
              tooltip: 'Refresh all data',
            ),

            Padding(
              padding: EdgeInsets.symmetric(horizontal: isWide ? 24 : 16),
              child: ValueListenableBuilder<bool>(
                valueListenable: InternetStatusNotifier.instance.isOnline,
                builder: (context, isOnline, _) {
                  return Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isOnline ? Colors.green.shade50 : Colors.red.shade50,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isOnline ? Icons.wifi_tethering : Icons.wifi_off,
                      color: isOnline ? Colors.green.shade700 : Colors.red.shade700,
                      size: 20,
                    ),
                  );
                },
              ),
            ),
          ]


      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Obx(() {
            final name = sessionController.username.value.isNotEmpty
                ? sessionController.username.value
                : sessionController.parentData.value?['name'] as String?;
            final email = sessionController.emailId.value;

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildGreetingCard(
                  context,
                  name ?? 'User',
                  email,
                  primaryColor,
                  sessionController,
                ),
                const SizedBox(height: 24),
                Obx(() {
                  final hasError = controller.tripError.value.isNotEmpty || controller.trackChildError.value.isNotEmpty;
                  if (hasError) {
                    final errorMessages = <String>[];
                    if (controller.tripError.value.isNotEmpty) {
                      errorMessages.add(controller.tripError.value);
                    }
                    if (controller.trackChildError.value.isNotEmpty) {
                      errorMessages.add(controller.trackChildError.value);
                    }
                    final errorMessage = errorMessages.join('\n\n');

                    return Padding(
                      padding: const EdgeInsets.all(16),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          border: Border.all(color: Colors.red.shade300, width: 1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              Icons.error_outline,
                              color: Colors.red.shade700,
                              size: 24,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                errorMessage,
                                style: TextStyle(color: Colors.red.shade700, fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  } else if (controller.currentTrip.value != null) {
                    return Column(
                      children: [
                        _buildCurrentTripSection(
                          context,
                          controller.currentTrip.value!,
                          primaryColor,
                          controller.trackChild.value,
                        ),
                        const SizedBox(height: 24),
                        // if (controller.trackChild.value != null)
                        //   _buildTrackChildSection(
                        //     context,
                        //     controller.trackChild.value!,
                        //     primaryColor,
                        //   ),
                        // const SizedBox(height: 24),
                      ],
                    );
                  }
                  return Padding(
                    padding: const EdgeInsets.all(16),
                    child: Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300, width: 1),
                          borderRadius: BorderRadius.circular(16),
                          color: Colors.grey.shade50,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.grey.shade200,
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Image
                            Image.asset(
                              'assets/images/nodata.png',
                              height: 120,
                            ),

                            const SizedBox(height: 14),

                            // Text
                            Text(
                              'No active trip',
                              style: TextStyle(
                                color: Colors.grey[700],
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );

                }),
                Text(
                  'Quick Access',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                _buildDashboardGrid(),
              ],
            );
          }),
        ),
      ),
    );
  }

  String getGreeting() {
    // Get current IST time
    final istTime = DateTime.now().toUtc().add(const Duration(hours: 5, minutes: 30));
    final hour = istTime.hour;

    if (hour >= 5 && hour < 12) {
      return 'Good morning 🌞';
    } else if (hour >= 12 && hour < 17) {
      return 'Good afternoon 🌤️ ';
    } else if (hour >= 17 && hour < 21) {
      return 'Good evening 🌞';
    } else {
      return 'Good night 🌙 ';
    }
  }

  Widget _buildGreetingCard(
    BuildContext context,
    String name,
    String email,
    Color primaryColor,
    SessionController sessionController,
  ) {
    return GestureDetector(
      onTap: () {
        Get.to(
          () => const ParentProfilePage(),
          binding: BindingsBuilder(() {
            Get.put(ParentProfileController(), tag: 'parent_profile');
          }),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              primaryColor,
              primaryColor.withOpacity(0.85),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: primaryColor.withOpacity(0.25),
              blurRadius: 18,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          children: [
            // Profile Circle
            CircleAvatar(
              radius: 34,
              backgroundColor: Colors.white,
              child: Text(
                _getInitials(name),
                style: TextStyle(
                  color: primaryColor,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),

            const SizedBox(width: 16),

            // Text section
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [

                  Text(
                    getGreeting(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,  // 👈 Center the name text
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 16,
                    ),
                  ),

                ],
              ),
            ),

            // Arrow icon
            const Icon(
              Icons.arrow_forward_ios,
              color: Colors.white,
              size: 20,
            ),
          ],
        ),
      )

    );
  }

  Widget _buildCurrentTripSection(
    BuildContext context,
    CurrentTrip trip,
    Color primaryColor,
    TrackChild? trackChildData,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: primaryColor.withOpacity(0.1),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            child: Row(
              children: [
                SizedBox(
                  width: 24,
                  height: 24,
                  child: Image.asset(
                    'assets/icons/bus.png',
                    fit: BoxFit.contain,
                    color: primaryColor,
                    errorBuilder: (context, error, stackTrace) {
                      return Icon(
                        Icons.directions_bus,
                        size: 24,
                        color: primaryColor,
                      );
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Active Trip',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: primaryColor,
                        ),
                      ),
                      Text(
                        trip.vehicle.vehicleNumber,
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: trip.status == 'en_route'
                        ? Colors.green
                        : trip.status == 'completed'
                            ? Colors.blue
                            : Colors.orange,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    trip.status.replaceAll('_', ' ').toUpperCase(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Driver',
                      style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                    ),
                    Text(
                      trip.driver?.name ?? 'N/A',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Speed',
                      style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                    ),
                    Text(
                      '${trip.vehicle.speed} km/h',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                buildLocationRow(trackChildData, trip),
                const SizedBox(height: 16),
    SizedBox(
    width: double.infinity,
    child: OutlinedButton(
    style: OutlinedButton.styleFrom(
    side: const BorderSide(
    color: Colors.blue, // Border color
    width: 1.5,         // Border width
    ),
    foregroundColor: Colors.blueAccent, // Text + Icon color
    padding: const EdgeInsets.symmetric(vertical: 12),
    shape: RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(8),
    ),
    ),

    onPressed: () {
      Get.to(() => VehicleLiveTrackingMapPage(tripData: trip));
    },

    child: const Row(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
    Icon(Icons.location_on, size: 18),
    SizedBox(width: 8),
    Text('View Live Tracking'),
    ],
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

  Widget _buildTrackChildSection(
    BuildContext context,
    TrackChild trackChild,
    Color primaryColor,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade100,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Icons.person,
                    color: Colors.blue.shade700,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Tracked Child',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.blue.shade700,
                        ),
                      ),
                      Text(
                        trackChild.child.name,
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: trackChild.vehicle.currentStatus == 'en_route'
                        ? Colors.green
                        : trackChild.vehicle.currentStatus == 'completed'
                            ? Colors.blue
                            : Colors.orange,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    trackChild.vehicle.currentStatus.replaceAll('_', ' ').toUpperCase(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Phone',
                      style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                    ),
                    Text(
                      trackChild.child.phoneNumber.toString(),
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Vehicle',
                      style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                    ),
                    Text(
                      trackChild.vehicle.vehicleNumber,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Speed',
                      style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                    ),
                    Text(
                      '${trackChild.vehicle.speed} km/h',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Location',
                      style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                    ),
                    Text(
                      '${trackChild.location.latitude.toStringAsFixed(4)}, ${trackChild.location.longitude.toStringAsFixed(4)}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    onPressed: () {
                    },
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.location_on, size: 18),
                        SizedBox(width: 8),
                        Text('View Child Location'),
                      ],
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

  Widget _buildDashboardGrid() {
    return Column(
      children: [
        _buildGridItem(
          icon: Icons.directions_bus,
          title: 'Vehicle Tracking',
          description: 'Track your vehicle in real-time',
        ),
        const SizedBox(height: 12),
        _buildGridItem(
          icon: Icons.location_on,
          title: 'Locations',
          description: 'Pickup and dropoff points',
        ),
        const SizedBox(height: 12),
        _buildGridItem(
          icon: Icons.emergency,
          title: 'Emergency Contact',
          description: 'Quick access to SOS contact',
        ),
      ],
    );
  }

  Widget _buildGridItem({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.blue.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              color: Colors.blue,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: TextStyle(
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
  }
}

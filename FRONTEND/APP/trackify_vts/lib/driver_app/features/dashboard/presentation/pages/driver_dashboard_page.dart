import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../scheduled_trips/presentation/pages/scheduled_trips_page.dart';
import '../controllers/driver_dashboard_controller.dart';
import '../../../profile/presentation/controllers/driver_profile_controller.dart';
import '../../../profile/presentation/pages/driver_profile_page.dart';
import 'trip_details_page.dart';

String _getInitials(String name) {
  final parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  } else if (parts.isNotEmpty) {
    return parts[0][0].toUpperCase();
  }
  return '';
}

class DriverDashboardPage extends GetView<DriverDashboardController> {
  const DriverDashboardPage({super.key});

  @override
  String? get tag => 'driver_dashboard';

  @override
  Widget build(BuildContext context) {
    final Color primaryColor = Theme.of(context).colorScheme.primary;
    return LayoutBuilder(
      builder: (context, constraints) {
        final double width = constraints.maxWidth;
        final double horizontalPadding =
            width >= 1100
                ? 64
                : width >= 900
                ? 48
                : width >= 600
                ? 28
                : 16;
        final double available = width - horizontalPadding * 2;
        final int metricColumns =
            available >= 900
                ? 3
                : available >= 560
                ? 2
                : 1;
        final double metricSpacing = 12;
        final double metricWidth =
            metricColumns == 1
                ? available
                : (available - metricSpacing * (metricColumns - 1)).clamp(
                      0,
                      double.infinity,
                    ) /
                    metricColumns;

        return Obx(() {
          final tripStatus = controller.tripStatus.value;
          final syncedAt = controller.lastSyncedAt.value;
          final syncTime =
              syncedAt == null
                  ? 'Not synced'
                  : '${syncedAt.hour.toString().padLeft(2, '0')}:${syncedAt.minute.toString().padLeft(2, '0')}';
          return ListView(
            padding: EdgeInsets.symmetric(
              horizontal: horizontalPadding,
              vertical: 20,
            ),
            children: [
              Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 960),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildProfileHeader(context, primaryColor),
                      const SizedBox(height: 20),
                      // Trip Card with loading and error states
                      Obx(() {
                        if (controller.isLoadingTrips.value) {
                          return Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: primaryColor,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const SizedBox(
                              height: 120,
                              child: Center(
                                child: CircularProgressIndicator(
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          );
                        }

                        if (controller.tripsError.value.isNotEmpty) {
                          return Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: Colors.red.shade200),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(
                                      Icons.error_outline,
                                      color: Colors.red.shade700,
                                      size: 24,
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Text(
                                        controller.tripsError.value,
                                        style: TextStyle(
                                          color: Colors.red.shade700,
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                SizedBox(
                                  width: double.infinity,
                                  child: FilledButton(
                                    onPressed:
                                        controller.fetchTodaysScheduledTrips,
                                    style: FilledButton.styleFrom(
                                      backgroundColor: Colors.red.shade600,
                                    ),
                                    child: const Text('Retry'),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }

                        if (controller.scheduledTrips.isEmpty) {
                          return Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: Colors.amber.shade50,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: Colors.amber.shade200),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.info_outline,
                                  color: Colors.amber.shade700,
                                  size: 24,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    'No scheduled trips for today',
                                    style: TextStyle(
                                      color: Colors.amber.shade700,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }

                        final selectedTrip = controller.selectedTrip.value;
                        if (selectedTrip == null) {
                          return const SizedBox.shrink();
                        }

                        return GestureDetector(
                          onTap: () {
                            Get.to(
                              () => TripDetailsPage(trip: selectedTrip),
                              transition: Transition.rightToLeft,
                            );
                          },
                          child: Container(
                            padding: const EdgeInsets.all(24),
                            decoration: BoxDecoration(
                              color: primaryColor,
                              borderRadius: BorderRadius.circular(24),
                              boxShadow: [
                                BoxShadow(
                                  color: primaryColor.withOpacity(0.3),
                                  blurRadius: 12,
                                  offset: const Offset(0, 6),
                                ),
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                /// --- TOP SECTION: Route Info + Vehicle Info ---
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    /// LEFT: Route Info
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Image.asset(
                                                'assets/icons/bus.png',
                                                width: 20,
                                                height: 20,
                                                color: Colors.white,
                                              ),
                                              const SizedBox(width: 10),
                                              Flexible(
                                                child: Text(
                                                  selectedTrip
                                                          .routeName
                                                          .isNotEmpty
                                                      ? selectedTrip.routeName
                                                      : (selectedTrip
                                                              .vehicleId
                                                              ?.routeName ??
                                                          'School Route B'),
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                  style: const TextStyle(
                                                    color: Colors.white,
                                                    fontSize: 20,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 8),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 10,
                                              vertical: 4,
                                            ),
                                            decoration: BoxDecoration(
                                              color: Colors.white.withOpacity(
                                                0.25,
                                              ),
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                            ),
                                            child: Text(
                                              (selectedTrip?.status ??
                                                      'IN-PROGRESS')
                                                  .toUpperCase(),
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontSize: 11,
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Column(
                                      children: [
                                        Row(
                                          children: [
                                            Image.asset(
                                              'assets/icons/location.png',
                                              width: 20,
                                              height: 20,
                                              color: Colors.white,
                                            ),
                                            const SizedBox(width: 4),
                                            Text(
                                              '${selectedTrip?.vehicleId.routePoints.length ?? 0} stops',
                                              style: TextStyle(
                                                color: Colors.white.withOpacity(
                                                  0.7,
                                                ),
                                                fontSize: 12,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                SizedBox(height: 5),

                                const Divider(
                                  color: Colors.white24,
                                  thickness: 1,
                                  height: 16,
                                ),

                                /// --- BOTTOM SECTION: Trip Status + Start Trip Button ---
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  crossAxisAlignment: CrossAxisAlignment.center,
                                  children: [
                                    /// LEFT: Trip status text
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            controller
                                                    .tripStatus
                                                    .value
                                                    .isNotEmpty
                                                ? controller.tripStatus.value
                                                : 'Trip in progress',
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 16,
                                              fontWeight: FontWeight.w600,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          const SizedBox(height: 4),
                                          Row(
                                            children: [
                                              Icon(
                                                Icons.info_outline,
                                                size: 15,
                                                color: Colors.white.withOpacity(
                                                  0.6,
                                                ),
                                              ),
                                              const SizedBox(width: 4),
                                              Flexible(
                                                child: Text(
                                                  'Tap to view full trip details',
                                                  style: TextStyle(
                                                    color: Colors.white
                                                        .withOpacity(0.6),
                                                    fontSize: 12,
                                                    fontStyle: FontStyle.italic,
                                                  ),
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),

                                    /// RIGHT: Start Trip Button
                                    Flexible(
                                      fit: FlexFit.tight,
                                      child: ConstrainedBox(
                                        constraints: const BoxConstraints(
                                          maxWidth: 130,
                                        ), // 👈 Limit button width
                                        child: FilledButton.icon(
                                          onPressed: controller.toggleTrip,
                                          style: FilledButton.styleFrom(
                                            backgroundColor: Colors.white,
                                            foregroundColor: primaryColor,
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 12,
                                              vertical: 12,
                                            ),
                                            shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(14),
                                            ),
                                          ),
                                          icon: Icon(
                                            controller.tripActive.value
                                                ? Icons.stop_circle
                                                : Icons.play_arrow_rounded,
                                          ),
                                          label: Text(
                                            controller.tripActive.value
                                                ? 'End trip'
                                                : 'Start trip',
                                            overflow: TextOverflow.ellipsis,
                                            maxLines: 1,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                      const SizedBox(height: 24),
                      // Available Trips Section
                      Obx(() {
                        if (controller.scheduledTrips.length > 1) {
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'Other scheduled trips',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: () {
                                      Get.to(
                                            () => ScheduledTripsPage(),
                                        transition: Transition.leftToRight, // 🔹 smooth left → right slide
                                        duration: const Duration(milliseconds: 400), // optional smooth speed
                                      );
                                    },
                                    child: Image.asset(
                                      'assets/icons/fast-forward.png',
                                      width: 15,
                                      height: 15,
                                      color: Colors.black, // optional tint color
                                    ),
                                  ),
                                ],
                              ),

                              const SizedBox(height: 12),
                              SizedBox(
                                height: 100,
                                child: ListView.builder(
                                  scrollDirection: Axis.horizontal,
                                  itemCount: controller.scheduledTrips.length,
                                  itemBuilder: (context, index) {
                                    final trip =
                                        controller.scheduledTrips[index];
                                    final isSelected =
                                        controller
                                            .selectedTrip
                                            .value
                                            ?.scheduledTripId ==
                                        trip.scheduledTripId;

                                    return Padding(
                                      padding: const EdgeInsets.only(right: 12),
                                      child: GestureDetector(
                                        onTap:
                                            () => controller.selectTrip(trip),
                                        child: Container(
                                          width: 150,
                                          padding: const EdgeInsets.all(12),
                                          decoration: BoxDecoration(
                                            color:
                                                isSelected
                                                    ? primaryColor
                                                    : Colors.white,
                                            borderRadius: BorderRadius.circular(
                                              12,
                                            ),
                                            border: Border.all(
                                              color:
                                                  isSelected
                                                      ? primaryColor
                                                      : Colors.grey.shade200,
                                              width: 2,
                                            ),
                                            boxShadow: [
                                              if (isSelected)
                                                BoxShadow(
                                                  color: primaryColor
                                                      .withOpacity(0.3),
                                                  blurRadius: 8,
                                                  offset: const Offset(0, 4),
                                                ),
                                            ],
                                          ),
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            mainAxisAlignment:
                                                MainAxisAlignment.center,
                                            children: [
                                              Text(
                                                trip.routeName.isNotEmpty
                                                    ? trip.routeName
                                                    : (trip
                                                            .vehicleId
                                                            ?.routeName ??
                                                        'Route'),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: TextStyle(
                                                  fontWeight: FontWeight.w600,
                                                  fontSize: 14,
                                                  color:
                                                      isSelected
                                                          ? Colors.white
                                                          : Colors.black,
                                                ),
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                trip.status,
                                                style: TextStyle(
                                                  fontSize: 12,
                                                  color:
                                                      isSelected
                                                          ? Colors.white70
                                                          : Colors
                                                              .grey
                                                              .shade600,
                                                ),
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                trip.scheduledStartTime,
                                                style: TextStyle(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w500,
                                                  color:
                                                      isSelected
                                                          ? Colors.white
                                                          : primaryColor,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                              const SizedBox(height: 24),
                            ],
                          );
                        }
                        return const SizedBox.shrink();
                      }),
                      Wrap(
                        spacing: metricSpacing,
                        runSpacing: metricSpacing,
                        children:
                            controller.keyMetrics
                                .map(
                                  (item) => SizedBox(
                                    width:
                                        metricColumns == 1 ? null : metricWidth,
                                    child: Container(
                                      padding: const EdgeInsets.all(18),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(18),
                                        border: Border.all(
                                          color: Colors.grey.shade200,
                                        ),
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black.withOpacity(
                                              0.04,
                                            ),
                                            blurRadius: 12,
                                            offset: const Offset(0, 6),
                                          ),
                                        ],
                                      ),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            item['label'] ?? '',
                                            style: const TextStyle(
                                              fontSize: 13,
                                              color: Colors.black54,
                                            ),
                                          ),
                                          const SizedBox(height: 8),
                                          Text(
                                            item['value'] ?? '',
                                            style: const TextStyle(
                                              fontSize: 20,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                )
                                .toList(),
                      ),
                      const SizedBox(height: 24),
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: Colors.grey.shade200),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 16,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Upcoming stops',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 12),
                            ...controller.upcomingStops.map(
                              (stop) => Padding(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 10,
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 46,
                                      height: 46,
                                      decoration: BoxDecoration(
                                        color: primaryColor.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                      alignment: Alignment.center,
                                      child: Text(
                                        stop['time'] ?? '',
                                        style: TextStyle(
                                          color: primaryColor,
                                          fontWeight: FontWeight.w600,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            stop['name'] ?? '',
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            stop['status'] ?? '',
                                            style: const TextStyle(
                                              fontSize: 13,
                                              color: Colors.black54,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Icon(
                                      Icons.chevron_right,
                                      color: Colors.grey.shade400,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: Colors.grey.shade200),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.04),
                              blurRadius: 12,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Quick actions',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 16),
                            ...controller.quickActions.map(
                              (action) => Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 14,
                                ),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(16),
                                  color: Colors.grey.shade100,
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.bolt, color: primaryColor),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            action['title'] ?? '',
                                            style: const TextStyle(
                                              fontSize: 15,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            action['subtitle'] ?? '',
                                            style: const TextStyle(
                                              fontSize: 13,
                                              color: Colors.black54,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Icon(
                                      Icons.chevron_right,
                                      color: Colors.grey.shade500,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        });
      },
    );
  }

  Widget _buildProfileHeader(BuildContext context, Color primaryColor) {
    final profileController = Get.find<DriverProfileController>(
      tag: 'driver_profile',
    );
    return Obx(() {
      final driverName = profileController.driverDetails['name'] ?? 'Driver';
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: primaryColor.withValues(alpha: 0.3),
                  width: 2,
                ),
              ),
              child: CircleAvatar(
                radius: 24,
                backgroundColor: primaryColor.withValues(alpha: 0.15),
                child: Text(
                  _getInitials(driverName),
                  style: TextStyle(
                    color: primaryColor,
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Good morning',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[600],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  Text(
                    driverName,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Colors.black,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: () => Get.to(() => DriverProfilePage(),transition: Transition.rightToLeft,duration: const Duration(milliseconds: 400),),
              icon: Icon(
                Icons.arrow_forward_ios,
                color: primaryColor,
                size: 20,
              ),
            ),
          ],
        ),
      );
    });
  }
}

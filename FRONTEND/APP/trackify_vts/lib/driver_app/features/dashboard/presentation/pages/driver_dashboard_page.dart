import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:get/get.dart';
import '../../../scheduled_trips/domain/models/scheduled_trip_model.dart'
as scheduled_models;
import '../../domain/models/dashboard_model.dart' as dashboard_models;
import '../../../scheduled_trips/presentation/pages/scheduled_trips_page.dart';
import '../controllers/driver_dashboard_controller.dart';
import 'package:trackify_vts/utilities/widgets/status_banner.dart';
import '../../../profile/presentation/controllers/driver_profile_controller.dart';
import '../../../profile/presentation/pages/driver_profile_page.dart';
import '../../../../Sessionhandler/session_controller.dart';
import 'trip_details_page.dart';
import 'driver_trip_history_page.dart';
import 'live_tracking_map_page.dart';
import 'package:trackify_vts/services/open_route_service.dart';
import 'package:trackify_vts/core/core.dart';
import 'trip_location_display.dart';

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
        metricColumns == 1
            ? available
            : (available - metricSpacing * (metricColumns - 1)).clamp(
          0,
          double.infinity,
        ) /
            metricColumns;

        return ListView(
          padding: EdgeInsets.symmetric(
            horizontal: horizontalPadding,
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
                        return _buildScheduledTripLoadingShimmer();
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
                        return Column(
                          children: [
                            Center(
                              child: Container(
                                margin: const EdgeInsets.symmetric(
                                  horizontal: 24,
                                  vertical: 16,
                                ),
                                padding: const EdgeInsets.symmetric(
                                  vertical: 24,
                                  horizontal: 16,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  border: Border.all(
                                    color:
                                    Colors
                                        .amber
                                        .shade400, // 🟡 outline color
                                    width: 1.5,
                                  ),
                                  borderRadius: BorderRadius.circular(
                                    12,
                                  ), // 🔹 reduced radius
                                ),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.center,
                                  children: [
                                    // 🟡 Icon
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: Colors.amber.shade600,
                                        shape: BoxShape.circle,
                                      ),
                                      child: Image.asset(
                                        'assets/icons/search.png',
                                        height: 30,
                                        width: 30,
                                        color:
                                        Colors
                                            .white, // optional → keeps white tint like the icon
                                      ),
                                    ),
                                    const SizedBox(height: 12),

                                    // 🟠 Main text
                                    Text(
                                      'No scheduled trips for today',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        color: Colors.amber.shade800,
                                        fontSize: 16,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    const SizedBox(height: 6),

                                    // 🟤 Subtext
                                    Text(
                                      'You can relax for now — no active routes assigned.',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        color: Colors.amber.shade700
                                            .withOpacity(0.9),
                                        fontSize: 13,
                                        height: 1.4,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 20),

                            // 🖼️ Illustration image
                            Image.asset(
                              'assets/images/nodata.png',
                              height: 250, // adjust based on design
                              fit: BoxFit.contain,
                            ),
                          ],
                        );
                      }

                      final activeTrip = controller.activeTrip.value;
                      final selectedTrip =
                          controller.selectedTrip.value ??
                              (controller.scheduledTrips.isNotEmpty
                                  ? controller.scheduledTrips.first
                                  : null);

                      // If active trip exists, ALWAYS show it, regardless of selectedTrip state
                      if (activeTrip != null) {
                        return _buildActiveTripCard(
                          context,
                          activeTrip,
                          primaryColor,
                        );
                      }

                      if (selectedTrip != null) {
                        return _buildScheduledTripCard(
                          context,
                          selectedTrip,
                          primaryColor,
                        );
                      }

                      return const SizedBox.shrink();
                    }),
                    const SizedBox(height: 24),
                    Obx(() {
                      if (controller.scheduledTrips.length > 1) {
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Upcoming Trips',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                GestureDetector(
                                  onTap: () {
                                    Get.to(
                                          () => ScheduledTripsPage(),
                                      transition:
                                      Transition
                                          .leftToRight, // 🔹 smooth left → right slide
                                      duration: const Duration(
                                        milliseconds: 400,
                                      ), // optional smooth speed
                                    );
                                  },
                                  behavior: HitTestBehavior.opaque,
                                  child: Container(
                                    padding: const EdgeInsets.all(10),
                                    child: Image.asset(
                                      'assets/icons/fast-forward.png',
                                      width: 15,
                                      height: 15,
                                      color: Colors.black, // optional tint color
                                    ),
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
                                  final trip = controller.scheduledTrips[index];
                                  final isSelected =
                                      controller
                                          .selectedTrip
                                          .value
                                          ?.scheduledTripId ==
                                          trip.scheduledTripId;

                                  return Padding(
                                    padding: const EdgeInsets.only(right: 12),
                                    child: GestureDetector(
                                      onTap: () => controller.selectTrip(trip),
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
                                                color: primaryColor.withOpacity(
                                                  0.3,
                                                ),
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
                                                    : Colors.grey.shade600,
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
                    Obx(() {
                      if (controller.isLoadingTripHistory.value) {
                        return _buildTripHistoryLoadingShimmer();
                      }

                      if (controller.tripHistoryError.value.isNotEmpty) {
                        return Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.red.shade200),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.red.shade100.withValues(
                                  alpha: 0.5,
                                ),
                                blurRadius: 12,
                                offset: const Offset(0, 6),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    Icons.error_outline,
                                    color: Colors.red.shade700,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      controller.tripHistoryError.value,
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
                                child: OutlinedButton(
                                  onPressed: controller.fetchTripHistory,
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: Colors.red.shade700,
                                    side: BorderSide(
                                      color: Colors.red.shade300,
                                    ),
                                  ),
                                  child: const Text('Retry'),
                                ),
                              ),
                            ],
                          ),
                        );
                      }

                      final hasTripContext =
                          controller.scheduledTrips.isNotEmpty ||
                              controller.activeTrip.value != null;

                      if (controller.tripHistory.isEmpty) {
                        if (!hasTripContext) {
                          return const SizedBox.shrink();
                        }
                        return _buildEmptyTripHistoryCard(primaryColor);
                      }

                      final history = controller.tripHistory.take(5).toList();
                      return Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.grey.shade200),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 16,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Recent trips',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                TextButton(
                                  onPressed: () {
                                    controller.fetchTripHistory();
                                    Get.to(
                                          () => const DriverTripHistoryPage(),
                                      transition: Transition.rightToLeft,
                                      duration: const Duration(
                                        milliseconds: 400,
                                      ),
                                    );
                                  },
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Text(
                                        'View full history',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Image.asset(
                                        'assets/icons/fast-forward.png',
                                        height: 8,
                                        width: 8,
                                        color: primaryColor,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            ...List.generate(history.length, (index) {
                              final trip = history[index];
                              return Padding(
                                padding: EdgeInsets.only(
                                  bottom: index == history.length - 1 ? 0 : 12,
                                ),
                                child: _buildTripHistoryTile(
                                  context,
                                  trip,
                                  primaryColor,
                                ),
                              );
                            }),
                          ],
                        ),
                      );
                    }),
                    const SizedBox(height: 24),

                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildActiveTripCard(
      BuildContext context,
      scheduled_models.ActiveTrip trip,
      Color primaryColor,
      ) {
    final routeName =
    trip.routeName.isNotEmpty
        ? trip.routeName
        : 'Active route';
    final activeRoutePoints = trip.routePoints;
    final coordinates = _extractCoordinates(
      activeRoutePoints,
      trip.startLocation,
      trip.vehicleId.standingLocation,
    );
    final stops = _extractStops(activeRoutePoints);
    final hasCoordinates = coordinates.isNotEmpty;
    
    return GestureDetector(
      onTap: () => _handleActiveTripTap(context, trip, primaryColor),
      child: Container(
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              primaryColor.withValues(alpha: 0.95),
              primaryColor,
              primaryColor.withValues(alpha: 0.82),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(32),
          border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
          boxShadow: [
            BoxShadow(
              color: primaryColor.withValues(alpha: 0.3),
              blurRadius: 28,
              offset: const Offset(0, 18),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // --- HEADER ROW 1: ICON + ROUTE NAME + STATUS ---
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Colors.white.withValues(alpha: 0.3),
                        Colors.white.withValues(alpha: 0.16),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.16),
                        blurRadius: 14,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.route_rounded,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    routeName,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      height: 1.1,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.3),
                      width: 1,
                    ),
                  ),
                  child: Text(
                    'ONGOING',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.95),
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),


            // --- MAP SECTION ---
            ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: Container(
                decoration: BoxDecoration(
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.14),
                  ),
                ),
                child: SizedBox(
                  height: 220,
                  child:
                  hasCoordinates
                      ? _ActiveTripMap(
                    points: coordinates,
                    stops: stops,
                    primaryColor: primaryColor,
                    showLiveTrackingButton: true,
                    tripId: trip.tripId,
                    endLocation: trip.endLocation != null
                        ? _GeoCoordinate(trip.endLocation!.latitude, trip.endLocation!.longitude)
                        : null,
                  )
                      : Container(
                    color: Colors.white.withValues(alpha: 0.08),
                    alignment: Alignment.center,
                    child: Text(
                      'Route coordinates unavailable',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.75),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScheduledTripCard(
      BuildContext context,
      scheduled_models.ScheduledTrip trip,
      Color primaryColor,
      ) {
    final routeName =
    trip.routeName.isNotEmpty
        ? trip.routeName
        : (trip.vehicleId?.routeName ?? 'Scheduled route');
    final formattedStart = _formatHistoryTimestamp(trip.scheduledStartTime);
    final startLabel =
    formattedStart.isNotEmpty ? formattedStart : trip.scheduledStartTime;
    final stopsCount = trip.routePoints.length;
    final stopLabel = stopsCount == 1 ? '1 stop' : '$stopsCount stops';
    final startAddress = trip.startLocation?.address ?? '';
    final endAddress = trip.endLocation?.address ?? '';

    Widget infoChip(IconData icon, String text, Color color) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                text,
                style: TextStyle(
                  color: color.withOpacity(0.9),
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      );
    }

    return GestureDetector(
      onTap: () {
        Get.to(
              () => TripDetailsPage(trip: trip),
          transition: Transition.rightToLeft,
        );
      },
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
          border: Border.all(color: primaryColor.withValues(alpha: 0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Row (Route + Status)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    routeName,
                    style: const TextStyle(
                      color: Colors.black87,
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      height: 1.2,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: Colors.orange.withOpacity(0.3),
                      width: 1,
                    ),
                  ),
                  child: Text(
                    'UPCOMING',
                    style: TextStyle(
                      color: Colors.orange.shade700,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 14),

            // Info Chips
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                infoChip(
                  Icons.access_time,
                  startLabel.isNotEmpty ? startLabel : 'Schedule pending',
                  Colors.blueGrey,
                ),
                infoChip(Icons.route, stopLabel, Colors.blueGrey),
                if (endAddress.isNotEmpty) infoChip(Icons.flag, endAddress, Colors.blueGrey),
              ],
            ),

            const SizedBox(height: 3),
            Divider(color: Colors.grey.withOpacity(0.2), thickness: 1),

            // Starting Address
            if (startAddress.isNotEmpty) ...[
              const SizedBox(height: 10),
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Image.asset(
                    'assets/icons/start.png',
                    height: 16,
                    width: 16,
                    color: Colors.grey[700],
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Starts from $startAddress',
                      style: TextStyle(
                        color: Colors.grey[800],
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],

            const SizedBox(height: 12),

            // Footer Info Line
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Icon(
                  Icons.info_outline,
                  color: Colors.grey.withOpacity(0.6),
                  size: 15,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Tap to view details',
                    style: TextStyle(
                      color: Colors.grey.withOpacity(0.6),
                      fontSize: 12,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScheduledTripLoadingShimmer() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: _Shimmer(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildSkeletonLine(height: 16),
                      const SizedBox(height: 8),
                      _buildSkeletonLine(height: 12, width: 160),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                _buildSkeletonLine(height: 12, width: 60),
              ],
            ),
            const SizedBox(height: 20),
            _buildSkeletonLine(height: 12),
            const SizedBox(height: 12),
            _buildSkeletonLine(height: 12, width: 220),
            const SizedBox(height: 12),
            _buildSkeletonLine(height: 12, width: 180),
            const SizedBox(height: 24),
            _buildSkeletonLine(height: 48, radius: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildTripHistoryLoadingShimmer() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: _Shimmer(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSkeletonLine(height: 16, width: 160),
            const SizedBox(height: 20),
            ...List.generate(3, (index) {
              return Padding(
                padding: EdgeInsets.only(bottom: index == 2 ? 0 : 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: _buildSkeletonLine(height: 14)),
                        const SizedBox(width: 16),
                        _buildSkeletonLine(height: 12, width: 80),
                      ],
                    ),
                    const SizedBox(height: 10),
                    _buildSkeletonLine(height: 12),
                    const SizedBox(height: 6),
                    _buildSkeletonLine(height: 12, width: 180),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildSkeletonLine({
    double height = 12,
    double? width,
    double radius = 10,
  }) {
    return Container(
      height: height,
      width: width,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }

  Future<void> _handleActiveTripTap(
      BuildContext context,
      scheduled_models.ActiveTrip trip,
      Color primaryColor,
      ) async {
    if (!(Get.isDialogOpen ?? false)) {
      Get.dialog(
        const Center(child: CircularProgressIndicator()),
        barrierDismissible: false,
      );
    }

    final detail = await controller.fetchTripDetail(trip.tripId);

    if (Get.isDialogOpen ?? false) {
      Get.back();
    }

    if (detail?.trip != null) {
      final detailTrip = detail!.trip!;
      final history = dashboard_models.DriverTripHistory(
        startLocation: detailTrip.startLocation,
        endLocation: detailTrip.endLocation,
        vehicleId: detailTrip.vehicleId,
        driverId: detailTrip.driverId,
        operatorId: detailTrip.operatorId,
        routeName: detailTrip.routeName,
        scheduledTripId: detailTrip.scheduledTripId,
        startTime: detailTrip.startTime,
        status: detailTrip.status,
        speedAlarmEnabled: detailTrip.speedAlarmEnabled,
        speedLimit: detailTrip.speedLimit,
        tripId: detailTrip.tripId,
        stops: detailTrip.stops,
        speedViolations: detailTrip.speedViolations,
        routeDeviations: detailTrip.routeDeviations,
        passengers: detailTrip.passengers,
        routePoints: detailTrip.routePoints,
        createdAt: detailTrip.createdAt,
        updatedAt: detailTrip.updatedAt,
      );


      _showTripHistoryDetails(
        context,
        history,
        primaryColor,
        analytics: detail.analytics,
        enableStopAction: true,   // force only for active card
      );

    } else {
      final message =
      controller.tripDetailError.value.isNotEmpty
          ? controller.tripDetailError.value
          : 'Unable to fetch trip details';
      showStatusBanner(
        message,
        Colors.redAccent,
        Icons.error_outline,
      );
    }
  }

  List<_GeoCoordinate> _extractCoordinates(
      List<scheduled_models.RoutePoint> routePoints,
      scheduled_models.LocationData startLocation,
      scheduled_models.LocationData? standingLocation,
      ) {
    final coordinates = <_GeoCoordinate>[];

    for (final point in routePoints) {
      if (point.latitude == 0 && point.longitude == 0) {
        continue;
      }
      if (coordinates.isEmpty ||
          coordinates.last.latitude != point.latitude ||
          coordinates.last.longitude != point.longitude) {
        coordinates.add(_GeoCoordinate(point.latitude, point.longitude));
      }
    }

    if (coordinates.isEmpty) {
      coordinates.add(
        _GeoCoordinate(startLocation.latitude, startLocation.longitude),
      );
      if (standingLocation != null) {
        coordinates.add(
          _GeoCoordinate(standingLocation.latitude, standingLocation.longitude),
        );
      }
    } else {
      final startCoordinate = _GeoCoordinate(
        startLocation.latitude,
        startLocation.longitude,
      );
      if (coordinates.first.latitude != startCoordinate.latitude ||
          coordinates.first.longitude != startCoordinate.longitude) {
        coordinates.insert(0, startCoordinate);
      }
      if (coordinates.length == 1 && standingLocation != null) {
        coordinates.add(
          _GeoCoordinate(standingLocation.latitude, standingLocation.longitude),
        );
      }
    }

    return coordinates;
  }

  static List<_GeoCoordinate> _extractStops(
      List<scheduled_models.RoutePoint> routePoints,
      ) {
    final stops = <_GeoCoordinate>[];
    for (var index = 0; index < routePoints.length; index++) {
      final point = routePoints[index];
      if (point.latitude == 0 && point.longitude == 0) {
        continue;
      }
      final order = point.order > 0 ? point.order : index + 1;
      final label = point.name.isNotEmpty ? point.name : 'Stop $order';
      final isDuplicate = stops.any(
            (existing) =>
        existing.latitude == point.latitude &&
            existing.longitude == point.longitude,
      );
      if (!isDuplicate) {
        stops.add(
          _GeoCoordinate(
            point.latitude,
            point.longitude,
            label: label,
            order: order,
          ),
        );
      }
    }
    stops.sort((a, b) => (a.order ?? 0).compareTo(b.order ?? 0));
    return stops;
  }

  static Widget _buildTripHistoryTile(
      BuildContext context,
      dashboard_models.DriverTripHistory trip,
      Color primaryColor,
      ) {
    final routeName =
    trip.routeName?.isNotEmpty == true
        ? trip.routeName!
        : trip.vehicleId?.routeName ?? 'Trip';

    final startLabel = _formatHistoryTimestamp(
      trip.startTime.isNotEmpty
          ? trip.startTime
          : trip.createdAt?.toIso8601String() ?? '',
    );
    final statusColor = _statusColor(trip.status, primaryColor);

    final timeLabel = startLabel.isNotEmpty ? startLabel : 'Time unavailable';

    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: () => _showTripHistoryDetails(context, trip, primaryColor,  enableStopAction: false,  // ensures no stop button
      ),
      child: Material(
        color: Colors.transparent,
        child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey.shade50,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    routeName,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.16),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    trip.status.toUpperCase(),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.schedule, size: 16, color: Colors.grey.shade600),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    timeLabel,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            TripLocationDisplay(trip: trip, primaryColor: primaryColor),
          ],
        ),
      ),
      ),
    );
  }

  static Widget _buildEmptyTripHistoryCard(Color primaryColor) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Recent trips',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: primaryColor.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: primaryColor,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.navigation,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'No completed trips yet',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: Colors.black87,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Recent trips will appear here once a trip is completed.',
                        style: TextStyle(fontSize: 13, color: Colors.black54),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static String _formatHistoryTimestamp(String value) {
    if (value.isEmpty) {
      return '';
    }
    final date = DateTime.tryParse(value);
    if (date == null) {
      return '';
    }
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final day = date.day.toString().padLeft(2, '0');
    final month = months[date.month - 1];
    final year = date.year;
    final hour = date.hour % 12 == 0 ? 12 : date.hour % 12;
    final minute = date.minute.toString().padLeft(2, '0');
    final period = date.hour >= 12 ? 'PM' : 'AM';
    return '$day $month $year, $hour:$minute $period';
  }

  static String _formatLocation(dashboard_models.Location? location) {
    if (location == null) {
      return '';
    }
    if (location.address.isNotEmpty) {
      return location.address;
    }
    return '${location.latitude.toStringAsFixed(4)}, ${location.longitude.toStringAsFixed(4)}';
  }

  static Color _statusColor(String status, Color primaryColor) {
    switch (status.toLowerCase()) {
      case 'completed':
        return Colors.green.shade600;
      case 'active':
      case 'in-progress':
        return primaryColor;
      case 'cancelled':
      case 'cancelled by operator':
        return Colors.red.shade600;
      default:
        return Colors.orange.shade600;
    }
  }

  static void _showTripHistoryDetails(
      BuildContext context,
      dashboard_models.DriverTripHistory trip,
      Color primaryColor, {
        dashboard_models.DriverTripAnalytics? analytics,
        bool enableStopAction = false,   // 👈 already default false
      }) {
    Get.to(
          () => _TripHistoryDetailsPage(
        trip: trip,
        primaryColor: primaryColor,
        analytics: analytics,
        enableStopAction: enableStopAction,
      ),
      transition: Transition.rightToLeft,
      duration: const Duration(milliseconds: 320),
    );
  }


  Widget _buildProfileHeader(BuildContext context, Color primaryColor) {
    final profileController = Get.find<DriverProfileController>(
      tag: 'driver_profile',
    );

    String getGreeting() {
      // Get current IST time
      final istTime = DateTime.now().toUtc().add(const Duration(hours: 5, minutes: 30));
      final hour = istTime.hour;

      if (hour >= 5 && hour < 12) {
        return '🌞 Good morning';
      } else if (hour >= 12 && hour < 17) {
        return '🌤️ Good afternoon';
      } else if (hour >= 17 && hour < 21) {
        return '🌞 Good evening';
      } else {
        return '🌙 Good night';
      }
    }

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
            GestureDetector(
              onTap: () => Get.to(
                    () => DriverProfilePage(),
                transition: Transition.rightToLeft,
                duration: const Duration(milliseconds: 400),
              ),
              child: Container(
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
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    getGreeting(),
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
                  // if (vehicleNumber.isNotEmpty)
                  //   Padding(
                  //     padding: const EdgeInsets.only(top: 2),
                  //     child: Text(
                  //       'Vehicle: $vehicleNumber',
                  //       style: TextStyle(
                  //         fontSize: 13,
                  //         color: primaryColor,
                  //         fontWeight: FontWeight.w600,
                  //       ),
                  //     ),
                  //   ),
                ],
              ),
            ),
            IconButton(
              onPressed:
                  () => Get.to(
                    () => DriverProfilePage(),
                transition: Transition.rightToLeft,
                duration: const Duration(milliseconds: 400),
              ),
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

class _TripHistoryDetailsPage extends StatelessWidget {
  const _TripHistoryDetailsPage({
    required this.trip,
    required this.primaryColor,
    this.analytics,
    this.enableStopAction = false,
  });

  final dashboard_models.DriverTripHistory trip;
  final Color primaryColor;
  final dashboard_models.DriverTripAnalytics? analytics;
  final bool enableStopAction;

  DriverDashboardController get controller =>
      Get.find<DriverDashboardController>(tag: 'driver_dashboard');

  @override
  Widget build(BuildContext context) {
    final routeName =
    trip.routeName?.isNotEmpty == true
        ? trip.routeName!
        : trip.vehicleId?.routeName ?? 'Trip';
    DriverDashboardPage._statusColor(trip.status, primaryColor);
    final startTimeLabel = DriverDashboardPage._formatHistoryTimestamp(
      trip.startTime.isNotEmpty
          ? trip.startTime
          : trip.createdAt?.toIso8601String() ?? '',
    );
    trip.updatedAt != null
        ? DriverDashboardPage._formatHistoryTimestamp(
      trip.updatedAt!.toIso8601String(),
    )
        : '';
    trip.createdAt != null
        ? DriverDashboardPage._formatHistoryTimestamp(
      trip.createdAt!.toIso8601String(),
    )
        : '';
    final startLocation = DriverDashboardPage._formatLocation(trip.startLocation);
    final endLocation = DriverDashboardPage._formatLocation(trip.endLocation);
    
    // Try to get vehicle number from multiple sources
    String vehicleNumber = '';
    
    // First priority: vehicle_details from API response
    if (trip.vehicleDetails != null && trip.vehicleDetails!['vehicle_number'] != null) {
      vehicleNumber = trip.vehicleDetails!['vehicle_number'] as String? ?? '';
    }
    
    // Second priority: vehicleId object
    if (vehicleNumber.isEmpty && trip.vehicleId?.vehicleNumber != null) {
      vehicleNumber = trip.vehicleId?.vehicleNumber ?? '';
    }
    
    // Third priority: activeTrip vehicleId
    if (vehicleNumber.isEmpty && controller.activeTrip.value != null) {
      vehicleNumber = controller.activeTrip.value!.vehicleId.vehicleNumber;
    }
    
    vehicleNumber = vehicleNumber.isNotEmpty ? vehicleNumber : 'Not assigned';
    trip.speedLimit > 0 ? '${trip.speedLimit} km/h' : 'Not set';
    final waypoints = trip.routePoints.isNotEmpty
        ? trip.routePoints
        : (trip.vehicleId?.routePoints ?? []);
    final previewPoints =
    waypoints
        .where((point) => point.latitude != 0 || point.longitude != 0)
        .map((point) => _GeoCoordinate(point.latitude, point.longitude))
        .toList();
    if (previewPoints.length < 2) {
      if (trip.startLocation != null) {
        previewPoints.add(
          _GeoCoordinate(
            trip.startLocation!.latitude,
            trip.startLocation!.longitude,
          ),
        );
      }
      if (trip.endLocation != null) {
        previewPoints.add(
          _GeoCoordinate(
            trip.endLocation!.latitude,
            trip.endLocation!.longitude,
          ),
        );
      }
    }
    final previewStops = DriverDashboardPage._extractStops(waypoints);
    final hasRoutePreview = previewPoints.length >= 2;
    final canShowStopAction = enableStopAction ;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        backgroundColor: primaryColor,
        elevation: 0,
        iconTheme: const IconThemeData(
          color: Colors.white, // 👈 makes the leading/back icon white
        ),
        title:  Text(
          enableStopAction ? 'Trip Details' : 'Trip History',
          style: TextStyle(
            color: Colors.white, // 👈 makes the title white
            fontWeight: FontWeight.w600,
            fontSize: 18,
          ),
        ),
      ),

      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(routeName, startTimeLabel),
            const SizedBox(height: 24),
            if (canShowStopAction) ...[
              const SizedBox(height: 24),
              Obx(() {
                final isStopping = controller.isStoppingTrip.value;
                final isStopped = controller.tripStoppedSuccessfully.value;
                return SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: isStopped || isStopping ? null : () async {
                      if (trip.tripId.isEmpty) {
                        showStatusBanner(
                          'Trip identifier unavailable',
                          Colors.redAccent,
                          Icons.error_outline,
                        );
                        return;
                      }
                      final stopLocation =
                          trip.endLocation ?? trip.startLocation;
                      if (stopLocation == null) {
                        showStatusBanner(
                          'Stop location unavailable',
                          Colors.redAccent,
                          Icons.error_outline,
                        );
                        return;
                      }
                      final success = await controller.stopActiveTrip(
                        tripId: trip.tripId,
                        payload: {
                          'end_location': {
                            'latitude': stopLocation.latitude,
                            'longitude': stopLocation.longitude,
                          },
                          'distance_traveled': 0,
                        },
                      );
                      if (success) {
                        // Don't navigate back immediately, let user see the stopped state
                      }
                    },
                    icon: isStopped
                        ? const Icon(Icons.check_circle_rounded)
                        : (isStopping
                        ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                      ),
                    )
                        : const Icon(Icons.stop_rounded)),
                    label: Text(isStopped
                        ? 'Trip has been ended successfully'
                        : (isStopping ? 'Stopping...' : 'Stop trip')),
                    style: FilledButton.styleFrom(
                      backgroundColor: isStopped ? Colors.green : Colors.redAccent,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                );
              }),
            ],
            const SizedBox(height: 24),
            _buildInfoRow(Icons.directions_bus, 'Vehicle number', vehicleNumber),
            _buildInfoRow(Icons.place, 'Start location', startLocation),

            _buildInfoRow(Icons.flag, 'End location', endLocation),


            if (hasRoutePreview) ...[
              const SizedBox(height: 24),
              Text(
                'Route preview',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: Colors.grey.shade800,
                ),
              ),
              const SizedBox(height: 12),
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 12,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: SizedBox(
                  height: 200,
                  child: _ActiveTripMap(
                    points: previewPoints,
                    stops: previewStops,
                    primaryColor: primaryColor,
                    endLocation: trip.endLocation != null
                        ? _GeoCoordinate(trip.endLocation!.latitude, trip.endLocation!.longitude)
                        : null,
                  ),
                ),
              ),
            ],
            if (waypoints.isNotEmpty) ...[
              const SizedBox(height: 24),
              Text(
                'Route Stops',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: Colors.grey.shade800,
                ),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children:
                  waypoints
                      .map(
                        (point) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 26,
                            height: 26,
                            decoration: BoxDecoration(
                              color:
                              primaryColor.withValues(alpha: 0.12),
                              shape: BoxShape.circle,
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              point.order.toString(),
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: primaryColor,
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
                                  point.name,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                SinglePointLocationDisplay(
                                  latitude: point.latitude,
                                  longitude: point.longitude,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                      .toList(),
                ),
              ),
            ],

          ],
        ),
      ),
    );
  }

  Widget _buildHeader(String routeName, String startTimeLabel) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            primaryColor,
            primaryColor.withValues(alpha: 0.7),
          ],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: primaryColor.withValues(alpha: 0.22),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            routeName,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 8),
          Text(
            startTimeLabel.isNotEmpty ? startTimeLabel : 'Time unavailable',
            style: TextStyle(
              fontSize: 13,
              color: Colors.white.withValues(alpha: 0.85),
            ),
          ),
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              trip.status.toUpperCase(),
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: primaryColor.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Icon(icon, color: primaryColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                    letterSpacing: 0.4,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  value.isNotEmpty ? value : 'Not available',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
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

class _ActiveTripMap extends StatefulWidget {
  const _ActiveTripMap({
    required this.points,
    required this.primaryColor,
    this.stops = const [],
    this.showLiveTrackingButton = false,
    this.tripId,
    this.endLocation,
  });

  final List<_GeoCoordinate> points;
  final List<_GeoCoordinate> stops;
  final Color primaryColor;
  final bool showLiveTrackingButton;
  final String? tripId;
  final _GeoCoordinate? endLocation;

  @override
  State<_ActiveTripMap> createState() => _ActiveTripMapState();
}

class _ActiveTripMapState extends State<_ActiveTripMap> {
  List<LatLng> routePoints = [];
  final MapController _mapController = MapController();
  double _currentZoom = 15;
  late final OpenRouteService _routeService;
  String? _lastRouteSignature;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _routeService = OpenRouteService(trackify_vts.openRouteServiceApiKey);
    _loadRoute();
  }

  Future<void> _loadRoute() async {
    final signature = _signatureFor(widget.points);
    if (_lastRouteSignature == signature) return;
    _lastRouteSignature = signature;

    final dedupedWaypoints = <LatLng>[];
    for (final point in widget.points) {
      final latLng = LatLng(point.latitude, point.longitude);
      if (dedupedWaypoints.isEmpty ||
          dedupedWaypoints.last.latitude != latLng.latitude ||
          dedupedWaypoints.last.longitude != latLng.longitude) {
        dedupedWaypoints.add(latLng);
      }
    }

    if (dedupedWaypoints.length < 2) return;

    setState(() => _isLoading = true);

    try {
      final fetchedRoute = await _routeService.getRouteThrough(
        List<LatLng>.from(dedupedWaypoints),
      );

      if (!mounted) return;

      if (fetchedRoute.isNotEmpty) {
        setState(() {
          routePoints = fetchedRoute;
          _isLoading = false;
        });
        
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
             final bounds = LatLngBounds.fromPoints(routePoints);
             _mapController.fitCamera(
               CameraFit.bounds(
                 bounds: bounds,
                 padding: const EdgeInsets.all(40),
               ),
             );
          }
        });
      }
    } catch (e) {
      debugPrint('⚠️ Route fetch failed: $e');
      setState(() => _isLoading = false);
    }
  }
  String _signatureFor(List<_GeoCoordinate> points) {
    return points
        .map(
          (p) =>
      '${p.latitude.toStringAsFixed(6)},${p.longitude.toStringAsFixed(6)}',
    )
        .join('|');
  }

  @override
  void didUpdateWidget(covariant _ActiveTripMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_lastRouteSignature != _signatureFor(widget.points)) {
      _loadRoute();
    }
  }

  void _zoomIn() {
    if (widget.points.isEmpty) return;

    final start = LatLng(
      widget.points.first.latitude,
      widget.points.first.longitude,
    );
    
    setState(() {
      _currentZoom = 16;
    });
    _mapController.move(start, 16);
  }

  void _openFullScreenMap() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder:
            (context) => Scaffold(
          appBar: AppBar(
            backgroundColor: Colors.white,
            iconTheme: const IconThemeData(color: Colors.black),
            title: const Text(
              'Full Screen Map',
              style: TextStyle(color: Colors.black),
            ),
          ),
          body: _FullScreenMap(
            routePoints: routePoints,
            points: widget.points,
            stops: widget.stops,
            primaryColor: widget.primaryColor,
            endLocation: widget.endLocation,
          ),
        ),
      ),
    );
  }

  void _openLiveTracking() {
    final assignedVehicleId = Get.find<SessionController>(tag: 'driver').driverData.value?['assigned_vehicle_id'] as String?;
    print('dash vehi : $assignedVehicleId');
    print('trip id: ${widget.tripId}');
    Get.to(() => LiveTrackingMapPage(
      assignedVehicleId: assignedVehicleId,
      routePoints: widget.points,
      stops: widget.stops,
      primaryColor: widget.primaryColor,
      tripId: widget.tripId,
      endLocation: widget.endLocation,
    ));
  }

  @override
  Widget build(BuildContext context) {
    if (widget.points.isEmpty) return const SizedBox.shrink();

    final startPoint = LatLng(
      widget.points.first.latitude,
      widget.points.first.longitude,
    );
    final endPoint = LatLng(
      widget.points.last.latitude,
      widget.points.last.longitude,
    );
    final markers = <Marker>[
      Marker(
        width: 38,
        height: 38,
        point: startPoint,
        child: _ActiveMapMarker(
          icon: Icons.play_arrow_rounded,
          background: widget.primaryColor,
          iconColor: Colors.white,
        ),
      ),
      Marker(
        width: 38,
        height: 38,
        point: endPoint,
        child: _ActiveMapMarker(
          icon: Icons.flag,
          background: Colors.white,
          iconColor: widget.primaryColor,
          borderColor: widget.primaryColor,
        ),
      ),
      ...widget.stops
          .where((s) => s.label?.isNotEmpty == true)
          .map(
            (stop) => Marker(
          width: 120,
          height: 80,
          point: LatLng(stop.latitude, stop.longitude),
          child: _StopMarker(
            label: stop.label ?? '',
            color: widget.primaryColor,
          ),
        ),
      ),
    ];

    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: startPoint,
            initialZoom: _currentZoom,
            interactionOptions: const InteractionOptions(
              flags: InteractiveFlag.pinchZoom | InteractiveFlag.drag,
            ),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
              subdomains: const ['a', 'b', 'c'],
              userAgentPackageName: 'com.trackify.driver',
            ),
            if (routePoints.isNotEmpty)
              PolylineLayer(
                polylines: [
                  Polyline(
                    points: routePoints,
                    color: widget.primaryColor,
                    strokeWidth: 5,
                    isDotted: false,
                  ),
                ],
              ),
            MarkerLayer(markers: markers),
          ],
        ),

        if (_isLoading)
          const Positioned.fill(
            child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
          ),

        Positioned(
          bottom: 10,
          right: 10,
          child: Column(
            children: [
              _MapButton(asset: 'assets/icons/zoom-in.png', onTap: _zoomIn),
              const SizedBox(height: 10),
              _MapButton(
                asset: 'assets/icons/maximize.png',
                onTap: _openFullScreenMap,
              ),
              if (widget.showLiveTrackingButton) ...[
                const SizedBox(height: 10),
                _MapButton(
                  asset: 'assets/icons/map.png',
                  onTap: _openLiveTracking,
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

/// Helper for consistent map buttons
class _MapButton extends StatelessWidget {
  final String asset;
  final VoidCallback onTap;

  const _MapButton({required this.asset, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Colors.black26,
              blurRadius: 5,
              offset: const Offset(2, 2),
            ),
          ],
        ),
        child: Image.asset(asset, width: 18, height: 18),
      ),
    );
  }
}

// 🔹 Full Screen Map Widget
class _FullScreenMap extends StatefulWidget {
  final List<LatLng> routePoints;
  final List<_GeoCoordinate> points;
  final List<_GeoCoordinate> stops;
  final Color primaryColor;
  final _GeoCoordinate? endLocation;

  const _FullScreenMap({
    required this.routePoints,
    required this.points,
    required this.stops,
    required this.primaryColor,
    this.endLocation,
  });

  @override
  State<_FullScreenMap> createState() => _FullScreenMapState();
}

class _FullScreenMapState extends State<_FullScreenMap> {
  final MapController _mapController = MapController();
  double _currentZoom = 16.0;

  void _zoomIn() {
    setState(() {
      _currentZoom += 1;
      _mapController.move(_mapController.camera.center, _currentZoom);
    });
  }

  void _zoomOut() {
    setState(() {
      _currentZoom -= 1;
      _mapController.move(_mapController.camera.center, _currentZoom);
    });
  }

  List<LatLng> _buildPolylineWithEndpoint(List<LatLng> routePoints, LatLng startPoint, LatLng endPoint) {
    final polyline = List<LatLng>.from(routePoints);
    
    if (polyline.isNotEmpty) {
      if ((polyline.first.latitude != startPoint.latitude || polyline.first.longitude != startPoint.longitude) &&
          (polyline.last.latitude != startPoint.latitude || polyline.last.longitude != startPoint.longitude)) {
        polyline.insert(0, startPoint);
      }
      
      if (polyline.last.latitude != endPoint.latitude || polyline.last.longitude != endPoint.longitude) {
        polyline.add(endPoint);
      }
    }
    
    return polyline;
  }

  @override
  Widget build(BuildContext context) {
    if (widget.points.isEmpty)
      return const Center(child: Text("No route data"));

    final latLngPoints =
    widget.points.map((p) => LatLng(p.latitude, p.longitude)).toList();
    final startPoint = latLngPoints.first;
    
    late final LatLng endPoint;
    if (widget.endLocation != null) {
      endPoint = LatLng(widget.endLocation!.latitude, widget.endLocation!.longitude);
    } else {
      endPoint = latLngPoints.last;
    }
    
    final markers = <Marker>[
      Marker(
        point: startPoint,
        child: _ActiveMapMarker(
          icon: Icons.play_arrow_rounded,
          background: widget.primaryColor,
          iconColor: Colors.white,
        ),
      ),
      Marker(
        point: endPoint,
        child: _ActiveMapMarker(
          icon: Icons.flag,
          background: Colors.white,
          iconColor: widget.primaryColor,
          borderColor: widget.primaryColor,
        ),
      ),
    ];

    final stopMarkers =
    widget.stops
        .where((stop) => stop.label?.isNotEmpty == true)
        .map(
          (stop) => Marker(
        point: LatLng(stop.latitude, stop.longitude),
        width: 120,
        height: 80,
        child: _StopMarker(
          label: stop.label ?? '',
          color: widget.primaryColor,
        ),
      ),
    )
        .toList();

    markers.addAll(stopMarkers);

    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: startPoint,
            initialZoom: _currentZoom,
            interactionOptions: const InteractionOptions(
              flags: InteractiveFlag.all,
            ),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
              subdomains: const ['a', 'b', 'c'],
              userAgentPackageName: 'com.trackify.driver',
            ),
            if (widget.routePoints.isNotEmpty)
              PolylineLayer(
                polylines: [
                  Polyline(
                    points: _buildPolylineWithEndpoint(widget.routePoints, startPoint, endPoint),
                    color: widget.primaryColor,
                    strokeWidth: 5,
                  ),
                ],
              ),
            MarkerLayer(markers: markers),
          ],
        ),

        // Zoom controls
        Positioned(
          bottom: 30,
          right: 20,
          child: Column(
            children: [
              _ZoomButton(iconPath: 'assets/icons/zoom-in.png', onTap: _zoomIn),
              const SizedBox(height: 10),
              _ZoomButton(
                iconPath: 'assets/icons/zoom-out.png',
                onTap: _zoomOut,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Reusable zoom button widget
class _ZoomButton extends StatelessWidget {
  final String iconPath;
  final VoidCallback onTap;

  const _ZoomButton({required this.iconPath, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 45,
        height: 45,
        decoration: BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 6,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        padding: const EdgeInsets.all(8),
        child: Image.asset(iconPath, fit: BoxFit.contain),
      ),
    );
  }
}

// 🔹 Marker Widget
class _ActiveMapMarker extends StatelessWidget {
  final IconData icon;
  final Color background;
  final Color iconColor;
  final Color? borderColor;

  const _ActiveMapMarker({
    required this.icon,
    required this.background,
    required this.iconColor,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: background,
        shape: BoxShape.circle,
        border: Border.all(color: borderColor ?? Colors.transparent, width: 2),
      ),
      padding: const EdgeInsets.all(6),
      child: Icon(icon, color: iconColor, size: 18),
    );
  }
}

class _StopMarker extends StatelessWidget {
  final String label;
  final Color color;

  const _StopMarker({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Transform.translate(
      offset: const Offset(0, -18),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 14,
            height: 14,
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              border: Border.all(color: color, width: 2),
            ),
          ),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.12),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LiveTripBadge extends StatefulWidget {
  final Color color;

  const _LiveTripBadge({required this.color});

  @override
  State<_LiveTripBadge> createState() => _LiveTripBadgeState();
}

class _LiveTripBadgeState extends State<_LiveTripBadge>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
    _scale = Tween<double>(
      begin: 0.92,
      end: 1.05,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: _scale,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: widget.color.withOpacity(0.18),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: widget.color.withOpacity(0.5)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.circle, size: 8, color: widget.color),
            const SizedBox(width: 6),
            Text(
              'LIVE TRIP',
              style: TextStyle(
                color: widget.color,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Shimmer extends StatefulWidget {
  const _Shimmer({required this.child});

  final Widget child;

  @override
  State<_Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<_Shimmer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final value = _controller.value;
        final gradient = LinearGradient(
          colors: [
            Colors.grey.shade300,
            Colors.grey.shade100,
            Colors.grey.shade300,
          ],
          stops: const [0.1, 0.3, 0.4],
          begin: Alignment(-1 - value, -0.3),
          end: Alignment(1 + value, 0.3),
        );
        return ShaderMask(
          shaderCallback: gradient.createShader,
          blendMode: BlendMode.srcATop,
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

class _GeoCoordinate {
  const _GeoCoordinate(this.latitude, this.longitude, {this.label, this.order});

  final double latitude;
  final double longitude;
  final String? label;
  final int? order;
}


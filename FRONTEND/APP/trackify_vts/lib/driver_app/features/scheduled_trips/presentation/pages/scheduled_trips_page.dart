import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import 'package:trackify_vts/driver_app/features/scheduled_trips/presentation/controllers/scheduled_trips_controller.dart';
import 'package:trackify_vts/driver_app/features/scheduled_trips/domain/models/scheduled_trip_model.dart';
import 'package:trackify_vts/utilities/widgets/status_banner.dart';
import 'package:trackify_vts/driver_app/features/dashboard/presentation/controllers/driver_dashboard_controller.dart';
import 'package:trackify_vts/driver_app/features/dashboard/presentation/pages/live_tracking_map_page.dart';
import 'package:panara_dialogs/panara_dialogs.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../../services/open_route_service.dart';

class ScheduledTripsPage extends StatefulWidget {
  const ScheduledTripsPage({super.key});

  @override
  State<ScheduledTripsPage> createState() => _ScheduledTripsPageState();
}

class _ScheduledTripsPageState extends State<ScheduledTripsPage> {
  late final ScheduledTripsController controller;
  ScheduledTrip? selectedTrip;

  @override
  void initState() {
    super.initState();
    controller = Get.put(ScheduledTripsController(), tag: 'scheduled_trips');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;

    return WillPopScope(
      onWillPop: () async {
        // Refresh dashboard when going back
        try {
          final dashboardController = Get.find<DriverDashboardController>(
            tag: 'driver_dashboard',
          );
          dashboardController.fetchTodaysScheduledTrips();
          dashboardController.fetchActiveTrip();
          dashboardController.fetchTripHistory();
        } catch (e) {
          // Ignore if controller not found
        }
        return true;
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF4F6FC),
        appBar: AppBar(
          elevation: 0,
          centerTitle: true,
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          title: Column(
            children: const [
              Text(
                'Upcoming Trips',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
              ),
              SizedBox(height: 4),
              Text(
                'Manage your daily routes at a glance',
                style: TextStyle(fontSize: 12, color: Colors.black54),
              ),
            ],
          ),
          actions: [
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Obx(
                () =>
                    controller.isLoading.value
                        ? const SizedBox(
                          width: 50,
                          child: Center(
                            child: SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          ),
                        )
                        : Tooltip(
                          message: 'Refresh trips',
                          child: Container(
                            decoration: BoxDecoration(
                              color: primaryColor.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: IconButton(
                              icon: const Icon(Icons.refresh),
                              color: primaryColor,
                              onPressed: controller.refreshTrips,
                            ),
                          ),
                        ),
              ),
            ),
          ],
        ),
        body: Obx(() {
          if (controller.isLoading.value && controller.allTrips.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (controller.errorMessage.value.isNotEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.08),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.error_outline,
                        size: 48,
                        color: Colors.red,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      controller.errorMessage.value,
                      textAlign: TextAlign.center,
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: Colors.black87,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Something went wrong while loading your trips. Please try again.',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 24,
                          vertical: 12,
                        ),
                      ),
                      onPressed: controller.refreshTrips,
                      icon: const Icon(Icons.refresh, color: Colors.white),
                      label: const Text(
                        'Retry',
                        style: TextStyle(color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }

          return Column(
            children: [
              SizedBox(height: 10,),
              // Active Trip Section
              Obx(() {
                if (controller.activeTrip.value != null) {
                  final utcTime = DateTime.tryParse(
                    controller.activeTrip.value!.startTime,
                  );
                  final istTime =
                      utcTime != null
                          ? utcTime.add(const Duration(hours: 5, minutes: 30))
                          : DateTime.now();

                  String _formatDate(DateTime time) {
                    final day = time.day.toString().padLeft(2, '0');
                    final month = time.month.toString().padLeft(2, '0');
                    final year = time.year.toString().substring(2);
                    return '$day/$month/$year';
                  }

                  String _formatTimeWithAmPm(DateTime time) {
                    final hour = time.hour % 12 == 0 ? 12 : time.hour % 12;
                    final minute = time.minute.toString().padLeft(2, '0');
                    final period = time.hour >= 12 ? 'PM' : 'AM';
                    return '$hour:$minute $period';
                  }

                  return GestureDetector(
                    onTap:
                        () => _showActiveTripModal(
                          context,
                          controller.activeTrip.value!,
                          primaryColor,
                        ),
                    child: Container(
                      margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF81C784),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF81C784).withOpacity(0.4),
                            blurRadius: 12,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: const [
                                    Icon(
                                      Icons.play_circle_fill,
                                      color: Colors.white,
                                      size: 24,
                                    ),
                                    SizedBox(width: 8),
                                    Text(
                                      'Active Trip',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  controller.activeTrip.value!.routeName,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                  ),
                                ),
                                if (utcTime != null)
                                  Text(
                                    'Started on ${_formatDate(istTime)} at ${_formatTimeWithAmPm(istTime)}',
                                    style: TextStyle(
                                      color: Colors.white.withOpacity(0.7),
                                      fontSize: 14,
                                    ),
                                  )
                                else
                                  Text(
                                    'Status: ${controller.activeTrip.value!.status}',
                                    style: TextStyle(
                                      color: Colors.white.withOpacity(0.7),
                                      fontSize: 14,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          Image.asset(
                            'assets/icons/bus.png',
                            height: 60,
                            width: 60,
                            fit: BoxFit.contain,
                            color: Colors.white,
                          ),
                        ],
                      ),
                    ),
                  );
                }
                return const SizedBox.shrink();
              }),
              // Tab selector
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE0E7FF)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(8),
                    child: Row(
                      children: [
                        Expanded(
                          child: _buildTabButton(
                            label: 'All Trips',
                            isSelected: controller.selectedTabIndex.value == 0,
                            onPressed: () => controller.setSelectedTab(0),
                            primaryColor: primaryColor,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildTabButton(
                            label: "Today's Trips",
                            isSelected: controller.selectedTabIndex.value == 1,
                            onPressed: () => controller.setSelectedTab(1),
                            primaryColor: primaryColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              // Trips list
              Expanded(
                child:
                    controller.currentTrips.isEmpty
                        ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(24),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(20),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.05),
                                      blurRadius: 20,
                                      offset: const Offset(0, 10),
                                    ),
                                  ],
                                ),
                                child: Column(
                                  children: [
                                    Icon(
                                      Icons.calendar_today,
                                      size: 48,
                                      color: Colors.grey[400],
                                    ),
                                    const SizedBox(height: 16),
                                    Text(
                                      'No trips found',
                                      style: theme.textTheme.titleMedium
                                          ?.copyWith(
                                            fontWeight: FontWeight.w600,
                                          ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      'Refresh to make sure you are seeing the latest updates.',
                                      style: theme.textTheme.bodyMedium
                                          ?.copyWith(color: Colors.grey[600]),
                                      textAlign: TextAlign.center,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        )
                        : RefreshIndicator(
                          onRefresh: controller.refreshTrips,
                          child:
                              controller.isLoading.value
                                  ? ListView.builder(
                                    padding: const EdgeInsets.fromLTRB(
                                      16,
                                      0,
                                      16,
                                      24,
                                    ),
                                    itemCount: 4,
                                    itemBuilder: (context, index) {
                                      return _buildTripCardShimmer();
                                    },
                                  )
                                  : ListView.builder(
                                    padding: const EdgeInsets.fromLTRB(
                                      16,
                                      0,
                                      16,
                                      24,
                                    ),
                                    itemCount: controller.currentTrips.length,
                                    itemBuilder: (context, index) {
                                      final trip =
                                          controller.currentTrips[index];
                                      return _buildTripCard(trip, primaryColor);
                                    },
                                  ),
                        ),
              ),
            ],
          );
        }),
      ),
    );
  }

  Widget _buildTabButton({
    required String label,
    required bool isSelected,
    required VoidCallback onPressed,
    required Color primaryColor,
  }) {
    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut, // 🔹 smoother color transition
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          gradient:
              isSelected
                  ? LinearGradient(
                    colors: [primaryColor, primaryColor.withOpacity(0.75)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  )
                  : null,
          color: isSelected ? null : Colors.transparent,
          border: Border.all(
            color:
                isSelected
                    ? primaryColor.withOpacity(0.3)
                    : Colors.grey.shade300,
          ),
          boxShadow:
              isSelected
                  ? [
                    BoxShadow(
                      color: primaryColor.withOpacity(0.25),
                      blurRadius: 14,
                      offset: const Offset(0, 6),
                    ),
                  ]
                  : [],
        ),
        child: Center(
          child: AnimatedDefaultTextStyle(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeInOut,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: isSelected ? Colors.white : Colors.black87,
            ),
            child: Text(label),
          ),
        ),
      ),
    );
  }

  Widget _buildTripCardShimmer() {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 18,
              offset: const Offset(0, 10),
            ),
          ],
          border: Border.all(color: const Color(0xFFE0E7FF), width: 1),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            height: 12,
                            width: 80,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Container(
                            height: 16,
                            width: 150,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      height: 28,
                      width: 80,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  height: 80,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTripCard(ScheduledTrip trip, Color primaryColor) {
    return GestureDetector(
      onTap: () {
        setState(() {
          selectedTrip = trip;
        });
        _showTripDetailsModal(trip, primaryColor);
      },
      child: Hero(
        tag:
            'trip-card-${trip.scheduledTripId.isNotEmpty ? trip.scheduledTripId : trip.routeName}',
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 18,
                offset: const Offset(0, 10),
              ),
            ],
            border: Border.all(color: const Color(0xFFE0E7FF), width: 1),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: Stack(
              children: [
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 10,
                                        vertical: 6,
                                      ),
                                      decoration: BoxDecoration(
                                        color: primaryColor.withOpacity(0.12),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Row(
                                        children: [
                                          Icon(
                                            Icons.alt_route,
                                            size: 14,
                                            color: primaryColor,
                                          ),
                                          const SizedBox(width: 4),
                                          Text(
                                            'Route',
                                            style: TextStyle(
                                              fontSize: 11,
                                              letterSpacing: 0.4,
                                              color: primaryColor,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Flexible(
                                      child: Text(
                                        trip.tripPeriod
                                            .replaceAll('-', ' ')
                                            .toUpperCase(),
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.black,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  trip.routeName.isNotEmpty
                                      ? trip.routeName
                                      : (trip.vehicleId?.routeName ?? 'Route'),
                                  style: TextStyle(
                                    fontSize: 15,
                                    color: Colors.grey[600],
                                    letterSpacing: 0.5,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          _buildStatusBadge(trip.status),
                        ],
                      ),
                      const SizedBox(height: 5),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF5F8FF),
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.03),
                              blurRadius: 8,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            // 🔹 Left section — trip time & stops
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Image.asset(
                                      'assets/icons/start.png',
                                      width: 18,
                                      height: 18,
                                      color: primaryColor,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      trip.scheduledStartTime,
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    Image.asset(
                                      'assets/icons/location.png',
                                      width: 18,
                                      height: 18,
                                      color: primaryColor,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      '${trip.routePoints.length} stops',
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: Colors.grey[700],
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),

                          ],
                        ),
                      ),

                      // Replace your existing repeatDays widget with this:
                      if (trip.repeatDays != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.start,
                            children: List.generate(7, (index) {
                              // Define day abbreviations in order
                              final List<String> days = [
                                'M',
                                'T',
                                'W',
                                'T',
                                'F',
                                'S',
                                'S',
                              ];

                              // Get whether this day is active (adjust your method if needed)
                              final bool isActive = trip.repeatDays!
                                  .isDayActive(index);

                              return Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 4,
                                ),
                                child: Container(
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color:
                                        isActive
                                            ? Colors.green.withOpacity(0.15)
                                            : Colors
                                                .transparent, // 👈 light green fill
                                    border: Border.all(
                                      color:
                                          isActive
                                              ? Colors.green
                                              : Colors.grey.shade400,
                                      width: 2,
                                    ),
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    days[index],
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                      color:
                                          isActive
                                              ? Colors.green
                                              : Colors.grey.shade500,
                                    ),
                                  ),
                                ),
                              );
                            }),
                          ),
                        ),
                    ],
                  ),
                ),
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(5),
                    decoration: BoxDecoration(
                      color: primaryColor.withOpacity(0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.arrow_forward_ios,
                      size: 10,
                      color: primaryColor,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    final color = _getStatusColor(status);
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color.withOpacity(0.18), color.withOpacity(0.08)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.4), width: 1),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.12),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Text(
        status.replaceAll('-', ' ').toUpperCase(),
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.5,
          color: _darkenStatusColor(color),
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'in-progress':
      case 'active':
        return Colors.green;
      case 'completed':
        return Colors.blue;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Color _darkenStatusColor(Color color) {
    const factor = 0.15;
    return Color.fromARGB(
      color.alpha,
      (color.red * (1 - factor)).clamp(0, 255).round(),
      (color.green * (1 - factor)).clamp(0, 255).round(),
      (color.blue * (1 - factor)).clamp(0, 255).round(),
    );
  }

  void _showTripDetailsModal(ScheduledTrip trip, Color primaryColor) {
    bool showMap = false;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setState) {
            return DraggableScrollableSheet(
              initialChildSize: 0.8,
              minChildSize: 0.5,
              maxChildSize: 0.95,
              builder: (
                BuildContext context,
                ScrollController scrollController,
              ) {
                return Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(20),
                      topRight: Radius.circular(20),
                    ),
                  ),
                  child: Column(
                    children: [
                      // Header
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: primaryColor,
                          borderRadius: const BorderRadius.only(
                            topLeft: Radius.circular(20),
                            topRight: Radius.circular(20),
                          ),
                        ),
                        child: Row(
                          children: [
                            if (showMap) ...[
                              IconButton(
                                icon: const Icon(
                                  Icons.arrow_back,
                                  color: Colors.white,
                                ),
                                onPressed:
                                    () => setState(() => showMap = false),
                              ),
                              const SizedBox(width: 8),
                            ] else ...[
                              Icon(Icons.directions_bus, color: Colors.white),
                              const SizedBox(width: 12),
                            ],
                            Expanded(
                              child: Text(
                                showMap ? 'Trip Map' : trip.routeName,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            if (!showMap)
                              IconButton(
                                icon: Image.asset(
                                  'assets/icons/map.png',
                                  height: 24, // adjust size as needed
                                  width: 24,
                                  color:
                                      Colors
                                          .white, // optional: keeps the white tint
                                ),
                                onPressed: () => setState(() => showMap = true),
                              ),
                            IconButton(
                              icon: const Icon(
                                Icons.close,
                                color: Colors.white,
                              ),
                              onPressed: () => Navigator.of(context).pop(),
                            ),
                          ],
                        ),
                      ),
                      // Content
                      Expanded(
                        child:
                            showMap
                                ? _buildMapView(trip, primaryColor)
                                : SingleChildScrollView(
                                  controller: scrollController,
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      _buildStartTripButton(
                                        context: context,
                                        trip: trip,
                                        primaryColor: primaryColor,
                                        onStartSuccess: () {
                                          Navigator.of(context).pop();
                                          controller.refreshTrips().then((_) {
                                            Future.delayed(
                                              const Duration(milliseconds: 500),
                                              () {
                                                if (controller.activeTrip.value !=
                                                    null) {
                                                  _showActiveTripModal(
                                                    context,
                                                    controller.activeTrip.value!,
                                                    primaryColor,
                                                  );
                                                }
                                              },
                                            );
                                          });
                                        },
                                        onStopSuccess: () {
                                          Navigator.of(context).pop();
                                          controller.refreshTrips().then((_) {
                                            setState(() {
                                              selectedTrip = null;
                                            });
                                          });
                                        },
                                      ),
                                      const SizedBox(height: 16),
                                      _buildInfoSection('Trip Schedule', [
                                        _InfoRowData(
                                          icon: Icons.directions_run,
                                          label: 'Route Name',
                                          value: trip.routeName,
                                        ),
                                        _InfoRowData(
                                          icon: Icons.schedule,
                                          label: 'Start Time',
                                          value: trip.scheduledStartTime,
                                        ),
                                        _InfoRowData(
                                          icon: Icons.calendar_today,
                                          label: 'Trip Period',
                                          value: trip.tripPeriod,
                                        ),
                                        _InfoRowData(
                                          icon: Icons.flag,
                                          label: 'Status',
                                          value: trip.status,
                                          isStatus: true,
                                        ),

                                      ], primaryColor),
                                      if (trip.vehicleId != null) ...[
                                        const SizedBox(height: 16),
                                        _buildInfoSection('Route Information', [
                                          _InfoRowData(
                                            icon: Icons.directions_bus,
                                            label: 'Vehicle Number',
                                            value:
                                                trip.vehicleId!.vehicleNumber,
                                          ),
                                          _InfoRowData(
                                            icon: Icons.info,
                                            label: 'Vehicle Type',
                                            value: trip.vehicleId!.vehicleType,
                                          ),
                                          _InfoRowData(
                                            icon: Icons.palette,
                                            label: 'Color',
                                            value: trip.vehicleId!.color,
                                          ),
                                          _InfoRowData(
                                            icon: Icons.card_membership,
                                            label: 'Registration',
                                            value:
                                                trip
                                                    .vehicleId!
                                                    .registrationNumber,
                                          ),
                                          _InfoRowData(
                                            icon: Icons.event_seat,
                                            label: 'Seating Capacity',
                                            value:
                                                '${trip.vehicleId!.seatingCapacity} seats',
                                          ),
                                        ], primaryColor),
                                      ],
                                      const SizedBox(height: 16),
                                      _buildRouteStopsSection(
                                        trip,
                                        primaryColor,
                                      ),
                                    ],
                                  ),
                                ),
                      ),
                    ],
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

  List<Marker> _buildMarkersForMap(ScheduledTrip trip) {
    final markers = <Marker>[];

    if (trip.startLocation != null) {
      markers.add(
        Marker(
          point: LatLng(
            trip.startLocation!.latitude,
            trip.startLocation!.longitude,
          ),
          width: 40,
          height: 50,
          child: GestureDetector(
            onTap:
                () => _showMarkerDetails(
                  context,
                  'Start Location',
                  trip.startLocation!.address,
                ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.green,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.3),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.location_on,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                Positioned(
                  bottom: -2,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.green,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'START',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 8,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (trip.endLocation != null) {
      markers.add(
        Marker(
          point: LatLng(
            trip.endLocation!.latitude,
            trip.endLocation!.longitude,
          ),
          width: 40,
          height: 50,
          child: GestureDetector(
            onTap:
                () => _showMarkerDetails(
                  context,
                  'End Location',
                  trip.endLocation!.address,
                ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.3),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.location_on,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                Positioned(
                  bottom: -2,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'END',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 8,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (trip.routePoints.isNotEmpty) {
      markers.addAll(
        trip.routePoints.map(
          (stop) => Marker(
            point: LatLng(stop.latitude, stop.longitude),
            width: 40,
            height: 40,
            child: GestureDetector(
              onTap:
                  () => _showMarkerDetails(
                    context,
                    'Stop ${stop.order}: ${stop.name}',
                    '${stop.latitude.toStringAsFixed(4)}, ${stop.longitude.toStringAsFixed(4)}',
                  ),
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.blue,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.3),
                      blurRadius: 4,
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    '${stop.order}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }

    return markers;
  }

  // --- The updated map builder function ---
  Widget _buildMapView(ScheduledTrip trip, Color primaryColor) {
    final mapController = MapController();
    double currentZoom = 12.0;
    final openRouteService = OpenRouteService(
      "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjU1MDE2ODk0OTMwYjQ0YjViOGNjODMyOTYzYjI4NGZiIiwiaCI6Im11cm11cjY0In0=", // 🔑 Your API key here
    );

    final startLocation = trip.startLocation;
    final endLocation = trip.endLocation;

    if (startLocation == null || endLocation == null) {
      return const Center(child: Text('Route data unavailable'));
    }

    final orderedStops = List<RoutePoint>.from(
      trip.routePoints,
    )..sort((a, b) => a.order.compareTo(b.order));
    final filteredStops =
        orderedStops.where((stop) {
          return stop.latitude != 0 || stop.longitude != 0;
        }).toList();

    final waypointChain = <LatLng>[
      LatLng(startLocation.latitude, startLocation.longitude),
      ...filteredStops.map((stop) => LatLng(stop.latitude, stop.longitude)),
      LatLng(endLocation.latitude, endLocation.longitude),
    ];

    final normalizedWaypoints = <LatLng>[];
    for (final point in waypointChain) {
      if (normalizedWaypoints.isEmpty ||
          normalizedWaypoints.last.latitude != point.latitude ||
          normalizedWaypoints.last.longitude != point.longitude) {
        normalizedWaypoints.add(point);
      }
    }

    if (normalizedWaypoints.length < 2) {
      return const Center(child: Text('Route data unavailable'));
    }

    List<LatLng> routePoints = [];
    bool isFetchingRoute = false;
    String? routeError;
    bool hasRequestedRoute = false;

    LatLng computeAverage(List<LatLng> points) {
      final lat =
          points.fold<double>(0, (sum, value) => sum + value.latitude) /
          points.length;
      final lon =
          points.fold<double>(0, (sum, value) => sum + value.longitude) /
          points.length;
      return LatLng(lat, lon);
    }

    return StatefulBuilder(
      builder: (context, setState) {
        Future<void> loadRoute() async {
          setState(() {
            isFetchingRoute = true;
            routeError = null;
          });
          try {
            final fetchedRoute = await openRouteService.getRouteThrough(
              normalizedWaypoints,
            );
            if (!context.mounted) {
              return;
            }
            if (fetchedRoute.isEmpty) {
              setState(() {
                routeError = 'Route unavailable';
                isFetchingRoute = false;
                routePoints = normalizedWaypoints;
              });
              return;
            }
            final center = computeAverage(fetchedRoute);
            mapController.move(center, currentZoom);
            setState(() {
              routePoints = fetchedRoute;
              isFetchingRoute = false;
            });
          } catch (_) {
            if (!context.mounted) {
              return;
            }
            setState(() {
              routeError = 'Unable to load route';
              isFetchingRoute = false;
              routePoints = [];
            });
          }
        }

        if (!hasRequestedRoute) {
          hasRequestedRoute = true;
          loadRoute();
        }

        void zoomIn() {
          currentZoom += 1;
          mapController.move(mapController.camera.center, currentZoom);
        }

        void zoomOut() {
          currentZoom -= 1;
          mapController.move(mapController.camera.center, currentZoom);
        }

        return Stack(
          children: [
            FlutterMap(
              mapController: mapController,
              options: MapOptions(
                initialCenter: normalizedWaypoints.first,
                initialZoom: currentZoom,
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
                if (routePoints.length > 1)
                  PolylineLayer(
                    polylines: [
                      Polyline(
                        points: routePoints,
                        color: primaryColor,
                        strokeWidth: 5,
                      ),
                    ],
                  ),
                MarkerLayer(markers: _buildMarkersForMap(trip)),
              ],
            ),
            Positioned(
              bottom: 20,
              right: 20,
              child: Column(
                children: [
                  _ZoomButton(
                    iconPath: 'assets/icons/zoom-in.png',
                    onTap: zoomIn,
                  ),
                  const SizedBox(height: 10),
                  _ZoomButton(
                    iconPath: 'assets/icons/zoom-out.png',
                    onTap: zoomOut,
                  ),
                ],
              ),
            ),
            if (isFetchingRoute)
              Positioned(
                top: 20,
                right: 20,
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.08),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: const Padding(
                    padding: EdgeInsets.all(8),
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
              ),
            if (routeError != null && routePoints.isEmpty && !isFetchingRoute)
              Positioned(
                left: 16,
                right: 16,
                bottom: 16,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    routeError!,
                    style: TextStyle(
                      color: Colors.red.shade700,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _buildStartTripButton({
    required BuildContext context,
    required ScheduledTrip trip,
    required Color primaryColor,
    VoidCallback? onStartSuccess,
    VoidCallback? onStopSuccess,
  }) {
    return Obx(() {
      final isLoading = controller.isStartingTrip.value;
      final activeTripId = controller.currentActiveTripId.value;
      final isTripActive = activeTripId != null;
      final normalizedStatus = trip.status.toLowerCase();
      final isPending = normalizedStatus == 'pending';
      final shouldShowStopButton =
          normalizedStatus == 'in progress' ||
          normalizedStatus == 'inprogress' ||
          normalizedStatus == 'in-progress' ||
          normalizedStatus == 'active';

      if (shouldShowStopButton) {
        return ElevatedButton.icon(
          style: ElevatedButton.styleFrom(
            minimumSize: const Size(double.infinity, 54),
            backgroundColor: Colors.redAccent,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            elevation: controller.isStoppingTrip.value ? 0 : 4,
          ),
          onPressed:
              controller.isStoppingTrip.value
                  ? null
                  : () {
                    final endLocation = trip.endLocation ?? trip.startLocation;
                    if (endLocation == null) {
                      showStatusBanner(
                        'End location data missing for this trip.',
                        Colors.red,
                        Icons.error_outline,
                      );
                      return;
                    }

                    if (trip.associatedTripId != null) {
                      controller.stopTrip(
                        tripId: trip.associatedTripId!,
                        payload: {
                          'end_location': {
                            'latitude': endLocation.latitude,
                            'longitude': endLocation.longitude,
                          },
                          'distance_traveled': 0,
                        },
                        onSuccess: onStopSuccess,
                      );
                    }
                  },
          icon:
              controller.isStoppingTrip.value
                  ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                  : const Icon(Icons.stop_rounded, size: 26),
          label: Text(
            controller.isStoppingTrip.value ? 'Stopping Trip...' : 'Stop Trip',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
        );
      }

      final isDisabled = !isPending || isTripActive;

      return ElevatedButton.icon(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(double.infinity, 54),
          backgroundColor: isDisabled ? Colors.grey.shade300 : primaryColor,
          foregroundColor:
              isDisabled
                  ? Colors.grey.shade600
                  : (primaryColor.computeLuminance() > 0.5
                      ? Colors.black
                      : Colors.white),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: isDisabled ? 0 : 4,
        ),
        onPressed:
            isDisabled || isLoading
                ? null
                : () => controller.startTrip(
                  trip.scheduledTripId,
                  onSuccess: onStartSuccess,
                ),
        icon:
            isLoading
                ? SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      primaryColor.computeLuminance() > 0.5
                          ? Colors.black
                          : Colors.white,
                    ),
                  ),
                )
                : const Icon(Icons.play_arrow_rounded, size: 28),
        label: Text(
          isLoading
              ? 'Starting Trip...'
              : isTripActive
              ? 'Another trip in progress'
              : isPending
              ? 'Start Trip'
              : 'Trip Already ${trip.status}',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      );
    });
  }

  Widget _buildRouteStopsSection(
      ScheduledTrip trip,
      Color primaryColor,
      ) {
    final stops = trip.routePoints;
    if (stops.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Route Stops',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),

        Column(
          children: stops.asMap().entries.map((entry) {
            final index = entry.key;
            final stop = entry.value;
            final bool isLast = index == stops.length - 1;

            return GestureDetector(
              onTap: () {
                _openMapForLocation(
                  stop.latitude,
                  stop.longitude,
                  stop.name,
                );
              },
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  /// LEFT: Number + Vertical Line
                  Column(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: primaryColor.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          '${stop.order}',
                          style: TextStyle(
                            color: primaryColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                          ),
                        ),
                      ),

                      /// Connecting Line (only between items)
                      if (!isLast)
                        Container(
                          width: 2,
                          height: 40,
                          margin: const EdgeInsets.symmetric(vertical: 6),
                          decoration: BoxDecoration(
                            color: primaryColor.withOpacity(0.35),
                            borderRadius: BorderRadius.circular(1),
                          ),
                        ),
                    ],
                  ),

                  const SizedBox(width: 14),

                  /// RIGHT: Stop Details Card
                  Expanded(
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 16),

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
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${stop.latitude.toStringAsFixed(4)}, '
                                      '${stop.longitude.toStringAsFixed(4)}',
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
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  void _openMapForLocation(double latitude, double longitude, String name) {
    // You can use url_launcher to open Google Maps or integrate with Google Maps SDK
    Get.snackbar(
      'Stop Location',
      '$name\nLat: ${latitude.toStringAsFixed(4)}, Lng: ${longitude.toStringAsFixed(4)}',
      duration: const Duration(seconds: 3),
    );
  }

  void _showMarkerDetails(BuildContext context, String title, String address) {
    // Show marker details in a snackbar instead of dialog
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
            Text(address),
          ],
        ),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _showActiveTripModal(
    BuildContext context,
    ActiveTrip activeTrip,
    Color primaryColor,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (BuildContext context) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.45,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(20),
              topRight: Radius.circular(20),
            ),
          ),
          child: Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: primaryColor,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(20),
                    topRight: Radius.circular(20),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Active Trip',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(Icons.close, color: Colors.white),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      activeTrip.routeName,
                      style: const TextStyle(color: Colors.white, fontSize: 16),
                    ),
                  ],
                ),
              ),

              // Content
              Expanded(
                child: SingleChildScrollView(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Trip Info
                        _buildActiveTripInfo(activeTrip, primaryColor),

                        const SizedBox(height: 24),

                        // Action Buttons
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: () {
                                  Navigator.pop(context);
                                  Get.to(
                                    () => LiveTrackingMapPage(
                                      assignedVehicleId:
                                          activeTrip.vehicleId.vehicleId,
                                      routePoints: activeTrip.routePoints,
                                      stops: activeTrip.stops,
                                      primaryColor: primaryColor,
                                      tripId: activeTrip.tripId,
                                    ),
                                  );
                                },
                                icon: const Icon(
                                  Icons.location_on,
                                  color: Colors.white,
                                ),
                                label: const Text(
                                  'Live Tracking',
                                  style: TextStyle(color: Colors.white),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: primaryColor,
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 12,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () {
                                  _showStopTripConfirmation(
                                    context,
                                    activeTrip,
                                    primaryColor,
                                  );
                                },
                                icon: const Icon(Icons.stop, color: Colors.red),
                                label: const Text(
                                  'Stop Trip',
                                  style: TextStyle(
                                    color: Colors.red,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(
                                    color: Colors.red,
                                    width: 2,
                                  ),
                                  backgroundColor: Colors.red.withOpacity(0.05),
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 12,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildActiveTripInfo(ActiveTrip activeTrip, Color primaryColor) {
    final utcTime = DateTime.tryParse(activeTrip.startTime);
    if (utcTime == null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Trip Details',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          _buildInfoRow('Vehicle', activeTrip.vehicleId.vehicleNumber),
          _buildInfoRow('Passengers', '${activeTrip.passengers.length}'),
        ],
      );
    }
    final istTime = utcTime.add(const Duration(hours: 5, minutes: 30));

    String _formatDate(DateTime time) {
      final day = time.day.toString().padLeft(2, '0');
      final month = time.month.toString().padLeft(2, '0');
      final year = time.year.toString().substring(2);
      return '$day/$month/$year';
    }

    String _formatTimeWithAmPm(DateTime time) {
      final hour = time.hour % 12 == 0 ? 12 : time.hour % 12;
      final minute = time.minute.toString().padLeft(2, '0');
      final period = time.hour >= 12 ? 'PM' : 'AM';
      return '$hour:$minute $period';
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Trip Details',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        _buildInfoRow('Vehicle', activeTrip.vehicleId.vehicleNumber),
        _buildInfoRow('Status', activeTrip.status),
        _buildInfoRow(
          'Started',
          '${_formatDate(istTime)} at ${_formatTimeWithAmPm(istTime)}',
        ),
        _buildInfoRow('Passengers', '${activeTrip.passengers.length}'),
        _buildInfoRow('Speed Limit', '${activeTrip.speedLimit} km/h'),
      ],
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[600],
              fontWeight: FontWeight.w500,
            ),
          ),
          Text(
            value,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  void _showStopTripConfirmation(
    BuildContext context,
    ActiveTrip activeTrip,
    Color primaryColor,
  ) {
    PanaraConfirmDialog.show(
      context,
      title: 'Stop Trip',
      message:
          'Are you sure you want to stop this trip? This action cannot be undone.',
      confirmButtonText: 'Stop Trip',
      cancelButtonText: 'Cancel',
      onTapConfirm: () {
        try {
          Navigator.pop(context);
        } catch (e) {
          // Ignore if nav fails
        }
        controller.stopTrip(
          tripId: activeTrip.tripId,
          payload: {
            'end_location': {
              'latitude': activeTrip.startLocation.latitude,
              'longitude': activeTrip.startLocation.longitude,
            },
            'distance_traveled': 0,
          },
          onSuccess: () {
            try {
              Navigator.pop(context);
            } catch (e) {
              // Ignore if nav fails
            }
            showStatusBanner(
              'Trip stopped successfully',
              Colors.green,
              Icons.check_circle,
            );
            controller.fetchActiveTrip();
          },
        );
      },
      onTapCancel: () {
        try {
          Navigator.pop(context);
        } catch (e) {
          // Ignore if nav fails
        }
      },
      panaraDialogType: PanaraDialogType.warning,
      barrierDismissible: false,
    );
  }
}

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

class _InfoRowData {
  final IconData icon;
  final String label;
  final String value;
  final bool isStatus;

  const _InfoRowData({
    required this.icon,
    required this.label,
    required this.value,
    this.isStatus = false,
  });
}

extension on _ScheduledTripsPageState {
  Widget _buildInfoSection(
    String title,
    List<_InfoRowData> rows,
    Color primaryColor,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          ...List.generate(rows.length, (index) {
            final row = rows[index];
            final isLast = index == rows.length - 1;
            return Column(
              children: [
                Row(
                  children: [
                    Icon(row.icon, size: 20, color: primaryColor),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            row.label,
                            style: const TextStyle(
                              fontSize: 14,
                              color: Colors.grey,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            row.value,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w500,
                              color:
                                  row.isStatus
                                      ? _getStatusColor(row.value.toLowerCase())
                                      : Colors.black87,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                if (!isLast) const SizedBox(height: 12),
              ],
            );
          }),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'completed':
        return Colors.green;
      case 'in_progress':
        return Colors.blue;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}

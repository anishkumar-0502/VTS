import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import 'package:trackify_vts/driver_app/features/scheduled_trips/presentation/controllers/scheduled_trips_controller.dart';
import 'package:trackify_vts/driver_app/features/scheduled_trips/domain/models/scheduled_trip_model.dart';
import 'package:trackify_vts/utilities/widgets/status_banner.dart';
import 'package:trackify_vts/driver_app/features/scheduled_trips/presentation/pages/trip_details_page.dart';
import 'package:trackify_vts/driver_app/features/scheduled_trips/presentation/pages/trip_map_page.dart';

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

    return Scaffold(
      backgroundColor: const Color(0xFFF4F6FC),
      appBar: AppBar(
        elevation: 0,
        centerTitle: true,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        title: Column(
          children: const [
            Text(
              'Scheduled Trips',
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
                    icon: const Icon(Icons.refresh),
                    label: const Text('Retry'),
                  ),
                ],
              ),
            ),
          );
        }

        return Column(
          children: [
            Container(
              width: double.infinity,
              margin: const EdgeInsets.fromLTRB(16, 20, 16, 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [primaryColor, primaryColor.withOpacity(0.75)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: primaryColor.withOpacity(0.25),
                    blurRadius: 16,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 18,
                        backgroundColor: Colors.white,
                        child: Icon(Icons.directions_bus, color: primaryColor),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'Your Daily Trip Scheduler',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Preview and manage upcoming trips with dynamic routing and detailed insights.',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: Colors.white.withOpacity(0.85),
                    ),
                  ),
                ],
              ),
            ),
            // Active Trip Section
            Obx(() {
              if (controller.activeTrip.value != null) {
                return Container(
                  margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF81C784), // 🌿 mild green (soft tone)
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF81C784).withOpacity(0.4),
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
                          const Icon(
                            Icons.play_circle_fill,
                            color: Colors.white,
                            size: 24,
                          ),
                          const SizedBox(width: 8),
                          const Text(
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
                        controller.activeTrip.value!.vehicleId.routeName,
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.9),
                          fontSize: 16,
                        ),
                      ),
                      Text(
                        'Started at ${controller.activeTrip.value!.startTime}',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.7),
                          fontSize: 14,
                        ),
                      ),
                    ],
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
                                        ?.copyWith(fontWeight: FontWeight.w600),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Refresh to make sure you are seeing the latest updates.',
                                    style: theme.textTheme.bodyMedium?.copyWith(
                                      color: Colors.grey[600],
                                    ),
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
                        child: ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                          itemCount: controller.currentTrips.length,
                          itemBuilder: (context, index) {
                            final trip = controller.currentTrips[index];
                            return _buildTripCard(trip, primaryColor);
                          },
                        ),
                      ),
            ),
          ],
        );
      }),
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
                                      '${trip.vehicleId?.routePoints.length ?? 0} stops',
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: Colors.grey[700],
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),

                            const Spacer(),

                            // 🔹 Right section — vehicle info box
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 10,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: primaryColor.withOpacity(0.1),
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.05),
                                    blurRadius: 6,
                                    offset: const Offset(0, 3),
                                  ),
                                ],
                              ),
                              child: Row(
                                children: [
                                  Image.asset(
                                    'assets/icons/bus.png',
                                    width: 20,
                                    height: 20,
                                    color: primaryColor,
                                  ),
                                  const SizedBox(width: 10),
                                  Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        trip.vehicleId?.vehicleNumber ?? 'N/A',
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      if (trip.vehicleId?.vehicleType != null)
                                        Text(
                                          trip.vehicleId!.vehicleType,
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: Colors.grey[500],
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
                                icon: const Icon(
                                  Icons.map,
                                  color: Colors.white,
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

    if (trip.vehicleId?.routePoints != null) {
      markers.addAll(
        trip.vehicleId!.routePoints.map(
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

  Widget _buildMapView(ScheduledTrip trip, Color primaryColor) {
    return FlutterMap(
      options: MapOptions(
        initialCenter: LatLng(
          trip.startLocation!.latitude,
          trip.startLocation!.longitude,
        ),
        initialZoom: 12,
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.trackify.driver',
        ),
        MarkerLayer(markers: _buildMarkersForMap(trip)),
      ],
    );
  }

  void _navigateToTripDetailsPage(ScheduledTrip trip, Color primaryColor) {
    Get.to(
      () => ScheduledTripDetailsPage(
        trip: trip,
        primaryColor: primaryColor,
        controller: controller,
      ),
      transition: Transition.rightToLeft,
    );
  }

  Widget _buildStartTripButton({
    required BuildContext context,
    required ScheduledTrip trip,
    required Color primaryColor,
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
                : () => controller.startTrip(trip.scheduledTripId),
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

  Marker _buildMapMarker({
    required BuildContext context,
    required String label,
    required Color color,
    required LatLng position,
    required VoidCallback onTap,
    bool isStop = false,
  }) {
    return Marker(
      point: position,
      width: 80,
      height: 80,
      child: GestureDetector(
        onTap: onTap,
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                label,
                style: TextStyle(
                  color:
                      color.computeLuminance() > 0.5
                          ? Colors.black
                          : Colors.white,
                  fontSize: isStop ? 9 : 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 2),
            Container(
              padding: EdgeInsets.all(isStop ? 0 : 6),
              width: isStop ? 40 : null,
              height: isStop ? 40 : null,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              child:
                  isStop
                      ? Center(
                        child: Text(
                          // Extract the last segment to display stop index
                          label.split(' ').last,
                          style: TextStyle(
                            color:
                                color.computeLuminance() > 0.5
                                    ? Colors.black
                                    : Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      )
                      : Icon(
                        Icons.location_on,
                        color:
                            color.computeLuminance() > 0.5
                                ? Colors.black
                                : Colors.white,
                        size: 18,
                      ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _MapMarkerBadge(
    BuildContext context,
    ScheduledTrip trip,
    Color primaryColor,
  ) {
    return const SizedBox.shrink();
  }

  Widget _buildMapSection(ScheduledTrip trip, Color primaryColor) {
    final routePoints = trip.vehicleId?.routePoints ?? [];
    final polylinePoints = <LatLng>[
      LatLng(trip.startLocation!.latitude, trip.startLocation!.longitude),
      ...routePoints.map<LatLng>(
        (point) => LatLng(point.latitude, point.longitude),
      ),
      LatLng(trip.endLocation!.latitude, trip.endLocation!.longitude),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Route Overview',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: SizedBox(
            height: 300,
            child: Stack(
              children: [
                FlutterMap(
                  options: MapOptions(
                    interactionOptions: const InteractionOptions(
                      enableMultiFingerGestureRace: true,
                    ),
                    onTap: (_, __) => FocusScope.of(context).unfocus(),
                    initialCenter: LatLng(
                      trip.startLocation!.latitude,
                      trip.startLocation!.longitude,
                    ),
                    initialZoom: 12,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.example.trackify_vts',
                    ),
                    PolylineLayer(
                      polylines: [
                        Polyline(
                          points: polylinePoints,
                          color: primaryColor.withOpacity(0.7),
                          strokeWidth: 4,
                        ),
                      ],
                    ),
                    MarkerLayer(
                      markers: [
                        // Start location marker
                        _buildMapMarker(
                          context: context,
                          label: 'START',
                          color: primaryColor,
                          position: LatLng(
                            trip.startLocation!.latitude,
                            trip.startLocation!.longitude,
                          ),
                          onTap: () {
                            _showMarkerDetails(
                              context,
                              'Start',
                              trip.startLocation!.address,
                            );
                          },
                        ),
                        // End location marker
                        _buildMapMarker(
                          context: context,
                          label: 'END',
                          color: primaryColor,
                          position: LatLng(
                            trip.endLocation!.latitude,
                            trip.endLocation!.longitude,
                          ),
                          onTap: () {
                            _showMarkerDetails(
                              context,
                              'End',
                              trip.endLocation!.address,
                            );
                          },
                        ),
                        // Route stops markers
                        ...?trip.vehicleId?.routePoints.asMap().entries.map(
                          (entry) => _buildMapMarker(
                            context: context,
                            label: 'STOP ${entry.key + 1}',
                            color: primaryColor,
                            position: LatLng(
                              entry.value.latitude,
                              entry.value.longitude,
                            ),
                            onTap: () {
                              _showMarkerDetails(
                                context,
                                'Stop ${entry.key + 1}',
                                entry.value.name,
                              );
                            },
                            isStop: true,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                Positioned(
                  bottom: 16,
                  right: 16,
                  child: GestureDetector(
                    onTap:
                        () => _openFullScreenMap(context, trip, primaryColor),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.12),
                            blurRadius: 8,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Image.asset(
                          'assets/icons/zoom-in.png',
                          width: 22,
                          height: 22,
                          color: Colors.black87,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTripDetailsSection(ScheduledTrip trip, Color primaryColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Trip Details',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        _buildDetailRow('Start Location', trip.startLocation?.address ?? 'N/A'),
        _buildDetailRow('End Location', trip.endLocation?.address ?? 'N/A'),
        _buildDetailRow('Start Time', trip.scheduledStartTime),
        _buildDetailRow('Trip Period', trip.tripPeriod),
        _buildDetailRow('Status', trip.status, isStatus: true),
      ],
    );
  }

  Widget _buildVehicleDetailsSection(ScheduledTrip trip, Color primaryColor) {
    if (trip.vehicleId == null) {
      return const SizedBox.shrink();
    }

    final vehicle = trip.vehicleId!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Vehicle Information',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        _buildDetailRow('Vehicle Number', vehicle.vehicleNumber),
        _buildDetailRow('Vehicle Type', vehicle.vehicleType),
        _buildDetailRow('Color', vehicle.color),
        _buildDetailRow('Registration', vehicle.registrationNumber),
        _buildDetailRow('Seating Capacity', '${vehicle.seatingCapacity} seats'),
      ],
    );
  }

  Widget _buildRouteStopsSection(ScheduledTrip trip, Color primaryColor) {
    final stops = trip.vehicleId?.routePoints ?? [];
    if (stops.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Route Stops',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        ...stops.map(
          (stop) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: GestureDetector(
              onTap: () {
                // Open maps with the stop location
                _openMapForLocation(stop.latitude, stop.longitude, stop.name);
              },
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: primaryColor,
                        shape: BoxShape.circle,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        '${stop.order}',
                        style: TextStyle(
                          color:
                              primaryColor.computeLuminance() > 0.5
                                  ? Colors.black
                                  : Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
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
                          const SizedBox(height: 2),
                          Text(
                            '${stop.latitude.toStringAsFixed(4)}, ${stop.longitude.toStringAsFixed(4)}',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(Icons.location_on, color: Colors.blue[600], size: 20),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDetailRow(String label, String value, {bool isStatus = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 14, color: Colors.grey[600])),
          isStatus
              ? _buildStatusBadge(value)
              : Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
        ],
      ),
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

  void _openFullScreenMap(
    BuildContext context,
    ScheduledTrip trip,
    Color primaryColor,
  ) {
    _navigateToTripDetailsPage(trip, primaryColor);
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

  Widget _buildRouteStopsSection(ScheduledTrip trip) {
    if (trip.vehicleId?.routePoints == null ||
        trip.vehicleId!.routePoints.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
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
          const Text(
            'Route Stops',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          ...trip.vehicleId!.routePoints.map(
            (stop) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: const BoxDecoration(
                      color: Colors.blue,
                      shape: BoxShape.circle,
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
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      stop.name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
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

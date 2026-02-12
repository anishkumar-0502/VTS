import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/driver_dashboard_controller.dart';
import '../../domain/models/dashboard_model.dart' as dashboard_models;
import 'package:trackify_vts/driver_app/features/scheduled_trips/domain/models/scheduled_trip_model.dart' as scheduled_models;
import 'trip_location_display.dart';
import 'trip_details_page.dart';

class DriverTripHistoryPage extends GetView<DriverDashboardController> {
  const DriverTripHistoryPage({super.key});

  @override
  String? get tag => 'driver_dashboard';

  @override
  Widget build(BuildContext context) {
    final Color primaryColor = Theme.of(context).colorScheme.primary;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Trip history'),
        actions: [
          IconButton(
            onPressed: controller.fetchTripHistory,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Obx(() {
        if (controller.isLoadingTripHistory.value) {
          return const Center(child: CircularProgressIndicator());
        }

        if (controller.tripHistoryError.value.isNotEmpty) {
          return Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error_outline, size: 48, color: Colors.red.shade600),
                const SizedBox(height: 16),
                Text(
                  controller.tripHistoryError.value,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.red.shade700,
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: controller.fetchTripHistory,
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        if (controller.tripHistory.isEmpty) {
          return Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: primaryColor.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.history, size: 42, color: primaryColor),
                ),
                const SizedBox(height: 20),
                const Text(
                  'No trips recorded yet',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                Text(
                  'Completed trips will appear here once synced. Pull down to refresh or check your recent assignments.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.black54,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: controller.fetchTripHistory,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Refresh'),
                ),
              ],
            ),
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: controller.tripHistory.length,
          itemBuilder: (context, index) {
            final trip = controller.tripHistory[index];
            return _buildTripHistoryTile(
              context,
              trip,
              primaryColor,
            );
          },
          separatorBuilder: (_, __) => const SizedBox(height: 12),
        );
      }),
    );
  }

  Widget _buildTripHistoryTile(
      BuildContext context,
      dashboard_models.DriverTripHistory trip,
      Color primaryColor,
      ) {
    final routeName =
    trip.routeName?.isNotEmpty == true
        ? trip.routeName!
        : trip.vehicleId?.routeName ?? 'Trip';
    final startLabel = trip.startTime.isNotEmpty ? trip.startTime : (trip.createdAt?.toIso8601String() ?? '');
    final statusColor = _statusColor(trip.status, primaryColor);

    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: () => _showTripHistoryDetails(context, trip, primaryColor),
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
                    startLabel,
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
    );
  }

  Color _statusColor(String status, Color primaryColor) {
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

  void _showTripHistoryDetails(
      BuildContext context,
      dashboard_models.DriverTripHistory trip,
      Color primaryColor,
      ) {
      // Navigate to existing trip details page if available or create one
      // Assuming TripDetailsPage exists or using the one from dashboard
      
      // Convert DriverTripHistory to ScheduledTrip for compatibility
      final scheduledTrip = scheduled_models.ScheduledTrip(
        scheduledTripId: trip.scheduledTripId ?? '',
        routeName: trip.routeName ?? trip.vehicleId?.routeName ?? '',
        scheduledStartTime: trip.startTime,
        tripPeriod: '', // Not available in history
        status: trip.status,
        startLocation: trip.startLocation != null 
            ? scheduled_models.LocationData(
                latitude: trip.startLocation!.latitude,
                longitude: trip.startLocation!.longitude,
                address: trip.startLocation!.address,
              )
            : null,
        endLocation: trip.endLocation != null
            ? scheduled_models.LocationData(
                latitude: trip.endLocation!.latitude,
                longitude: trip.endLocation!.longitude,
                address: trip.endLocation!.address,
              )
            : null,
        vehicleId: trip.vehicleId,
        vehicleIdString: trip.vehicleId?.id ?? '',
        driverId: trip.driverId,
        operatorId: trip.operatorId,
        repeatDays: null,
        isActive: false,
        associatedTripId: trip.tripId,
        createdAt: trip.createdAt,
        updatedAt: trip.updatedAt,
        routePoints: trip.routePoints,
      );

      Get.to(
        () => TripDetailsPage(
          trip: scheduledTrip,
        ),
        transition: Transition.rightToLeft,
        duration: const Duration(milliseconds: 320),
      );
  }
}

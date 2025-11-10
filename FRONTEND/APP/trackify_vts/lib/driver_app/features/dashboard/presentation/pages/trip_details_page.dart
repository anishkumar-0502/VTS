import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/driver_dashboard_controller.dart';
import '../../domain/models/dashboard_model.dart' as dashboard_models;
import '../../../scheduled_trips/domain/models/scheduled_trip_model.dart'
    as scheduled_models;

class TripDetailsPage extends StatelessWidget {
  final scheduled_models.ScheduledTrip trip;

  const TripDetailsPage({required this.trip, super.key});

  DriverDashboardController get controller =>
      Get.find<DriverDashboardController>(tag: 'driver_dashboard');

  @override
  Widget build(BuildContext context) {
    final Color primaryColor = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: CustomScrollView(
        slivers: [
          // Premium App Bar with gradient
          SliverAppBar(
            expandedHeight: 240,
            pinned: true,
            elevation: 0,
            backgroundColor: primaryColor,
            flexibleSpace: FlexibleSpaceBar(
              title: const Text(
                'Trip Details',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 18,
                ),
              ),
              centerTitle: false,
              titlePadding: const EdgeInsets.only(left: 24, bottom: 16),
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [primaryColor, primaryColor.withOpacity(0.7)],
                  ),
                ),
                child: Stack(
                  children: [
                    // Decorative circles
                    Positioned(
                      top: -50,
                      right: -50,
                      child: Container(
                        width: 200,
                        height: 200,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withOpacity(0.1),
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: -100,
                      left: -100,
                      child: Container(
                        width: 250,
                        height: 250,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withOpacity(0.08),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            trip.routeName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 28,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              _buildStatusBadge(
                                trip.status.toUpperCase(),
                                const Color(0xFF4CAF50),
                              ),
                              const SizedBox(width: 10),
                              _buildStatusBadge(
                                trip.tripPeriod.toUpperCase(),
                                const Color(0xFF2196F3),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Trip Schedule Card
                  _buildCard(
                    title: 'Trip Schedule',
                    primaryColor: primaryColor,
                    child: Column(
                      children: [
                        _buildScheduleRow(
                          'Start Time',
                          trip.scheduledStartTime,
                          Icons.schedule,
                          primaryColor,
                        ),
                        const Divider(height: 20),
                        _buildScheduleRow(
                          'Trip Period',
                          trip.tripPeriod,
                          Icons.event,
                          primaryColor,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Route Information Card
                  _buildCard(
                    title: 'Route Information',
                    primaryColor: primaryColor,
                    child: Column(
                      children: [
                        _buildLocationRow(
                          'Start Location',
                          trip.startLocation?.address ?? 'N/A',
                          Icons.location_on,
                          primaryColor,
                        ),
                        const Divider(height: 20),
                        _buildLocationRow(
                          'End Location',
                          trip.endLocation?.address ?? 'N/A',
                          Icons.flag,
                          primaryColor,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Vehicle Information Card
                  _buildCard(
                    title: 'Vehicle Information',
                    primaryColor: primaryColor,
                    child: Column(
                      children: [
                        _buildInfoRow(
                          'Vehicle Number',
                          trip.vehicleId?.vehicleNumber ?? 'N/A',
                          primaryColor,
                        ),
                        const Divider(height: 20),
                        _buildInfoRow(
                          'Vehicle Type',
                          trip.vehicleId?.vehicleType ?? 'N/A',
                          primaryColor,
                        ),
                        const Divider(height: 20),
                        _buildInfoRow(
                          'Color',
                          trip.vehicleId?.color ?? 'N/A',
                          primaryColor,
                        ),
                        const Divider(height: 20),
                        _buildInfoRow(
                          'Capacity',
                          '${trip.vehicleId?.seatingCapacity ?? 0} seats',
                          primaryColor,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Route Stops Card
                  if (trip.vehicleId?.routePoints.isNotEmpty ?? false)
                    _buildCard(
                      title: 'Route Stops',
                      primaryColor: primaryColor,
                      child: Column(
                        children: [
                          ...?trip.vehicleId?.routePoints.map(
                            (point) => Padding(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              child: Row(
                                children: [
                                  Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: primaryColor.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(
                                      '${point.order}',
                                      style: TextStyle(
                                        color: primaryColor,
                                        fontWeight: FontWeight.w700,
                                        fontSize: 16,
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
                                            fontWeight: FontWeight.w600,
                                            fontSize: 15,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${point.latitude.toStringAsFixed(4)}, ${point.longitude.toStringAsFixed(4)}',
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
                    ),
                  const SizedBox(height: 20),

                  // Repeat Schedule Card
                  _buildCard(
                    title: 'Repeat Schedule',
                    primaryColor: primaryColor,
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _buildDayChip(
                          'Mon',
                          trip.repeatDays?.monday ?? false,
                          primaryColor,
                        ),
                        _buildDayChip(
                          'Tue',
                          trip.repeatDays?.tuesday ?? false,
                          primaryColor,
                        ),
                        _buildDayChip(
                          'Wed',
                          trip.repeatDays?.wednesday ?? false,
                          primaryColor,
                        ),
                        _buildDayChip(
                          'Thu',
                          trip.repeatDays?.thursday ?? false,
                          primaryColor,
                        ),
                        _buildDayChip(
                          'Fri',
                          trip.repeatDays?.friday ?? false,
                          primaryColor,
                        ),
                        _buildDayChip(
                          'Sat',
                          trip.repeatDays?.saturday ?? false,
                          primaryColor,
                        ),
                        _buildDayChip(
                          'Sun',
                          trip.repeatDays?.sunday ?? false,
                          primaryColor,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Additional Details Card
                  _buildCard(
                    title: 'Additional Details',
                    primaryColor: primaryColor,
                    child: Column(
                      children: [
                        _buildInfoRow(
                          'Trip ID',
                          trip.scheduledTripId ?? 'N/A',
                          primaryColor,
                          isMonospace: true,
                        ),
                        const Divider(height: 20),
                        _buildInfoRow(
                          'Is Active',
                          trip.isActive ? 'Yes' : 'No',
                          primaryColor,
                        ),
                        const Divider(height: 20),
                        _buildInfoRow(
                          'Created',
                          _formatDate(trip.createdAt),
                          primaryColor,
                        ),
                        const Divider(height: 20),
                        _buildInfoRow(
                          'Last Updated',
                          _formatDate(trip.updatedAt),
                          primaryColor,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Action Buttons
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: () {
                        controller.selectTrip(trip);
                        Get.back();
                      },
                      icon: const Icon(Icons.check_circle),
                      label: const Text('Select This Trip'),
                      style: FilledButton.styleFrom(
                        backgroundColor: primaryColor,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => Get.back(),
                      icon: const Icon(Icons.close),
                      label: const Text('Go Back'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCard({
    required String title,
    required Color primaryColor,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade100, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 15,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: primaryColor.withOpacity(0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              title,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: primaryColor,
                letterSpacing: 0.3,
              ),
            ),
          ),
          const SizedBox(height: 18),
          child,
        ],
      ),
    );
  }

  Widget _buildScheduleRow(
    String label,
    String value,
    IconData icon,
    Color primaryColor,
  ) {
    return Row(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                primaryColor.withOpacity(0.15),
                primaryColor.withOpacity(0.05),
              ],
            ),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: primaryColor.withOpacity(0.1), width: 1),
          ),
          alignment: Alignment.center,
          child: Icon(icon, color: primaryColor, size: 24),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade500,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.2,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Colors.black87,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLocationRow(
    String label,
    String address,
    IconData icon,
    Color primaryColor,
  ) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                primaryColor.withOpacity(0.15),
                primaryColor.withOpacity(0.05),
              ],
            ),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: primaryColor.withOpacity(0.1), width: 1),
          ),
          alignment: Alignment.center,
          child: Icon(icon, color: primaryColor, size: 24),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade500,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.2,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                address,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildInfoRow(
    String label,
    String value,
    Color primaryColor, {
    bool isMonospace = false,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey.shade600,
            fontWeight: FontWeight.w500,
          ),
        ),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              fontFamily: isMonospace ? 'monospace' : null,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDayChip(String day, bool isActive, Color primaryColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: isActive ? primaryColor.withOpacity(0.15) : Colors.grey.shade100,
        border: Border.all(
          color: isActive ? primaryColor : Colors.grey.shade300,
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        day,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: isActive ? primaryColor : Colors.grey.shade600,
        ),
      ),
    );
  }

  String _formatDate(Object? date) {
    if (date == null) return 'N/A';
    DateTime? parsed;
    if (date is DateTime) {
      parsed = date;
    } else if (date is String && date.isNotEmpty) {
      parsed = DateTime.tryParse(date);
    }
    if (parsed == null) return 'N/A';
    return '${parsed.year}-${parsed.month.toString().padLeft(2, '0')}-${parsed.day.toString().padLeft(2, '0')} ${parsed.hour.toString().padLeft(2, '0')}:${parsed.minute.toString().padLeft(2, '0')}';
  }

  Widget _buildStatusBadge(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
      decoration: BoxDecoration(
        color: color.withOpacity(0.25),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.5), width: 1.5),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

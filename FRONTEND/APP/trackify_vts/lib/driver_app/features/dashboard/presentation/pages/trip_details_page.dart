import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/driver_dashboard_controller.dart';
import '../../../scheduled_trips/domain/models/scheduled_trip_model.dart'
    as scheduled_models;
import 'package:trackify_vts/utilities/widgets/status_banner.dart';

class TripDetailsPage extends StatefulWidget {
  final scheduled_models.ScheduledTrip trip;

  const TripDetailsPage({required this.trip, super.key});

  @override
  State<TripDetailsPage> createState() => _TripDetailsPageState();
}

class _TripDetailsPageState extends State<TripDetailsPage> {
  bool _isStarted = false;
  bool _isStopped = false;

  DriverDashboardController get controller =>
      Get.find<DriverDashboardController>(tag: 'driver_dashboard');

  @override
  Widget build(BuildContext context) {
    final Color primaryColor = Theme.of(context).colorScheme.primary;
    final String normalizedStatus = widget.trip.status.toLowerCase();
    final bool isPending = normalizedStatus == 'pending';
    final bool isInProgress =
        normalizedStatus == 'in-progress' ||
        normalizedStatus == 'in progress' ||
        normalizedStatus == 'inprogress';

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
            leading: IconButton(
              icon: const Icon(
                Icons.arrow_back_ios_new_rounded,
                color: Colors.white,
              ),
              onPressed: () => Navigator.pop(context),
            ),
            flexibleSpace: FlexibleSpaceBar(
              centerTitle: false,
              titlePadding: const EdgeInsets.only(
                left: 64,
                bottom: 16,
                right: 24,
              ),
              title: const Text(
                'Trip Details',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 18,
                ),
              ),
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
                          widget.trip.scheduledStartTime,
                          Icons.schedule,
                          primaryColor,
                        ),
                        const Divider(height: 20),
                        _buildScheduleRow(
                          'Trip Period',
                          widget.trip.tripPeriod,
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
                          _formatLocationDisplay(widget.trip.startLocation),
                          Icons.location_on,
                          primaryColor,
                        ),
                        const Divider(height: 20),
                        _buildLocationRow(
                          'End Location',
                          _formatLocationDisplay(widget.trip.endLocation),
                          Icons.flag,
                          primaryColor,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Vehicle Information Card
                  if (widget.trip.vehicleId != null && 
                      (widget.trip.vehicleId!.vehicleNumber.isNotEmpty || 
                       widget.trip.vehicleId!.seatingCapacity > 0))
                    _buildCard(
                      title: 'Vehicle Information',
                      primaryColor: primaryColor,
                      child: Column(
                        children: [
                          if (widget.trip.vehicleId!.vehicleNumber.isNotEmpty)
                            _buildInfoRow(
                              'Vehicle Number',
                              widget.trip.vehicleId!.vehicleNumber,
                              primaryColor,
                            ),

                          if (widget.trip.vehicleId!.vehicleNumber.isNotEmpty && 
                              widget.trip.vehicleId!.seatingCapacity > 0)
                            const Divider(height: 20),
                          
                          if (widget.trip.vehicleId!.seatingCapacity > 0)
                            _buildInfoRow(
                              'Capacity',
                              '${widget.trip.vehicleId!.seatingCapacity} seats',
                              primaryColor,
                            ),
                        ],
                      ),
                    ),
                  if (widget.trip.vehicleId != null && 
                      (widget.trip.vehicleId!.vehicleNumber.isNotEmpty || 
                       widget.trip.vehicleId!.seatingCapacity > 0))
                    const SizedBox(height: 20),

                  // Passenger Details Card
                  if (widget.trip.passengers.isNotEmpty)
                    _buildCard(
                      title: 'Passenger Details (${widget.trip.passengers.length})',
                      primaryColor: primaryColor,
                      child: Column(
                        children: widget.trip.passengers.asMap().entries.map((entry) {
                          final p = entry.value;
                          final isLast = entry.key == widget.trip.passengers.length - 1;
                          return Column(
                            children: [
                              _buildPassengerRow(p, primaryColor),
                              if (!isLast) const Divider(height: 24, thickness: 0.5),
                            ],
                          );
                        }).toList(),
                      ),
                    ),
                  if (widget.trip.passengers.isNotEmpty)
                    const SizedBox(height: 20),

                  // Route Stops Card
                  if (widget.trip.routePoints.isNotEmpty)
                    _buildCard(
                      title: 'Route Stops',
                      primaryColor: primaryColor,
                      child: Column(
                        children: widget.trip.routePoints
                            .asMap()
                            .entries
                            .map(
                              (entry) => _buildRouteStopItem(
                            point: entry.value,
                            index: entry.key,
                            total: widget.trip.routePoints.length,
                            primaryColor: primaryColor,
                          ),
                        )
                            .toList(),
                      ),
                    ),
                  if (widget.trip.routePoints.isNotEmpty)
                    const SizedBox(height: 20),


                  // Repeat Schedule Card
                  if (widget.trip.repeatDays != null && 
                      (widget.trip.repeatDays!.monday || 
                       widget.trip.repeatDays!.tuesday || 
                       widget.trip.repeatDays!.wednesday || 
                       widget.trip.repeatDays!.thursday || 
                       widget.trip.repeatDays!.friday || 
                       widget.trip.repeatDays!.saturday || 
                       widget.trip.repeatDays!.sunday))
                  _buildCard(
                    title: 'Repeat Schedule',
                    primaryColor: primaryColor,
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _buildDayChip(
                          'Mon',
                          widget.trip.repeatDays?.monday ?? false,
                          primaryColor,
                        ),
                        _buildDayChip(
                          'Tue',
                          widget.trip.repeatDays?.tuesday ?? false,
                          primaryColor,
                        ),
                        _buildDayChip(
                          'Wed',
                          widget.trip.repeatDays?.wednesday ?? false,
                          primaryColor,
                        ),
                        _buildDayChip(
                          'Thu',
                          widget.trip.repeatDays?.thursday ?? false,
                          primaryColor,
                        ),
                        _buildDayChip(
                          'Fri',
                          widget.trip.repeatDays?.friday ?? false,
                          primaryColor,
                        ),
                        _buildDayChip(
                          'Sat',
                          widget.trip.repeatDays?.saturday ?? false,
                          primaryColor,
                        ),
                        _buildDayChip(
                          'Sun',
                          widget.trip.repeatDays?.sunday ?? false,
                          primaryColor,
                        ),
                      ],
                    ),
                  ),
                  if (widget.trip.repeatDays != null && 
                      (widget.trip.repeatDays!.monday || 
                       widget.trip.repeatDays!.tuesday || 
                       widget.trip.repeatDays!.wednesday || 
                       widget.trip.repeatDays!.thursday || 
                       widget.trip.repeatDays!.friday || 
                       widget.trip.repeatDays!.saturday || 
                       widget.trip.repeatDays!.sunday))
                    const SizedBox(height: 20),

                  // Trip Performance Card (only for completed trips)
                  if (widget.trip.status.toLowerCase() == 'completed' && 
                      (widget.trip.distanceTraveled != null || widget.trip.duration != null))
                    _buildCard(
                      title: 'Trip Performance',
                      primaryColor: primaryColor,
                      child: Column(
                        children: [
                          if (widget.trip.distanceTraveled != null)
                            _buildInfoRow(
                              'Distance Traveled',
                              '${widget.trip.distanceTraveled!.toStringAsFixed(2)} km',
                              primaryColor,
                            ),
                          if (widget.trip.distanceTraveled != null && widget.trip.duration != null)
                            const Divider(height: 20),
                          if (widget.trip.duration != null)
                            _buildInfoRow(
                              'Duration',
                              '${widget.trip.duration!.toStringAsFixed(1)} mins',
                              primaryColor,
                            ),
                          if (widget.trip.endTime != null) ...[
                            const Divider(height: 20),
                            _buildInfoRow(
                              'End Time',
                              widget.trip.endTime!.split('T').last.substring(0, 5),
                              primaryColor,
                            ),
                          ],
                        ],
                      ),
                    ),
                  if (widget.trip.status.toLowerCase() == 'completed' && 
                      (widget.trip.distanceTraveled != null || widget.trip.duration != null))
                    const SizedBox(height: 20),

                  // Action Buttons
                  if (isPending) ...[
                    Obx(() {
                      final isStarting = controller.isStartingTrip.value;
                      return SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          onPressed:
                              isStarting || _isStarted
                                  ? null
                                  : () async {
                                    final scheduledTripId = widget.trip.scheduledTripId;
                                    if (scheduledTripId.isEmpty) {
                                      showStatusBanner(
                                        'Trip identifier unavailable',
                                        Colors.redAccent,
                                        Icons.error_outline,
                                      );
                                      return;
                                    }
                                    final success = await controller
                                        .startScheduledTrip(
                                      scheduledTripId: scheduledTripId,
                                    );
                                    if (success) {
                                      setState(() => _isStarted = true);
                                      controller.selectTrip(widget.trip);
                                    }
                                  },
                          icon:
                              isStarting
                                  ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                  : const Icon(Icons.not_started_outlined),
                          label: Text(
                            isStarting ? 'Starting...' : (_isStarted ? 'Trip in progress' : 'Start this trip'),
                          ),
                          style: FilledButton.styleFrom(
                            backgroundColor: Colors.green,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      );
                    }),
                    const SizedBox(height: 12),
                  ],
                  if (isInProgress) ...[
                    Obx(() {
                      final isStopping = controller.isStoppingTrip.value;
                      return SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          onPressed: _isStopped ? null : (isStopping ? null : () async {
                            final associatedTripId =
                                widget.trip.associatedTripId;
                            if (associatedTripId == null ||
                                associatedTripId.isEmpty) {
                              showStatusBanner(
                                'Trip identifier unavailable',
                                Colors.redAccent,
                                Icons.error_outline,
                              );
                              return;
                            }
                            final stopLocation =
                                widget.trip.endLocation ?? widget.trip.startLocation;
                            if (stopLocation == null) {
                              showStatusBanner(
                                'Stop location unavailable',
                                Colors.redAccent,
                                Icons.error_outline,
                              );
                              return;
                            }
                            final success = await controller
                                .stopActiveTrip(
                                  tripId: associatedTripId,
                                  payload: {
                                    'end_location': {
                                      'latitude': stopLocation.latitude,
                                      'longitude':
                                          stopLocation.longitude,
                                    },
                                    'distance_traveled': 0,
                                  },
                                );
                            if (success) {
                              setState(() => _isStopped = true);
                              // Don't navigate back immediately, let user see the stopped state
                            }
                          }),
                          icon: _isStopped
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
                          label: Text(_isStopped ? 'Trip has been stopped' : (isStopping ? 'Stopping...' : 'Stop trip')),
                          style: FilledButton.styleFrom(
                            backgroundColor: _isStopped ? Colors.green : Colors.redAccent,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      );
                    }),
                    const SizedBox(height: 12),
                  ],
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

  Widget _buildPassengerRow(scheduled_models.Passenger passenger, Color primaryColor) {
    return Row(
      children: [
        CircleAvatar(
          radius: 20,
          backgroundColor: primaryColor.withOpacity(0.1),
          child: Text(
            passenger.name.isNotEmpty ? passenger.name[0].toUpperCase() : 'P',
            style: TextStyle(color: primaryColor, fontWeight: FontWeight.bold),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                passenger.name,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
              ),
              Text(
                passenger.phoneNumber,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
              ),
            ],
          ),
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            _buildStatusBadge(
              passenger.pickedUp ? 'Picked' : 'Not Picked',
              passenger.pickedUp ? Colors.green : Colors.orange,
            ),
            const SizedBox(height: 4),
            if (passenger.dropped)
              _buildStatusBadge('Dropped', Colors.blue),
          ],
        ),
      ],
    );
  }

  Widget _buildStatusBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      child: Text(
        text,
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildRouteStopItem({
    required dynamic point,
    required int index,
    required int total,
    required Color primaryColor,
  }) {
    final bool isLast = index == total - 1;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // LEFT: Number + Line
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
                '${point.order}',
                style: TextStyle(
                  color: primaryColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ),

            // Vertical Line (only if not last)
            if (!isLast)
              Container(
                width: 2,
                height: 40,
                margin: const EdgeInsets.symmetric(vertical: 6),
                color: primaryColor.withOpacity(0.3),
              ),
          ],
        ),

        const SizedBox(width: 14),

        // RIGHT: Stop Details
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  point.name,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${point.latitude.toStringAsFixed(4)}, '
                      '${point.longitude.toStringAsFixed(4)}',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ],
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

  String _formatLocationDisplay(scheduled_models.LocationData? location) {
    if (location == null) {
      return 'N/A';
    }
    
    if (location.address.isNotEmpty && location.address != 'N/A') {
      return location.address;
    }
    
    if (location.latitude != 0 || location.longitude != 0) {
      return '${location.latitude.toStringAsFixed(4)}, ${location.longitude.toStringAsFixed(4)}';
    }
    
    return 'N/A';
  }
}

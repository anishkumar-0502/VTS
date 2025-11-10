import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:get/get.dart';
import 'package:trackify_vts/driver_app/features/scheduled_trips/domain/models/scheduled_trip_model.dart';
import 'package:trackify_vts/driver_app/features/scheduled_trips/presentation/controllers/scheduled_trips_controller.dart';
import 'package:trackify_vts/driver_app/features/scheduled_trips/presentation/pages/trip_map_page.dart';

class ScheduledTripDetailsPage extends StatelessWidget {
  final ScheduledTrip trip;
  final Color primaryColor;
  final ScheduledTripsController controller;

  const ScheduledTripDetailsPage({
    super.key,
    required this.trip,
    required this.primaryColor,
    required this.controller,
  });

  @override
  Widget build(BuildContext context) {
    final String statusChipText =
        trip.status.isNotEmpty ? trip.status.toUpperCase() : 'PENDING';
    final String periodChipText =
        trip.tripPeriod.isNotEmpty ? trip.tripPeriod.toUpperCase() : 'MORNING';

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 8),
                _buildHeader(context),
                const SizedBox(height: 12),
                _buildStatusChips(context, statusChipText, periodChipText),
                const SizedBox(height: 16),
                if (_hasMapData) _buildMapCard(context),
                _buildTripScheduleSection(context),
                if (trip.vehicleId != null)
                  _buildRouteInformationSection(context),
                _buildRouteStopsSection(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  bool get _hasMapData =>
      trip.startLocation != null && trip.endLocation != null;

  Widget _buildHeader(BuildContext context) {
    return SizedBox(
      height: 48,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => Navigator.of(context).maybePop(),
            ),
          ),
          const Text(
            'Trip Details',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChips(BuildContext context, String status, String period) {
    final Color chipColor = primaryColor;
    final Color chipBackground = chipColor.withOpacity(0.12);

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _StatusChip(
          label: status,
          foreground: chipColor,
          background: chipBackground,
        ),
        _StatusChip(
          label: period,
          foreground: chipColor,
          background: chipBackground,
        ),
      ],
    );
  }

  Widget _buildMapCard(BuildContext context) {
    final markers = _buildMarkers();

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Route Overview',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 260,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Stack(
                children: [
                  /// 🌍 Map Layer
                  FlutterMap(
                    options: MapOptions(
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
                        userAgentPackageName: 'com.trackify.driver',
                      ),
                      MarkerLayer(markers: markers),
                    ],
                  ),

                  /// 🔍 Zoom-In Icon (bottom-right)
                  Positioned(
                    bottom: 12,
                    right: 12,
                    child: GestureDetector(
                      onTap: () {
                        Get.to(
                          () => TripMapPage(trip: trip),
                          transition: Transition.rightToLeft,
                        );
                      },
                      child: Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.15),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
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
      ),
    );
  }

  List<Marker> _buildMarkers() {
    final markers = <Marker>[
      Marker(
        point: LatLng(
          trip.startLocation!.latitude,
          trip.startLocation!.longitude,
        ),
        width: 40,
        height: 40,
        child: GestureDetector(
          onTap:
              () => _showMarkerInfo(
                'Start Location',
                trip.startLocation!.address,
              ),
          child: Column(
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
              Container(
                margin: const EdgeInsets.only(top: 4),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
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
            ],
          ),
        ),
      ),
      Marker(
        point: LatLng(trip.endLocation!.latitude, trip.endLocation!.longitude),
        width: 40,
        height: 40,
        child: GestureDetector(
          onTap:
              () => _showMarkerInfo('End Location', trip.endLocation!.address),
          child: Column(
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
              Container(
                margin: const EdgeInsets.only(top: 4),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
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
            ],
          ),
        ),
      ),
    ];

    if (trip.vehicleId?.routePoints != null) {
      markers.addAll(
        trip.vehicleId!.routePoints.map(
          (stop) => Marker(
            point: LatLng(stop.latitude, stop.longitude),
            width: 40,
            height: 40,
            child: GestureDetector(
              onTap:
                  () => _showMarkerInfo(
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

  Widget _buildTripScheduleSection(BuildContext context) {
    final rows = [
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
    ];

    return _buildInfoSection('Trip Schedule', rows);
  }

  Widget _buildRouteInformationSection(BuildContext context) {
    final vehicle = trip.vehicleId!;

    final rows = [
      _InfoRowData(
        icon: Icons.directions_bus,
        label: 'Vehicle Number',
        value: vehicle.vehicleNumber,
      ),
      _InfoRowData(
        icon: Icons.info,
        label: 'Vehicle Type',
        value: vehicle.vehicleType,
      ),
      _InfoRowData(icon: Icons.palette, label: 'Color', value: vehicle.color),
      _InfoRowData(
        icon: Icons.card_membership,
        label: 'Registration',
        value: vehicle.registrationNumber,
      ),
      _InfoRowData(
        icon: Icons.event_seat,
        label: 'Seating Capacity',
        value: '${vehicle.seatingCapacity} seats',
      ),
    ];

    return _buildInfoSection('Route Information', rows);
  }

  Widget _buildInfoSection(String title, List<_InfoRowData> rows) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration,
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
                _buildInfoRow(row),
                if (!isLast)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Divider(height: 1, color: Colors.grey[300]),
                  ),
              ],
            );
          }),
        ],
      ),
    );
  }

  Widget _buildInfoRow(_InfoRowData row) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Icon(row.icon, color: Colors.blue[600], size: 24),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                row.label,
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),
              const SizedBox(height: 4),
              if (row.isStatus)
                _buildStatusBadge(row.value)
              else
                Text(
                  row.value,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRouteStopsSection() {
    final stops = trip.vehicleId?.routePoints ?? [];
    if (stops.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Route Stops',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          ...List.generate(stops.length, (index) {
            final stop = stops[index];
            final isLast = index == stops.length - 1;

            return Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Colors.blue[600],
                        shape: BoxShape.circle,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        '${stop.order}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
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
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
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
                  ],
                ),
                if (!isLast)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Divider(height: 1, color: Colors.grey[300]),
                  ),
              ],
            );
          }),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    final color = _getStatusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color, width: 1),
      ),
      child: Text(
        status.replaceAll('-', ' ').toUpperCase(),
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: color,
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

  BoxDecoration get _cardDecoration => BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(16),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withOpacity(0.05),
        blurRadius: 8,
        offset: const Offset(0, 2),
      ),
    ],
  );

  void _showMarkerInfo(String title, String description) {
    // This will be called when user taps on a marker
    // You can implement a toast or bottom sheet if needed
  }
}

class _StatusChip extends StatelessWidget {
  final String label;
  final Color foreground;
  final Color background;

  const _StatusChip({
    required this.label,
    required this.foreground,
    required this.background,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: foreground.withOpacity(0.5)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: foreground,
        ),
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

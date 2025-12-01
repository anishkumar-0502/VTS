import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:get/get.dart';
import 'package:trackify_vts/driver_app/features/scheduled_trips/domain/models/scheduled_trip_model.dart';
import 'package:trackify_vts/driver_app/features/scheduled_trips/presentation/controllers/scheduled_trips_controller.dart';
import 'package:trackify_vts/driver_app/features/scheduled_trips/presentation/pages/trip_map_page.dart';
import 'package:trackify_vts/services/open_route_service.dart';

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

  bool get _hasMapData {
    final stops = trip.vehicleId?.routePoints ?? [];
    final hasStart =
        (trip.startLocation != null &&
            (trip.startLocation!.latitude != 0 ||
                trip.startLocation!.longitude != 0)) ||
        stops.isNotEmpty;
    final hasEnd =
        (trip.endLocation != null &&
            (trip.endLocation!.latitude != 0 ||
                trip.endLocation!.longitude != 0)) ||
        stops.length >= 2 ||
        (stops.isNotEmpty && hasStart);
    return hasStart && hasEnd;
  }

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
              child: _buildRouteMap(context),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRouteMap(BuildContext context) {
    final vehicle = trip.vehicleId;
    final sortedStops = List<RoutePoint>.from(vehicle?.routePoints ?? [])
      ..sort((a, b) => a.order.compareTo(b.order));
    final validStops = sortedStops.where((stop) {
      return stop.latitude != 0 || stop.longitude != 0;
    }).toList();

    final startLocation = trip.startLocation;
    final endLocation = trip.endLocation;
    final standingLocation = vehicle?.standingLocation;

    LatLng? startPoint;
    String startInfo = '';

    if (startLocation != null &&
        (startLocation.latitude != 0 || startLocation.longitude != 0)) {
      startPoint = LatLng(startLocation.latitude, startLocation.longitude);
      startInfo = startLocation.address;
    } else if (validStops.isNotEmpty) {
      final firstStop = validStops.first;
      startPoint = LatLng(firstStop.latitude, firstStop.longitude);
      startInfo = firstStop.name;
    } else if (standingLocation != null &&
        (standingLocation.latitude != 0 || standingLocation.longitude != 0)) {
      startPoint = LatLng(standingLocation.latitude, standingLocation.longitude);
      startInfo = standingLocation.address;
    }

    LatLng? endPoint;
    String endInfo = '';

    if (endLocation != null &&
        (endLocation.latitude != 0 || endLocation.longitude != 0)) {
      endPoint = LatLng(endLocation.latitude, endLocation.longitude);
      endInfo = endLocation.address;
    } else if (validStops.isNotEmpty) {
      final lastStop = validStops.last;
      endPoint = LatLng(lastStop.latitude, lastStop.longitude);
      endInfo = lastStop.name;
    } else if (standingLocation != null &&
        (standingLocation.latitude != 0 || standingLocation.longitude != 0)) {
      endPoint = LatLng(standingLocation.latitude, standingLocation.longitude);
      endInfo = standingLocation.address;
    }

    if (startPoint == null || endPoint == null) {
      return const Center(child: Text('Route data unavailable'));
    }

    bool coordinatesEqual(LatLng first, LatLng second) {
      return (first.latitude - second.latitude).abs() < 1e-6 &&
          (first.longitude - second.longitude).abs() < 1e-6;
    }

    final middleStops = validStops.where((stop) {
      final stopPoint = LatLng(stop.latitude, stop.longitude);
      return !coordinatesEqual(stopPoint, startPoint!) &&
          !coordinatesEqual(stopPoint, endPoint!);
    }).toList();

    final waypointChain = <LatLng>[
      startPoint,
      ...middleStops.map((stop) => LatLng(stop.latitude, stop.longitude)),
      endPoint,
    ];

    final normalizedWaypoints = <LatLng>[];
    for (final point in waypointChain) {
      if (normalizedWaypoints.isEmpty ||
          !coordinatesEqual(normalizedWaypoints.last, point)) {
        normalizedWaypoints.add(point);
      }
    }

    if (normalizedWaypoints.length < 2) {
      return const Center(child: Text('Route data unavailable'));
    }

    final mapController = MapController();
    final openRouteService = OpenRouteService(
      "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjU1MDE2ODk0OTMwYjQ0YjViOGNjODMyOTYzYjI4NGZiIiwiaCI6Im11cm11cjY0In0=",
    );

    double currentZoom = 12;
    List<LatLng> routePoints = List<LatLng>.from(normalizedWaypoints);
    bool isFetchingRoute = false;
    String? routeError;
    bool hasRequestedRoute = false;

    LatLng computeAverage(List<LatLng> points) {
      final lat = points.fold<double>(0, (sum, value) => sum + value.latitude) /
          points.length;
      final lon = points.fold<double>(0, (sum, value) => sum + value.longitude) /
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
            final fetchedRoute =
                await openRouteService.getRouteThrough(normalizedWaypoints);
            if (!context.mounted) {
              return;
            }
            if (fetchedRoute.isEmpty) {
              setState(() {
                routeError = 'Route unavailable';
                isFetchingRoute = false;
                routePoints = List<LatLng>.from(normalizedWaypoints);
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
              routePoints = List<LatLng>.from(normalizedWaypoints);
            });
          }
        }

        if (!hasRequestedRoute) {
          hasRequestedRoute = true;
          loadRoute();
        }

        void zoomIn() {
          currentZoom = ((currentZoom + 1).clamp(2.0, 18.0)).toDouble();
          mapController.move(mapController.camera.center, currentZoom);
        }

        void zoomOut() {
          currentZoom = ((currentZoom - 1).clamp(2.0, 18.0)).toDouble();
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
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
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
                MarkerLayer(
                  markers: _buildMarkers(
                    startPoint: startPoint!,
                    startInfo: startInfo,
                    endPoint: endPoint!,
                    endInfo: endInfo,
                    stops: validStops,
                  ),
                ),
              ],
            ),
            Positioned(
              top: 16,
              right: 16,
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
                  alignment: Alignment.center,
                  child: const Icon(Icons.fullscreen, color: Colors.black87),
                ),
              ),
            ),
            Positioned(
              bottom: 20,
              right: 20,
              child: Column(
                children: [
                  _ZoomButton(icon: Icons.add, onTap: zoomIn),
                  const SizedBox(height: 10),
                  _ZoomButton(icon: Icons.remove, onTap: zoomOut),
                ],
              ),
            ),
            if (isFetchingRoute)
              Positioned(
                top: 16,
                left: 16,
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.08),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  alignment: Alignment.center,
                  child: const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
              ),
            if (routeError != null && !isFetchingRoute)
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
                    color: Colors.red.withOpacity(0.12),
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

  List<Marker> _buildMarkers({
    required LatLng startPoint,
    required String startInfo,
    required LatLng endPoint,
    required String endInfo,
    required List<RoutePoint> stops,
  }) {
    final startDescription = startInfo.isNotEmpty
        ? startInfo
        : '${startPoint.latitude.toStringAsFixed(4)}, ${startPoint.longitude.toStringAsFixed(4)}';
    final endDescription = endInfo.isNotEmpty
        ? endInfo
        : '${endPoint.latitude.toStringAsFixed(4)}, ${endPoint.longitude.toStringAsFixed(4)}';

    final markers = <Marker>[
      Marker(
        point: startPoint,
        width: 40,
        height: 40,
        child: GestureDetector(
          onTap: () => _showMarkerInfo('Start Location', startDescription),
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
        point: endPoint,
        width: 40,
        height: 40,
        child: GestureDetector(
          onTap: () => _showMarkerInfo('End Location', endDescription),
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

    final seen = <String>{
      '${startPoint.latitude.toStringAsFixed(6)}_${startPoint.longitude.toStringAsFixed(6)}',
      '${endPoint.latitude.toStringAsFixed(6)}_${endPoint.longitude.toStringAsFixed(6)}',
    };

    for (var index = 0; index < stops.length; index++) {
      final stop = stops[index];
      final key =
          '${stop.latitude.toStringAsFixed(6)}_${stop.longitude.toStringAsFixed(6)}';
      if (seen.contains(key)) {
        continue;
      }
      seen.add(key);

      final order = stop.order > 0 ? stop.order : index + 1;
      final label = stop.name.isNotEmpty ? stop.name : 'Stop $order';
      markers.add(
        Marker(
          point: LatLng(stop.latitude, stop.longitude),
          width: 40,
          height: 40,
          child: GestureDetector(
            onTap: () => _showMarkerInfo(
              'Stop $order: $label',
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
                  '$order',
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

class _ZoomButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _ZoomButton({
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 42,
        height: 42,
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
        alignment: Alignment.center,
        child: Icon(icon, color: Colors.black87),
      ),
    );
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

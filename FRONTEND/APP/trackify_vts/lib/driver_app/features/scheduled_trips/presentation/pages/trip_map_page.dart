import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:trackify_vts/driver_app/features/scheduled_trips/domain/models/scheduled_trip_model.dart';
import 'package:trackify_vts/services/open_route_service.dart';

class TripMapPage extends StatefulWidget {
  final ScheduledTrip trip;

  const TripMapPage({super.key, required this.trip});

  @override
  State<TripMapPage> createState() => _TripMapPageState();
}

class _TripMapPageState extends State<TripMapPage> {
  final MapController _mapController = MapController();
  final OpenRouteService _openRouteService = OpenRouteService('5b3ce3597851110001cf6248f2192131238440788734f1952e420108');
  
  List<LatLng> _polylinePoints = [];
  bool _isFetchingRoute = false;
  bool _isMapReady = false;

  @override
  void initState() {
    super.initState();
    _loadRoute();
  }

  Future<void> _loadRoute() async {
    if (!mounted) return;
    
    setState(() {
      _isFetchingRoute = true;
    });

    try {
      final points = <LatLng>[];
      if (widget.trip.startLocation != null) {
        points.add(LatLng(widget.trip.startLocation!.latitude, widget.trip.startLocation!.longitude));
      }
      for (var point in widget.trip.routePoints) {
        points.add(LatLng(point.latitude, point.longitude));
      }
      if (widget.trip.endLocation != null) {
        points.add(LatLng(widget.trip.endLocation!.latitude, widget.trip.endLocation!.longitude));
      }

      if (points.length > 1) {
        final route = await _openRouteService.getRouteThrough(points);
        if (mounted) {
          setState(() {
            _polylinePoints = route;
            _isFetchingRoute = false;
          });
          _fitBounds();
        }
      } else {
        if (mounted) {
          setState(() {
            _isFetchingRoute = false;
          });
          _fitBounds();
        }
      }
    } catch (e) {
      debugPrint('Error loading route: $e');
      if (mounted) {
        setState(() {
          _isFetchingRoute = false;
        });
        _fitBounds();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final markers = _buildMarkers();

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.trip.routeName),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: FlutterMap(
        mapController: _mapController,
        options: MapOptions(
          initialCenter: LatLng(
            widget.trip.startLocation?.latitude ?? 0,
            widget.trip.startLocation?.longitude ?? 0,
          ),
          initialZoom: 12,
          onMapReady: () {
            _isMapReady = true;
            _fitBounds();
          },
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            subdomains: const ['a', 'b', 'c'],
            userAgentPackageName: 'com.trackify.driver',
          ),
          if (_polylinePoints.isNotEmpty)
            PolylineLayer(
              polylines: [
                Polyline(
                  points: _polylinePoints,
                  color: Colors.blue,
                  strokeWidth: 4,
                ),
              ],
            ),
          MarkerLayer(markers: markers),
        ],
      ),
    );
  }

  void _fitBounds() {
    if (!_isMapReady || _isFetchingRoute) return;

    final points = <LatLng>[];
    
    // Add Start and End locations
    if (widget.trip.startLocation != null) {
      points.add(
        LatLng(
          widget.trip.startLocation!.latitude,
          widget.trip.startLocation!.longitude,
        ),
      );
    }
    if (widget.trip.endLocation != null) {
      points.add(
        LatLng(
          widget.trip.endLocation!.latitude,
          widget.trip.endLocation!.longitude,
        ),
      );
    }
    
    // Add Route Stops
    for (var point in widget.trip.routePoints) {
      points.add(LatLng(point.latitude, point.longitude));
    }
    
    // Add Polyline Points
    points.addAll(_polylinePoints);

    if (points.isNotEmpty) {
      // Calculate bounds
      double? minLat, maxLat, minLng, maxLng;
      for (final p in points) {
        if (minLat == null || p.latitude < minLat) minLat = p.latitude;
        if (maxLat == null || p.latitude > maxLat) maxLat = p.latitude;
        if (minLng == null || p.longitude < minLng) minLng = p.longitude;
        if (maxLng == null || p.longitude > maxLng) maxLng = p.longitude;
      }

      if (minLat != null && maxLat != null && minLng != null && maxLng != null) {
         _mapController.fitCamera(
          CameraFit.bounds(
            bounds: LatLngBounds(
              LatLng(minLat, minLng),
              LatLng(maxLat, maxLng),
            ),
            padding: const EdgeInsets.all(50),
          ),
        );
      }
    }
  }

  List<Marker> _buildMarkers() {
    final markers = <Marker>[];

    if (widget.trip.startLocation != null) {
      markers.add(
        Marker(
          point: LatLng(
            widget.trip.startLocation!.latitude,
            widget.trip.startLocation!.longitude,
          ),
          width: 40,
          height: 40,
          child: GestureDetector(
            onTap:
                () => _showMarkerInfo(
                  'Start Location',
                  widget.trip.startLocation!.address,
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
              ],
            ),
          ),
        ),
      );
    }

    if (widget.trip.endLocation != null) {
      markers.add(
        Marker(
          point: LatLng(
            widget.trip.endLocation!.latitude,
            widget.trip.endLocation!.longitude,
          ),
          width: 40,
          height: 40,
          child: GestureDetector(
            onTap:
                () => _showMarkerInfo(
                  'End Location',
                  widget.trip.endLocation!.address,
                ),
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
              ],
            ),
          ),
        ),
      );
    }

    if (widget.trip.routePoints.isNotEmpty) {
      markers.addAll(
        widget.trip.routePoints.map(
          (stop) => Marker(
            point: LatLng(stop.latitude, stop.longitude),
            width: 40,
            height: 40,
            child: GestureDetector(
              onTap:
                  () => _showStopBottomSheet(
                    context,
                    stop.order,
                    stop.name,
                    stop.latitude,
                    stop.longitude,
                  ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
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
                Container(
                  margin: const EdgeInsets.only(top: 4),
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(4),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
                        blurRadius: 2,
                      ),
                    ],
                  ),
                  child: Text(
                    stop.name,
                    style: const TextStyle(
                      color: Colors.black87,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            ),
          ),
        ),
      );
    }

    return markers;
  }

  void _showStopBottomSheet(
    BuildContext context,
    int order,
    String name,
    double latitude,
    double longitude,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder:
          (context) => DraggableScrollableSheet(
            initialChildSize: 0.35,
            minChildSize: 0.25,
            maxChildSize: 0.5,
            builder: (context, scrollController) {
              return Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 10,
                  ),
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 5,
                        margin: const EdgeInsets.only(bottom: 20),
                        decoration: BoxDecoration(
                          color: Colors.grey[300],
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.blue,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '$order',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${latitude.toStringAsFixed(5)}, ${longitude.toStringAsFixed(5)}',
                                style: TextStyle(color: Colors.grey[600]),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () {
                              _openMapForLocation(latitude, longitude, name);
                            },
                            icon: const Icon(Icons.directions),
                            label: const Text('Directions'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.blue,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.pop(context),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            child: const Text('Close'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
    );
  }

  void _openMapForLocation(double latitude, double longitude, String name) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Directions to $name\nLat: $latitude, Lng: $longitude'),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _showMarkerInfo(String title, String subtitle) {
    // Show a snackbar with marker info
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
            Text(subtitle),
          ],
        ),
        duration: const Duration(seconds: 3),
      ),
    );
  }
}


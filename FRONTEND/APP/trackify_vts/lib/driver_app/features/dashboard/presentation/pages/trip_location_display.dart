
import 'package:flutter/material.dart';
import 'package:geocoding/geocoding.dart';
import '../../domain/models/dashboard_model.dart' as dashboard_models;

class TripLocationDisplay extends StatefulWidget {
  final dashboard_models.DriverTripHistory trip;
  final Color primaryColor;

  const TripLocationDisplay({
    super.key,
    required this.trip,
    required this.primaryColor,
  });

  @override
  State<TripLocationDisplay> createState() => _TripLocationDisplayState();
}

class _TripLocationDisplayState extends State<TripLocationDisplay> {
  String _displayText = 'Loading route...';
  bool _mounted = false;

  @override
  void initState() {
    super.initState();
    _mounted = true;
    _resolveAddresses();
  }

  @override
  void dispose() {
    _mounted = false;
    super.dispose();
  }

  Future<void> _resolveAddresses() async {
    final trip = widget.trip;
    final parts = <String>[];

    // 1. Start Location
    String startStr = '';
    if (trip.startLocation != null) {
      if (trip.startLocation!.address.isNotEmpty) {
        startStr = trip.startLocation!.address;
      } else {
        startStr = await _fetchAddress(trip.startLocation!.latitude, trip.startLocation!.longitude);
      }
    }
    if (startStr.isNotEmpty) parts.add(startStr);

    // 2. Stops (Intermediates)
    if (trip.stops.isNotEmpty) {
       for (var stop in trip.stops) {
          String stopName = '';
          if (stop is Map) {
             if (stop['address'] != null && stop['address'].toString().trim().isNotEmpty) {
                stopName = stop['address'].toString().trim();
             } else if (stop['name'] != null && stop['name'].toString().trim().isNotEmpty) {
                stopName = stop['name'].toString().trim();
             } else if (stop['latitude'] != null && stop['longitude'] != null) {
                stopName = await _fetchAddress(
                   double.tryParse(stop['latitude'].toString()) ?? 0,
                   double.tryParse(stop['longitude'].toString()) ?? 0
                );
             }
          }
          if (stopName.isNotEmpty) parts.add(stopName);
       }
    } else if (trip.routePoints.isNotEmpty) {
       for (var point in trip.routePoints) {
          if (point.latitude == 0 && point.longitude == 0) continue;
          
          if (point.name.isNotEmpty) {
             parts.add(point.name);
          } else {
             final addr = await _fetchAddress(point.latitude, point.longitude);
             if (addr.isNotEmpty) parts.add(addr);
          }
       }
    }

    // 3. End Location
    String endStr = '';
    if (trip.endLocation != null) {
      if (trip.endLocation!.address.isNotEmpty) {
        endStr = trip.endLocation!.address;
      } else {
        endStr = await _fetchAddress(trip.endLocation!.latitude, trip.endLocation!.longitude);
      }
    }
    if (endStr.isNotEmpty) parts.add(endStr);

    if (_mounted) {
      setState(() {
        _displayText = parts.join(' → ');
      });
    }
  }

  Future<String> _fetchAddress(double lat, double lng) async {
    try {
      if (lat == 0 && lng == 0) return '';
      
      List<Placemark> placemarks = await placemarkFromCoordinates(lat, lng);
      if (placemarks.isNotEmpty) {
        final place = placemarks.first;
        final components = [
           place.street,
           place.subLocality,
           place.locality
        ].where((e) => e != null && e.isNotEmpty).toSet().toList(); 
        
        if (components.isNotEmpty) return components.join(', ');
      }
    } catch (e) {
      // ignore
    }
    return '${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)}';
  }

  @override
  Widget build(BuildContext context) {
    if (_displayText.isEmpty) {
        return const SizedBox.shrink();
    }
    
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(Icons.route, size: 16, color: widget.primaryColor),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            _displayText,
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey.shade700,
              height: 1.4,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

class SinglePointLocationDisplay extends StatefulWidget {
  final double latitude;
  final double longitude;
  final TextStyle? style;

  const SinglePointLocationDisplay({
    super.key,
    required this.latitude,
    required this.longitude,
    this.style,
  });

  @override
  State<SinglePointLocationDisplay> createState() => _SinglePointLocationDisplayState();
}

class _SinglePointLocationDisplayState extends State<SinglePointLocationDisplay> {
  String _displayText = '';
  bool _mounted = false;

  @override
  void initState() {
    super.initState();
    _mounted = true;
    _displayText = '${widget.latitude.toStringAsFixed(4)}, ${widget.longitude.toStringAsFixed(4)}';
    _resolveAddress();
  }

  @override
  void dispose() {
    _mounted = false;
    super.dispose();
  }

  Future<void> _resolveAddress() async {
    try {
      if (widget.latitude == 0 && widget.longitude == 0) return;

      List<Placemark> placemarks = await placemarkFromCoordinates(widget.latitude, widget.longitude);
      if (placemarks.isNotEmpty && _mounted) {
        final place = placemarks.first;
        final components = [
           place.street,
           place.subLocality,
           place.locality
        ].where((e) => e != null && e.isNotEmpty).toSet().toList();
        
        if (components.isNotEmpty) {
           setState(() {
              _displayText = components.join(', ');
           });
        }
      }
    } catch (e) {
      // ignore
    }
  }

  @override
  Widget build(BuildContext context) {
    return Text(
      _displayText,
      style: widget.style,
    );
  }
}

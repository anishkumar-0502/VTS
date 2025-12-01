import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

class OpenRouteService {
  final String apiKey;

  OpenRouteService(this.apiKey);

  Future<List<LatLng>> getRoute(LatLng start, LatLng end) {
    return getRouteThrough([start, end]);
  }

  Future<List<LatLng>> getRouteThrough(List<LatLng> coordinates) async {
    if (coordinates.length < 2) {
      throw ArgumentError('At least two coordinates are required');
    }

    final url = Uri.https(
      'api.openrouteservice.org',
      '/v2/directions/driving-car',
      {
        'api_key': apiKey,
        'format': 'geojson',
        'instructions': 'false',
        'geometry_format': 'geojson',
      },
    );

    final body = jsonEncode({
      'coordinates': coordinates
          .map((point) => [point.longitude, point.latitude])
          .toList(),
      'preference': 'shortest',
    });

    final res = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body,
    );

    if (res.statusCode != 200) {
      throw Exception('Failed to fetch route: ${res.body}');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final features = data['features'] as List<dynamic>?;
    if (features != null && features.isNotEmpty) {
      final geometry = features.first['geometry'] as Map<String, dynamic>?;
      final points = geometry?['coordinates'] as List<dynamic>?;
      if (points != null && points.isNotEmpty) {
        return points.map((coord) {
          final lon = (coord[0] as num).toDouble();
          final lat = (coord[1] as num).toDouble();
          return LatLng(lat, lon);
        }).toList();
      }
    }

    final routes = data['routes'] as List<dynamic>?;
    if (routes != null && routes.isNotEmpty) {
      final geometry = routes.first['geometry'];
      if (geometry is Map<String, dynamic>) {
        final points = geometry['coordinates'] as List<dynamic>?;
        if (points != null && points.isNotEmpty) {
          return points.map((coord) {
            final lon = (coord[0] as num).toDouble();
            final lat = (coord[1] as num).toDouble();
            return LatLng(lat, lon);
          }).toList();
        }
      } else if (geometry is String) {
        return _decodePolyline(geometry);
      }
    }

    return [];
  }

  List<LatLng> _decodePolyline(String polyline) {
    final points = <LatLng>[];
    int index = 0;
    int lat = 0;
    int lng = 0;

    while (index < polyline.length) {
      int result = 0;
      int shift = 0;
      int b;
      do {
        b = polyline.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      final deltaLat = (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
      lat += deltaLat;

      result = 0;
      shift = 0;
      do {
        b = polyline.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      final deltaLng = (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
      lng += deltaLng;

      points.add(
        LatLng(lat / 1e5, lng / 1e5),
      );
    }

    return points;
  }
}

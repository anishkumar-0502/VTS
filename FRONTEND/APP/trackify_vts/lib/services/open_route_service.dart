import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

class OpenRouteService {
  final String apiKey;
  
  // Using OSRM public server as fallback since ORS key is disallowed
  static const String _baseUrl = 'router.project-osrm.org';

  OpenRouteService(this.apiKey);

  Future<List<LatLng>> getRoute(LatLng start, LatLng end) {
    return getRouteThrough([start, end]);
  }

  Future<List<LatLng>> getRouteThrough(List<LatLng> coordinates) async {
    if (coordinates.length < 2) {
      throw ArgumentError('At least two coordinates are required');
    }

    // OSRM expects coordinates in "lon,lat;lon,lat" format
    final coordString = coordinates
        .map((p) => '${p.longitude},${p.latitude}')
        .join(';');

    final url = Uri.https(
      _baseUrl,
      '/route/v1/driving/$coordString',
      {
        'overview': 'full',
        'geometries': 'geojson',
        'steps': 'false',
      },
    );

    try {
      final res = await http.get(url);

      if (res.statusCode != 200) {
        print('Failed to fetch route from OSRM: ${res.body}');
        throw Exception('Failed to fetch route: ${res.body}');
      }

      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final routes = data['routes'] as List<dynamic>?;

      if (routes != null && routes.isNotEmpty) {
        final geometry = routes.first['geometry'] as Map<String, dynamic>?;
        final points = geometry?['coordinates'] as List<dynamic>?;

        if (points != null && points.isNotEmpty) {
          return points.map((coord) {
            // GeoJSON is [lon, lat]
            final lon = (coord[0] as num).toDouble();
            final lat = (coord[1] as num).toDouble();
            return LatLng(lat, lon);
          }).toList();
        }
      }

      return [];
    } catch (e) {
      print('Error fetching route: $e');
      rethrow;
    }
  }

  Future<LatLng> snapToRoad(LatLng point) async {
    try {
      // Use OSRM Nearest service
      final url = Uri.https(
        _baseUrl,
        '/nearest/v1/driving/${point.longitude},${point.latitude}',
      );

      final res = await http.get(url);

      if (res.statusCode != 200) {
        print('[OpenRouteService] Snap to road failed: ${res.body}');
        return point;
      }

      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final waypoints = data['waypoints'] as List<dynamic>?;

      if (waypoints != null && waypoints.isNotEmpty) {
        final location = waypoints.first['location'] as List<dynamic>?;
        if (location != null && location.length >= 2) {
          final lon = (location[0] as num).toDouble();
          final lat = (location[1] as num).toDouble();
          // print('[OpenRouteService] Snapped: ($lat, $lon)');
          return LatLng(lat, lon);
        }
      }

      return point;
    } catch (e) {
      print('[OpenRouteService] Error snapping to road: $e');
      return point;
    }
  }
}

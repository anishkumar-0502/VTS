
import 'dart:convert';
import 'package:trackify_vts/driver_app/features/dashboard/domain/models/dashboard_model.dart';
import 'package:trackify_vts/driver_app/features/scheduled_trips/domain/models/scheduled_trip_model.dart' as scheduled_models;

void main() {
  final jsonStr = '''
  {
      "start_location": {"latitude": 12.916, "longitude": 77.600, "address": "Start"},
      "end_location": {"latitude": 11.001, "longitude": 76.959, "address": "End"},
      "scheduled_trip_id": "SCHTRP-123",
      "vehicle_id": {
          "_id": "VEH-123",
          "vehicle_number": "AK01AB1046",
          "route_points": []
      },
      "driver_id": "DRV-123",
      "operator_id": "OPR-123",
      "route_name": "Test Route",
      "scheduled_start_time": "03:30",
      "trip_period": "afternoon",
      "route_points": [
          {
              "stop_id": "STP-1",
              "name": "Dharmapuri",
              "latitude": 12.264,
              "longitude": 78.063,
              "sequence": 1,
              "order": 1
          },
          {
              "stop_id": "STP-2",
              "name": "Salem",
              "latitude": 11.641,
              "longitude": 78.107,
              "sequence": 2,
              "order": 2
          }
      ],
      "status": "completed",
      "createdAt": "2025-11-07T08:51:55.523Z",
      "updatedAt": "2025-12-24T12:39:38.016Z"
  }
  ''';

  try {
    final jsonMap = json.decode(jsonStr) as Map<String, dynamic>;
    final trip = DriverTripHistory.fromJson(jsonMap);
    
    print('Trip ID: ${trip.scheduledTripId}');
    print('Route Points Count: ${trip.routePoints.length}');
    
    for (var point in trip.routePoints) {
      print('Point: ${point.name} (${point.latitude}, ${point.longitude})');
    }
  } catch (e, stack) {
    print('Error: $e');
    print('Stack: $stack');
  }
}

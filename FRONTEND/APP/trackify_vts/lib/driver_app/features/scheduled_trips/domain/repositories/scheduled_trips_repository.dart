import '../models/scheduled_trip_model.dart';
import '../../data/api.dart';

class ScheduledTripsRepository {
  final ScheduledTripsAPICalls _apiCalls = ScheduledTripsAPICalls();

  Future<ScheduledTripsResponse> getAllScheduledTrips(String token) async {
    try {
      final response = await _apiCalls.getAllScheduledTrips(token);
      return ScheduledTripsResponse.fromJson(response);
    } catch (e) {
      rethrow;
    }
  }

  Future<ScheduledTripsResponse> getTodayScheduledTrips(String token) async {
    try {
      final response = await _apiCalls.getTodayScheduledTrips(token);
      return ScheduledTripsResponse.fromJson(response);
    } catch (e) {
      rethrow;
    }
  }

  Future<ActiveTripResponse> getActiveTrip(String token) async {
    try {
      final response = await _apiCalls.getActiveTrip(token);
      return ActiveTripResponse.fromJson(response);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> startScheduledTrip({
    required String token,
    required String scheduledTripId,
  }) async {
    try {
      return await _apiCalls.startScheduledTrip(
        token: token,
        scheduledTripId: scheduledTripId,
      );
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> endTrip({
    required String token,
    required String tripId,
    required Map<String, dynamic> body,
  }) async {
    try {
      return await _apiCalls.endTrip(token: token, tripId: tripId, body: body);
    } catch (e) {
      rethrow;
    }
  }
}

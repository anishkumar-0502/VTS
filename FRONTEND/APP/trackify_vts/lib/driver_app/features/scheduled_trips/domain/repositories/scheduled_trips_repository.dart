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
}

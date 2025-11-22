import '../../data/api.dart';
import '../models/dashboard_model.dart';

class DashboardRepositories {
  final DashboardApicalls _api = DashboardApicalls();

  Future<GettodaystripResponse> gettodayscheduletrip(String token) async {
    try {
      final responseJson = await _api.gettodaystrip(token);
      return GettodaystripResponse.fromJson(responseJson);
    } catch (e) {
      rethrow;
    }
  }

  Future<DriverTripHistoryResponse> getDriverTrips(String token) async {
    try {
      final responseJson = await _api.getDriverTrips(token);
      return DriverTripHistoryResponse.fromJson(responseJson);
    } catch (e) {
      rethrow;
    }
  }

  Future<DriverTripDetailResponse> getTripDetail(
      String token,
      String tripId,
      ) async {
    try {
      final responseJson = await _api.getTripDetail(token, tripId);
      return DriverTripDetailResponse.fromJson(responseJson);
    } catch (e) {
      rethrow;
    }
  }
}
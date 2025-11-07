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
}

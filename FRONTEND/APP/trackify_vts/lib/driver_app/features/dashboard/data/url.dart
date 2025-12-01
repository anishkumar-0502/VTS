import 'package:trackify_vts/core/core.dart';

class Dashboardurl {
  static final String tripsfortoday = '${trackify_vts.baseUrl}/driver/scheduled-trips/today';
  static final String driverTrips = '${trackify_vts.baseUrl}/driver/trips';
  static String tripDetail(String tripId) => '${trackify_vts.baseUrl}/driver/trips/$tripId';
}

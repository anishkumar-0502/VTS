import '../../../../core/core.dart';

class ScheduledTripsUrl {
  static final String allTrips =
      '${trackify_vts.baseUrl}/driver/scheduled-trips';
  static final String todayTrips =
      '${trackify_vts.baseUrl}/driver/scheduled-trips/today';
  static final String activeTrip =
      '${trackify_vts.baseUrl}/driver/trips/active';

  static String startTrip(String scheduledTripId) =>
      '${trackify_vts.baseUrl}/driver/scheduled-trips/$scheduledTripId/start';

  static String endTrip(String tripId) =>
      '${trackify_vts.baseUrl}/driver/trips/$tripId/end';
}

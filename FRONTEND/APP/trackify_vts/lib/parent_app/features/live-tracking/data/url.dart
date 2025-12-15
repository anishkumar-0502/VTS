// live-tracking/data/url.dart

import '../../../../core/core.dart';

class LiveTrackingUrl {
  static const String _base = '/parent';
  
  // API 1: /parent/profile
  static String getProfile() => '${trackify_vts.baseUrl}$_base/profile';
  
  // API 2: /parent/current-trip?childId={{child_id}}
  static String getCurrentTrip(String childId) => '${trackify_vts.baseUrl}$_base/current-trip?childId=$childId';
  
  // API 3: /parent/track-child?childId={{child_id}} (Used for initial check in Home)
  static String getTrackChild(String childId) => '${trackify_vts.baseUrl}$_base/track-child?childId=$childId';

  // API 4: /parent/passenger-status?tripId={{trip_id}}&childId={{child_id}}
  static String getPassengerStatus(String tripId, String childId) => '${trackify_vts.baseUrl}$_base/passenger-status?tripId=$tripId&childId=$childId';

  // API 5: /parent/next-stop?tripId={{trip_id}}&childId={{child_id}}
  static String getNextStop(String tripId, String childId) => '${trackify_vts.baseUrl}$_base/next-stop?tripId=$tripId&childId=$childId';
}
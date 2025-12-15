import '../../../../core/core.dart';

class ParentProfileUrl {
  static final String profile = '${trackify_vts.baseUrl}/parent/profile';
  static final String profileupdate = '${trackify_vts.baseUrl}/parent/profile/update';
  static final String changepassword = '${trackify_vts.baseUrl}/parent/profile/change-password';
  
  static String currentTrip(String childId) => '${trackify_vts.baseUrl}/parent/current-trip?childId=$childId';
  static String trackChild(String childId) => '${trackify_vts.baseUrl}/parent/track-child?childId=$childId';
  static String tripDetails(String tripId) => '${trackify_vts.baseUrl}/driver/trips/$tripId';
  static String nextStop(String tripId, String childId) => '${trackify_vts.baseUrl}/parent/next-stop?tripId=$tripId&childId=$childId';
}

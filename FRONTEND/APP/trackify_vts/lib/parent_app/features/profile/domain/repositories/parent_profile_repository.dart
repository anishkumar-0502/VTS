import 'package:trackify_vts/parent_app/features/profile/domain/models/parent_profile_model.dart';
import '../../data/api.dart';

class ParentProfileRepository {
  final ParentProfileAPICalls _api = ParentProfileAPICalls();

  Future<GetParentProfileResponse> getParentProfile(String token) async {
    try {
      final responseJson = await _api.getParentProfile(token);
      return GetParentProfileResponse.fromJson(responseJson);
    } catch (e) {
      rethrow;
    }
  }

  Future<CurrentTripResponse> getCurrentTrip(String token, String childId) async {
    try {
      final responseJson = await _api.getCurrentTrip(token, childId);
      _normalizeResponse(responseJson);
      return CurrentTripResponse.fromJson(responseJson);
    } catch (e) {
      rethrow;
    }
  }

  Future<TrackChildResponse> trackChild(String token, String childId) async {
    try {
      final responseJson = await _api.trackChild(token, childId);
      _normalizeResponse(responseJson);
      return TrackChildResponse.fromJson(responseJson);
    } catch (e) {
      rethrow;
    }
  }

  void _normalizeResponse(Map<String, dynamic> json) {
    if (json['message'] != null && json['message'] is! String) {
      json['message'] = json['message'].toString();
    }
    if (json['data'] is Map) {
      final data = json['data'] as Map<String, dynamic>;
      _normalizeVehicleData(data);
    }
  }

  void _normalizeVehicleData(Map<String, dynamic> data) {
    if (data['vehicle'] is Map) {
      final vehicle = data['vehicle'] as Map<String, dynamic>;
      if (vehicle['phone_number'] != null && vehicle['phone_number'] is int) {
        vehicle['phone_number'] = vehicle['phone_number'].toString();
      }
      _normalizeVehicleFields(vehicle);
    }
    if (data['child'] is Map) {
      final child = data['child'] as Map<String, dynamic>;
      if (child['phone_number'] != null && child['phone_number'] is int) {
        child['phone_number'] = child['phone_number'].toString();
      }
    }
  }

  void _normalizeVehicleFields(Map<String, dynamic> vehicle) {
    final stringFields = [
      'vehicle_number',
      'current_status',
      'vehicle_type',
      'assigned_driver_id',
      'registration_number',
      'chassis_number',
      'color',
      'current_trip_id',
      'device_id',
      'assigned_device_id',
    ];

    for (final field in stringFields) {
      if (vehicle[field] != null && vehicle[field] is! String) {
        vehicle[field] = vehicle[field].toString();
      }
    }
  }

  Future<TripDetailsResponse> getTripDetails(String token, String tripId) async {
    try {
      final responseJson = await _api.getTripDetails(token, tripId);
      return TripDetailsResponse.fromJson(responseJson);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> updateParentProfile(
      String token, {
        required String name,
        required int phoneNumber,
        String? profileImageBase64,
      }) async {
    try {
      return await _api.updateParentProfile(
        token,
        name: name,
        phoneNumber: phoneNumber,
        profileImageBase64: profileImageBase64,
      );
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> changepasswordrepo(
      String token, String oldpassword, String newpassword) async {
    final responseJson =
    await _api.changepassword(token, oldpassword, newpassword);
    return responseJson;
  }
}

import 'package:trackify_vts/driver_app/features/profile/domain/models/profile_model.dart';
import '../../data/api.dart';

class ProfileRepository {
  final ProfileAPICalls _api = ProfileAPICalls();

  Future<GetProfileResponse> getDriverProfile(String token) async {
    try {
      final responseJson = await _api.getDriverProfile(token);
      return GetProfileResponse.fromJson(responseJson);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> updateDriverProfile(
      String token, {
        required String name,
        required int phoneNumber,
        String? profileImageBase64,
      }) async {
    try {
      return await _api.updateDriverProfile(
        token,
        name: name,
        phoneNumber: phoneNumber,
        profileImageBase64: profileImageBase64,
      );
    } catch (e) {
      rethrow;
    }
  }

  Future<ChangePasswordResponse> changepasswordrepo(
      String token, String oldpassword, String newpassword) async {
    final responseJson =
    await _api.changepassword(token, oldpassword, newpassword);
    return ChangePasswordResponse.fromJson(responseJson);
  }

}

import 'package:trackify_vts/parent_app/features/auth/domain/models/login_model.dart';

import '../../data/api.dart';

class AuthRepository {
  final AuthAPICalls _api = AuthAPICalls();

  Future<GetLoginResponse> login(String email, String password) async {
    try {
      final responseJson = await _api.loginParent(email, password);
      return GetLoginResponse.fromJson(responseJson);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> registerFcmToken(
    String fcmToken,
    String authToken,
  ) async {
    try {
      return await _api.registerFcmToken(fcmToken, authToken);
    } catch (e) {
      rethrow;
    }
  }
}

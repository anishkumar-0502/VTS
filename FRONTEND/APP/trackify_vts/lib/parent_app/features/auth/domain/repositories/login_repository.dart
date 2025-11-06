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
}

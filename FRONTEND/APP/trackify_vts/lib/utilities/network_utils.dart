import 'dart:convert';
import 'package:get/get.dart';
import 'package:http/http.dart' as http;
import 'package:trackify_vts/driver_app/features/auth/presentation/pages/login_page.dart';
import 'package:trackify_vts/parent_app/features/auth/presentation/pages/login_page.dart';
import 'package:trackify_vts/driver_app/Sessionhandler/session_controller.dart' as driver_session;
import 'package:trackify_vts/parent_app/Sessionhandler/session_controller.dart' as parent_session;

import '../../utilities/exception/exception.dart';

class NetworkUtils {
  static bool _isLoggingOut = false;

  static Map<String, dynamic> handleResponse(http.Response response, {required bool isDriver}) {
    Map<String, dynamic> responseBody;
    try {
      responseBody = jsonDecode(response.body);
    } catch (e) {
      throw HttpException(response.statusCode, 'Invalid response from server');
    }

    if (response.statusCode == 401 || responseBody['message'] == 'User not found') {
      if (!_isLoggingOut) {
        _logout(isDriver: isDriver);
      }
      throw HttpException(401, responseBody['message'] ?? 'Session expired');
    }

    return responseBody;
  }

  static void _logout({required bool isDriver}) {
    _isLoggingOut = true;
    if (isDriver) {
      try {
        final sessionController = Get.find<driver_session.SessionController>(tag: 'driver');
        sessionController.clearSession();
      } catch (e) {
        // Controller might not be found
      }
      // Use a small delay to ensure navigation happens cleanly
      Future.delayed(const Duration(milliseconds: 100), () {
        Get.offAll(() => const DriverLoginPage());
        _isLoggingOut = false;
      });
    } else {
      try {
        final sessionController = Get.find<parent_session.SessionController>();
        sessionController.clearSession();
      } catch (e) {
        // Controller might not be found
      }
      Future.delayed(const Duration(milliseconds: 100), () {
        Get.offAll(() => const ParentLoginPage());
        _isLoggingOut = false;
      });
    }
  }
}

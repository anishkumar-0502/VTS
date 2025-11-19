import 'package:get/get.dart';

import '../../../../Sessionhandler/session_controller.dart';
import '../../../auth/presentation/pages/login_page.dart';
import '../../../dashboard/presentation/pages/driver_home_page.dart';

class DriverSplashScreenController extends GetxController {
  final SessionController _sessionController = Get.find<SessionController>(tag: 'driver');

  @override
  void onReady() {
    super.onReady();
    Future.delayed(const Duration(seconds: 2), () async {
      if (!isClosed) {
        await _evaluateSession();
      }
    });
  }

  Future<void> _evaluateSession() async {
    await _sessionController.loadSession();
    final hasToken = _sessionController.token.value.isNotEmpty;
    final loggedIn = _sessionController.isLoggedIn.value;
    if (loggedIn && hasToken) {
      _goToHome();
    } else {
      await _sessionController.clearSession();
      _goToLogin();
    }
  }

  void _goToHome() {
    if (!isClosed) {
      Get.offAll(() => const DriverHomePage());
    }
  }

  void _goToLogin() {
    if (!isClosed) {
      Get.offAll(() => const DriverLoginPage());
    }
  }
}

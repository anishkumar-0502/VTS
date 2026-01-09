import "package:flutter/foundation.dart";
import 'package:get/get.dart';

import '../../../../Sessionhandler/session_controller.dart';
import '../../../auth/presentation/pages/login_page.dart';
import '../../../dashboard/presentation/controllers/parent_home_controller.dart';
import '../../../dashboard/presentation/pages/parent_home_page.dart';
import '../../../dashboard/presentation/bindings/parent_home_binding.dart';

class ParentSplashScreenController extends GetxController {
  final SessionController _sessionController = Get.find<SessionController>();

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
    try {
      await _sessionController.ensureInitialized();
      await _sessionController.loadSession();
      
      debugPrint('[SplashScreen] Session evaluation - loggedIn: ${_sessionController.isLoggedIn.value}, hasToken: ${_sessionController.token.value.isNotEmpty}');
      
      final hasToken = _sessionController.token.value.isNotEmpty;
      final loggedIn = _sessionController.isLoggedIn.value;
      final hasRequiredData = _sessionController.parentData.value?.containsKey('end_user_id') ?? false;
      
      if (loggedIn && hasToken && hasRequiredData) {
        debugPrint('[SplashScreen] ✅ Valid session found, navigating to home');
        _goToHome();
      } else {
        debugPrint('[SplashScreen] ⚠️ Invalid session (loggedIn=$loggedIn, hasToken=$hasToken, hasData=$hasRequiredData), clearing and going to login');
        await _sessionController.clearSession();
        _goToLogin();
      }
    } catch (e) {
      debugPrint('[SplashScreen] ❌ Error evaluating session: $e');
      await _sessionController.clearSession();
      _goToLogin();
    }
  }

  void _goToHome() {
    if (!isClosed) {
      Get.offAll(
        () => ParentHomePage(),
        binding: ParentHomeBinding(),
      );
    }
  }

  void _goToLogin() {
    if (!isClosed) {
      Get.offAll(() => const ParentLoginPage());
    }
  }
}

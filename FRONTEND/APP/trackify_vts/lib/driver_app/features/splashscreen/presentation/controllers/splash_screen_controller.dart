import 'package:get/get.dart';

import '../../../auth/presentation/pages/login_page.dart';

class DriverSplashScreenController extends GetxController {
  @override
  void onReady() {
    super.onReady();
    Future.delayed(const Duration(seconds: 2), () {
      if (!isClosed) {
        Get.offAll(() => const DriverLoginPage());
      }
    });
  }
}

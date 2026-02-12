import "package:flutter/foundation.dart";
import 'package:get/get.dart';
import '../controllers/parent_home_controller.dart';

class ParentHomeBinding extends Bindings {
  @override
  void dependencies() {
    try {
      if (!Get.isRegistered<ParentHomeController>(tag: 'home')) {
        Get.put<ParentHomeController>(
          ParentHomeController(),
          tag: 'home',
          permanent: true,
        );
        debugPrint('✅ [ParentHomeBinding] ParentHomeController created and registered as permanent');
      } else {
        debugPrint('✅ [ParentHomeBinding] ParentHomeController already registered');
      }
    } catch (e) {
      debugPrint('❌ [ParentHomeBinding] Error registering controller: $e');
      rethrow;
    }
  }
}

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
        print('✅ [ParentHomeBinding] ParentHomeController created and registered as permanent');
      } else {
        print('✅ [ParentHomeBinding] ParentHomeController already registered');
      }
    } catch (e) {
      print('❌ [ParentHomeBinding] Error registering controller: $e');
      rethrow;
    }
  }
}

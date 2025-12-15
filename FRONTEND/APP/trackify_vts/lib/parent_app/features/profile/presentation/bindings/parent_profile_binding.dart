import 'package:get/get.dart';
import '../controllers/parent_profile_controller.dart';

class ParentProfileBinding extends Bindings {
  @override
  void dependencies() {
    Get.put<ParentProfileController>(
      ParentProfileController(),
      tag: 'parent_profile',
    );
  }
}

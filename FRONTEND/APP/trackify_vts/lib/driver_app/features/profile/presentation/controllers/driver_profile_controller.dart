import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:panara_dialogs/panara_dialogs.dart';

import '../../../../Sessionhandler/session_controller.dart';
import '../../../auth/presentation/pages/login_page.dart';

class DriverProfileController extends GetxController {
  final SessionController sessionController = Get.find<SessionController>();

  Map<String, String> get driverDetails {
    final base = <String, String>{
      'name': 'Jordan Lee',
      'employeeId': 'DRV-2045',
      'vehicleNumber': 'GX 18 TR 4521',
      'licenseNumber': 'TN-82-5109',
      'licenseExpiry': 'Dec 2026',
      'experience': '6 years',
      'email': '',
      'phoneNumber': '',
    };
    final data = sessionController.driverData.value;
    if (data != null) {
      final name = data['name'];
      if (name is String && name.isNotEmpty) {
        base['name'] = name;
      }
      final id = data['user_id'];
      if (id != null) {
        base['employeeId'] = id.toString();
      }
      final email = data['email'];
      if (email is String && email.isNotEmpty) {
        base['email'] = email;
      }
      final phone = data['phone_number'];
      if (phone != null) {
        base['phoneNumber'] = phone.toString();
      }
    }
    return base;
  }

  final List<Map<String, String>> complianceItems = [
    {
      'title': 'Daily checklist',
      'status': 'Completed today',
    },
    {
      'title': 'Vehicle inspection',
      'status': 'Due in 14 days',
    },
    {
      'title': 'First-aid certification',
      'status': 'Valid until Mar 2026',
    },
  ];

  final List<Map<String, String>> documents = [
    {
      'name': 'License copy',
      'status': 'Uploaded',
    },
    {
      'name': 'Insurance',
      'status': 'Uploaded',
    },
    {
      'name': 'Vehicle fitness',
      'status': 'Pending refresh',
    },
  ];

  @override
  void onInit() {
    super.onInit();
    sessionController.loadSession();
  }

  Future<void> confirmLogout(BuildContext context) async {
    PanaraConfirmDialog.show(
      context,
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
      panaraDialogType: PanaraDialogType.warning,
      onTapCancel: () {
        Get.back();
      },
      onTapConfirm: () async {
        Get.back();
        await sessionController.clearSession();
        if (!isClosed) {
          Get.offAll(() => const DriverLoginPage());
        }
      },
    );
  }
}

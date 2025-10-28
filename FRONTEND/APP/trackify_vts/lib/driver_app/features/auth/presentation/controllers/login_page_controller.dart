import 'package:flutter/material.dart';
import 'package:get/get.dart';

class DriverLoginPageController extends GetxController {
  final GlobalKey<FormState> formKey = GlobalKey<FormState>();
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final RxBool obscurePassword = true.obs;

  @override
  void onClose() {
    emailController.dispose();
    passwordController.dispose();
    super.onClose();
  }

  String? validateEmail(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) {
      return 'Enter your email';
    }
    if (!GetUtils.isEmail(trimmed)) {
      return 'Enter a valid email address';
    }
    return null;
  }

  String? validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Enter your password';
    }
    if (value.length < 6) {
      return 'Password must have at least 6 characters';
    }
    if (!value.contains(RegExp(r'[A-Za-z]')) || !value.contains(RegExp(r'[0-9]'))) {
      return 'Include letters and numbers';
    }
    return null;
  }

  void submit() {
    if (formKey.currentState?.validate() ?? false) {
      Get.snackbar(
        'Login',
        'Driver authentication pending integration.',
        backgroundColor: Colors.white,
        colorText: Colors.black,
      );
    }
  }
}

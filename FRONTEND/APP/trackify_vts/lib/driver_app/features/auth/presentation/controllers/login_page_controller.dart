import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../Sessionhandler/session_controller.dart';
import '../../../dashboard/presentation/pages/driver_home_page.dart';
import '../../domain/models/login_model.dart';
import '../../domain/repositories/login_repository.dart';
import '../../../../../utilities/exception/exception.dart' as exceptions;

class DriverLoginPageController extends GetxController {
  final GlobalKey<FormState> formKey = GlobalKey<FormState>();
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final RxBool obscurePassword = true.obs;
  final RxBool isLoading = false.obs;

  final AuthRepository _authRepository = AuthRepository();
  final SessionController _sessionController = Get.find<SessionController>();

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

  Future<void> submit() async {
    if (isLoading.value) {
      return;
    }
    if (formKey.currentState?.validate() ?? false) {
      isLoading.value = true;
      final email = emailController.text.trim();
      final password = passwordController.text;
      try {
        final response = await _authRepository.login(email, password);
        if (!response.error) {
          await _saveSession(response);
          showStatusBanner(response.message, Colors.green, Icons.check_circle);
          Get.offAll(() => const DriverHomePage());
        } else {
          showStatusBanner(response.message, Colors.redAccent, Icons.error_outline);
        }
      } catch (e) {
        final message = e is exceptions.HttpException
            ? e.message
            : e is exceptions.SocketException
                ? e.message
                : e is exceptions.TimeoutException
                    ? e.message
                    : 'Unable to login. Please try again.';
        showStatusBanner(message, Colors.redAccent, Icons.error_outline);
      } finally {
        isLoading.value = false;
      }
    }
  }

  Future<void> _saveSession(GetLoginResponse response) async {
    final data = response.data;
    if (data == null) {
      return;
    }
    final userId = data['user_id'];
    final token = data['token'];
    final email = data['email'];
    final name = data['name'];
    if (userId is String && token is String && email is String) {
      await _sessionController.saveSession(
        userId: userId,
        emailId: email,
        token: token,
        username: name is String ? name : null,
        rawData: data,
      );
    }
  }

  void showStatusBanner(String message, Color color, IconData icon) {
    Get.rawSnackbar(
      messageText: Row(
        children: [
          Icon(icon, color: color),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: TextStyle(color: color, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
      backgroundColor: color.withValues(alpha: 0.12),
      borderRadius: 16,
      borderColor: color,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      snackPosition: SnackPosition.TOP,
      duration: const Duration(seconds: 3),
      isDismissible: true,
    );
  }
}

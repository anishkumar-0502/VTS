import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../../Sessionhandler/session_controller.dart';
import '../../../dashboard/presentation/controllers/parent_home_controller.dart';
import '../../../dashboard/presentation/pages/parent_home_page.dart';
import '../../domain/repositories/login_repository.dart';
import '../../../profile/domain/repositories/parent_profile_repository.dart';
import '../../../../../utilities/exception/exception.dart' as exceptions;
import '../../../../../utilities/widgets/status_banner.dart';

class ParentLoginPageController extends GetxController {
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
    if (!value.contains(RegExp(r'[A-Za-z]')) ||
        !value.contains(RegExp(r'[0-9]'))) {
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
          await _fetchAndUpdateFullProfile();
          showStatusBanner(response.message, Colors.green, Icons.check_circle);
          Get.offAll(
            () => ParentHomePage(),
            binding: BindingsBuilder(() {
              Get.put(ParentHomeController());
            }),
          ); 
        } else {  
          showStatusBanner(
            response.message,
            Colors.redAccent,
            Icons.error_outline,
          );
        }
      } catch (e) {
        final message =
            e is exceptions.HttpException
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

  Future<void> _saveSession(dynamic response) async {
    try {
      final data = response.data;
      if (data == null) {
        return;
      }
      final userId = data['user_id'];
      final token = data['token'];
      final email = data['email'];
      final name = data['name'];
      
      final Map<String, dynamic> sessionData = Map<String, dynamic>.from(data);
      
      if (data['user_details'] != null && data['user_details'] is Map) {
         final userDetails = data['user_details'];
         if (userDetails['end_user_id'] != null) {
            sessionData['end_user_id'] = userDetails['end_user_id'];
         }
      }

      if (userId is String && token is String && email is String) {
        await _sessionController.saveSession(
          userId: userId,
          emailId: email,
          token: token,
          username: name is String ? name : null,
          rawData: sessionData,
        );
      }
    } catch (e) {
      debugPrint('Error saving session: $e');
    }
  }

  Future<void> _fetchAndUpdateFullProfile() async {
    try {
      final token = _sessionController.token.value;
      if (token.isEmpty) {
        debugPrint('Token not available for profile fetch after login');
        return;
      }

      debugPrint('[LoginController] Fetching full profile after login');
      
      final profileRepository = ParentProfileRepository();
      final response = await profileRepository.getParentProfile(token);
      
      if (!response.error && response.data != null) {
        final profile = response.data!;
        
        final completeProfileData = <String, dynamic>{
          'name': profile.name,
          'email': profile.email,
          'phone_number': profile.phoneNumber,
          'user_id': profile.userId,
          'assigned_vehicle_id': profile.assignedVehicleId,
          'role_id': profile.roleId,
          'operator_id': profile.operatorId,
          'end_user_id': profile.endUserId,
        };
        
        await _sessionController.saveSession(
          userId: profile.userId,
          emailId: profile.email,
          token: token,
          username: profile.name,
          rawData: completeProfileData,
        );
        
        debugPrint('[LoginController] ✅ Full profile fetched and session updated with all required fields');
      } else {
        debugPrint('[LoginController] ⚠️ Failed to fetch full profile after login: ${response.message}');
      }
    } catch (e) {
      debugPrint('[LoginController] ⚠️ Error fetching profile after login: $e');
    }
  }


}

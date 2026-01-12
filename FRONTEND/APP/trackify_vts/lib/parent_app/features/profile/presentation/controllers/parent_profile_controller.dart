import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../../Sessionhandler/session_controller.dart';
import 'package:trackify_vts/shared/widgets/modern_dialog.dart';
import '../../../auth/presentation/pages/login_page.dart';
import '../../domain/models/parent_profile_model.dart';
import '../../domain/repositories/parent_profile_repository.dart';
import '../../../../../utilities/exception/exception.dart' as exceptions;
import '../../../../../utilities/widgets/status_banner.dart';

class ParentProfileController extends GetxController {
  final SessionController sessionController = Get.find<SessionController>();
  final ParentProfileRepository _profileRepository = ParentProfileRepository();

  final RxBool isLoading = true.obs;
  final Rx<ParentProfileData?> profileData = Rxn<ParentProfileData>();

  Map<String, String> get parentDetails {
    final data = profileData.value;
    if (data != null) {
      return {
        'name': data.name,
        'email': data.email,
        'phoneNumber': data.phoneNumber.toString(),
        'operator': data.operatorDetails?.name ?? 'Unknown',
        'vehicle': data.vehicleDetails?.vehicleNumber ?? 'Not assigned',
        'pickupLocation': data.pickupLocation?.name ?? 'Not set',
        'dropoffLocation': data.dropoffLocation?.name ?? 'Not set',
        'sosContact': data.sosContact?.name ?? 'Not set',
      };
    }
    final base = <String, String>{
      'name': 'Loading...',
      'email': '',
      'phoneNumber': '',
      'operator': '',
      'vehicle': '',
      'pickupLocation': '',
      'dropoffLocation': '',
      'sosContact': '',
    };
    final sessionData = sessionController.parentData.value;
    if (sessionData != null) {
      final name = sessionData['name'];
      if (name is String && name.isNotEmpty) {
        base['name'] = name;
      }
      final email = sessionData['email'];
      if (email is String && email.isNotEmpty) {
        base['email'] = email;
      }
      final phone = sessionData['phone_number'];
      if (phone != null) {
        base['phoneNumber'] = phone.toString();
      }
    }
    return base;
  }

  List<Map<String, String>> get quickStats {
    final data = profileData.value;
    if (data == null) {
      return [
        {'title': 'Vehicle', 'value': '--', 'subtitle': ''},
        {'title': 'Status', 'value': '--', 'subtitle': ''},
        {'title': 'Route', 'value': '--', 'subtitle': ''},
      ];
    }
    return [
      {
        'title': 'Vehicle',
        'value': data.vehicleDetails?.vehicleNumber ?? '--',
        'subtitle': data.vehicleDetails?.vehicleType ?? 'Not assigned',
      },
      {
        'title': 'Status',
        'value': data.vehicleDetails?.currentStatus ?? '--',
        'subtitle': data.status ? 'Active' : 'Inactive',
      },
      {
        'title': 'Pickup',
        'value': data.pickupLocation?.name ?? '--',
        'subtitle': data.pickupLocation?.address ?? '',
      },
    ];
  }

  List<Map<String, String>> get operatorSnapshot {
    final data = profileData.value;
    if (data == null || data.operatorDetails == null) {
      return [];
    }
    final operator = data.operatorDetails!;
    return [
      {'label': 'Operator name', 'value': operator.name},
      {'label': 'Contact', 'value': operator.phone},
      {'label': 'Email', 'value': operator.email},
      {'label': 'City', 'value': '${operator.city}, ${operator.state}'},
    ];
  }

  List<Map<String, String>> get vehicleSnapshot {
    final data = profileData.value;
    if (data == null || data.vehicleDetails == null) {
      return [];
    }
    final vehicle = data.vehicleDetails!;
    return [
      {'label': 'Vehicle number', 'value': vehicle.vehicleNumber},
      {'label': 'Type', 'value': vehicle.vehicleType},
      {'label': 'Capacity', 'value': '${vehicle.seatingCapacity} seats'},
      {'label': 'Status', 'value': vehicle.currentStatus ?? '--'},
    ];
  }

  List<Map<String, String>> get locationSnapshot {
    final data = profileData.value;
    if (data == null) {
      return [];
    }
    final locations = <Map<String, String>>[];
    if (data.pickupLocation != null) {
      locations.add({
        'label': 'Pickup',
        'value': data.pickupLocation!.name,
        'address': data.pickupLocation!.address,
      });
    }
    if (data.dropoffLocation != null) {
      locations.add({
        'label': 'Dropoff',
        'value': data.dropoffLocation!.name,
        'address': data.dropoffLocation!.address,
      });
    }
    return locations;
  }

  List<Map<String, String>> get sosDetails {
    final data = profileData.value;
    if (data == null || data.sosContact == null) {
      return [];
    }
    final sos = data.sosContact!;
    return [
      {'label': 'SOS Contact', 'value': sos.name},
      {'label': 'Phone', 'value': sos.phoneNumber.toString()},
    ];
  }

  @override
  void onInit() {
    super.onInit();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await sessionController.ensureInitialized();
      fetchProfile();
    });
  }

  Future<void> fetchProfile({bool showLoading = true}) async {
    try {
      if (showLoading) isLoading.value = true;
      final token = sessionController.token.value;
      if (token.isEmpty) {
        showStatusBanner(
          'No authentication token found',
          Colors.redAccent,
          Icons.error_outline,
        );
        return;
      }
      debugPrint('[ParentProfileController] Fetching parent profile...');
      final response = await _profileRepository.getParentProfile(token);
      debugPrint(
        '[ParentProfileController] Got response: error=${response.error}, message=${response.message}, data!=null=${response.data != null}',
      );
      if (response.error) {
        showStatusBanner(
          response.message,
          Colors.redAccent,
          Icons.error_outline,
        );
      } else if (response.data != null) {
        try {
          profileData.value = response.data;
          debugPrint('[ParentProfileController] ✅ Profile data set: ${profileData.value?.name}');
          
          final profile = response.data!;
          final rawData = <String, dynamic>{
            'name': profile.name,
            'email': profile.email,
            'phone_number': profile.phoneNumber,
            'user_id': profile.userId,
            'assigned_vehicle_id': profile.assignedVehicleId,
            'role_id': profile.roleId,
            'operator_id': profile.operatorId,
            'end_user_id': profile.endUserId,
          };
          await sessionController.saveSession(
            userId: profile.userId,
            emailId: profile.email,
            token: sessionController.token.value,
            username: profile.name,
            rawData: rawData,
          );
          debugPrint('[ParentProfileController] ✅ Session updated with complete profile data');
        } catch (e) {
          debugPrint('[ParentProfileController] ❌ Error setting profile data: $e');
          showStatusBanner(
            'Failed to parse profile data',
            Colors.redAccent,
            Icons.error_outline,
          );
        }
      } else {
        debugPrint('[ParentProfileController] ⚠️ Response data is null');
        showStatusBanner(
          'No profile data received',
          Colors.redAccent,
          Icons.error_outline,
        );
      }
    } on exceptions.HttpException catch (e) {
      debugPrint('[ParentProfileController] HttpException: $e');
      showStatusBanner(e.message, Colors.redAccent, Icons.error_outline);
    } catch (e) {
      debugPrint('[ParentProfileController] Exception in fetchProfile: $e');
      showStatusBanner(
        'Failed to load profile',
        Colors.redAccent,
        Icons.error_outline,
      );
    } finally {
      if (showLoading) isLoading.value = false;
    }
  }

  Future<void> confirmLogout(BuildContext context) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return ModernDialog(
          title: 'Confirm Logout',
          icon: Icons.logout,
          iconColor: Colors.orange,
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.orange.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: Colors.orange.withValues(alpha: 0.2),
                    width: 1.5,
                  ),
                ),
                child: const Text(
                  'Are you sure you want to logout from your account?',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.black87,
                    height: 1.6,
                  ),
                ),
              ),
            ],
          ),
          actions: [
            ModernDialogButton(
              label: 'Yes, Logout',
              icon: Icons.exit_to_app,
              backgroundColor: Colors.orange,
              onPressed: () async {
                Get.back();
                await sessionController.clearSession();
                if (!isClosed) {
                  Get.offAll(() => const ParentLoginPage());
                }
              },
            ),
            ModernDialogButton(
              label: 'Cancel',
              icon: Icons.close,
              backgroundColor: Colors.grey[600]!,
              onPressed: () => Navigator.pop(context),
            ),
          ],
        );
      },
    );
  }

  Future<void> updateProfile({
    required String name,
    required int phoneNumber,
  }) async {
    try {
      isLoading.value = true;
      final token = sessionController.token.value;
      if (token.isEmpty) {
        showStatusBanner(
          'No authentication token found',
          Colors.redAccent,
          Icons.error_outline,
        );
        return;
      }

      final response = await _profileRepository.updateParentProfile(
        token,
        name: name,
        phoneNumber: phoneNumber,
      );

      if (response['success'] == true || response['error'] == false) {
        showStatusBanner(
          response['message'] ?? 'Profile updated successfully',
          Colors.green,
          Icons.check_circle_outline,
        );
        await fetchProfile(showLoading: false);
      } else {
        showStatusBanner(
          response['message'] ?? 'Failed to update profile',
          Colors.redAccent,
          Icons.error_outline,
        );
      }
    } on exceptions.HttpException catch (e) {
      showStatusBanner(e.message, Colors.redAccent, Icons.error_outline);
    } catch (e) {
      debugPrint('Exception in updateProfile: $e');
      showStatusBanner(
        'Failed to update profile',
        Colors.redAccent,
        Icons.error_outline,
      );
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {
    try {
      isLoading.value = true;
      final token = sessionController.token.value;
      if (token.isEmpty) {
        showStatusBanner(
          'No authentication token found',
          Colors.redAccent,
          Icons.error_outline,
        );
        return;
      }

      final response = await _profileRepository.changepasswordrepo(
        token,
        oldPassword,
        newPassword,
      );

      if (response['success'] == true || response['error'] == false) {
        showStatusBanner(
          response['message'] ?? 'Password changed successfully',
          Colors.green,
          Icons.check_circle_outline,
        );
        await Future.delayed(const Duration(milliseconds: 1500));
        if (!isClosed) {
          Get.back();
        }
      } else {
        showStatusBanner(
          response['message'] ?? 'Failed to change password',
          Colors.redAccent,
          Icons.error_outline,
        );
      }
    } on exceptions.HttpException catch (e) {
      showStatusBanner(e.message, Colors.redAccent, Icons.error_outline);
    } catch (e) {
      debugPrint('Exception in changePassword: $e');
      showStatusBanner(
        'Failed to change password',
        Colors.redAccent,
        Icons.error_outline,
      );
    } finally {
      isLoading.value = false;
    }
  }
}

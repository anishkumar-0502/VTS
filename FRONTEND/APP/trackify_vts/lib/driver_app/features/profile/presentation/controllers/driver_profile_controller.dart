import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:panara_dialogs/panara_dialogs.dart';

import '../../../../Sessionhandler/session_controller.dart';
import '../../../auth/presentation/pages/login_page.dart';
import '../../domain/models/profile_model.dart';
import '../../domain/repositories/profile_repository.dart';
import '../../../../../utilities/exception/exception.dart' as exceptions;
import '../../../../../utilities/widgets/status_banner.dart';

class DriverProfileController extends GetxController {
  final SessionController sessionController = Get.find<SessionController>();
  final ProfileRepository _profileRepository = ProfileRepository();

  final RxBool isLoading = true.obs;
  final Rx<ProfileData?> profileData = Rxn<ProfileData>();

  Map<String, String> get driverDetails {
    final data = profileData.value;
    if (data != null) {
      return {
        'name': data.name,
        'employeeId': data.userId,
        'vehicleNumber': data.assignedVehicle?.vehicleNumber ?? 'Not assigned',
        'licenseNumber': data.licenseNumber,
        'licenseExpiry': _formatDate(data.licenseExpiry),
        'experience': _deriveExperience(data.createdAt),
        'email': data.email,
        'phoneNumber': data.phoneNumber.toString(),
        'operator': data.operatorDetails?.companyName ?? 'Unknown',
        'route': data.assignedVehicle?.routeName ?? 'Awaiting assignment',
        'status': data.assignedVehicle?.currentStatus ?? 'Offline',
      };
    }
    final base = <String, String>{
      'name': 'Loading...',
      'employeeId': '',
      'vehicleNumber': '',
      'licenseNumber': '',
      'licenseExpiry': '',
      'experience': '',
      'email': '',
      'phoneNumber': '',
      'operator': '',
      'route': '',
      'status': '',
    };
    final sessionData = sessionController.driverData.value;
    if (sessionData != null) {
      final name = sessionData['name'];
      if (name is String && name.isNotEmpty) {
        base['name'] = name;
      }
      final id = sessionData['user_id'];
      if (id != null) {
        base['employeeId'] = id.toString();
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
        {'title': 'Experience', 'value': '--', 'subtitle': ''},
        {'title': 'License', 'value': '--', 'subtitle': ''},
        {'title': 'Last login', 'value': '--', 'subtitle': ''},
      ];
    }
    return [
      {
        'title': 'Experience',
        'value': _deriveExperience(data.createdAt),
        'subtitle': 'Since ${_formatDisplayDate(data.createdAt)}',
      },
      {
        'title': 'License',
        'value': _licenseState(data.licenseExpiry),
        'subtitle': 'Expires ${_formatDate(data.licenseExpiry)}',
      },
      {
        'title': 'Last login',
        'value': _relativeTime(data.lastLogin),
        'subtitle': _formatDisplayDate(data.lastLogin),
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
      {'label': 'Company', 'value': operator.companyName},
      {'label': 'Contact', 'value': operator.phone},
      {'label': 'Email', 'value': operator.email},
      {'label': 'Plan', 'value': operator.subscriptionPlan},
      {'label': 'Location', 'value': '${operator.city}, ${operator.state}'},
    ];
  }

  List<Map<String, String>> get vehicleSnapshot {
    final data = profileData.value;
    if (data == null || data.assignedVehicle == null) {
      return [];
    }
    final vehicle = data.assignedVehicle!;
    return [
      {'label': 'Vehicle number', 'value': vehicle.vehicleNumber},
      {'label': 'Route', 'value': vehicle.routeName},
      {'label': 'Capacity', 'value': '${vehicle.seatingCapacity} seats'},
      {'label': 'Status', 'value': vehicle.currentStatus},
      {'label': 'Standing at', 'value': vehicle.standingLocation.name},
    ];
  }

  List<RoutePoint> get routePoints {
    final data = profileData.value;
    if (data == null || data.assignedVehicle == null) {
      return [];
    }
    return data.assignedVehicle!.routePoints;
  }

  List<OperatorDetails> get associatedOperators {
    final data = profileData.value;
    if (data == null) {
      return [];
    }
    return data.associatedOperators;
  }

  List<Map<String, String>> get complianceItems {
    final data = profileData.value;
    if (data == null) {
      return [
        {'title': 'Daily checklist', 'status': 'Pending sync'},
        {'title': 'Vehicle inspection', 'status': 'Pending sync'},
        {'title': 'License verification', 'status': 'Pending sync'},
      ];
    }
    return [
      {
        'title': 'Vehicle assignment',
        'status':
            data.assignedVehicle != null
                ? 'Assigned to ${data.assignedVehicle!.vehicleNumber}'
                : 'Awaiting assignment',
      },
      {'title': 'License status', 'status': _licenseState(data.licenseExpiry)},
      {
        'title': 'Last safety audit',
        'status': _formatDisplayDate(data.updatedAt),
      },
    ];
  }

  List<Map<String, String>> get documents {
    final data = profileData.value;
    if (data == null) {
      return [
        {'name': 'License', 'status': 'Loading...'},
        {'name': 'Insurance', 'status': 'Loading...'},
      ];
    }
    return [
      {'name': 'Driving license', 'status': _licenseState(data.licenseExpiry)},
      {
        'name': 'Operator contract',
        'status': data.operatorDetails?.status == true ? 'Active' : 'Inactive',
      },
      {
        'name': 'Vehicle allocation',
        'status': data.assignedVehicle == null ? 'Pending' : 'Assigned',
      },
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
      print('Fetching profile...');
      final response = await _profileRepository.getDriverProfile(token);
      print(
        'Got response: error=${response.error}, message=${response.message}, data!=null=${response.data != null}',
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
          print('Profile data set: ${profileData.value?.name}');
        } catch (e) {
          print('Error setting profile data: $e');
          showStatusBanner(
            'Failed to parse profile data',
            Colors.redAccent,
            Icons.error_outline,
          );
        }
      } else {
        print('Response data is null');
        showStatusBanner(
          'No profile data received',
          Colors.redAccent,
          Icons.error_outline,
        );
      }
    } on exceptions.HttpException catch (e) {
      print('HttpException: $e');
      showStatusBanner(e.message, Colors.redAccent, Icons.error_outline);
    } catch (e) {
      print('Exception in fetchProfile: $e');
      showStatusBanner(
        'Failed to load profile',
        Colors.redAccent,
        Icons.error_outline,
      );
    } finally {
      if (showLoading) isLoading.value = false;
    }
  }

  String _formatDate(String dateString) {
    try {
      final date = DateTime.parse(dateString);
      return '${_pad2(date.month)}/${_pad2(date.day)}/${date.year}';
    } catch (e) {
      return dateString;
    }
  }

  String _deriveExperience(DateTime since) {
    final now = DateTime.now();
    final totalMonths = (now.year - since.year) * 12 + now.month - since.month;
    if (totalMonths <= 0) {
      return 'New driver';
    }
    final years = totalMonths ~/ 12;
    final months = totalMonths % 12;
    if (years > 0 && months > 0) {
      return '${years}y ${months}m';
    }
    if (years > 0) {
      return years == 1 ? '1y' : '${years}y';
    }
    return '${months}m';
  }

  String _licenseState(String expiry) {
    try {
      final date = DateTime.parse(expiry);
      final now = DateTime.now();
      if (date.isBefore(now)) {
        return 'Expired';
      }
      final days = date.difference(now).inDays;
      if (days <= 30) {
        return 'Expiring soon';
      }
      return 'Active';
    } catch (e) {
      return 'Unknown';
    }
  }

  String _formatDisplayDate(DateTime date) {
    final month = _monthName(date.month);
    return '$month ${_pad2(date.day)}, ${date.year}';
  }

  String _relativeTime(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inDays >= 1) {
      return '${diff.inDays}d ago';
    }
    if (diff.inHours >= 1) {
      return '${diff.inHours}h ago';
    }
    if (diff.inMinutes >= 1) {
      return '${diff.inMinutes}m ago';
    }
    return 'Just now';
  }

  String _monthName(int month) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    if (month < 1 || month > months.length) {
      return '';
    }
    return months[month - 1];
  }

  String _pad2(int value) {
    return value.toString().padLeft(2, '0');
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

  Future<void> updateProfile({
    required String name,
    required int phoneNumber,
    String? profileImageBase64,
  }) async {
    try {
      final token = sessionController.token.value;
      if (token.isEmpty) {
        Get.snackbar('Error', 'Token not found');
        return;
      }

      final response = await _profileRepository.updateDriverProfile(
        token,
        name: name,
        phoneNumber: phoneNumber,
        profileImageBase64: profileImageBase64,
      );

      if (response['error'] == false) {
        showStatusBanner(
          'Profile updated successfully',
          Colors.green,
          Icons.check_circle,
        );
        await fetchProfile(
          showLoading: false,
        ); // Refresh after update without full loading screen
      } else {
        showStatusBanner(
          response['message'] ?? 'Update failed',
          Colors.redAccent,
          Icons.error_outline,
        );
      }
    } catch (e) {
      showStatusBanner(
        'Something went wrong during update',
        Colors.redAccent,
        Icons.error_outline,
      );
    }
  }

  Future<void> changepasswordcontroller({
    required String oldpassword,
    required String newpassword,
  }) async {
    try {
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
        oldpassword,
        newpassword,
      );

      if (!response.error) {
        showStatusBanner(
          'Password changed successfully',
          Colors.green,
          Icons.check_circle,
        );
      } else {
        showStatusBanner(
          response.message,
          Colors.redAccent,
          Icons.error_outline,
        );
      }
    } on exceptions.HttpException catch (e) {
      showStatusBanner(e.message, Colors.redAccent, Icons.error_outline);
    } catch (e) {
      showStatusBanner(
        'Something went wrong during password change',
        Colors.redAccent,
        Icons.error_outline,
      );
    }
  }
}

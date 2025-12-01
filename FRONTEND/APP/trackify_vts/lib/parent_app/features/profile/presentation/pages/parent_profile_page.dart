import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:panara_dialogs/panara_dialogs.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../domain/models/parent_profile_model.dart';
import '../controllers/parent_profile_controller.dart';
import 'detail_pages/parent_profile_personal_details_page.dart';
import 'detail_pages/parent_profile_vehicle_details_page.dart';
import 'detail_pages/parent_profile_operator_details_page.dart';
import 'detail_pages/parent_profile_edit_page.dart';
import 'detail_pages/parent_profile_change_password_page.dart';

String _getInitials(String name) {
  final parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  } else if (parts.isNotEmpty) {
    return parts[0][0].toUpperCase();
  }
  return '';
}

class ParentProfilePage extends GetView<ParentProfileController> {
  const ParentProfilePage({super.key});

  @override
  String get tag => 'parent_profile';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    return Obx(() {
      print(
        'Building ParentProfilePage, isLoading: ${controller.isLoading.value}, data: ${controller.profileData.value?.name}',
      );
      if (controller.isLoading.value) {
        return const Scaffold(
          backgroundColor: Color(0xFFF8F8F8),
          body: Center(child: CircularProgressIndicator()),
        );
      }
      final data = controller.profileData.value;
      if (data == null) {
        return const Scaffold(
          backgroundColor: Color(0xFFF8F8F8),
          body: Center(child: Text('No profile data available')),
        );
      }
      return Scaffold(
        backgroundColor: const Color(0xFFF8F8F8),
        body: SingleChildScrollView(
          child: Column(
            children: [
              _buildTopHeader(context, data, primaryColor),
              _buildContentLabel(),
              _buildSettingsList(context, data),
            ],
          ),
        ),
        floatingActionButton:
            data.sosContact != null
                ? FloatingActionButton(
                  onPressed:
                      () => _showSOSDialog(
                        context,
                        data.sosContact!,
                        primaryColor,
                      ),
                  backgroundColor: Colors.blue,
                  child: Image.asset(
                    'assets/icons/support.png',
                    width: 26,
                    height: 26,
                    fit: BoxFit.contain,
                    color:
                        Colors
                            .white, // remove this line if image already has color
                  ),
                )
                : null,
      );
    });
  }

  Widget _buildTopHeader(
    BuildContext context,
    ParentProfileData data,
    Color primaryColor,
  ) {
    return Container(
      height: 280,
      decoration: BoxDecoration(
        color: primaryColor,
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(30),
          bottomRight: Radius.circular(30),
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            top: 50,
            left: 20,
            child: CircleAvatar(
              backgroundColor: Colors.white,
              child: IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.black),
                onPressed: () => Get.back(),
              ),
            ),
          ),
          Positioned(
            top: 50,
            right: 20,
            child: CircleAvatar(
              backgroundColor: Colors.white,
              child: IconButton(
                icon: const Icon(Icons.logout, color: Colors.black),
                onPressed: () => controller.confirmLogout(context),
              ),
            ),
          ),
          Positioned(
            top: 80,
            left: 0,
            right: 0,
            child: Center(
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 50,
                    backgroundColor: Colors.white,
                    child: Text(
                      _getInitials(data.name),
                      style: TextStyle(
                        color: primaryColor,
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    data.name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    data.email,
                    style: const TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContentLabel() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          'Profile Information',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: Colors.grey[700],
          ),
        ),
      ),
    );
  }

  Widget _buildSettingsList(BuildContext context, ParentProfileData data) {
    return Column(
      children: [
        _buildSettingItem(
          context,
          Icon(Icons.person, color: Theme.of(context).colorScheme.primary),
          'Personal Details',
          'Name, email, and phone',
          'personal',
        ),

        _buildSettingItem(
          context,
          Icon(Icons.edit, color: Theme.of(context).colorScheme.primary),
          'Edit Profile',
          'Update your details here',
          'edit',
        ),
        _buildSettingItem(
          context,
          Icon(Icons.lock, color: Theme.of(context).colorScheme.primary),
          'Change Password',
          'Update your  password',
          'password',
        ),

        if (data.vehicleDetails != null)
          _buildSettingItem(
            context,
            Image.asset(
              'assets/icons/bus.png',
              width: 24,
              height: 24,
              fit: BoxFit.contain,
              color: Theme.of(context).colorScheme.primary,
            ),
            'Vehicle Information',
            data.vehicleDetails!.vehicleNumber,
            'vehicle',
          ),
        if (data.operatorDetails != null)
          _buildSettingItem(
            context,
            Icon(Icons.business, color: Theme.of(context).colorScheme.primary),
            'Operator Details',
            data.operatorDetails!.name,
            'operator',
          ),

      ],
    );
  }

  Widget _buildSettingItem(
    BuildContext context,
    Widget iconWidget,
    String title,
    String subtitle,
    String section,
  ) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _navigateToDetailPage(context, section),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.withOpacity(0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(
                      context,
                    ).colorScheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: iconWidget,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.arrow_forward_ios,
                  size: 18,
                  color: Colors.grey[400],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _navigateToDetailPage(BuildContext context, String section) {
    final data = controller.profileData.value;
    if (data == null) return;

    switch (section) {
      case 'personal':
        Get.to(
          () => ParentProfilePersonalDetailsPage(data: data),
          transition: Transition.rightToLeft,
          duration: const Duration(milliseconds: 350),
        );
        break;

      case 'vehicle':
        if (data.vehicleDetails != null) {
          Get.to(
            () => ParentProfileVehicleDetailsPage(data: data),
            transition: Transition.rightToLeft,
            duration: const Duration(milliseconds: 350),
          );
        }
        break;

      case 'operator':
        if (data.operatorDetails != null) {
          Get.to(
            () => ParentProfileOperatorDetailsPage(data: data),
            transition: Transition.rightToLeft,
            duration: const Duration(milliseconds: 350),
          );
        }
        break;

      case 'edit':
        Get.to(
          () => ParentProfileEditPage(data: data),
          transition: Transition.rightToLeft,
          duration: const Duration(milliseconds: 350),
        );
        break;

      case 'password':
        Get.to(
          () => const ParentProfileChangePasswordPage(),
          transition: Transition.rightToLeft,
          duration: const Duration(milliseconds: 350),
        );
        break;
    }
  }


  void _showSOSDialog(
    BuildContext context,
    SOSContact sosContact,
    Color primaryColor,
  ) {
    PanaraConfirmDialog.show(
      context,
      title: 'Emergency Contact',
      message: '${sosContact.name}\n${sosContact.phoneNumber}',
      confirmButtonText: 'Call',
      cancelButtonText: 'Close',
      panaraDialogType: PanaraDialogType.custom,
      color: Colors.red,

      onTapCancel: () {
        Get.back(); // Close dialog
      },

      onTapConfirm: () async {
        Get.back(); // Close dialog

        final String phone = "+91 987654321";
        final Uri uri = Uri(scheme: 'tel', path: phone);

        print("Testing TEL URL...");
        print("URI = $uri");

        try {
          final bool launched = await launchUrl(
            uri,
            mode: LaunchMode.externalApplication,
          );

          print("launchUrl result = $launched");

          if (!launched) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Dialer unavailable on this device.'),
              ),
            );
          }
        } catch (e) {
          print("ERROR: $e");
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Unable to open dialer. Phone: $phone')),
          );
        }
      },
    );
  }
}

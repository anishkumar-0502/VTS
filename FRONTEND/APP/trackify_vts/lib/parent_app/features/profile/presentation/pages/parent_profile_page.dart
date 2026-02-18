import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../domain/models/parent_profile_model.dart';
import '../controllers/parent_profile_controller.dart';
import 'detail_pages/parent_profile_personal_details_page.dart';
import 'detail_pages/parent_profile_vehicle_details_page.dart';
import 'detail_pages/parent_profile_operator_details_page.dart';
import 'detail_pages/parent_profile_edit_page.dart';
import 'detail_pages/parent_profile_change_password_page.dart';
import 'detail_pages/parent_profile_emergency_contact_page.dart';
import '../../../../shared/index.dart';
import 'package:trackify_vts/shared/widgets/modern_dialog.dart';
import '../../../live-tracking/presentation/pages/live_tracking_children_page.dart';

String _getInitials(String name) {
  final parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  } else if (parts.isNotEmpty) {
    return parts[0][0].toUpperCase();
  }
  return '';
}

class WaveClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    var path = Path();
    path.lineTo(0, size.height - 50);
    path.quadraticBezierTo(
        size.width / 2, size.height, size.width, size.height - 50);
    path.lineTo(size.width, 0);
    path.close();
    return path;
  }

  @override
  bool shouldReclip(CustomClipper<Path> oldClipper) => false;
}

class ParentProfilePage extends GetView<ParentProfileController> {
  const ParentProfilePage({super.key});

  @override
  String get tag => 'parent_profile';

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF2764FF);
    
    return Obx(() {
      debugPrint(
        'Building ParentProfilePage, isLoading: ${controller.isLoading.value}, data: ${controller.profileData.value?.name}',
      );
      if (controller.isLoading.value) {
        return const Scaffold(
          backgroundColor: Colors.white,
          body: ProfilePageSkeleton(),
        );
      }
      final data = controller.profileData.value;
      if (data == null) {
        return const Scaffold(
          backgroundColor: Colors.white,
          body: Center(child: Text('No profile data available')),
        );
      }
      return Scaffold(
        backgroundColor: Colors.white,
        body: SingleChildScrollView(
          child: Column(
            children: [
              _buildProfileCardWithWave(context, data),
              SizedBox(height: 15,),
              _buildMenuItems(context, data),
            ],
          ),
        ),
        floatingActionButton:
            data.sosContact != null
                ? GestureDetector(
                  onTap: () => _showSOSDialog(
                    context,
                    data.sosContact!,
                    primaryColor,
                  ),
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.15),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Image.asset(
                      'assets/icons/support.png',
                      width: 24,
                      height: 24,
                      color: Colors.red[800],
                    ),
                  ),
                )
                : null,
      );
    });
  }

  Widget _buildProfileCardWithWave(
    BuildContext context,
    ParentProfileData data,
  ) {
    const primaryColor = Color(0xFF2764FF);
    const accentColor = Color(0xFF1E4FB4);
    
    return SizedBox(
      height: 300,
      child: Stack(
        children: [
          ClipPath(
            clipper: WaveClipper(),
            child: Container(
              height: 200,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [primaryColor, accentColor],
                ),
              ),
            ),
          ),
          Positioned(
            top: 40,
            left: 12,
            child: CircleAvatar(
              backgroundColor: Colors.white.withValues(alpha: 0.2),
              radius: 20,
              child: IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white),
                iconSize: 20,
                onPressed: () => Get.back(),
              ),
            ),
          ),
          Positioned(
            top: 130,
            left: 0,
            right: 0,
            child: Center(
              child: Column(
                children: [
                  Stack(
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 4),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 16,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: CircleAvatar(
                          radius: 50,
                          backgroundColor: Colors.white,
                          child: Text(
                            _getInitials(data.name),
                            style: const TextStyle(
                              color: primaryColor,
                              fontSize: 36,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: GestureDetector(
                          onTap: () => _navigateToDetailPage(context, 'edit', data),
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: primaryColor,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.2),
                                  blurRadius: 6,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.edit,
                              size: 16,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    data.name,
                    style: const TextStyle(
                      color: Colors.black87,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      fontFamily: 'Poppins',
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    data.email,
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      fontFamily: 'Poppins',
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItems(BuildContext context, ParentProfileData data) {
    return Column(
      children: [
        _buildMenuItem(
          context,
          Icons.person_outline,
          'My Profile',
          'personal',
          data,
        ),
        _buildMenuDivider(),
        _buildMenuItem(
          context,
          Icons.lock_outline,
          'Change Password',
          'password',
          data,
        ),
        _buildMenuDivider(),

        if (data.vehicleDetails != null) ...[
          _buildMenuDivider(),
          _buildMenuItem(
            context,
            Icons.directions_bus_outlined,
            'Vehicle Information',
            'vehicle',
            data,
          ),
        ],
        if (data.operatorDetails != null) ...[
          _buildMenuDivider(),
          _buildMenuItem(
            context,
            Icons.business_outlined,
            'Operator Details',
            'operator',
            data,
          ),
        ],
        _buildMenuDivider(),
        _buildMenuDivider(),
        _buildLogoutButton(context),
      ],
    );
  }

  Widget _buildMenuItem(
    BuildContext context,
    IconData icon,
    String title,
    String section,
    ParentProfileData data,
  ) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _navigateToDetailPage(context, section, data),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          child: Row(
            children: [
              Icon(
                icon,
                size: 22,
                color: Colors.grey[600],
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: Colors.black87,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMenuDivider() {
    return Divider(
      height: 1,
      color: Colors.grey[200],
      indent: 20,
      endIndent: 20,
    );
  }

  Widget _buildLogoutButton(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => controller.confirmLogout(context),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Row(
            children: [
              Icon(
                Icons.power_settings_new,
                size: 22,
                color: Colors.red[600],
              ),
              const SizedBox(width: 20),
              Text(
                'Logout',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Colors.red[600],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }


  void _navigateToDetailPage(
    BuildContext context,
    String section,
    ParentProfileData data,
  ) {
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

      case 'sos':
        if (data.sosContact != null) {
          Get.to(
            () => ParentProfileEmergencyContactPage(data: data),
            transition: Transition.rightToLeft,
            duration: const Duration(milliseconds: 350),
          );
        }
        break;

      case 'track_child':
        Get.to(
          () => LiveTrackingChildrenPage(),
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
    // Use Future.delayed to ensure the dialog is shown after the current frame
    // This prevents the '!_debugLocked' assertion error during gesture handling
    Future.delayed(Duration.zero, () {
      if (!context.mounted) return;

      showDialog(
        context: context,
        builder: (BuildContext context) {
          return ModernDialog(
            title: 'Emergency SOS',
            icon: Icons.emergency_rounded,
            iconColor: Colors.red[700]!,
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(height: 8),
                Text(
                  'You are about to call your emergency contact',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: Colors.red.withValues(alpha: 0.2),
                      width: 1.5,
                    ),
                  ),
                  child: Column(
                    children: [
                      Text(
                        sosContact.name,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [

                          Text(
                            sosContact.phoneNumber.toString(),
                            style: TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w700,
                              color: Colors.red[700],
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],
            ),
            actions: [
              ModernDialogButton(
                label: 'Call Now',
                icon: Icons.call,
                backgroundColor: Colors.red[600]!,
                onPressed: () async {
                  Get.back();
                  final String phone = sosContact.phoneNumber.toString();
                  final Uri uri = Uri(scheme: 'tel', path: phone);

                  try {
                    final bool launched = await launchUrl(
                      uri,
                      mode: LaunchMode.externalApplication,
                    );

                    if (!launched) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Dialer unavailable on this device.'),
                          ),
                        );
                      }
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Unable to open dialer. Phone: $phone')),
                      );
                    }
                  }
                },
              ),
              ModernDialogButton(
                label: 'Cancel',
                isOutlined: true,
                backgroundColor: Colors.grey[600]!,
                onPressed: () => Navigator.pop(context),
              ),
            ],
          );
        },
      );
    });
  }
}

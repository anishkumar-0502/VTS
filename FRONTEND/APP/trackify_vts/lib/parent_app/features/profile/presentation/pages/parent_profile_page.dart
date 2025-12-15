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
    final path = Path();
    path.lineTo(0, size.height - 60);
    path.quadraticBezierTo(
      size.width * 0.25,
      size.height,
      size.width * 0.5,
      size.height - 40,
    );
    path.quadraticBezierTo(
      size.width * 0.75,
      size.height - 80,
      size.width,
      size.height - 40,
    );
    path.lineTo(size.width, 0);
    path.close();
    return path;
  }

  @override
  bool shouldReclip(WaveClipper oldClipper) => false;
}

class ParentProfilePage extends GetView<ParentProfileController> {
  const ParentProfilePage({super.key});

  @override
  String get tag => 'parent_profile';

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF2764FF);
    
    return Obx(() {
      print(
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
    
    return Stack(
      children: [
        Container(
          color: Colors.white,
          height: 340,
        ),
        ClipPath(
          clipper: WaveClipper(),
          child: Container(
            height: 340,
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
            backgroundColor: Colors.white.withValues(alpha: 0.9),
            radius: 20,
            child: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.black87),
              iconSize: 20,
              onPressed: () => Get.back(),
            ),
          ),
        ),
        Positioned(
          top: 70,
          left: 0,
          right: 0,
          child: Center(
            child: Column(
              children: [
                Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.2),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: CircleAvatar(
                    radius: 48,
                    backgroundColor: Colors.white,
                    child: Text(
                      _getInitials(data.name),
                      style: const TextStyle(
                        color: primaryColor,
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  data.name,
                  style: const TextStyle(
                    color: Colors.black87,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 4),
                Text(
                  data.email,
                  style: const TextStyle(
                    color: Color.fromARGB(255, 236, 234, 234),
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ],
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
          Icons.edit_outlined,
          'Edit Profile',
          'edit',
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
        _buildMenuItem(
          context,
          Icons.phone_outlined,
          'Emergency Contact',
          'sos',
          data,
        ),
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
        _buildMenuItem(
          context,
          Icons.location_on_outlined,
          'Track Child Location',
          'track_child',
          data,
        ),
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
          () => const LiveTrackingChildrenPage(),
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
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return ModernDialog(
          title: 'Emergency Contact',
          assetIcon: 'assets/icons/support.png',
          iconColor: Colors.red[800]!,
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DialogContentRow(
                label: 'Contact Name',
                value: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    const Icon(Icons.person, color: Colors.red, size: 16),
                    const SizedBox(width: 6),
                    Text(
                      sosContact.name,
                      style: const TextStyle(
                        color: Colors.red,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
                isHighlighted: false,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              const SizedBox(height: 8),
              DialogContentRow(
                label: 'Phone Number',
                value: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    const Icon(Icons.phone, color: Colors.red, size: 16),
                    const SizedBox(width: 6),
                    Text(
                      sosContact.phoneNumber.toString(),
                      style: const TextStyle(
                        color: Colors.red,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
                isHighlighted: false,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
            ],
          ),
          actions: [
            ModernDialogButton(
              label: 'Call',
              icon: Icons.call,
              backgroundColor: Colors.red,
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
              label: 'Close',
              icon: Icons.close,
              backgroundColor: Colors.grey[600]!,
              onPressed: () => Navigator.pop(context),
            ),
          ],
        );
      },
    );
  }
}

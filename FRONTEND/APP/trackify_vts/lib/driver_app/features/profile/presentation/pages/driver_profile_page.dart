import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../domain/models/profile_model.dart';
import '../controllers/driver_profile_controller.dart';
import 'personal_details_page.dart';
import 'associated_operators_page.dart';
import 'assigned_vehicle_page.dart';
import 'driver_profile_details_page.dart';
import 'dart:convert';
import 'package:image_picker/image_picker.dart';
import '../../../../../utilities/widgets/status_banner.dart';

String _formatDateTime(DateTime date) {
  final day = date.day.toString().padLeft(2, '0');
  final month = date.month.toString().padLeft(2, '0');
  final year = date.year.toString();
  final hour =
      date.hour > 12 ? date.hour - 12 : (date.hour == 0 ? 12 : date.hour);
  final minute = date.minute.toString().padLeft(2, '0');
  final period = date.hour >= 12 ? 'PM' : 'AM';
  return '$day-$month-$year $hour:$minute $period';
}

String _getInitials(String name) {
  final parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  } else if (parts.isNotEmpty) {
    return parts[0][0].toUpperCase();
  }
  return '';
}

class DriverProfilePage extends GetView<DriverProfileController> {
  const DriverProfilePage({super.key});

  @override
  String? get tag => 'driver_profile';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    return Obx(() {
      print(
        'Building DriverProfilePage, isLoading: ${controller.isLoading.value}, data: ${controller.profileData.value?.name}',
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
              _buildCommonCard(context, data, primaryColor),
              _buildContentLabel(),
              _buildSettingsList(context, data),
            ],
          ),
        ),
      );
    });
  }

  Widget _buildTopHeader(
    BuildContext context,
    ProfileData data,
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
          // Back Button
          Positioned(
            top: 50,
            left: 20,
            child: CircleAvatar(
              backgroundColor: Colors.white,
              child: IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.black),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
          ),

          // Edit Button
          Positioned(
            top: 50,
            right: 20,
            child: CircleAvatar(
              backgroundColor: Colors.white,
              child: IconButton(
                icon: const Icon(Icons.edit, color: Colors.black),
                onPressed: () {
                  final data = controller.profileData.value;
                  if (data == null) return;

                  final nameController = TextEditingController(text: data.name);
                  final phoneController = TextEditingController(
                    text: data.phoneNumber.toString(),
                  );

                  String? imageBase64;
                  bool hasChanged = false;

                  bool _hasAnyChange() {
                    return nameController.text.trim() != data.name ||
                        phoneController.text != data.phoneNumber.toString() ||
                        imageBase64 != null;
                  }

                  showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    backgroundColor: Colors.transparent,
                    builder: (context) {
                      return StatefulBuilder(
                        builder: (context, setState) {
                          return Container(
                            padding: const EdgeInsets.all(16),
                            margin: EdgeInsets.only(
                              bottom: MediaQuery.of(context).viewInsets.bottom,
                            ),
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.vertical(
                                top: Radius.circular(20),
                              ),
                            ),
                            child: SingleChildScrollView(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Text(
                                    "Edit Profile",
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  // GestureDetector(
                                  //   onTap: () async {
                                  //     try {
                                  //       final picked = await ImagePicker()
                                  //           .pickImage(
                                  //             source: ImageSource.gallery,
                                  //           );
                                  //       if (picked != null) {
                                  //         final bytes =
                                  //             await picked.readAsBytes();
                                  //         imageBase64 = base64Encode(bytes);
                                  //         setState(
                                  //           () => hasChanged = _hasAnyChange(),
                                  //         );
                                  //       }
                                  //     } catch (e) {
                                  //       showStatusBanner(
                                  //         'Failed to pick image',
                                  //         Colors.redAccent,
                                  //         Icons.error_outline,
                                  //       );
                                  //     }
                                  //   },
                                  //   child: CircleAvatar(
                                  //     radius: 40,
                                  //     backgroundColor: Colors.grey[300],
                                  //     backgroundImage:
                                  //         imageBase64 != null
                                  //             ? MemoryImage(
                                  //               base64Decode(imageBase64!),
                                  //             )
                                  //             : null,
                                  //     child:
                                  //         imageBase64 == null
                                  //             ? const Icon(
                                  //               Icons.camera_alt,
                                  //               color: Colors.black54,
                                  //             )
                                  //             : null,
                                  //   ),
                                  // ),
                                  // const SizedBox(height: 12),
                                  TextField(
                                    controller: nameController,
                                    onChanged:
                                        (value) => setState(
                                          () => hasChanged = _hasAnyChange(),
                                        ),
                                    autofillHints: const [AutofillHints.name],
                                    enableSuggestions: false,
                                    enableInteractiveSelection: false,
                                    decoration: const InputDecoration(
                                      labelText: 'Name',
                                      border: OutlineInputBorder(),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  TextField(
                                    controller: phoneController,
                                    onChanged:
                                        (value) => setState(
                                          () => hasChanged = _hasAnyChange(),
                                        ),
                                    keyboardType: TextInputType.phone,
                                    autofillHints: const [
                                      AutofillHints.telephoneNumber,
                                    ],
                                    enableSuggestions: false,
                                    enableInteractiveSelection: false,
                                    maxLength: 10,
                                    decoration: const InputDecoration(
                                      labelText: 'Phone Number',
                                      border: OutlineInputBorder(),
                                    ),
                                  ),
                                  const SizedBox(height: 20),
                                  ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor:
                                          hasChanged
                                              ? Colors.green
                                              : Colors.grey,
                                      minimumSize: const Size(
                                        double.infinity,
                                        45,
                                      ),
                                    ),
                                    onPressed:
                                        hasChanged
                                            ? () {
                                              final name =
                                                  nameController.text.trim();
                                              final phone =
                                                  int.tryParse(
                                                    phoneController.text,
                                                  ) ??
                                                  0;
                                              controller.updateProfile(
                                                name: name,
                                                phoneNumber: phone,
                                                profileImageBase64: imageBase64,
                                              );
                                              Navigator.of(context).pop();
                                            }
                                            : null,
                                    child: const Text(
                                      'Save Changes',
                                      style: TextStyle(color: Colors.white),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      );
                    },
                  );
                },
              ),
            ),
          ),

          // Profile Info
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircleAvatar(
                  radius: 50,
                  backgroundColor: Colors.white,
                  child: CircleAvatar(
                    radius: 46,
                    backgroundColor: Colors.grey[300],
                    child: Text(
                      _getInitials(data.name),
                      style: const TextStyle(
                        fontSize: 40,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  data.name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  data.email,
                  style: const TextStyle(color: Colors.white70, fontSize: 14),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCommonCard(
    BuildContext context,
    ProfileData data,
    Color primaryColor,
  ) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // _buildInfoRow('Role', data.roleName),
          const SizedBox(height: 12),
          _buildInfoRow('License Number', data.licenseNumber),
          const SizedBox(height: 12),
          _buildInfoRow('Phone', data.phoneNumber.toString()),
          const SizedBox(height: 12),
          _buildInfoRow(
            'Status',
            data.status ? 'Active' : 'Inactive',
            valueColor: data.status ? Colors.green : Colors.red,
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 14, color: Colors.grey)),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: valueColor ?? Colors.black,
          ),
        ),
      ],
    );
  }

  Widget _buildContentLabel() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      alignment: Alignment.centerLeft,
      child: const Text(
        'CONTENT',
        style: TextStyle(
          color: Colors.grey,
          fontSize: 12,
          fontWeight: FontWeight.bold,
          letterSpacing: 1,
        ),
      ),
    );
  }

  void _showChangePasswordDialog(BuildContext context) {
    final oldPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final primaryColor = Theme.of(context).colorScheme.primary;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            left: 16,
            right: 16,
            top: 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Change Password',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: oldPasswordController,
                obscureText: true,
                autofillHints: const [AutofillHints.password],
                enableSuggestions: false,
                decoration: const InputDecoration(
                  labelText: 'Old Password',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: newPasswordController,
                obscureText: true,
                autofillHints: const [AutofillHints.newPassword],
                enableSuggestions: false,
                decoration: const InputDecoration(
                  labelText: 'New Password',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.grey),
                      ),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                      ),
                      onPressed: () async {
                        final oldPassword = oldPasswordController.text.trim();
                        final newPassword = newPasswordController.text.trim();

                        final passwordRegex = RegExp(
                          r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,15}$',
                        );

                        if (!passwordRegex.hasMatch(newPassword)) {
                          showStatusBanner(
                            'Password must include 1 capital, 1 small, 1 number, 1 special character (8–15 chars)',
                            Colors.redAccent,
                            Icons.error_outline,
                          );
                          return;
                        }

                        await controller.changepasswordcontroller(
                          oldpassword: oldPassword,
                          newpassword: newPassword,
                        );

                        Navigator.of(context).pop();
                      },
                      child: Text(
                        'Change Password',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize:
                              MediaQuery.of(context).size.width *
                              0.03, // responsive font size
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSettingsList(BuildContext context, ProfileData data) {
    final settings = [
      {'icon': Icons.person, 'title': 'Personal'},
      {'icon': Icons.lock, 'title': 'Change Password'},
      {'icon': Icons.business, 'title': 'Associated Operators'},
      {'icon': Icons.directions_bus, 'title': 'Assigned Vehicle'},
      // {'icon': Icons.badge, 'title': 'Driver Profile'},
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: List.generate(settings.length, (index) {
          final setting = settings[index];
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 1),
                ),
              ],
            ),
            child: ListTile(
              leading: Icon(
                setting['icon'] as IconData,
                color: Colors.grey[600],
              ),
              title: Text(
                setting['title'] as String,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
              trailing: const Icon(Icons.chevron_right, color: Colors.grey),
              onTap: () {
                switch (index) {
                  case 0:
                    Get.to(() => PersonalDetailsPage(data: data),transition: Transition.rightToLeft,   // Slide animation
                      duration: const Duration(milliseconds: 350),  // Smooth speed
                      curve: Curves.easeInOut, );
                    break;
                  case 1:
                    _showChangePasswordDialog(context);
                    break;
                  case 2:
                    Get.to(
                      () => AssociatedOperatorsPage(
                        operators: data.associatedOperators,

                      ),
                      transition: Transition.leftToRight,   // Slide animation
                      duration: const Duration(milliseconds: 350),  // Smooth speed
                      curve: Curves.easeInOut,
                    );
                    break;
                  case 3:
                    Get.to(
                      () => AssignedVehiclePage(vehicle: data.assignedVehicle),
                      transition: Transition.rightToLeft,   // Slide animation
                      duration: const Duration(milliseconds: 350),  // Smooth speed
                      curve: Curves.easeInOut,
                    );
                    break;
                  case 4:
                    if (data.driverProfile != null) {
                      Get.to(
                        () => DriverProfileDetailsPage(
                          driverProfile: data.driverProfile!,
                        ),
                      );
                    } else {
                      showStatusBanner(
                        'Driver profile not available',
                        Colors.redAccent,
                        Icons.error_outline,
                      );
                    }
                    break;
                }
              },
            ),
          );
        }),
      ),
    );
  }
}

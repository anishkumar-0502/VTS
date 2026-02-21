import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:panara_dialogs/panara_dialogs.dart';
import '../../domain/models/profile_model.dart';
import '../controllers/driver_profile_controller.dart';
import 'personal_details_page.dart';
import 'associated_operators_page.dart';
import 'assigned_vehicle_page.dart';
import 'driver_profile_details_page.dart';
import '../../../../../utilities/widgets/status_banner.dart';

String _getInitials(String name) {
  final parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  } else if (parts.isNotEmpty) {
    return parts[0][0].toUpperCase();
  }
  return '';
}

class DriverProfilePage extends StatefulWidget {
  const DriverProfilePage({super.key});

  @override
  State<DriverProfilePage> createState() => _DriverProfilePageState();
}

class _DriverProfilePageState extends State<DriverProfilePage> {
  late final DriverProfileController controller;
  bool _hasInitialized = false;

  @override
  void initState() {
    super.initState();
    controller = Get.find<DriverProfileController>(tag: 'driver_profile');
    _hasInitialized = false;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_hasInitialized && mounted) {
        debugPrint('[DriverProfile] 🔄 Page loaded - fetching fresh profile data from API...');
        _hasInitialized = true;
        controller.fetchProfile(showLoading: false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    
    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) {
          debugPrint('[DriverProfile] 📲 Page popped');
        }
      },
      child: Obx(() {
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
          floatingActionButton: FloatingActionButton(
            heroTag: 'profile_refresh',
            onPressed: () => controller.fetchProfile(showLoading: true),
            tooltip: 'Refresh Profile',
            child: const Icon(Icons.refresh),
          ),
        );
      }),
    );
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

                  String imageBase64 = '';
                  bool hasChanged = false;
                  String? phoneError;

                  bool _hasAnyChange() {
                    return nameController.text.trim() != data.name ||
                        phoneController.text != data.phoneNumber.toString() ||
                        imageBase64.isNotEmpty;
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
                                    onChanged: (value) {
                                      setState(() {
                                        hasChanged = _hasAnyChange();
                                        if (value.isNotEmpty && value.length < 10) {
                                          phoneError = 'Phone number must be 10 digits';
                                        } else {
                                          phoneError = null;
                                        }
                                      });
                                    },
                                    keyboardType: TextInputType.phone,
                                    autofillHints: const [
                                      AutofillHints.telephoneNumber,
                                    ],
                                    enableSuggestions: false,
                                    enableInteractiveSelection: false,
                                    maxLength: 10,
                                    decoration: InputDecoration(
                                      labelText: 'Phone Number',
                                      border: const OutlineInputBorder(),
                                      errorText: phoneError,
                                    ),
                                  ),
                                  const SizedBox(height: 20),
                                  ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor:
                                          (hasChanged &&
                                                  phoneController.text.length ==
                                                      10)
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
                                              if (phoneController.text.length <
                                                  10) {
                                                setState(() {
                                                  phoneError =
                                                      'Phone number must be exactly 10 digits';
                                                });
                                                return;
                                              }
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
          if (data.licenseNumber.isNotEmpty) ...[
            _buildInfoRow('License Number', data.licenseNumber),
            const SizedBox(height: 12),
          ],
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
        bool isOldPasswordVisible = false;
        bool isNewPasswordVisible = false;

        return StatefulBuilder(
          builder: (context, setState) {
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
                    obscureText: !isOldPasswordVisible,
                    autofillHints: const [AutofillHints.password],
                    enableSuggestions: false,
                    decoration: InputDecoration(
                      labelText: 'Old Password',
                      border: const OutlineInputBorder(),
                      suffixIcon: IconButton(
                        icon: Icon(
                          isOldPasswordVisible
                              ? Icons.visibility
                              : Icons.visibility_off,
                        ),
                        onPressed: () {
                          setState(() {
                            isOldPasswordVisible = !isOldPasswordVisible;
                          });
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: newPasswordController,
                    obscureText: !isNewPasswordVisible,
                    autofillHints: const [AutofillHints.newPassword],
                    enableSuggestions: false,
                    decoration: InputDecoration(
                      labelText: 'New Password',
                      border: const OutlineInputBorder(),
                      suffixIcon: IconButton(
                        icon: Icon(
                          isNewPasswordVisible
                              ? Icons.visibility
                              : Icons.visibility_off,
                        ),
                        onPressed: () {
                          setState(() {
                            isNewPasswordVisible = !isNewPasswordVisible;
                          });
                        },
                      ),
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
        children: [
          ...List.generate(settings.length, (index) {
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
                      Get.to(
                        () => const PersonalDetailsPage(),
                        transition: Transition.rightToLeft,
                        duration: const Duration(milliseconds: 350),
                        curve: Curves.easeInOut,
                      );
                      break;
                    case 1:
                      _showChangePasswordDialog(context);
                      break;
                    case 2:
                      Get.to(
                        () => AssociatedOperatorsPage(
                          operators: data.associatedOperators,
                        ),
                        transition: Transition.leftToRight, // Slide animation
                        duration: const Duration(
                          milliseconds: 350,
                        ), // Smooth speed
                        curve: Curves.easeInOut,
                      );
                      break;
                    case 3:
                      Get.to(
                        () => AssignedVehiclePage(
                          vehicle: data.assignedVehicle,
                        ),
                        transition: Transition.rightToLeft, // Slide animation
                        duration: const Duration(
                          milliseconds: 350,
                        ), // Smooth speed
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
          const SizedBox(height: 5),
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.red.shade100),
            ),
            child: TextButton.icon(
              onPressed: () {
                PanaraConfirmDialog.show(
                  context,
                  title: "Logout",
                  message: "Are you sure you want to logout?",
                  confirmButtonText: "Logout",
                  cancelButtonText: "Cancel",
                  onTapConfirm: () {
                    Navigator.pop(context);
                    controller.logout();
                  },
                  onTapCancel: () {
                    Navigator.pop(context);
                  },
                  panaraDialogType: PanaraDialogType.error,
                  barrierDismissible: false,
                );
              },
              icon: Icon(Icons.logout, color: Colors.red.shade600),
              label: Text(
                'Logout',
                style: TextStyle(
                  color: Colors.red.shade600,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import '../../../domain/models/parent_profile_model.dart';
import '../../controllers/parent_profile_controller.dart';
import '../../../../../../utilities/widgets/app_text_field.dart';

class ParentProfileEditPage extends GetView<ParentProfileController> {
  final ParentProfileData data;
  final _formKey = GlobalKey<FormState>();

  ParentProfileEditPage({required this.data, super.key});

  @override
  String get tag => 'parent_profile';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;

    // Initialize controllers with initial data
    controller.initializeEditFields(data);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F8F8),
      appBar: AppBar(
        backgroundColor: primaryColor,
        iconTheme: const IconThemeData(
          color: Colors.white, // <-- Change leading icon color here
        ),
        title: const Text('Edit Profile',style: TextStyle(color: Colors.white),),
        centerTitle: true,
        elevation: 0,
      ),
      body: Obx(() {
        // Accessing profileData to ensure Obx re-renders when it changes
        final _ = controller.profileData.value;
        
        return SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [

                  Text(
                    'Full Name',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: Colors.grey[700],
                    ),
                  ),
                  const SizedBox(height: 8),
                  AppTextField(
                    controller: controller.nameController,
                    label: 'Enter your full name',
                    prefixIcon: Icon(Icons.person, color: primaryColor),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Name is required';
                      }
                      if (value.length < 2) {
                        return 'Name must be at least 2 characters';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Phone Number',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: Colors.grey[700],
                    ),
                  ),
                  const SizedBox(height: 8),
                  AppTextField(
                    controller: controller.phoneController,
                    label: 'Enter your phone number',
                    keyboardType: TextInputType.number,
                    prefixIcon: Icon(Icons.phone, color: primaryColor),
                    maxLength: 10,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],

                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Phone number is required';
                      }
                      if (value.length != 10) {
                        return 'Phone number must be exactly 10 digits';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 30),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: controller.isLoading.value || !controller.hasChanges
                          ? null
                          : () {
                        if (_formKey.currentState!.validate()) {
                          controller.updateProfile(
                            name: controller.nameController.text.trim(),
                            phoneNumber: int.parse(controller.phoneController.text.trim()),
                          );
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: controller.hasChanges ? primaryColor : Colors.grey,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: controller.isLoading.value
                          ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                          : const Text(
                        'Save Changes',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () => Get.back(),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        side: BorderSide(color: primaryColor),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: Text(
                        'Cancel',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: primaryColor,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }),
    );
  }
}

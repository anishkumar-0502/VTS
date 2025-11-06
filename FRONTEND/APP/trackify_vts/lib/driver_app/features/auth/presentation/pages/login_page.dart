import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../../utilities/widgets/app_text_field.dart';
import '../controllers/login_page_controller.dart';

class DriverLoginPage extends StatelessWidget {
  const DriverLoginPage({super.key});

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final Color primaryColor = Theme.of(context).colorScheme.primary;
    final DriverLoginPageController controller =
        Get.put(DriverLoginPageController(), tag: 'driver_login', permanent: false);

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding: EdgeInsets.symmetric(horizontal: size.width * 0.08),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: size.height * 0.05),
                    child: Form(
                      key: controller.formKey,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          SizedBox(
                            height: size.height * 0.2,
                            child: Image.asset('assets/logo/logo.png'),
                          ),
                          SizedBox(height: size.height * 0.03),
                          Text(
                            'Welcome Back Driver',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: size.width * 0.075,
                              fontWeight: FontWeight.w700,
                              color: Colors.black,
                            ),
                          ),
                          SizedBox(height: size.height * 0.015),
                          Text(
                            'Login with your credentials to continue.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: size.width * 0.04,
                              color: Colors.black54,
                            ),
                          ),
                          SizedBox(height: size.height * 0.05),
                          AppTextField(
                            controller: controller.emailController,
                            label: 'Email Address',
                            keyboardType: TextInputType.emailAddress,
                            textInputAction: TextInputAction.next,
                            validator: controller.validateEmail,
                            prefixIcon: const Icon(Icons.email_outlined, color: Colors.black54),
                          ),
                          SizedBox(height: size.height * 0.03),
                          Obx(() {
                            return AppTextField(
                              controller: controller.passwordController,
                              label: 'Password',
                              obscureText: controller.obscurePassword.value,
                              textInputAction: TextInputAction.done,
                              validator: controller.validatePassword,
                              prefixIcon: const Icon(Icons.lock_outline, color: Colors.black54),
                              suffixIcon: IconButton(
                                onPressed: () {
                                  controller.obscurePassword.toggle();
                                },
                                icon: Icon(
                                  controller.obscurePassword.value
                                      ? Icons.visibility_off_outlined
                                      : Icons.visibility_outlined,
                                  color: Colors.black54,
                                ),
                              ),
                            );
                          }),
                          SizedBox(height: size.height * 0.05),
                          SizedBox(
                            width: double.infinity,
                            child: Obx(() {
                              final loading = controller.isLoading.value;
                              return ElevatedButton(
                                onPressed: loading ? null : () => controller.submit(),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: primaryColor,
                                  foregroundColor: Colors.white,
                                  padding: EdgeInsets.symmetric(vertical: size.height * 0.02),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(size.width * 0.04),
                                  ),
                                ),
                                child: loading
                                    ? SizedBox(
                                        height: size.height * 0.028,
                                        width: size.height * 0.028,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2.6,
                                          valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                                        ),
                                      )
                                    : Text(
                                        'Login',
                                        style: TextStyle(
                                          fontSize: size.width * 0.045,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                              );
                            }),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

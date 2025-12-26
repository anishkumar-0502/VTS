import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:trackify_vts/core/Network/InternetStatusNotifier.dart';

import '../controllers/driver_dashboard_controller.dart';
import '../../../profile/presentation/controllers/driver_profile_controller.dart';
import '../../../scheduled_trips/presentation/pages/scheduled_trips_page.dart';
import 'driver_dashboard_page.dart';
import 'package:url_launcher/url_launcher.dart';


class DriverHomePage extends StatefulWidget {
  const DriverHomePage({super.key});

  @override
  State<DriverHomePage> createState() => _DriverHomePageState();
}

class _DriverHomePageState extends State<DriverHomePage> {
  late final DriverDashboardController controller;
  late final DriverProfileController profileController;

  @override
  void initState() {
    super.initState();
    controller = Get.put(DriverDashboardController(), tag: 'driver_dashboard');
    profileController = Get.put(
      DriverProfileController(),
      tag: 'driver_profile',
    );
  }

  @override
  Widget build(BuildContext context) {
    final Color primaryColor = Theme.of(context).colorScheme.primary;

    return LayoutBuilder(
      builder: (context, constraints) {
        final bool isWide = constraints.maxWidth >= 900;
        return Obx(() {
          final bool isOffline = controller.isOffline.value;
          final vehicleNumber = profileController.driverDetails['vehicleNumber'] ?? '';
          final hasVehicle =
              vehicleNumber.isNotEmpty && vehicleNumber.toLowerCase() != 'not assigned';
          final vehicleLabel = hasVehicle ? 'Bus :  $vehicleNumber' : 'Vehicle not assigned';

          final scaffoldBody = Column(
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                height: isOffline ? 44 : 0,
                width: double.infinity,
                color: Colors.orange.shade100,
                padding: EdgeInsets.symmetric(horizontal: isWide ? 32 : 16),
                alignment: Alignment.centerLeft,
                child: Row(
                  children: [
                    // Icon(
                    //   Icons.cloud_off,
                    //   color: Colors.orange.shade700,
                    //   size: 20,
                    // ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Offline mode enabled. Updates will sync when connected.',
                        style: TextStyle(
                          color: Colors.orange.shade700,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: controller.markSynced,
                      child: const Text('Sync now'),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Align(
                  alignment: Alignment.topCenter,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 1280),
                    child: DriverDashboardPage(),
                  ),
                ),
              ),
            ],
          );

          return Scaffold(
            appBar: AppBar(
              backgroundColor: Colors.white,
              elevation: 0,
              leading: Builder(
                builder:
                    (context) => IconButton(
                      icon: Image.asset(
                        'assets/icons/stack.png',
                        width: 30, // adjust size as needed
                        height: 30,
                      ),
                      onPressed: () => Scaffold.of(context).openDrawer(),
                    ),
              ),
              title: Column(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Trackify Driver',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: Colors.black,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    vehicleLabel,
                    style: TextStyle(
                      fontSize: 14,
                      color: hasVehicle ? Colors.black45 : Colors.black54,
                      fontWeight: hasVehicle ? FontWeight.w600 : FontWeight.w500,
                    ),
                  ),
                ],
              ),
                actions: [
                  IconButton(
                    onPressed: () async {
                      // Refresh all dashboard data
                      await controller.refreshAllData();
                    },
                    icon: Container(
                      padding: const EdgeInsets.all(8), // same padding as online/offline icon
                      decoration: BoxDecoration(
                        color: primaryColor.withOpacity(0.08),
                        shape: BoxShape.circle, // same circular shape
                      ),
                      child: Icon(
                        Icons.refresh,
                        color: primaryColor,
                        size: 20, // same size as wifi icon
                      ),
                    ),
                    tooltip: 'Refresh all data',
                  ),

                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: isWide ? 24 : 16),
                    child: ValueListenableBuilder<bool>(
                      valueListenable: InternetStatusNotifier.instance.isOnline,
                      builder: (context, isOnline, _) {
                        return Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: isOnline ? Colors.green.shade50 : Colors.red.shade50,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            isOnline ? Icons.wifi_tethering : Icons.wifi_off,
                            color: isOnline ? Colors.green.shade700 : Colors.red.shade700,
                            size: 20,
                          ),
                        );
                      },
                    ),
                  ),
                ]


            ),
            drawer: Drawer(
              backgroundColor: Colors.white,
              child: Column(
                children: [
                  // Logo and Title Section
                  Container(
                    padding: const EdgeInsets.only(
                      top: 50,
                      bottom: 20,
                      left: 20,
                      right: 20,
                    ),
                    child: Column(
                      children: [
                        // Logo: Light bulb with blue outline and green lightning
                        Container(
                          width: 60,
                          height: 60,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: const Color(0xFF2F80ED),
                              width: 3,
                            ),
                          ),
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              Icon(
                                Icons.lightbulb_outline,
                                color: const Color(0xFF2F80ED),
                                size: 30,
                              ),
                              Positioned(
                                bottom: 8,
                                child: Icon(
                                  Icons.flash_on,
                                  color: Colors.green,
                                  size: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                        // App Title
                        Column(
                          children: [
                            Text(
                              'Smart School',
                              style: TextStyle(
                                color: Colors.grey[800],
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              'D R I V E R',
                              style: TextStyle(
                                color: Colors.grey[400],
                                fontSize: 14,
                                letterSpacing: 2,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Menu Items
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      children: [
                        // Students List
                        // _buildMenuItem(
                        //   icon: Icons.group,
                        //   title: 'Students list',
                        //   subtitle: 'List of Students',
                        //   onTap: () {
                        //     Navigator.pop(context); // Close drawer
                        //     // Navigate to students page
                        //     Get.toNamed('/driver/students');
                        //   },
                        // ),

                        _buildMenuItem(
                          assetIcon: 'assets/icons/bus.png',
                          title: 'My Trips',
                          subtitle: 'Monitor Daily Trips',
                          onTap: () {
                            Navigator.pop(context);
                            Get.to(
                              () => const ScheduledTripsPage(),
                              transition: Transition.rightToLeft,
                              duration: const Duration(milliseconds: 400),
                            );
                          },
                        ),

                        _buildMenuItem(
                          assetIcon: 'assets/icons/clock.png',
                          title: 'Trips History',
                          subtitle: 'View Past Travel Records',
                          onTap: () {
                            Navigator.pop(context);
                            Get.to(
                              () => const DriverTripHistoryPage(),
                              transition: Transition.rightToLeft,
                              duration: const Duration(milliseconds: 400),
                            );
                          },
                        ),

                        // Contact School
                    _buildMenuItem(
                      icon: Icons.phone,
                      title: 'Contact Us',
                      subtitle: 'Call Management',
                      onTap: () async {
                        Navigator.pop(context);

                        const phoneNumber = '9876543210';
                        final Uri uri = Uri(scheme: 'tel', path: phoneNumber);

                        print("Testing TEL URL...");
                        print("URI = $uri");

                        try {
                          // Force Android to open the dialer externally
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
                            SnackBar(
                              content: Text('Unable to open dialer. Phone: $phoneNumber'),
                            ),
                          );
                        }
                      },
                    ),




                    // Logout
                        _buildMenuItem(
                          icon: Icons.power_settings_new,
                          title: 'Logout',
                          subtitle: 'Sign out from App',
                          onTap: () {
                            Navigator.pop(context); // Close drawer
                            profileController.confirmLogout(context);
                          },
                        ),
                      ],
                    ),
                  ),

                  // Bottom Image
                  Container(
                    padding: const EdgeInsets.all(20),
                    child: Image.asset(
                      'assets/images/schoolside.png',
                      fit: BoxFit.fill,
                    ),
                  ),
                ],
              ),
            ),
            body: scaffoldBody,
          );
        });
      },
    );
  }

  Widget _buildMenuItem({
    IconData? icon, // optional (for Material Icons)
    String? assetIcon, // optional (for asset icons)
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: Colors.transparent,
        ),
        child: Row(
          children: [
            // ✅ If assetIcon is given, use Image.asset, else fallback to Icon
            assetIcon != null
                ? Image.asset(
                  assetIcon,
                  height: 24,
                  width: 24,
                  color: const Color(0xFF2F80ED), // optional tint
                )
                : Icon(icon, color: const Color(0xFF2F80ED), size: 24),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.black,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: Colors.grey[400], size: 20),
          ],
        ),
      ),
    );
  }

  void _showLanguageDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Select Language'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                title: const Text('English'),
                onTap: () {
                  Navigator.pop(context);
                  // Implement language change logic
                },
              ),
              ListTile(
                title: const Text('Spanish'),
                onTap: () {
                  Navigator.pop(context);
                  // Implement language change logic
                },
              ),
              ListTile(
                title: const Text('French'),
                onTap: () {
                  Navigator.pop(context);
                  // Implement language change logic
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
          ],
        );
      },
    );
  }


}

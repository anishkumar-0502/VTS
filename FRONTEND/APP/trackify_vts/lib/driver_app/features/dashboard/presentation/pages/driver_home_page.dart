import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../controllers/driver_dashboard_controller.dart';
import '../../../trips/presentation/controllers/driver_trips_controller.dart';
import '../../../trips/presentation/pages/driver_trips_page.dart';
import '../../../live_tracking/presentation/controllers/driver_live_tracking_controller.dart';
import '../../../live_tracking/presentation/pages/driver_live_tracking_page.dart';
import '../../../profile/presentation/controllers/driver_profile_controller.dart';
import '../../../profile/presentation/pages/driver_profile_page.dart';
import 'driver_dashboard_page.dart';

class DriverHomePage extends StatefulWidget {
  const DriverHomePage({super.key});

  @override
  State<DriverHomePage> createState() => _DriverHomePageState();
}

class _DriverHomePageState extends State<DriverHomePage> {
  late final DriverDashboardController controller;
  late final List<_DriverNavItem> navItems;

  @override
  void initState() {
    super.initState();
    controller = Get.put(DriverDashboardController(), tag: 'driver_dashboard');
    Get.lazyPut(() => DriverTripsController(), tag: 'driver_trips');
    Get.lazyPut(() => DriverLiveTrackingController(), tag: 'driver_live_tracking');
    Get.lazyPut(() => DriverProfileController(), tag: 'driver_profile');
    navItems = const [
      _DriverNavItem(
        label: 'Home',
        icon: Icons.home_outlined,
        activeIcon: Icons.home,
        page: DriverDashboardPage(),
      ),
      _DriverNavItem(
        label: 'Live',
        icon: Icons.location_on_outlined,
        activeIcon: Icons.location_on,
        page: DriverLiveTrackingPage(),
      ),
      _DriverNavItem(
        label: 'Trips',
        icon: Icons.event_note_outlined,
        activeIcon: Icons.event_note,
        page: DriverTripsPage(),
      ),
      _DriverNavItem(
        label: 'Profile',
        icon: Icons.person_outline,
        activeIcon: Icons.person,
        page: DriverProfilePage(),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final Color primaryColor = Theme.of(context).colorScheme.primary;

    return LayoutBuilder(
      builder: (context, constraints) {
        final bool isWide = constraints.maxWidth >= 900;
        return Obx(() {
          final int index = controller.currentIndex.value;
          final bool tripActive = controller.tripActive.value;
          final bool isOffline = controller.isOffline.value;
          final destinations = navItems.map((item) => item.toDestination()).toList();
          final pages = navItems.map((item) => item.page).toList();
          final bool onLiveTab = navItems[index].label == 'Live';
          final Widget? fab = onLiveTab
              ? FloatingActionButton.extended(
                  onPressed: controller.toggleTrip,
                  backgroundColor: tripActive ? Colors.redAccent : primaryColor,
                  icon: Icon(tripActive ? Icons.stop_circle : Icons.play_arrow_rounded),
                  label: Text(tripActive ? 'End trip' : 'Start trip'),
                )
              : null;
          final navRailDestinations = navItems
              .map((item) => NavigationRailDestination(
                    icon: Icon(item.icon),
                    selectedIcon: Icon(item.activeIcon),
                    label: Text(item.label),
                  ))
              .toList();

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
                    Icon(Icons.cloud_off, color: Colors.orange.shade700, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Offline mode enabled. Updates will sync when connected.',
                        style: TextStyle(color: Colors.orange.shade700, fontSize: 13),
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
                    child: IndexedStack(
                      index: index,
                      children: pages,
                    ),
                  ),
                ),
              ),
            ],
          );

          return Scaffold(
            appBar: AppBar(
              backgroundColor: Colors.white,
              elevation: 0,
              title: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    tripActive ? 'Trip in progress' : 'Trip ready',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Colors.black),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    controller.selectedRouteName.value,
                    style: const TextStyle(fontSize: 14, color: Colors.black54),
                  ),
                ],
              ),
              actions: [
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: isWide ? 24 : 16),
                  child: ElevatedButton.icon(
                    onPressed: controller.toggleOfflineMode,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isOffline ? Colors.orange.shade50 : Colors.grey.shade200,
                      foregroundColor: isOffline ? Colors.orange.shade700 : Colors.black,
                      elevation: 0,
                    ),
                    icon: Icon(isOffline ? Icons.sync_disabled : Icons.wifi_tethering),
                    label: Text(isOffline ? 'Offline' : 'Online'),
                  ),
                ),
              ],
            ),
            body: isWide
                ? Row(
                    children: [
                      NavigationRail(
                        selectedIndex: index,
                        onDestinationSelected: controller.switchTab,
                        extended: constraints.maxWidth >= 1200,
                        labelType:
                            constraints.maxWidth >= 1200 ? NavigationRailLabelType.none : NavigationRailLabelType.all,
                        destinations: navRailDestinations,
                        backgroundColor: Colors.white,
                      ),
                      const VerticalDivider(width: 1),
                      Expanded(child: scaffoldBody),
                    ],
                  )
                : scaffoldBody,
            floatingActionButton: fab,
            bottomNavigationBar: isWide
                ? null
                : NavigationBar(
                    selectedIndex: index,
                    onDestinationSelected: controller.switchTab,
                    destinations: destinations,
                    backgroundColor: Colors.white,
                    indicatorColor: primaryColor.withOpacity(0.1),
                    surfaceTintColor: Colors.white,
                  ),
          );
        });
      },
    );
  }
}

class _DriverNavItem {
  const _DriverNavItem({
    required this.label,
    required this.icon,
    required this.activeIcon,
    required this.page,
  });

  final String label;
  final IconData icon;
  final IconData activeIcon;
  final Widget page;

  NavigationDestination toDestination() {
    return NavigationDestination(
      icon: Icon(icon),
      selectedIcon: Icon(activeIcon),
      label: label,
    );
  }
}

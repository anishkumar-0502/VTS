import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../features/dashboard/presentation/pages/parent_home_page.dart';
import '../../features/dashboard/presentation/bindings/parent_home_binding.dart';
import '../../features/live-tracking/presentation/pages/live_tracking_children_page.dart';
import '../../features/profile/presentation/pages/parent_profile_page.dart';
import '../../features/profile/presentation/controllers/parent_profile_controller.dart';

class ParentBottomNavbar extends StatefulWidget {
  final int currentIndex;
  final Function(int) onTap;

  const ParentBottomNavbar({
    super.key,
    this.currentIndex = 0,
    required this.onTap,
  });

  @override
  State<ParentBottomNavbar> createState() => _ParentBottomNavbarState();
}

class _ParentBottomNavbarState extends State<ParentBottomNavbar> {
  late int _selectedIndex;

  @override
  void initState() {
    super.initState();
    _selectedIndex = widget.currentIndex;
  }

  @override
  void didUpdateWidget(ParentBottomNavbar oldWidget) {
    super.didUpdateWidget(oldWidget);
    _selectedIndex = widget.currentIndex;
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
    widget.onTap(index);

    switch (index) {
      case 0:
        Get.offAllNamed('/dashboard');
        break;
      case 1:
        Get.offAllNamed('/live-tracking');
        break;
      case 2:
        Get.offAllNamed('/profile');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF2764FF),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: _onItemTapped,
        type: BottomNavigationBarType.fixed,
        backgroundColor: const Color(0xFF2764FF),
        selectedItemColor: Colors.white,
        unselectedItemColor: Colors.white.withValues(alpha: 0.5),
        selectedLabelStyle: const TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: 12,
          color: Colors.white,
        ),
        unselectedLabelStyle: TextStyle(
          fontWeight: FontWeight.w500,
          fontSize: 11,
          color: Colors.white.withValues(alpha: 0.5),
        ),
        items: [
          BottomNavigationBarItem(
            icon: Icon(
              _selectedIndex == 0 ? Icons.dashboard : Icons.dashboard_outlined,
              size: 24,
            ),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(
              _selectedIndex == 1
                  ? Icons.location_history
                  : Icons.location_history_outlined,
              size: 24,
            ),
            label: 'Live Tracking',
          ),
          BottomNavigationBarItem(
            icon: Icon(
              _selectedIndex == 2 ? Icons.person : Icons.person_outlined,
              size: 24,
            ),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

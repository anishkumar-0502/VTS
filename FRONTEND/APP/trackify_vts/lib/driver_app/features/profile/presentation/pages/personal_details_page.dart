import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../domain/models/profile_model.dart';
import '../controllers/driver_profile_controller.dart';

class PersonalDetailsPage extends StatefulWidget {
  const PersonalDetailsPage({super.key});

  @override
  State<PersonalDetailsPage> createState() => _PersonalDetailsPageState();
}

class _PersonalDetailsPageState extends State<PersonalDetailsPage> {
  late final DriverProfileController controller;

  @override
  void initState() {
    super.initState();
    controller = Get.find<DriverProfileController>(tag: 'driver_profile');
    WidgetsBinding.instance.addPostFrameCallback((_) {
      debugPrint('[PersonalDetails] Page loaded - fetching fresh profile data...');
      controller.fetchProfile(showLoading: false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) {
          debugPrint('[PersonalDetails] 📲 Returning to profile - triggering refresh...');
          controller.fetchProfile(showLoading: false);
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF1F4F9),
        body: Obx(() {
          final data = controller.profileData.value;
          if (data == null) {
            return const Center(child: CircularProgressIndicator());
          }
          
          return Column(
            children: [
              _buildHeader(context, data),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Column(
                    children: [
                      _detailTile(Icons.person, "Name", data.name),
                      _detailTile(Icons.phone, "Phone", data.phoneNumber.toString()),
                      if (data.licenseNumber.isNotEmpty)
                        _detailTile(
                            Icons.badge, "License Number", data.licenseNumber),
                      if (data.licenseExpiry != null &&
                          data.licenseExpiry!.isNotEmpty)
                        _detailTile(Icons.event, "License Expiry",
                            _formatDate(data.licenseExpiry)),
                      _detailTile(Icons.verified, "Status", data.status ? "Active" : "Inactive"),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            ],
          );
        }),
      ),
    );
  }

  // ---------------------
  // Header Design
  // ---------------------
  Widget _buildHeader(BuildContext context, ProfileData data) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.only(top: 50, bottom: 30),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF4A7BFE), Color(0xFF6BCBFF)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white),
                onPressed: () => Navigator.pop(context),
              ),
              const Spacer(),
            ],
          ),
          const SizedBox(height: 10),
          CircleAvatar(
            radius: 40,
            backgroundColor: Colors.white,
            child: Text(
              data.name.isNotEmpty ? data.name[0].toUpperCase() : "?",
              style: const TextStyle(fontSize: 30, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            data.name,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            data.email,
            style: TextStyle(
              color: Colors.white.withOpacity(0.9),
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  // ---------------------
  // Detail Tile
  // ---------------------
  Widget _detailTile(IconData icon, String label, String value,
      {bool isClickable = false, VoidCallback? onTap}) {
    return GestureDetector(
      onTap: isClickable ? onTap : null,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.9),
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 6,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          children: [
            Icon(icon, size: 28, color: Colors.blueAccent),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: const TextStyle(
                          color: Colors.grey, fontSize: 12)),
                  const SizedBox(height: 4),
                  Text(
                    value,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            if (isClickable)
              const Icon(Icons.chevron_right, color: Colors.grey)
          ],
        ),
      ),
    );
  }
}

String _formatDate(String? rawDate) {
  if (rawDate == null) return '--';
  try {
    final date = DateTime.parse(rawDate);
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    final year = date.year.toString();
    return "$day-$month-$year";
  } catch (e) {
    return rawDate; // fallback if wrong format
  }
}

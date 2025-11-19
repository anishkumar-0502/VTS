import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../domain/models/profile_model.dart';

class PersonalDetailsPage extends StatelessWidget {
  final ProfileData data;

  const PersonalDetailsPage({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F4F9),
      body: Column(
        children: [
          _buildHeader(context),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Column(
                children: [
                  _detailTile(Icons.person, "Name", data.name),

                  _detailTile(Icons.phone, "Phone", data.phoneNumber.toString(),
                  ),
                  _detailTile(Icons.badge, "License Number", data.licenseNumber),
                  _detailTile(Icons.event, "License Expiry", _formatDate(data.licenseExpiry)),
                  _detailTile(Icons.verified, "Status", data.status ? "Active" : "Inactive"),
                  _detailTile(Icons.access_time, "Last Login",
                      _formatDateTime(data.lastLogin)),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ---------------------
  // Header Design
  // ---------------------
  Widget _buildHeader(BuildContext context) {
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

  // ---------------------
  // Phone & Email launch functions
  // ---------------------
  Future<void> _callNumber(String number) async {
    final Uri uri = Uri(scheme: 'tel', path: number);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _openEmail(String email) async {
    final Uri uri = Uri(scheme: 'mailto', path: email);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  // ---------------------
  // Date Formatting
  // ---------------------
  String _formatDateTime(DateTime date) {
    final d = date.day.toString().padLeft(2, '0');
    final m = date.month.toString().padLeft(2, '0');
    final y = date.year;
    final h = date.hour > 12 ? date.hour - 12 : date.hour == 0 ? 12 : date.hour;
    final min = date.minute.toString().padLeft(2, '0');
    final period = date.hour >= 12 ? "PM" : "AM";
    return "$d-$m-$y  $h:$min $period";
  }
}

String _formatDate(String rawDate) {
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

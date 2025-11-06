import 'package:flutter/material.dart';

import '../../domain/models/profile_model.dart';

class DriverProfileDetailsPage extends StatelessWidget {
  final DriverProfile driverProfile;

  const DriverProfileDetailsPage({super.key, required this.driverProfile});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F8F8),
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.primary,
        title: const Text('Driver Profile', style: TextStyle(color: Colors.white)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            const SizedBox(height: 16),
            _buildDetailCard('Name', driverProfile.name),
            _buildDetailCard('Email', driverProfile.email),
            _buildDetailCard('Phone', driverProfile.phoneNumber.toString()),
            _buildDetailCard('License Number', driverProfile.licenseNumber),
            _buildDetailCard('License Expiry', driverProfile.licenseExpiry),
            _buildDetailCard('Status', driverProfile.status ? 'Active' : 'Inactive'),
            _buildDetailCard('Driver ID', driverProfile.driverId),
            _buildDetailCard('User ID', driverProfile.userId),
            _buildDetailCard('Operator ID', driverProfile.operatorId),
            _buildDetailCard('Assigned Vehicle ID', driverProfile.assignedVehicleId ?? 'None'),
            _buildDetailCard('Created At', _formatDateTime(driverProfile.createdAt)),
            _buildDetailCard('Updated At', _formatDateTime(driverProfile.updatedAt)),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailCard(String label, String value) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.all(16),
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
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              color: Colors.grey,
            ),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Colors.black,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDateTime(DateTime date) {
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    final year = date.year.toString();
    final hour = date.hour > 12 ? date.hour - 12 : (date.hour == 0 ? 12 : date.hour);
    final minute = date.minute.toString().padLeft(2, '0');
    final period = date.hour >= 12 ? 'PM' : 'AM';
    return '$day-$month-$year $hour:$minute $period';
  }
}
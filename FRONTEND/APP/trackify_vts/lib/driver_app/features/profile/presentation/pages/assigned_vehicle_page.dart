import 'package:flutter/material.dart';

import '../../domain/models/profile_model.dart';

class AssignedVehiclePage extends StatelessWidget {
  final AssignedVehicle? vehicle;

  const AssignedVehiclePage({super.key, required this.vehicle});

  @override
  Widget build(BuildContext context) {
    if (vehicle == null) {
      return Scaffold(
        backgroundColor: const Color(0xFFF8F8F8),
        appBar: AppBar(
          backgroundColor: Theme.of(context).colorScheme.primary,
          title: const Text(
            'Assigned Vehicle',
            style: TextStyle(color: Colors.white),
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ),
        body: const Center(child: Text('No assigned vehicle')),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8F8F8),
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.primary,
        title: const Text(
          'Assigned Vehicle',
          style: TextStyle(color: Colors.white),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            const SizedBox(height: 16),
            _buildDetailCard('Vehicle Number', vehicle!.vehicleNumber),
            // _buildDetailCard('Vehicle Type', vehicle!.vehicleType),
            _buildDetailCard('Capacity', vehicle!.capacity.toString()),
            _buildDetailCard(
              'Registration Number',
              vehicle!.registrationNumber,
            ),
            _buildDetailCard('Color', vehicle!.color),
            _buildDetailCard(
              'Seating Capacity',
              vehicle!.seatingCapacity.toString(),
            ),


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
          Text(label, style: const TextStyle(fontSize: 14, color: Colors.grey)),
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

}

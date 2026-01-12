import 'package:flutter/material.dart';
import '../../../domain/models/parent_profile_model.dart';

class ParentProfileVehicleDetailsPage extends StatelessWidget {
  final ParentProfileData data;

  const ParentProfileVehicleDetailsPage({required this.data, super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final vehicle = data.vehicleDetails;

    if (vehicle == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Vehicle Information',style: TextStyle(color: Colors.white),),
          centerTitle: true,
          backgroundColor: primaryColor,
          iconTheme: const IconThemeData(
            color: Colors.white, // <-- Change leading icon color here
          ),
          elevation: 0,
        ),
        body: const Center(child: Text('No vehicle information available')),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8F8F8),
      appBar: AppBar(
        title: const Text('Vehicle Information',style: TextStyle(color: Colors.white),),
        centerTitle: true,
        backgroundColor: primaryColor,
        iconTheme: const IconThemeData(
          color: Colors.white, // <-- Change leading icon color here
        ),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: primaryColor.withOpacity(0.15),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(

                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: primaryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Image.asset(
                      'assets/icons/bus.png',height: 50,width: 50,
                      color: primaryColor,
                    ),
                  ),
                  const SizedBox(width: 20),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        vehicle.vehicleNumber,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),

                    ],
                  ),

                ],
              ),
            ),
            const SizedBox(height: 24),
            _buildVehicleSpecCard(
              title: 'Vehicle Specifications',
              items: [
                {'icon': Icons.local_shipping, 'label': 'Type', 'value': vehicle.vehicleType},
                {'icon': Icons.pin, 'label': 'Registration', 'value': vehicle.registrationNumber},
                {'icon': Icons.palette, 'label': 'Color', 'value': vehicle.color},
                {'icon': Icons.event_seat, 'label': 'Capacity', 'value': '${vehicle.seatingCapacity} seats'},
              ],
              primaryColor: primaryColor,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVehicleSpecCard({
    required String title,
    required List<Map<String, dynamic>> items,
    required Color primaryColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 16),
          ...items.asMap().entries.map((entry) {
            final item = entry.value;
            final isLast = entry.key == items.length - 1;
            return Column(
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: primaryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        item['icon'] as IconData,
                        color: primaryColor,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item['label'] as String,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            item['value'] as String,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: Colors.black87,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                if (!isLast) ...[
                  const SizedBox(height: 12),
                  Divider(height: 1, color: Colors.grey[200]),
                  const SizedBox(height: 12),
                ],
              ],
            );
          }).toList(),
        ],
      ),
    );
  }

}

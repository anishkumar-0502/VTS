import 'package:flutter/material.dart';

import '../../domain/models/profile_model.dart';

class AssociatedOperatorsPage extends StatelessWidget {
  final List<OperatorDetails> operators;

  const AssociatedOperatorsPage({super.key, required this.operators});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F8F8),
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.primary,
        title: const Text(
          'Associated Operators',
          style: TextStyle(color: Colors.white),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body:
          operators.isEmpty
              ? const Center(child: Text('No associated operators'))
              : ListView.builder(
                itemCount: operators.length,
                itemBuilder: (context, index) {
                  final operator = operators[index];
                  return Container(
                    margin: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 4,
                    ),
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
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          operator.name,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.black,
                          ),
                        ),
                        const SizedBox(height: 8),
                        _buildInfoRow('Email', operator.email),
                        _buildInfoRow('Phone', operator.phone),
                        _buildInfoRow('Company', operator.companyName ?? 'N/A'),
                        _buildInfoRow('Address', operator.address),
                        _buildInfoRow('City', operator.city),
                        _buildInfoRow(
                          'Status',
                          operator.status ? 'Active' : 'Inactive',
                        ),
                        _buildInfoRow(
                          'Total Vehicles',
                          operator.totalVehicles.toString(),
                        ),
                        _buildInfoRow(
                          'Total Drivers',
                          operator.totalDrivers.toString(),
                        ),
                      ],
                    ),
                  );
                },
              ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 14, color: Colors.grey)),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: Colors.black,
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../controllers/driver_alerts_controller.dart';

class DriverAlertsPage extends GetView<DriverAlertsController> {
  const DriverAlertsPage({super.key});

  @override
  String? get tag => 'driver_alerts';

  @override
  Widget build(BuildContext context) {
    final Color primaryColor = Theme.of(context).colorScheme.primary;
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      children: [
        const Text('Alerts & communication', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
        const SizedBox(height: 16),
        Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          elevation: 0,
          color: primaryColor.withOpacity(0.08),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: primaryColor, borderRadius: BorderRadius.circular(14)),
                  child: const Icon(Icons.campaign, color: Colors.white),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text('Keep everyone informed', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                      SizedBox(height: 4),
                      Text('Send quick updates to school administrators and parents about delays or safety checks.',
                          style: TextStyle(fontSize: 13, color: Colors.black87)),
                    ],
                  ),
                ),
                OutlinedButton(onPressed: () {}, child: const Text('Create alert')),
              ],
            ),
          ),
        ),
        const SizedBox(height: 22),
        const Text('Recent alerts', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        ...controller.recentAlerts.map(
          (alert) => Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: Colors.grey.shade200),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12, offset: const Offset(0, 6)),
              ],
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(_iconForType(alert['type']), color: _colorForType(alert['type'], primaryColor)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(alert['title'] ?? '',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 4),
                      Text(alert['body'] ?? '', style: const TextStyle(fontSize: 13, color: Colors.black87)),
                      const SizedBox(height: 8),
                      Text(alert['time'] ?? '', style: const TextStyle(fontSize: 12, color: Colors.black45)),
                    ],
                  ),
                ),
                IconButton(onPressed: () {}, icon: const Icon(Icons.more_vert)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 22),
        const Text('Quick contacts', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        ...controller.quickContacts.map(
          (contact) => Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: primaryColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  alignment: Alignment.center,
                  child: Text(contact['name']?.split(' ').map((s) => s[0]).take(2).join() ?? '',
                      style: TextStyle(color: primaryColor, fontWeight: FontWeight.w700)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(contact['name'] ?? '',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Text(contact['role'] ?? '', style: const TextStyle(fontSize: 13, color: Colors.black54)),
                    ],
                  ),
                ),
                OutlinedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.phone_outlined),
                  label: Text(contact['phone'] ?? ''),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  IconData _iconForType(String? type) {
    switch (type) {
      case 'info':
        return Icons.info_outline;
      case 'update':
        return Icons.auto_graph_outlined;
      case 'reminder':
        return Icons.event_note_outlined;
      default:
        return Icons.notifications_none;
    }
  }

  Color _colorForType(String? type, Color primary) {
    switch (type) {
      case 'info':
        return primary;
      case 'update':
        return Colors.orange.shade600;
      case 'reminder':
        return Colors.teal;
      default:
        return Colors.black54;
    }
  }
}

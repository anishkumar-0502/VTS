import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../controllers/driver_dashboard_controller.dart';

class DriverDashboardPage extends GetView<DriverDashboardController> {
  const DriverDashboardPage({super.key});

  @override
  String? get tag => 'driver_dashboard';

  @override
  Widget build(BuildContext context) {
    final Color primaryColor = Theme.of(context).colorScheme.primary;
    return LayoutBuilder(
      builder: (context, constraints) {
        final double width = constraints.maxWidth;
        final double horizontalPadding = width >= 1100
            ? 64
            : width >= 900
                ? 48
                : width >= 600
                    ? 28
                    : 16;
        final double available = width - horizontalPadding * 2;
        final int metricColumns = available >= 900
            ? 3
            : available >= 560
                ? 2
                : 1;
        final double metricSpacing = 12;
        final double metricWidth = metricColumns == 1
            ? available
            : (available - metricSpacing * (metricColumns - 1)).clamp(0, double.infinity) / metricColumns;

        return Obx(() {
          final tripStatus = controller.tripStatus.value;
          final syncedAt = controller.lastSyncedAt.value;
          final syncTime = syncedAt == null
              ? 'Not synced'
              : '${syncedAt.hour.toString().padLeft(2, '0')}:${syncedAt.minute.toString().padLeft(2, '0')}';
          return ListView(
            padding: EdgeInsets.symmetric(horizontal: horizontalPadding, vertical: 20),
            children: [
              Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 960),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: primaryColor,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: const Icon(Icons.directions_bus, color: Colors.white, size: 28),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('Good morning, Jordan',
                                          style: TextStyle(color: Colors.white70, fontSize: 16)),
                                      const SizedBox(height: 4),
                                      Text(controller.selectedRouteName.value,
                                          style: const TextStyle(
                                              color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
                                    ],
                                  ),
                                ),
                                FilledButton.icon(
                                  onPressed: controller.toggleTrip,
                                  style: FilledButton.styleFrom(
                                    backgroundColor: Colors.white,
                                    foregroundColor: primaryColor,
                                  ),
                                  icon: Icon(controller.tripActive.value ? Icons.stop_circle : Icons.play_arrow_rounded),
                                  label: Text(controller.tripActive.value ? 'End trip' : 'Start trip'),
                                ),
                              ],
                            ),
                            const SizedBox(height: 20),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Flexible(
                                  child: Text(
                                    tripStatus,
                                    style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600),
                                  ),
                                ),
                                Text('Last sync $syncTime',
                                    style: const TextStyle(color: Colors.white70, fontSize: 13)),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      Wrap(
                        spacing: metricSpacing,
                        runSpacing: metricSpacing,
                        children: controller.keyMetrics
                            .map(
                              (item) => SizedBox(
                                width: metricColumns == 1 ? null : metricWidth,
                                child: Container(
                                  padding: const EdgeInsets.all(18),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(18),
                                    border: Border.all(color: Colors.grey.shade200),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withOpacity(0.04),
                                        blurRadius: 12,
                                        offset: const Offset(0, 6),
                                      ),
                                    ],
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(item['label'] ?? '',
                                          style: const TextStyle(fontSize: 13, color: Colors.black54)),
                                      const SizedBox(height: 8),
                                      Text(item['value'] ?? '',
                                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                                    ],
                                  ),
                                ),
                              ),
                            )
                            .toList(),
                      ),
                      const SizedBox(height: 24),
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: Colors.grey.shade200),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 16,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Upcoming stops',
                                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 12),
                            ...controller.upcomingStops.map(
                              (stop) => Padding(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 46,
                                      height: 46,
                                      decoration: BoxDecoration(
                                        color: primaryColor.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                      alignment: Alignment.center,
                                      child: Text(
                                        stop['time'] ?? '',
                                        style: TextStyle(
                                          color: primaryColor,
                                          fontWeight: FontWeight.w600,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(stop['name'] ?? '',
                                              style: const TextStyle(
                                                  fontSize: 16, fontWeight: FontWeight.w600)),
                                          const SizedBox(height: 4),
                                          Text(stop['status'] ?? '',
                                              style: const TextStyle(fontSize: 13, color: Colors.black54)),
                                        ],
                                      ),
                                    ),
                                    Icon(Icons.chevron_right, color: Colors.grey.shade400),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: Colors.grey.shade200),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.04),
                              blurRadius: 12,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Quick actions',
                                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 16),
                            ...controller.quickActions.map(
                              (action) => Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(16),
                                  color: Colors.grey.shade100,
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.bolt, color: primaryColor),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(action['title'] ?? '',
                                              style: const TextStyle(
                                                  fontSize: 15, fontWeight: FontWeight.w600)),
                                          const SizedBox(height: 4),
                                          Text(action['subtitle'] ?? '',
                                              style: const TextStyle(fontSize: 13, color: Colors.black54)),
                                        ],
                                      ),
                                    ),
                                    Icon(Icons.chevron_right, color: Colors.grey.shade500),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        });
      },
    );
  }
}

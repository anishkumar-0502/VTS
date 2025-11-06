import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../controllers/driver_routes_controller.dart';

class DriverRoutesPage extends GetView<DriverRoutesController> {
  const DriverRoutesPage({super.key});

  @override
  String? get tag => 'driver_routes';

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
        final double cardWidth = width >= 900
            ? 320
            : width >= 600
                ? 280
                : width * 0.72;

        return Obx(() {
          final int selectedIndex = controller.selectedRouteIndex.value;
          final route = controller.assignedRoutes[selectedIndex];
          final stops = (route['stops'] as List).cast<Map<String, String>>();
          return ListView(
            padding: EdgeInsets.symmetric(horizontal: horizontalPadding, vertical: 20),
            children: [
              Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 960),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Assigned routes',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 16),
                      SizedBox(
                        height: 176,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemBuilder: (context, index) {
                            final item = controller.assignedRoutes[index];
                            final bool active = index == selectedIndex;
                            return GestureDetector(
                              onTap: () => controller.selectRoute(index),
                              child: Container(
                                width: cardWidth,
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: active ? primaryColor : Colors.white,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: active ? Colors.transparent : Colors.grey.shade200,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.08),
                                      blurRadius: 14,
                                      offset: const Offset(0, 8),
                                    ),
                                  ],
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item['name']?.toString() ?? '',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: active ? Colors.white : Colors.black,
                                        fontSize: 18,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      '${item['start']} → ${item['end']}',
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: active ? Colors.white70 : Colors.black54,
                                        fontSize: 13,
                                      ),
                                    ),
                                    const Spacer(),
                                    Wrap(
                                      spacing: 16,
                                      runSpacing: 6,
                                      crossAxisAlignment: WrapCrossAlignment.center,
                                      children: [
                                        Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(Icons.place_outlined,
                                                size: 18, color: active ? Colors.white : primaryColor),
                                            const SizedBox(width: 6),
                                            Text(
                                              item['distance']?.toString() ?? '',
                                              style: TextStyle(
                                                color: active ? Colors.white : Colors.black87,
                                                fontSize: 13,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ],
                                        ),
                                        Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(Icons.timer_outlined,
                                                size: 18, color: active ? Colors.white : primaryColor),
                                            const SizedBox(width: 6),
                                            Text(
                                              item['duration']?.toString() ?? '',
                                              style: TextStyle(
                                                color: active ? Colors.white : Colors.black87,
                                                fontSize: 13,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                          separatorBuilder: (_, __) => const SizedBox(width: 16),
                          itemCount: controller.assignedRoutes.length,
                          padding: EdgeInsets.only(right: width >= 600 ? 0 : 16),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
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
                            Row(
                              children: [
                                Icon(Icons.flag_outlined, color: primaryColor),
                                const SizedBox(width: 8),
                                const Text('Route overview',
                                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                              ],
                            ),
                            const SizedBox(height: 20),
                            ...List.generate(stops.length, (index) {
                              final stop = stops[index];
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 16),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Column(
                                      children: [
                                        Container(
                                          width: 12,
                                          height: 12,
                                          decoration: BoxDecoration(
                                            color: primaryColor,
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                        if (index != stops.length - 1)
                                          Container(
                                            width: 2,
                                            height: 42,
                                            margin: const EdgeInsets.symmetric(vertical: 6),
                                            color: primaryColor.withOpacity(0.4),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(vertical: 8),
                                        decoration: const BoxDecoration(
                                          border: Border(
                                            bottom: BorderSide(color: Color(0xFFE6E8EE)),
                                          ),
                                        ),
                                        child: Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    stop['name'] ?? '',
                                                    style: const TextStyle(
                                                        fontSize: 16, fontWeight: FontWeight.w600),
                                                  ),
                                                  const SizedBox(height: 4),
                                                  Text('Stop ${index + 1}',
                                                      style: const TextStyle(
                                                          fontSize: 12, color: Colors.black45)),
                                                ],
                                              ),
                                            ),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                              decoration: BoxDecoration(
                                                color: primaryColor.withOpacity(0.1),
                                                borderRadius: BorderRadius.circular(12),
                                              ),
                                              child: Text(
                                                stop['time'] ?? '',
                                                style: TextStyle(
                                                  color: primaryColor,
                                                  fontWeight: FontWeight.w600,
                                                  fontSize: 13,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }),
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
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        child: Wrap(
                          spacing: 16,
                          runSpacing: 12,
                          children: controller.routeHighlights
                              .map(
                                (highlight) => SizedBox(
                                  width: width >= 700 ? (width - horizontalPadding * 2 - 32) / 3 : null,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(highlight['label'] ?? '',
                                          style: const TextStyle(fontSize: 13, color: Colors.black45)),
                                      const SizedBox(height: 8),
                                      Text(highlight['value'] ?? '',
                                          style: const TextStyle(
                                              fontSize: 16, fontWeight: FontWeight.w600)),
                                    ],
                                  ),
                                ),
                              )
                              .toList(),
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

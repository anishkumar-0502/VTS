import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../controllers/driver_students_controller.dart';

class DriverStudentsPage extends GetView<DriverStudentsController> {
  const DriverStudentsPage({super.key});

  @override
  String? get tag => 'driver_students';

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

        return Obx(() {
          return ListView(
            padding: EdgeInsets.symmetric(horizontal: horizontalPadding, vertical: 20),
            children: [
              Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 960),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Student manifest',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(18),
                          color: Colors.white,
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Wrap(
                          spacing: 16,
                          runSpacing: 12,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            Icon(Icons.groups, color: primaryColor),
                            SizedBox(
                              width: width >= 600 ? 300 : double.infinity,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: const [
                                  Text('Morning Route A',
                                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                                  SizedBox(height: 4),
                                  Text('24 assigned • 18 on board • 0 dropped',
                                      style: TextStyle(fontSize: 13, color: Colors.black54)),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            FilledButton.icon(
                              onPressed: controller.clearQueue,
                              style: FilledButton.styleFrom(
                                backgroundColor: primaryColor,
                                foregroundColor: Colors.white,
                              ),
                              icon: const Icon(Icons.check_circle_outline),
                              label: const Text('Sync all'),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                      ...List.generate(controller.manifest.length, (index) {
                        final student = controller.manifest[index];
                        final bool picked = student['pickup'] as bool;
                        final bool dropped = student['drop'] as bool;
                        return Container(
                          margin: const EdgeInsets.only(bottom: 14),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: Colors.grey.shade200),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.04),
                                blurRadius: 10,
                                offset: const Offset(0, 6),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  CircleAvatar(
                                    backgroundColor: primaryColor.withOpacity(0.15),
                                    child: Text(
                                      student['name'].toString().substring(0, 1),
                                      style: TextStyle(
                                        color: primaryColor,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          student['name'].toString(),
                                          style: const TextStyle(
                                              fontSize: 16, fontWeight: FontWeight.w700),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          student['grade'].toString(),
                                          style: const TextStyle(fontSize: 13, color: Colors.black54),
                                        ),
                                      ],
                                    ),
                                  ),
                                  ConstrainedBox(
                                    constraints: const BoxConstraints(maxWidth: 180),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        const Text('Guardian',
                                            style: TextStyle(fontSize: 12, color: Colors.black45)),
                                        Text(
                                          student['guardian'].toString(),
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                          textAlign: TextAlign.right,
                                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              Wrap(
                                spacing: 12,
                                runSpacing: 12,
                                children: [
                                  SizedBox(
                                    width: width >= 480 ? 220 : double.infinity,
                                    child: OutlinedButton.icon(
                                      onPressed: () => controller.togglePickup(index, !picked),
                                      style: OutlinedButton.styleFrom(
                                        side: BorderSide(
                                          color: picked ? Colors.green : Colors.grey.shade300,
                                        ),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(14),
                                        ),
                                        backgroundColor:
                                            picked ? Colors.green.shade50 : Colors.transparent,
                                      ),
                                      icon: Icon(
                                        picked ? Icons.check_circle : Icons.radio_button_unchecked,
                                        color: picked ? Colors.green : Colors.black45,
                                      ),
                                      label: Text(
                                        'Picked up',
                                        style: TextStyle(
                                          color: picked ? Colors.green.shade700 : Colors.black54,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ),
                                  SizedBox(
                                    width: width >= 480 ? 220 : double.infinity,
                                    child: OutlinedButton.icon(
                                      onPressed: () => controller.toggleDrop(index, !dropped),
                                      style: OutlinedButton.styleFrom(
                                        side: BorderSide(
                                          color: dropped ? Colors.blue : Colors.grey.shade300,
                                        ),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(14),
                                        ),
                                        backgroundColor:
                                            dropped ? Colors.blue.shade50 : Colors.transparent,
                                      ),
                                      icon: Icon(
                                        dropped ? Icons.check_circle : Icons.radio_button_unchecked,
                                        color: dropped ? Colors.blue : Colors.black45,
                                      ),
                                      label: Text(
                                        'Dropped off',
                                        style: TextStyle(
                                          color: dropped ? Colors.blue.shade700 : Colors.black54,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      }),
                      const SizedBox(height: 16),
                      if (controller.syncQueue.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.orange.shade50,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: Colors.orange.shade200),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      'Pending sync (${controller.syncQueue.length})',
                                      style: TextStyle(
                                        color: Colors.orange.shade800,
                                        fontSize: 16,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                  TextButton(
                                    onPressed: controller.clearQueue,
                                    child: const Text('Clear all'),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              ...controller.syncQueue.map(
                                (item) => Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 4),
                                  child: Row(
                                    children: [
                                      Icon(Icons.sync, color: Colors.orange.shade700, size: 18),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          '${item['student']} • ${item['status']}',
                                          style: TextStyle(
                                            color: Colors.orange.shade700,
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

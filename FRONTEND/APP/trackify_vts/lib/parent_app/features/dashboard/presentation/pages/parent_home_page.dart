import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../Sessionhandler/session_controller.dart';

class ParentHomePage extends StatelessWidget {
  const ParentHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final sessionController = Get.find<SessionController>();
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Parent Dashboard'),
      ),
      body: Center(
        child: Obx(() {
          final name = sessionController.username.value.isNotEmpty
              ? sessionController.username.value
              : sessionController.parentData.value?['name'] as String?;
          final email = sessionController.emailId.value;
          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Welcome${name != null && name.isNotEmpty ? ', $name' : ''}',
                style: theme.textTheme.headlineSmall,
              ),
              const SizedBox(height: 12),
              if (email.isNotEmpty)
                Text(
                  email,
                  style: theme.textTheme.bodyMedium,
                ),
            ],
          );
        }),
      ),
    );
  }
}

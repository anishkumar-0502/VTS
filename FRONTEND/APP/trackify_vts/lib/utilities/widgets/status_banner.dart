import 'package:flutter/material.dart';
import 'package:get/get.dart';

/// Shows a custom status banner using Get.rawSnackbar.
///
/// [message]: The message to display.
/// [color]: The color for the icon and text.
/// [icon]: The icon to display.
/// [duration]: How long to show the banner (default 3 seconds).
void showStatusBanner(
  String message,
  Color color,
  IconData icon, {
  Duration duration = const Duration(seconds: 3),
}) {
  Get.rawSnackbar(
    messageText: Row(
      children: [
        Icon(icon, color: color),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            message,
            style: TextStyle(color: color, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    ),
    backgroundColor: color.withValues(alpha: 0.12),
    borderRadius: 16,
    borderColor: color,
    margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    snackPosition: SnackPosition.TOP,
    duration: duration,
    isDismissible: true,
  );
}

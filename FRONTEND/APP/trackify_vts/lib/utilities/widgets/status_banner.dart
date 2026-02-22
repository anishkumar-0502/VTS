import 'package:flutter/material.dart';
import 'package:get/get.dart';

/// Shows a custom toast-like status banner with icon and message.
///
/// [message]: The message to display.
/// [color]: The color for the icon background and border (green for success, blue for info, red for error).
/// [icon]: The icon to display.
/// [duration]: How long to show the banner (default 3 seconds).
void showStatusBanner(
  String message,
  Color color,
  IconData icon, {
  Duration duration = const Duration(seconds: 3),
}) {
  // Determine icon color based on background color
  Color iconColor = Colors.white;
  
  Get.rawSnackbar(
    messageText: Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border(
          left: BorderSide(color: color, width: 4),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: iconColor,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: Colors.black87,
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    ),
    backgroundColor: Colors.transparent,
    margin: const EdgeInsets.only(top: 20, right: 16, left: 16),
    snackPosition: SnackPosition.TOP,
    duration: duration,
    isDismissible: true,
    padding: EdgeInsets.zero,
    borderRadius: 0,
  );
}

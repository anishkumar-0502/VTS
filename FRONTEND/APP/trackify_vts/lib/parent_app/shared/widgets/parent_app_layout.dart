import 'package:flutter/material.dart';
import 'package:get/get.dart';

class ParentAppLayout extends StatelessWidget {
  final Widget? appBar;
  final Widget body;
  final FloatingActionButton? floatingActionButton;
  final Color? backgroundColor;
  final int navbarCurrentIndex;

  const ParentAppLayout({
    super.key,
    this.appBar,
    required this.body,
    this.floatingActionButton,
    this.backgroundColor,
    this.navbarCurrentIndex = 0,
  });

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) {
          debugPrint('[ParentAppLayout] Back button - navigating to previous screen');
          Get.back();
        }
      },
      child: Scaffold(
        appBar: appBar as PreferredSizeWidget?,
        backgroundColor: backgroundColor,
        body: body,
        floatingActionButton: floatingActionButton,
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../../utilities/widgets/animated_trackify_text.dart';
import '../../../../../utilities/widgets/location_pulse_icon.dart';
import '../controllers/splash_screen_controller.dart';

class DriverSplashScreenPage extends StatelessWidget {
  const DriverSplashScreenPage({super.key});

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    Get.put(DriverSplashScreenController(), tag: 'driver_splash', permanent: false);

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF081F60), Color(0xFF1F4CC9), Color(0xFF2764FF)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: Stack(
          children: [
            Positioned(
              top: size.height * 0.25,
              right: size.width * 0.15,
              child: const LocationPulseIcon(size: 52, delay: Duration(milliseconds: 250)),
            ),
            // Positioned(
            //   bottom: size.height * 0.25,
            //   left: size.width * 0.16,
            //   child: const LocationPulseIcon(size: 42, delay: Duration(milliseconds: 700), icon: Icons.my_location_rounded),
            // ),
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AnimatedTrackifyText(
                    text: 'Trackit',
                    style: TextStyle(
                      fontSize: size.width * 0.18,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                    duration: const Duration(milliseconds: 1600),
                  ),
                  SizedBox(height: size.height * 0.02),
                  TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0, end: 1),
                    duration: const Duration(milliseconds: 900),
                    builder: (context, value, child) {
                      return Opacity(
                        opacity: value,
                        child: Transform.translate(
                          offset: Offset(0, (1 - value) * 24),
                          child: child,
                        ),
                      );
                    },
                    child: Text(
                      'navigation made smarter',
                      style: TextStyle(
                        fontSize: size.width * 0.045,
                        fontWeight: FontWeight.w500,
                        color: Colors.white70,
                      ),
                    ),
                  ),
                  SizedBox(height: size.height * 0.08),
                  // const BouncingDotsLoader(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

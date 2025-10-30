import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/Network/Internet_connectivity.dart';
import 'Sessionhandler/session_controller.dart';
import 'features/splashscreen/presentation/pages/splash_screen_page.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  Get.put(SessionController(), permanent: true);
  GoogleFonts.config.allowRuntimeFetching = false;
  runApp(const DriverApp());
}

class DriverApp extends StatelessWidget {
  const DriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    final Color primaryColor = const Color(0xFF2764FF);

    return GetMaterialApp(
      title: 'Trackify Driver',
      debugShowCheckedModeBanner: false,
      builder: (context, child) {
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(textScaler: const TextScaler.linear(1.0)),
          child: InternetChecker(child: child!),
        );
      },
      theme: ThemeData(
        scaffoldBackgroundColor: Colors.white,
        colorScheme: ColorScheme.fromSeed(
          seedColor: primaryColor,
          primary: primaryColor,
          surface: Colors.white,
          onPrimary: Colors.white,
          onSurface: Colors.black,
        ),
        textTheme: GoogleFonts.poppinsTextTheme().apply(
          bodyColor: Colors.black,
          displayColor: Colors.black,
        ),
        primaryTextTheme: GoogleFonts.poppinsTextTheme().apply(
          bodyColor: Colors.white,
          displayColor: Colors.white,
        ),
        useMaterial3: true,
      ),
      home: const DriverSplashScreenPage(),
    );
  }
}

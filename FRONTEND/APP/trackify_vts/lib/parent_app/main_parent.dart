import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../core/Network/internet_connectivity.dart';
import '../services/firebase_notification_service.dart';
import 'Sessionhandler/session_controller.dart';
import 'features/splashscreen/presentation/pages/splash_screen_page.dart';
import 'features/dashboard/presentation/bindings/parent_home_binding.dart';
import 'features/profile/presentation/bindings/parent_profile_binding.dart';
import 'features/dashboard/presentation/pages/parent_home_page.dart';
import 'features/live-tracking/presentation/pages/live_tracking_children_page.dart';
import 'features/live-tracking/presentation/controllers/live_tracking_children_controller.dart';
import 'features/profile/presentation/pages/parent_profile_page.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint('═══════════════════════════════════════════════════════');
  debugPrint('🔔 BACKGROUND MESSAGE HANDLER (APP TERMINATED)');
  debugPrint('═══════════════════════════════════════════════════════');
  debugPrint('Message ID: ${message.messageId}');
  debugPrint('Title: ${message.notification?.title}');
  debugPrint('Body: ${message.notification?.body}');
  debugPrint('Data: ${message.data}');
  debugPrint('═══════════════════════════════════════════════════════');
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  await FirebaseNotificationService().initialize();

  Get.put(SessionController(), permanent: true);
  GoogleFonts.config.allowRuntimeFetching = false;

  runApp(const ParentApp());
}

class ParentApp extends StatelessWidget {
  const ParentApp({super.key});

  @override
  Widget build(BuildContext context) {
    final Color primaryColor = const Color(0xFF2764FF);

    return GetMaterialApp(
      title: 'Trackit Parent',
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
      getPages: [
        GetPage(
          name: '/dashboard',
          page: () => ParentHomePage(),
          binding: ParentHomeBinding(),
        ),
        GetPage(
          name: '/live-tracking',
          page: () => const LiveTrackingChildrenPage(),
          binding: BindingsBuilder(() {
            Get.lazyPut(() => LiveTrackingChildrenController());
          }),
        ),
        GetPage(
          name: '/profile',
          page: () => const ParentProfilePage(),
          binding: ParentProfileBinding(),
        ),
      ],
      home: const ParentSplashScreenPage(),
    );
  }
}

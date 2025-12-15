import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../core/Network/Internet_connectivity.dart';
import 'Sessionhandler/session_controller.dart';
import 'features/splashscreen/presentation/pages/splash_screen_page.dart';
import 'features/dashboard/presentation/bindings/parent_home_binding.dart';
import 'features/profile/presentation/bindings/parent_profile_binding.dart';
import 'features/dashboard/presentation/pages/parent_home_page.dart';
import 'features/profile/presentation/pages/parent_profile_page.dart';

Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print("📩 Background Notification: ${message.notification?.title}");
}


Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1️⃣ Initialize Firebase
  await Firebase.initializeApp();

  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);


  // 2️⃣ Request notification permission
  await FirebaseMessaging.instance.requestPermission();

  // 3️⃣ Print FCM token
  String? token = await FirebaseMessaging.instance.getToken();
  print("📌 Parent App FCM Token: $token");

  // 4️⃣ Listen to foreground notifications
  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    Get.snackbar(
      message.notification?.title ?? "Notification",
      message.notification?.body ?? "",
      snackPosition: SnackPosition.TOP,
      backgroundColor: Colors.blue,
      colorText: Colors.white,
    );
  });

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
      title: 'Trackify Parent',
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
          name: '/profile',
          page: () => const ParentProfilePage(),
          binding: ParentProfileBinding(),
        ),
      ],
      home: const ParentSplashScreenPage(),
    );
  }
}

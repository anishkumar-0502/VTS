import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class FirebaseNotificationService {
  static final FirebaseNotificationService _instance = FirebaseNotificationService._internal();

  factory FirebaseNotificationService() {
    return _instance;
  }

  FirebaseNotificationService._internal();

  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();

  Future<void> initialize() async {
    await _initializeLocalNotifications();
    await _requestNotificationPermission();
    await _setupForegroundMessageHandler();
    await _setupBackgroundMessageHandler();
    await _getAndLogToken();
  }

  Future<void> _getAndLogToken() async {
    try {
      final token = await _firebaseMessaging.getToken();
      debugPrint('═══════════════════════════════════════════════════════');
      debugPrint('✅ FCM TOKEN OBTAINED');
      debugPrint('═══════════════════════════════════════════════════════');
      debugPrint('Token: $token');
      debugPrint('═══════════════════════════════════════════════════════');
      debugPrint('👉 Send this token to your backend API');
      debugPrint('═══════════════════════════════════════════════════════');
    } catch (e) {
      debugPrint('❌ Error getting FCM token: $e');
    }

    _firebaseMessaging.onTokenRefresh.listen((newToken) {
      debugPrint('═══════════════════════════════════════════════════════');
      debugPrint('🔄 FCM TOKEN REFRESHED');
      debugPrint('═══════════════════════════════════════════════════════');
      debugPrint('New Token: $newToken');
      debugPrint('👉 Update this token in your backend API');
      debugPrint('═══════════════════════════════════════════════════════');
    });
  }

 Future<void> _initializeLocalNotifications() async {
  const AndroidInitializationSettings androidInitializationSettings =
      AndroidInitializationSettings('@mipmap/ic_launcher');

  const InitializationSettings initializationSettings =
      InitializationSettings(android: androidInitializationSettings);

  await _localNotifications.initialize(initializationSettings);

  const AndroidNotificationChannel channel = AndroidNotificationChannel(
    'high_importance_channel',
    'High Importance Notifications',
    description: 'This channel is used for important notifications.',
    importance: Importance.max,
  );

  await _localNotifications
      .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(channel);
}

  Future<void> _requestNotificationPermission() async {
    NotificationSettings settings = await _firebaseMessaging.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      debugPrint('Notification permission denied');
    } else if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      debugPrint('Notification permission granted');
    } else if (settings.authorizationStatus == AuthorizationStatus.provisional) {
      debugPrint('Notification permission provisional');
    }
  }

  Future<void> _setupForegroundMessageHandler() async {
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint('═══════════════════════════════════════════════════════');
      debugPrint('🔔 FIREBASE NOTIFICATION RECEIVED (FOREGROUND)');
      debugPrint('═══════════════════════════════════════════════════════');
      debugPrint('Message ID: ${message.messageId}');
      debugPrint('Message Data: ${message.data}');

      if (message.notification != null) {
        debugPrint('───────────────────────────────────────────────────────');
        debugPrint('Title: ${message.notification!.title}');
        debugPrint('Body: ${message.notification!.body}');
        debugPrint('───────────────────────────────────────────────────────');
        _showLocalNotification(
          title: message.notification!.title ?? 'Notification',
          body: message.notification!.body ?? '',
          payload: message.data,
        );
      }
      debugPrint('═══════════════════════════════════════════════════════');
    });
  }

  Future<void> _setupBackgroundMessageHandler() async {
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint('═══════════════════════════════════════════════════════');
      debugPrint('🔔 NOTIFICATION TAPPED (APP OPENED FROM NOTIFICATION)');
      debugPrint('═══════════════════════════════════════════════════════');
      debugPrint('Message ID: ${message.messageId}');
      debugPrint('Payload: ${message.data}');
      debugPrint('═══════════════════════════════════════════════════════');
      _handleNotificationClick(message.data);
    });

    FirebaseMessaging.instance.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        debugPrint('═══════════════════════════════════════════════════════');
        debugPrint('🔔 APP LAUNCHED VIA NOTIFICATION (COLD START)');
        debugPrint('═══════════════════════════════════════════════════════');
        debugPrint('Message ID: ${message.messageId}');
        debugPrint('Payload: ${message.data}');
        debugPrint('═══════════════════════════════════════════════════════');
        _handleNotificationClick(message.data);
      }
    });
  }

  Future<void> _showLocalNotification({
    required String title,
    required String body,
    Map<String, dynamic>? payload,
  }) async {
    debugPrint('📬 Displaying local notification:');
    debugPrint('   Title: $title');
    debugPrint('   Body: $body');
    
    const AndroidNotificationDetails androidNotificationDetails =
        AndroidNotificationDetails(
      'high_importance_channel',
      'High Importance Notifications',
      channelDescription: 'This channel is used for important notifications.',
      importance: Importance.max,
      priority: Priority.high,
      enableVibration: true,
      enableLights: true,
      playSound: true,
    );

    const NotificationDetails notificationDetails =
        NotificationDetails(android: androidNotificationDetails);

    await _localNotifications.show(
      DateTime.now().millisecond,
      title,
      body,
      notificationDetails,
      payload: payload?.toString(),
    );
  }

  void _handleNotificationClick(Map<String, dynamic> data) {
    debugPrint('📲 Handling notification click with payload:');
    data.forEach((key, value) {
      debugPrint('   ├─ $key: $value');
    });
  }

  Future<String?> getDeviceToken() async {
    try {
      final token = await _firebaseMessaging.getToken();
      debugPrint('═══════════════════════════════════════════════════════');
      debugPrint('📱 FCM TOKEN AVAILABLE:');
      debugPrint('═══════════════════════════════════════════════════════');
      debugPrint('Token: $token');
      debugPrint('═══════════════════════════════════════════════════════');
      return token;
    } catch (e) {
      debugPrint('❌ Error getting FCM token: $e');
      return null;
    }
  }

  void subscribeToTopic(String topic) {
    _firebaseMessaging.subscribeToTopic(topic);
    debugPrint('Subscribed to topic: $topic');
  }

  void unsubscribeFromTopic(String topic) {
    _firebaseMessaging.unsubscribeFromTopic(topic);
    debugPrint('Unsubscribed from topic: $topic');
  }
}

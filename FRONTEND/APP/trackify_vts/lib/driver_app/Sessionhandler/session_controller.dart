import 'dart:async';
import 'dart:convert';

import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SessionController extends GetxController {
  var isLoggedIn = false.obs;
  var userId = ''.obs;
  var username = ''.obs;
  var token = ''.obs;
  var emailId = ''.obs;
  final driverData = Rxn<Map<String, dynamic>>();

  late SharedPreferences prefs; // Use late to ensure initialization
  final Completer<void> _initCompleter = Completer<void>();

  SessionController() {
    _initializePrefs();
  }

  Future<void> _initializePrefs() async {
    prefs = await SharedPreferences.getInstance();
    _applySessionFromPrefs();
    if (!_initCompleter.isCompleted) {
      _initCompleter.complete();
    }
  }

  Future<void> ensureInitialized() async {
    await _initCompleter.future;
  }

  void _applySessionFromPrefs() {
    isLoggedIn.value = prefs.getBool('isLoggedIn') ?? false;
    userId.value = prefs.getString('userId') ?? '';
    username.value = prefs.getString('username') ?? '';
    emailId.value = prefs.getString('emailId') ?? '';
    token.value = prefs.getString('token') ?? '';
    final storedDriverData = prefs.getString('driverData');
    if (storedDriverData != null && storedDriverData.isNotEmpty) {
      try {
        final decoded = jsonDecode(storedDriverData);
        driverData.value = decoded is Map<String, dynamic> ? Map<String, dynamic>.from(decoded) : null;
      } catch (_) {
        driverData.value = null;
      }
    } else {
      driverData.value = null;
    }
  }

  @override
  void onInit() {
    super.onInit();
    // No need to call loadSession here as it's handled in _initializePrefs
  }

  // Load session from shared preferences
  Future<void> loadSession() async {
    await ensureInitialized();
    _applySessionFromPrefs();
  }

  // Save session to shared preferences
  Future<void> saveSession({
    required String userId,
    required String emailId,
    required String token,
    String? username,
    Map<String, dynamic>? rawData,
  }) async {
    await ensureInitialized();
    await prefs.setBool('isLoggedIn', true);
    await prefs.setString('userId', userId);
    await prefs.setString('emailId', emailId);
    await prefs.setString('token', token);
    if (username != null && username.isNotEmpty) {
      await prefs.setString('username', username);
      this.username.value = username; // Update username only if provided
    } else {
      await prefs.remove('username');
      this.username.value = '';
    }
    if (rawData != null) {
      await prefs.setString('driverData', jsonEncode(rawData));
      driverData.value = rawData;
    } else {
      await prefs.remove('driverData');
      driverData.value = null;
    }
    this.userId.value = userId;
    this.emailId.value = emailId;
    this.token.value = token;
    isLoggedIn.value = true;
  }

  // Clear session data
  Future<void> clearSession() async {
    await ensureInitialized();
    await prefs.clear();
    _applySessionFromPrefs();
  }
}
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

  var sessionError = ''.obs;
  var isSessionValid = true.obs;
  var sessionExpiryTime = Rxn<DateTime>();

  late SharedPreferences prefs; // Use late to ensure initialization
  final Completer<void> _initCompleter = Completer<void>();

  static const String _sessionTimestampKey = 'sessionTimestamp';
  static const String _sessionExpiryKey = 'sessionExpiry';
  static const int _sessionDurationHours = 24;

  SessionController() {
    _initializePrefs();
  }

  Future<void> _initializePrefs() async {
    try {
      prefs = await SharedPreferences.getInstance();
      _applySessionFromPrefs();
      _validateSession();
      if (!_initCompleter.isCompleted) {
        _initCompleter.complete();
      }
    } catch (e) {
      if (!_initCompleter.isCompleted) {
        _initCompleter.complete();
      }
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

    final expiryStr = prefs.getString(_sessionExpiryKey);
    if (expiryStr != null && expiryStr.isNotEmpty) {
      try {
        sessionExpiryTime.value = DateTime.parse(expiryStr);
      } catch (_) {
        sessionExpiryTime.value = null;
      }
    }

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

  void _validateSession() {
    if (!isLoggedIn.value) {
      isSessionValid.value = true;
      return;
    }

    if (token.value.isEmpty) {
      isSessionValid.value = false;
      return;
    }

    if (sessionExpiryTime.value != null) {
      final now = DateTime.now();
      if (now.isAfter(sessionExpiryTime.value!)) {
        isSessionValid.value = false;
        return;
      }
    }

    isSessionValid.value = true;
  }


  // Load session from shared preferences
  Future<void> loadSession() async {
    await ensureInitialized();
    _applySessionFromPrefs();
    _validateSession();
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
    
    final now = DateTime.now();
    final expiry = now.add(const Duration(hours: _sessionDurationHours));

    await prefs.setBool('isLoggedIn', true);
    await prefs.setString('userId', userId);
    await prefs.setString('emailId', emailId);
    await prefs.setString('token', token);
    await prefs.setString(_sessionTimestampKey, now.toIso8601String());
    await prefs.setString(_sessionExpiryKey, expiry.toIso8601String());

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
    this.sessionExpiryTime.value = expiry;
    isLoggedIn.value = true;
    isSessionValid.value = true;
  }

  // Clear session data
  Future<void> clearSession() async {
    await ensureInitialized();
    await prefs.remove('isLoggedIn');
    await prefs.remove('userId');
    await prefs.remove('username');
    await prefs.remove('emailId');
    await prefs.remove('token');
    await prefs.remove('driverData');
    await prefs.remove(_sessionTimestampKey);
    await prefs.remove(_sessionExpiryKey);
    
    _applySessionFromPrefs();
    isSessionValid.value = true;
  }
}
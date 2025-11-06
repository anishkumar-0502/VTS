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
  final parentData = Rxn<Map<String, dynamic>>();

  late SharedPreferences prefs;
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
    final storedParentData = prefs.getString('parentData');
    if (storedParentData != null && storedParentData.isNotEmpty) {
      try {
        final decoded = jsonDecode(storedParentData);
        parentData.value = decoded is Map<String, dynamic> ? Map<String, dynamic>.from(decoded) : null;
      } catch (_) {
        parentData.value = null;
      }
    } else {
      parentData.value = null;
    }
  }


  Future<void> loadSession() async {
    await ensureInitialized();
    _applySessionFromPrefs();
  }

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
      this.username.value = username;
    } else {
      await prefs.remove('username');
      this.username.value = '';
    }
    if (rawData != null) {
      await prefs.setString('parentData', jsonEncode(rawData));
      parentData.value = rawData;
    } else {
      await prefs.remove('parentData');
      parentData.value = null;
    }
    this.userId.value = userId;
    this.emailId.value = emailId;
    this.token.value = token;
    isLoggedIn.value = true;
  }

  Future<void> clearSession() async {
    await ensureInitialized();
    await prefs.clear();
    _applySessionFromPrefs();
  }
}

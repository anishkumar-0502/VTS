import 'dart:async';
import 'dart:convert';

import 'package:get/get.dart';
import '../../utilities/shared_prefs_mock.dart';

class SessionController extends GetxController {
  var isLoggedIn = false.obs;
  var userId = ''.obs;
  var username = ''.obs;
  var token = ''.obs;
  var emailId = ''.obs;
  final parentData = Rxn<Map<String, dynamic>>();
  
  var sessionError = ''.obs;
  var isSessionValid = true.obs;
  var sessionExpiryTime = Rxn<DateTime>();

  late SharedPreferencesMock prefs;
  final Completer<void> _initCompleter = Completer<void>();
  
  static const String _sessionTimestampKey = 'sessionTimestamp';
  static const String _sessionExpiryKey = 'sessionExpiry';
  static const int _sessionDurationHours = 24;

  SessionController() {
    _initializePrefs();
  }

  Future<void> _initializePrefs() async {
    try {
      prefs = await SharedPreferencesMock.getInstance();
      _applySessionFromPrefs();
      _validateSession();
      if (!_initCompleter.isCompleted) {
        _initCompleter.complete();
      }
    } catch (e) {
      print('[SessionController] Error initializing preferences: $e');
      if (!_initCompleter.isCompleted) {
        _initCompleter.complete();
      }
    }
  }

  Future<void> ensureInitialized() async {
    await _initCompleter.future;
  }

  void _applySessionFromPrefs() {
    try {
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
      
      final storedParentData = prefs.getString('parentData');
      if (storedParentData != null && storedParentData.isNotEmpty) {
        try {
          final decoded = jsonDecode(storedParentData);
          parentData.value = decoded is Map<String, dynamic> ? Map<String, dynamic>.from(decoded) : null;
        } catch (e) {
          print('[SessionController] Error decoding parentData: $e');
          parentData.value = null;
        }
      } else {
        parentData.value = null;
      }
      
      sessionError.value = '';
      print('[SessionController] ✅ Session loaded from storage');
    } catch (e) {
      print('[SessionController] ❌ Error applying session: $e');
      sessionError.value = 'Failed to load session data';
    }
  }

  void _validateSession() {
    if (!isLoggedIn.value) {
      isSessionValid.value = true;
      return;
    }

    if (token.value.isEmpty) {
      print('[SessionController] ⚠️ Token is empty');
      isSessionValid.value = false;
      sessionError.value = 'Session token is missing';
      return;
    }

    if (userId.value.isEmpty) {
      print('[SessionController] ⚠️ User ID is empty');
      isSessionValid.value = false;
      sessionError.value = 'User ID is missing';
      return;
    }

    if (sessionExpiryTime.value != null) {
      final now = DateTime.now();
      if (now.isAfter(sessionExpiryTime.value!)) {
        print('[SessionController] ⚠️ Session expired');
        isSessionValid.value = false;
        sessionError.value = 'Session has expired';
        return;
      }
    }

    isSessionValid.value = true;
    sessionError.value = '';
    print('[SessionController] ✅ Session is valid');
  }

  Future<void> loadSession() async {
    try {
      await ensureInitialized();
      _applySessionFromPrefs();
      _validateSession();
      print('[SessionController] ✅ Session reloaded');
    } catch (e) {
      print('[SessionController] ❌ Error loading session: $e');
      sessionError.value = 'Failed to load session';
    }
  }

  Future<void> saveSession({
    required String userId,
    required String emailId,
    required String token,
    String? username,
    Map<String, dynamic>? rawData,
  }) async {
    try {
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
      this.sessionExpiryTime.value = expiry;
      isLoggedIn.value = true;
      isSessionValid.value = true;
      sessionError.value = '';
      
      print('[SessionController] ✅ Session saved successfully');
      print('[SessionController] ⏰ Session expiry: ${expiry.toString()}');
    } catch (e) {
      print('[SessionController] ❌ Error saving session: $e');
      sessionError.value = 'Failed to save session';
      isSessionValid.value = false;
      rethrow;
    }
  }

  bool isSessionExpiring({int warningMinutes = 5}) {
    if (sessionExpiryTime.value == null) return false;
    
    final now = DateTime.now();
    final warningTime = sessionExpiryTime.value!.subtract(Duration(minutes: warningMinutes));
    
    return now.isAfter(warningTime) && now.isBefore(sessionExpiryTime.value!);
  }

  Future<void> extendSession({int hours = _sessionDurationHours}) async {
    try {
      await ensureInitialized();
      
      final expiry = DateTime.now().add(Duration(hours: hours));
      await prefs.setString(_sessionExpiryKey, expiry.toIso8601String());
      
      this.sessionExpiryTime.value = expiry;
      print('[SessionController] ✅ Session extended until ${expiry.toString()}');
    } catch (e) {
      print('[SessionController] ❌ Error extending session: $e');
      sessionError.value = 'Failed to extend session';
    }
  }

  Future<void> clearSession() async {
    try {
      await ensureInitialized();
      
      print('[SessionController] 🔄 Clearing session...');
      await prefs.remove('isLoggedIn');
      await prefs.remove('userId');
      await prefs.remove('username');
      await prefs.remove('emailId');
      await prefs.remove('token');
      await prefs.remove('parentData');
      await prefs.remove(_sessionTimestampKey);
      await prefs.remove(_sessionExpiryKey);
      
      _applySessionFromPrefs();
      isSessionValid.value = true;
      sessionError.value = '';
      
      print('[SessionController] ✅ Session cleared successfully');
    } catch (e) {
      print('[SessionController] ❌ Error clearing session: $e');
      sessionError.value = 'Failed to clear session';
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      print('[SessionController] 🚪 Logging out...');
      await clearSession();
      print('[SessionController] ✅ Logout successful');
    } catch (e) {
      print('[SessionController] ❌ Error during logout: $e');
      rethrow;
    }
  }

  Map<String, dynamic> getSessionInfo() {
    return {
      'isLoggedIn': isLoggedIn.value,
      'isValid': isSessionValid.value,
      'userId': userId.value,
      'emailId': emailId.value,
      'username': username.value,
      'expiryTime': sessionExpiryTime.value?.toIso8601String(),
      'error': sessionError.value,
    };
  }

  @override
  void onClose() {
    super.onClose();
    print('[SessionController] 🔴 SessionController disposed');
  }
}

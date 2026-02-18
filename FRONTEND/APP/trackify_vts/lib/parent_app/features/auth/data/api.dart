import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:trackify_vts/parent_app/features/auth/data/url.dart';

import '../../../../utilities/network_utils.dart';
import '../../../../utilities/exception/exception.dart';

class AuthAPICalls {
  String _getDefaultErrorMessage(int statusCode) {
    switch (statusCode) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Invalid credentials. Please try again.';
      case 403:
        return 'You do not have permission to access this resource.';
      case 404:
        return 'The requested resource was not found.';
      case 500:
        return 'An error occurred on the server. Please try again later.';
      case 503:
        return 'Service is temporarily unavailable. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  Map<String, dynamic> _handleResponse(http.Response response, {bool autoLogout = true}) {
    return NetworkUtils.handleResponse(response, isDriver: false, autoLogout: autoLogout);
  }

  Future<Map<String, dynamic>> loginParent(
    String email,
    String password,
  ) async {
    final url = AuthUrl.login;

    try {
      final response = await http
          .post(
            Uri.parse(url),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'email': email,
              'password': password,
              'role_id': 4,
            }),
          )
          .timeout(
            const Duration(seconds: 60),
            onTimeout: () {
              throw TimeoutException(
                408,
                'Request timed out. Please try again.',
              );
            },
          );

      debugPrint('Parent Response Status Code: ${response.statusCode}');
      debugPrint('Parent Response Body: ${response.body}');

      return _handleResponse(response, autoLogout: false);
    } on TimeoutException {
      throw HttpException(408, 'Request timed out. Please try again.');
    } on http.ClientException {
      throw HttpException(
        503,
        'Unable to reach the server. \nPlease check your connection or try again later.',
      );
    } catch (e) {
      if (e is HttpException) rethrow;
      debugPrint('Parent login error: $e');
      throw HttpException(500, _getDefaultErrorMessage(500));
    }
  }

  Future<Map<String, dynamic>> registerFcmToken(
    String token,
    String authToken,
  ) async {
    final url = AuthUrl.registerFcmToken;

    try {
      final response = await http
          .post(
            Uri.parse(url),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $authToken',
            },
            body: jsonEncode({
              'fcm_token': token,
            }),
          )
          .timeout(
            const Duration(seconds: 30),
            onTimeout: () {
              throw TimeoutException(
                408,
                'FCM registration request timed out.',
              );
            },
          );

      debugPrint('FCM Registration Status Code: ${response.statusCode}');
      debugPrint('FCM Registration Response: ${response.body}');

      return _handleResponse(response);
    } on TimeoutException {
      throw HttpException(408, 'FCM registration timed out.');
    } on http.ClientException {
      throw HttpException(
        503,
        'Unable to register FCM token. Please check your connection.',
      );
    } catch (e) {
      if (e is HttpException) rethrow;
      debugPrint('FCM registration error: $e');
      throw HttpException(500, _getDefaultErrorMessage(500));
    }
  }
}

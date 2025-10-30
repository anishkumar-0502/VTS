import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:trackify_vts/parent_app/features/auth/data/url.dart';

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

  Map<String, dynamic> _handleResponse(http.Response response) {
    Map<String, dynamic> responseBody;

    try {
      responseBody = jsonDecode(response.body);
    } catch (e) {
      throw HttpException(
        response.statusCode,
        _getDefaultErrorMessage(response.statusCode),
      );
    }

    return responseBody;
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

      return _handleResponse(response);
    } on TimeoutException {
      throw HttpException(408, 'Request timed out. Please try again.');
    } on http.ClientException {
      throw HttpException(
        503,
        'Unable to reach the server. \nPlease check your connection or try again later.',
      );
    } catch (e) {
      debugPrint('Parent login error: $e');
      throw HttpException(500, _getDefaultErrorMessage(500));
    }
  }
}

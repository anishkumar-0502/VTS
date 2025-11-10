import 'dart:convert';
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:trackify_vts/driver_app/features/scheduled_trips/data/url.dart';

import '../../../../utilities/exception/exception.dart';

class ScheduledTripsAPICalls {
  String _getDefaultErrorMessage(int statusCode) {
    switch (statusCode) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Unauthorized. Please log in again.';
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

  Future<Map<String, dynamic>> getAllScheduledTrips(String token) async {
    final url = ScheduledTripsUrl.allTrips;

    try {
      final response = await http
          .get(
            Uri.parse(url),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
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

      debugPrint('Response Status Code: ${response.statusCode}');
      debugPrint('Response Body: ${response.body}');

      return _handleResponse(response);
    } on TimeoutException {
      throw HttpException(408, 'Request timed out. Please try again.');
    } on http.ClientException {
      throw HttpException(
        503,
        'Unable to reach the server. \nPlease check your connection or try again later.',
      );
    } catch (e) {
      debugPrint("Error: $e");
      throw HttpException(500, _getDefaultErrorMessage(500));
    }
  }

  Future<Map<String, dynamic>> getTodayScheduledTrips(String token) async {
    final url = ScheduledTripsUrl.todayTrips;

    try {
      final response = await http
          .get(
            Uri.parse(url),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
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

      debugPrint('Response Status Code: ${response.statusCode}');
      debugPrint('Response Body: ${response.body}');

      return _handleResponse(response);
    } on TimeoutException {
      throw HttpException(408, 'Request timed out. Please try again.');
    } on http.ClientException {
      throw HttpException(
        503,
        'Unable to reach the server. \nPlease check your connection or try again later.',
      );
    } catch (e) {
      debugPrint("Error: $e");
      throw HttpException(500, _getDefaultErrorMessage(500));
    }
  }

  Future<Map<String, dynamic>> getActiveTrip(String token) async {
    final url = ScheduledTripsUrl.activeTrip;

    try {
      final response = await http
          .get(
            Uri.parse(url),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
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

      debugPrint('Active Trip Response Status Code: ${response.statusCode}');
      debugPrint('Active Trip Response Body: ${response.body}');

      return _handleResponse(response);
    } on TimeoutException {
      throw HttpException(408, 'Request timed out. Please try again.');
    } on http.ClientException {
      throw HttpException(
        503,
        'Unable to reach the server. \nPlease check your connection or try again later.',
      );
    } catch (e) {
      debugPrint("Active Trip Error: $e");
      throw HttpException(500, _getDefaultErrorMessage(500));
    }
  }

  Future<Map<String, dynamic>> startScheduledTrip({
    required String token,
    required String scheduledTripId,
  }) async {
    final url = ScheduledTripsUrl.startTrip(scheduledTripId);

    try {
      final response = await http
          .post(
            Uri.parse(url),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(
            const Duration(seconds: 60),
            onTimeout: () {
              throw TimeoutException(
                408,
                'Start trip request timed out. Please try again.',
              );
            },
          );

      debugPrint('Start Trip Status Code: ${response.statusCode}');
      debugPrint('Start Trip Response Body: ${response.body}');

      return _handleResponse(response);
    } on TimeoutException {
      throw HttpException(
        408,
        'Start trip request timed out. Please try again.',
      );
    } on http.ClientException {
      throw HttpException(
        503,
        'Unable to reach the server. \nPlease check your connection or try again later.',
      );
    } catch (e) {
      debugPrint("Start Trip Error: $e");
      throw HttpException(500, _getDefaultErrorMessage(500));
    }
  }

  Future<Map<String, dynamic>> endTrip({
    required String token,
    required String tripId,
    required Map<String, dynamic> body,
  }) async {
    final url = ScheduledTripsUrl.endTrip(tripId);

    try {
      final response = await http
          .put(
            Uri.parse(url),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode(body),
          )
          .timeout(
            const Duration(seconds: 60),
            onTimeout: () {
              throw TimeoutException(
                408,
                'End trip request timed out. Please try again.',
              );
            },
          );

      debugPrint('End Trip Status Code: ${response.statusCode}');
      debugPrint('End Trip Response Body: ${response.body}');

      return _handleResponse(response);
    } on TimeoutException {
      throw HttpException(408, 'End trip request timed out. Please try again.');
    } on http.ClientException {
      throw HttpException(
        503,
        'Unable to reach the server. \nPlease check your connection or try again later.',
      );
    } catch (e) {
      debugPrint("End Trip Error: $e");
      throw HttpException(500, _getDefaultErrorMessage(500));
    }
  }
}

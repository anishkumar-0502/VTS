import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:trackify_vts/driver_app/features/dashboard/data/url.dart';

import '../../../../utilities/network_utils.dart';
import '../../../../utilities/exception/exception.dart';

class DashboardApicalls {
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
    return NetworkUtils.handleResponse(response, isDriver: true);
  }

  Future<Map<String, dynamic>> gettodaystrip(String token) async {
    final url = Dashboardurl.tripsfortoday;

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
      debugPrint('Response profile Body: ${response.body}');

      return _handleResponse(response);
    } on TimeoutException {
      throw HttpException(408, 'Request timed out. Please try again.');
    } on http.ClientException {
      throw HttpException(
        503,
        'Unable to reach the server. \nPlease check your connection or try again later.',
      );
    } catch (e) {
      if (e is HttpException) rethrow;
      debugPrint("Error: $e");
      throw HttpException(500, _getDefaultErrorMessage(500));
    }
  }

  Future<Map<String, dynamic>> getDriverTrips(String token) async {
    final url = Dashboardurl.driverTrips;

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

      debugPrint('Driver trips Status Code: ${response.statusCode}');
      debugPrint('Driver trips Body: ${response.body}');

      return _handleResponse(response);
    } on TimeoutException {
      throw HttpException(408, 'Request timed out. Please try again.');
    } on http.ClientException {
      throw HttpException(
        503,
        'Unable to reach the server. \nPlease check your connection or try again later.',
      );
    } catch (e) {
      if (e is HttpException) rethrow;
      debugPrint("Driver trips Error: $e");
      throw HttpException(500, _getDefaultErrorMessage(500));
    }
  }

  Future<Map<String, dynamic>> getTripDetail(
    String token,
    String tripId,
  ) async {
    final url = Dashboardurl.tripDetail(tripId);

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

      debugPrint('Driver trip detail Status Code: ${response.statusCode}');
      debugPrint('Driver trip detail Body: ${response.body}');

      return _handleResponse(response);
    } on TimeoutException {
      throw HttpException(408, 'Request timed out. Please try again.');
    } on http.ClientException {
      throw HttpException(
        503,
        'Unable to reach the server. \nPlease check your connection or try again later.',
      );
    } catch (e) {
      if (e is HttpException) rethrow;
      debugPrint("Driver trip detail Error: $e");
      throw HttpException(500, _getDefaultErrorMessage(500));
    }
  }
}

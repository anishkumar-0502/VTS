import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../utilities/network_utils.dart';
import '../../../../utilities/exception/exception.dart';
import 'url.dart';

class LiveTrackingApiClient {
  // ... (Your existing code for httpClient, getRequest, and _handleResponse) ...
  final http.Client httpClient;

  LiveTrackingApiClient({required this.httpClient});

  // Reusable GET request handler for authenticated endpoints
  Future<Map<String, dynamic>> getRequest(String fullUrl, {required String token}) async {
    final uri = Uri.parse(fullUrl);
    final headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };

    try {
      final response = await httpClient.get(uri, headers: headers).timeout(
        const Duration(seconds: 15),
        onTimeout: () => throw TimeoutException(408, 'Request timed out.'),
      );
      
      return _handleResponse(response);

    } on TimeoutException {
      throw HttpException(408, 'Request timed out. Please check your network.');
    } on http.ClientException {
      throw HttpException(503, 'Unable to reach the server. Check connection.');
    } catch (e) {
      // Re-throw if it's already an HttpException, otherwise wrap it
      if (e is HttpException) rethrow;
      throw HttpException(500, 'An unexpected error occurred: ${e.toString()}');
    }
  }

  Map<String, dynamic> _handleResponse(http.Response response) {
    final responseBody = NetworkUtils.handleResponse(response, isDriver: false);

    if (response.statusCode >= 400) {
      final errorMessage = responseBody['message']?.toString() ?? 'Server error';
      throw HttpException(response.statusCode, errorMessage);
    }

    return responseBody;
  }
}

// Concrete API implementation for Live Tracking
class LiveTrackingApi {
  final LiveTrackingApiClient _client;

  LiveTrackingApi(this._client);
  
  // API 1: /parent/current-trip?childId={{child_id}}
  Future<Map<String, dynamic>> getCurrentTrip(String token, String childId) {
    final url = LiveTrackingUrl.getCurrentTrip(childId);
    return _client.getRequest(url, token: token);
  }
  
  // API 2: /parent/track-child?childId={{child_id}}
  Future<Map<String, dynamic>> getTrackChild(String token, String childId) {
    final url = LiveTrackingUrl.getTrackChild(childId);
    return _client.getRequest(url, token: token);
  }

  // API 3: /parent/passenger-status?tripId={{trip_id}}&childId={{child_id}}
  Future<Map<String, dynamic>> getPassengerStatus(String token, String tripId, String childId) {
    final url = LiveTrackingUrl.getPassengerStatus(tripId, childId);
    return _client.getRequest(url, token: token);
  }

  // API 4: /parent/next-stop?tripId={{trip_id}}&childId={{child_id}}
  Future<Map<String, dynamic>> getNextStop(String token, String tripId, String childId) {
    final url = LiveTrackingUrl.getNextStop(tripId, childId);
    return _client.getRequest(url, token: token);
  }
}
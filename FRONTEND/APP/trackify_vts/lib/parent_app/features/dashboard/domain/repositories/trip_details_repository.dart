import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../../core/core.dart';
import '../models/trip_details_models.dart';

class TripDetailsRepository {
  Future<TripDetailsResponse> getTripDetails(String token, String tripId) async {
    try {
      final response = await http.get(
        Uri.parse('${trackify_vts.baseUrl}/driver/trips/$tripId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return TripDetailsResponse.fromJson(data);
      } else {
        return TripDetailsResponse(
          error: true,
          message: 'Failed to fetch trip details',
        );
      }
    } catch (e) {
      return TripDetailsResponse(
        error: true,
        message: 'Network error: $e',
      );
    }
  }
}
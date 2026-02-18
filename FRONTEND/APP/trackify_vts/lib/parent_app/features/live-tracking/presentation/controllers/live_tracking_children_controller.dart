import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:http/http.dart' as http;
import '../../../../../core/core.dart';
import '../../../../Sessionhandler/session_controller.dart';

class LiveTrackingChildrenController extends GetxController {
  final SessionController sessionController = Get.find<SessionController>();
  
  final Rxn<Map<String, dynamic>> profileData = Rxn<Map<String, dynamic>>();
  final RxBool isLoading = true.obs;
  final RxString errorMessage = ''.obs;

  @override
  void onInit() {
    super.onInit();
    fetchProfile();
    
    // Listen to token changes to refresh data when a new user logs in
    ever(sessionController.token, (String token) {
      if (token.isNotEmpty) {
        debugPrint('[LiveTrackingChildrenController] Token changed, refreshing profile...');
        fetchProfile();
      } else {
        // Clear data if logged out
        profileData.value = null;
        errorMessage.value = '';
      }
    });
  }

  Future<void> fetchProfile() async {
    try {
      isLoading.value = true;
      errorMessage.value = '';

      final token = sessionController.token.value;
      if (token.isEmpty) {
        throw Exception('Token not found');
      }

      final response = await http.get(
        Uri.parse('${trackify_vts.baseUrl}/parent/profile'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final jsonData = jsonDecode(response.body);
        profileData.value = jsonData['data'];
      } else {
        throw Exception('Failed to fetch profile');
      }
    } catch (e) {
      errorMessage.value = 'Error: ${e.toString()}';
    } finally {
      isLoading.value = false;
    }
  }

  Future<String> fetchTripStatus(String childId) async {
    try {
      final token = sessionController.token.value;
      final response = await http.get(
        Uri.parse('${trackify_vts.baseUrl}/parent/current-trip?childId=$childId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final jsonData = jsonDecode(response.body);
        return jsonData['data']?['status'] ?? 'Unknown';
      }
    } catch (e) {
      debugPrint('Error fetching trip status: $e');
    }
    return 'Unknown';
  }

  Future<Map<String, dynamic>?> fetchNextStop(String childId) async {
    try {
      final token = sessionController.token.value;
      
      final tripResponse = await http.get(
        Uri.parse('${trackify_vts.baseUrl}/parent/current-trip?childId=$childId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 15));

      if (tripResponse.statusCode != 200) return null;

      final tripJson = jsonDecode(tripResponse.body);
      final tripId = tripJson['data']?['associated_trip_id'] as String?;

      if (tripId == null || tripId.isEmpty) return null;

      final nextStopResponse = await http.get(
        Uri.parse(
            '${trackify_vts.baseUrl}/parent/next-stop?tripId=$tripId&childId=$childId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 15));

      if (nextStopResponse.statusCode == 200) {
        final jsonData = jsonDecode(nextStopResponse.body);
        return jsonData['data'] as Map<String, dynamic>?;
      }
      return null;
    } catch (e) {
      debugPrint('Error fetching next stop: $e');
      return null;
    }
  }
}

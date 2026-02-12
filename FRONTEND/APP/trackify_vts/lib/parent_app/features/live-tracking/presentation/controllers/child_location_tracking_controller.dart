import "package:flutter/foundation.dart";
import 'package:get/get.dart';
import 'package:latlong2/latlong.dart';
import 'package:geocoding/geocoding.dart';

import 'dart:convert'; 
import 'package:http/http.dart' as http;
import 'package:flutter_map/flutter_map.dart';

import '../../../../Sessionhandler/session_controller.dart';
import '../../domain/repositories/live_tracking_repository.dart';
import '../../../../../utilities/exception/exception.dart' as exceptions;
import '../../../../../core/core.dart';

class ChildLocationTrackingController extends GetxController {
  final LiveTrackingRepository repository;
  final SessionController sessionController = Get.find<SessionController>();

  late final String childId;
  late final String tripId;

  var isLoading = true.obs;
  var errorMessage = ''.obs;

  var childLocationLatLng = Rxn<LatLng>();
  var childLocationAddress = ''.obs;
  var childLocationName = ''.obs;

  var nextStopLatLng = Rxn<LatLng>();
  var nextStopAddress = ''.obs;
  var nextStopName = ''.obs;

  var childStandingLocation = Rxn<LatLng>();
  var childStandingLocationName = ''.obs;
  var currentZoom = 14.0.obs;

  late MapController mapController;
  
  ChildLocationTrackingController({required this.repository}) {
    mapController = MapController();
  }

  @override
  void onInit() {
    super.onInit();
    debugPrint('[ChildLocationTrackingController] onInit called');
    debugPrint('[ChildLocationTrackingController] Get.arguments: ${Get.arguments}');
    
    final args = Get.arguments as Map<String, dynamic>?;
    childId = args?['childId'] as String? ?? '';
    tripId = args?['tripId'] as String? ?? '';

    debugPrint('[ChildLocationTrackingController] childId: $childId, tripId: $tripId');

   if (childId.isNotEmpty) {
      debugPrint('[ChildLocationTrackingController] Fetching child location and next stop');
      fetchChildLocationAndNextStop();

      debugPrint('[ChildLocationTrackingController] Fetching child standing location');
    fetchChildStandingLocation();
    } else {
      debugPrint('[ChildLocationTrackingController] ERROR: childId or tripId is empty');
     isLoading(false);
    errorMessage.value = 'Error: Child ID is missing. Cannot track live location.';
    }
  }

  Future<void> fetchChildLocationAndNextStop() async {
    try {
      isLoading(true);
      errorMessage('');

      final token = sessionController.token.value;
      debugPrint('[ChildLocationTrackingController] Token: ${token.isNotEmpty ? '***' : 'EMPTY'}');
      
      if (token.isEmpty) {
        debugPrint('[ChildLocationTrackingController] ERROR: No authentication token');
        errorMessage('No authentication token found');
        return;
      }

      debugPrint('[ChildLocationTrackingController] Fetching child location for childId: $childId');
      final childLocation = await repository.getChildLocation(token, childId);
      debugPrint('[ChildLocationTrackingController] Child location received: ${childLocation.location}');
      
      childLocationLatLng.value = childLocation.location;
      childLocationName.value = childLocation.name;
      debugPrint('[ChildLocationTrackingController] Child location set - name: ${childLocation.name}');

      debugPrint('[ChildLocationTrackingController] Converting coordinates to address');
      final childAddress =
          await _getAddressFromCoordinates(childLocation.location);
      childLocationAddress.value = childAddress;
      debugPrint('[ChildLocationTrackingController] Child address: $childAddress');

      debugPrint('[ChildLocationTrackingController] Fetching next stop for tripId: $tripId, childId: $childId');
      final nextStop =
          await repository.getNextStop(token, tripId, childId);
      debugPrint('[ChildLocationTrackingController] Next stop received: ${nextStop.location}');
      
      nextStopLatLng.value = nextStop.location;
      nextStopName.value = nextStop.name;
      debugPrint('[ChildLocationTrackingController] Next stop set - name: ${nextStop.name}');

      debugPrint('[ChildLocationTrackingController] Converting next stop coordinates to address');
      final nextStopAddr =
          await _getAddressFromCoordinates(nextStop.location);
      nextStopAddress.value = nextStopAddr;
      debugPrint('[ChildLocationTrackingController] Next stop address: $nextStopAddr');

      errorMessage('');
      debugPrint('[ChildLocationTrackingController] Fetch complete - SUCCESS');
    } on exceptions.HttpException catch (e) {
      debugPrint('[ChildLocationTrackingController] HttpException: ${e.message}');
      errorMessage('Server error: ${e.message}');
    } catch (e, stackTrace) {
      debugPrint('[ChildLocationTrackingController] Exception: $e');
      debugPrint('[ChildLocationTrackingController] StackTrace: $stackTrace');
      errorMessage('Error loading location: ${e.toString()}');
    } finally {
      isLoading(false);
    }
  }

Future<void> fetchChildStandingLocation() async {
  if (childId.isEmpty) return;

  final baseUrl = trackify_vts.baseUrl; // Assuming trackify_vts.baseUrl is defined in core.dart
  final url = Uri.parse('$baseUrl/parent/track-child?childId=$childId');

  try {
    final token = sessionController.token.value;
    final response = await http.get(
      url,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    ).timeout(const Duration(seconds: 10));

    if (response.statusCode == 200) {
      final jsonBody = json.decode(response.body);
      final data = jsonBody['data'] as Map<String, dynamic>?;

      if (jsonBody['error'] == false && data != null) {
        final lat = data['latitude'] as double?;
        final lng = data['longitude'] as double?;
        final name = data['name'] as String? ?? 'Standing Location';

        if (lat != null && lng != null) {
          childStandingLocation.value = LatLng(lat, lng);
          childStandingLocationName.value = name;
          debugPrint('[ChildLocationTrackingController] Standing Location received: ($lat, $lng) - $name');
        }
      } else {
        debugPrint('[ChildLocationTrackingController] Failed to retrieve standing location: ${jsonBody['message']}');
      }
    } else {
      debugPrint('[ChildLocationTrackingController] Standing Location API failed with status code: ${response.statusCode}');
    }
  } catch (e) {
    debugPrint('[ChildLocationTrackingController] Error fetching standing location: $e');
  }
}

  Future<String> _getAddressFromCoordinates(LatLng location) async {
    try {
      final placemarks = await placemarkFromCoordinates(
        location.latitude,
        location.longitude,
      );

      if (placemarks.isNotEmpty) {
        final place = placemarks.first;
        final parts = <String>[];

        if (place.street?.isNotEmpty ?? false) parts.add(place.street!);
        if (place.subLocality?.isNotEmpty ?? false) parts.add(place.subLocality!);
        if (place.locality?.isNotEmpty ?? false) parts.add(place.locality!);
        if (place.administrativeArea?.isNotEmpty ?? false) parts.add(place.administrativeArea!);
        if (place.postalCode?.isNotEmpty ?? false) parts.add(place.postalCode!);

        return parts.isNotEmpty ? parts.join(', ') : 'Location Found';
      }
    } catch (e) {
      debugPrint('Geocoding error: $e');
    }
    return '${location.latitude.toStringAsFixed(4)}, ${location.longitude.toStringAsFixed(4)}';
  }
}

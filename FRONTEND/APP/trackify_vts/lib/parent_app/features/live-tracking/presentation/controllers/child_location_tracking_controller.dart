import 'package:get/get.dart';
import 'package:latlong2/latlong.dart';
import 'package:geocoding/geocoding.dart';

import 'dart:convert'; 
import 'package:http/http.dart' as http;
import 'package:flutter_map/flutter_map.dart';

import '../../../../Sessionhandler/session_controller.dart';
import '../../domain/repositories/live_tracking_repository.dart';
import '../../../../../utilities/exception/exception.dart' as exceptions;
import '../../../../../services/open_route_service.dart';
import '../../../../../core/core.dart';

class ChildLocationTrackingController extends GetxController {
  final LiveTrackingRepository repository;
  final SessionController sessionController = Get.find<SessionController>();
  late final OpenRouteService openRouteService;

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

  var routePolylinePoints = <LatLng>[].obs;
  late MapController mapController;
  
  ChildLocationTrackingController({required this.repository}) {
    openRouteService = OpenRouteService(trackify_vts.openRouteServiceApiKey);
    mapController = MapController();
  }

  @override
  void onInit() {
    super.onInit();
    print('[ChildLocationTrackingController] onInit called');
    print('[ChildLocationTrackingController] Get.arguments: ${Get.arguments}');
    
    final args = Get.arguments as Map<String, dynamic>?;
    childId = args?['childId'] as String? ?? '';
    tripId = args?['tripId'] as String? ?? '';

    print('[ChildLocationTrackingController] childId: $childId, tripId: $tripId');

   if (childId.isNotEmpty) {
      print('[ChildLocationTrackingController] Fetching child location and next stop');
      fetchChildLocationAndNextStop();

      print('[ChildLocationTrackingController] Fetching child standing location');
    fetchChildStandingLocation();
    } else {
      print('[ChildLocationTrackingController] ERROR: childId or tripId is empty');
     isLoading(false);
    errorMessage.value = 'Error: Child ID is missing. Cannot track live location.';
    }
  }

  Future<void> fetchChildLocationAndNextStop() async {
    try {
      isLoading(true);
      errorMessage('');

      final token = sessionController.token.value;
      print('[ChildLocationTrackingController] Token: ${token.isNotEmpty ? '***' : 'EMPTY'}');
      
      if (token.isEmpty) {
        print('[ChildLocationTrackingController] ERROR: No authentication token');
        errorMessage('No authentication token found');
        return;
      }

      print('[ChildLocationTrackingController] Fetching child location for childId: $childId');
      final childLocation = await repository.getChildLocation(token, childId);
      print('[ChildLocationTrackingController] Child location received: ${childLocation.location}');
      
      childLocationLatLng.value = childLocation.location;
      childLocationName.value = childLocation.name;
      print('[ChildLocationTrackingController] Child location set - name: ${childLocation.name}');

      print('[ChildLocationTrackingController] Converting coordinates to address');
      final childAddress =
          await _getAddressFromCoordinates(childLocation.location);
      childLocationAddress.value = childAddress;
      print('[ChildLocationTrackingController] Child address: $childAddress');

      print('[ChildLocationTrackingController] Fetching next stop for tripId: $tripId, childId: $childId');
      final nextStop =
          await repository.getNextStop(token, tripId, childId);
      print('[ChildLocationTrackingController] Next stop received: ${nextStop.location}');
      
      nextStopLatLng.value = nextStop.location;
      nextStopName.value = nextStop.name;
      print('[ChildLocationTrackingController] Next stop set - name: ${nextStop.name}');

      print('[ChildLocationTrackingController] Converting next stop coordinates to address');
      final nextStopAddr =
          await _getAddressFromCoordinates(nextStop.location);
      nextStopAddress.value = nextStopAddr;
      print('[ChildLocationTrackingController] Next stop address: $nextStopAddr');

      await _fetchRoutePolyline();

      errorMessage('');
      print('[ChildLocationTrackingController] Fetch complete - SUCCESS');
    } on exceptions.HttpException catch (e) {
      print('[ChildLocationTrackingController] HttpException: ${e.message}');
      errorMessage('Server error: ${e.message}');
    } catch (e, stackTrace) {
      print('[ChildLocationTrackingController] Exception: $e');
      print('[ChildLocationTrackingController] StackTrace: $stackTrace');
      errorMessage('Error loading location: ${e.toString()}');
    } finally {
      isLoading(false);
    }
  }


  Future<void> _fetchRoutePolyline() async {
    try {
      final currentLoc = childLocationLatLng.value;
      final nextLoc = nextStopLatLng.value;

      if (currentLoc == null || nextLoc == null) {
        print('[ChildLocationTrackingController] Missing location data for polyline');
        return;
      }

      print('[ChildLocationTrackingController] Fetching route polyline from $currentLoc to $nextLoc');
      final points = await openRouteService.getRouteThrough([currentLoc, nextLoc]);

      if (points.isNotEmpty) {
        routePolylinePoints.value = points;
        print('[ChildLocationTrackingController] Route polyline fetched - ${points.length} points');
      } else {
        print('[ChildLocationTrackingController] No polyline points returned');
      }
    } catch (e) {
      print('[ChildLocationTrackingController] Error fetching polyline: $e');
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
          print('[ChildLocationTrackingController] Standing Location received: ($lat, $lng) - $name');
        }
      } else {
        print('[ChildLocationTrackingController] Failed to retrieve standing location: ${jsonBody['message']}');
      }
    } else {
      print('[ChildLocationTrackingController] Standing Location API failed with status code: ${response.statusCode}');
    }
  } catch (e) {
    print('[ChildLocationTrackingController] Error fetching standing location: $e');
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
      print('Geocoding error: $e');
    }
    return '${location.latitude.toStringAsFixed(4)}, ${location.longitude.toStringAsFixed(4)}';
  }
}

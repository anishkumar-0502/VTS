import 'package:flutter_map/flutter_map.dart';
import 'package:get/get.dart';
import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

import '../../../../../core/core.dart';
import '../../../../../services/open_route_service.dart';
import '../../../../Sessionhandler/session_controller.dart';
import '../../../profile/domain/models/parent_profile_model.dart';
import '../../../profile/domain/repositories/parent_profile_repository.dart';

class VehicleLiveTrackingController extends GetxController {
  final SessionController _sessionController = Get.find<SessionController>();
  final ParentProfileRepository _profileRepository = ParentProfileRepository();

  // Reactive variables
  final Rx<TripDetailsData?> tripDetails = Rxn<TripDetailsData>();
  final RxBool isLoadingTripDetails = false.obs;
  final RxString tripDetailsError = ''.obs;

  final Rx<LatLng?> currentVehicleLocation = Rxn<LatLng>();
  final RxBool isConnected = false.obs;
  final RxBool userHasZoomed = false.obs;
  final Rx<DateTime?> lastUserInteraction = Rxn<DateTime>();
  final RxBool hasAutoZoomedOnce = false.obs;

  // Map and routing
  late MapController mapController;
  late OpenRouteService _routeService;
  final RxList<LatLng> routePolyline = <LatLng>[].obs;
  final RxBool isLoadingRoute = false.obs;

  @override
  void onInit() {
    super.onInit();
    mapController = MapController();
    _routeService = OpenRouteService(trackify_vts.openRouteServiceApiKey);

    // Load trip details when controller initializes
    final tripId = Get.arguments as String?;
    if (tripId != null) {
      loadTripDetails(tripId);
    }
  }

  @override
  void onClose() {
    mapController.dispose();
    super.onClose();
  }

  Future<String> _getAuthToken() async {
    await _sessionController.ensureInitialized();
    return _sessionController.token.value;
  }

  Future<void> loadTripDetails(String tripId) async {
    try {
      isLoadingTripDetails.value = true;
      tripDetailsError.value = '';

      final token = await _getAuthToken();
      final response = await _profileRepository.getTripDetails(token, tripId);

      if (response.error) {
        tripDetailsError.value = response.message;
      } else if (response.data != null) {
        tripDetails.value = response.data;

        // Set initial location
        _setInitialLocation();

        // Load route
        await _loadRoute();
      }
    } catch (e) {
      tripDetailsError.value = 'Failed to load trip details: $e';
    } finally {
      isLoadingTripDetails.value = false;
    }
  }

  void _setInitialLocation() {
    if (tripDetails.value?.trip.vehicleId.latitude != null &&
        tripDetails.value?.trip.vehicleId.longitude != null) {
      currentVehicleLocation.value = LatLng(
        tripDetails.value!.trip.vehicleId.latitude,
        tripDetails.value!.trip.vehicleId.longitude,
      );

      // Center map on initial location after the map is built
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (currentVehicleLocation.value != null) {
          mapController.move(currentVehicleLocation.value!, 15.0);
        }
      });
    }
  }

  Future<void> _loadRoute() async {
    if (tripDetails.value == null) return;

    try {
      isLoadingRoute.value = true;

      final trip = tripDetails.value!.trip;
      final coordinates = <LatLng>[];

      // Add start location
      coordinates.add(LatLng(
        trip.startLocation.latitude,
        trip.startLocation.longitude,
      ));

      // Add route points
      for (final point in trip.routePoints) {
        coordinates.add(LatLng(point.latitude, point.longitude));
      }

      // Add end location
      coordinates.add(LatLng(
        trip.endLocation.latitude,
        trip.endLocation.longitude,
      ));

      if (coordinates.length >= 2) {
        routePolyline.value = await _routeService.getRouteThrough(coordinates);
      }
    } catch (e) {
      // Fallback to straight line if routing fails
      final trip = tripDetails.value!.trip;
      routePolyline.value = [
        LatLng(trip.startLocation.latitude, trip.startLocation.longitude),
        LatLng(trip.endLocation.latitude, trip.endLocation.longitude),
      ];
    } finally {
      isLoadingRoute.value = false;
    }
  }

  void onMapPositionChanged(MapPosition position, bool hasGesture) {
    if (hasGesture) {
      userHasZoomed.value = true;
      lastUserInteraction.value = DateTime.now();
    }
  }
}
import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:http/http.dart' as http;
import 'package:socket_io_client/socket_io_client.dart' as IO;

import '../../../../Sessionhandler/session_controller.dart';
import '../../../profile/domain/models/parent_profile_model.dart';
import '../../../profile/domain/repositories/parent_profile_repository.dart';
import '../../../live-tracking/domain/models/live_tracking_model.dart';
import '../../../live-tracking/domain/repositories/live_tracking_repository.dart';
import '../../../live-tracking/data/api.dart';
import '../../../../../utilities/exception/exception.dart' as exceptions;
import '../../../../../services/socket_io_service.dart';
import '../../../../../services/open_route_service.dart';
import '../../../../../core/core.dart';

class ParentHomeController extends GetxController with WidgetsBindingObserver, GetTickerProviderStateMixin {
  final SessionController sessionController = Get.find<SessionController>();
  final ParentProfileRepository _profileRepository = ParentProfileRepository();
  final LiveTrackingRepository _liveTrackingRepository = LiveTrackingRepositoryImpl(
    LiveTrackingApi(LiveTrackingApiClient(httpClient: http.Client())),
  );
  final SocketIOService _socketIOService = SocketIOService();
  final OpenRouteService _openRouteService = OpenRouteService(trackify_vts.openRouteServiceApiKey);

  final Rx<CurrentTrip?> currentTrip = Rxn<CurrentTrip>();
  final RxBool isFetchingTrip = false.obs;
  final RxString tripError = ''.obs;
  final RxBool isUpcomingTrip = false.obs;

  final Rx<ParentLiveTripData?> tripMapData = Rxn<ParentLiveTripData>();
  final RxBool isFetchingTripMap = false.obs;
  final RxString tripMapError = ''.obs;
  final Rx<LatLng?> currentVehicleLocation = Rxn<LatLng>();
  final Rx<LatLng?> targetLocation = Rxn<LatLng>();
  final RxList<LatLng> routePolylinePoints = <LatLng>[].obs;
  
  final Rx<ParentProfileData?> parentProfile = Rxn<ParentProfileData>();

  IO.Socket? socket;
  final RxBool isSocketConnected = false.obs;
  final RxMap<String, LatLng> vehicleLocations = <String, LatLng>{}.obs;
  final RxMap<String, Color> vehicleColors = <String, Color>{}.obs;
  final RxMap<String, DateTime> vehicleTimestamps = <String, DateTime>{}.obs;
  final RxMap<String, String> vehicleNumbers = <String, String>{}.obs;
  final RxMap<String, double> vehicleHeadings = <String, double>{}.obs;
  final Rx<double> currentVehicleHeading = 0.0.obs;
  String? assignedVehicleId;
  String? assignedVehicleNumber;

  bool _isDisposed = false;
  bool _autoZoomDone = false;
  final RxBool isInitializationComplete = false.obs;
  final RxBool pageVisibilityTrigger = false.obs;
  final RxBool showRouteBanner = false.obs;
  Timer? _bannerTimer;
  final MapController mapController = MapController();
  final RxDouble currentZoom = 13.0.obs;

  void showRouteBannerTemporarily() {
    _bannerTimer?.cancel();
    showRouteBanner.value = true;
    _bannerTimer = Timer(const Duration(seconds: 5), () {
      showRouteBanner.value = false;
    });
  }

  @override
  void onInit() {
    super.onInit();
    debugPrint('[ParentHome] onInit called');
    _initializeData();
    _setupSocketConnection();
  }

  Future<void> _initializeData() async {
    try {
      await _fetchProfileAndGetVehicleId();
      await fetchCurrentTrip();
      await fetchTripMapData();
    } catch (e) {
      debugPrint('[Home] Error during initialization: $e');
    } finally {
      isInitializationComplete.value = true;
    }
  }

  String? _getChildId() {
    if (parentProfile.value != null) {
      final endUserId = parentProfile.value!.endUserId;
      if (endUserId.isNotEmpty) {
        debugPrint('[Home] ✅ Using endUserId: $endUserId');
        return endUserId;
      }
    }
    debugPrint('[Home] ❌ No child ID found!');
    return null;
  }

  Future<void> fetchCurrentTrip({bool showLoading = false}) async {
    try {
      final token = sessionController.token.value;
      if (token.isEmpty) {
        debugPrint('[Home] No authentication token');
        return;
      }

      final childId = _getChildId();
      if (childId == null) {
        debugPrint('[Home] No child ID found');
        return;
      }

      if (showLoading) isFetchingTrip.value = true;

      final response = await _profileRepository.getCurrentTrip(token, childId);
      
      if (!response.error && response.data != null) {
        currentTrip.value = response.data;
        isUpcomingTrip.value = response.data!.status.toLowerCase() == 'scheduled' || 
                              response.message.toLowerCase().contains('upcoming');
        tripError.value = '';
        debugPrint('[Home] Current trip set: ${currentTrip.value?.tripId} (Upcoming: ${isUpcomingTrip.value})');
      } else {
        debugPrint('[Home] Error fetching trip: ${response.message}');
        tripError.value = response.message ?? '';
      }
    } on exceptions.HttpException catch (e) {
      debugPrint('[Home] HttpException: $e');
      tripError.value = e.message;
    } catch (e) {
      debugPrint('[Home] Exception: $e');
      tripError.value = '';
    } finally {
      if (showLoading) isFetchingTrip.value = false;
    }
  }

  Future<void> fetchTripMapData({bool showLoading = false}) async {
    try {
      final token = sessionController.token.value;
      if (token.isEmpty) {
        debugPrint('[Home] ❌ No token for trip map data');
        return;
      }

      final childId = _getChildId();
      if (childId == null) {
        debugPrint('[Home] ❌ No child ID found for map data');
        return;
      }

      if (showLoading) isFetchingTripMap.value = true;

      debugPrint('[Home] 📍 Fetching trip map data for childId: $childId');
      
      final response = await _profileRepository.getCurrentTrip(token, childId);
      debugPrint('[Home] 📊 API Response - Error: ${response.error}, Has Data: ${response.data != null}');
      
      ParentLiveTripData? baseData;
      
      if (!response.error && response.data != null) {
        final trip = response.data!;
        if (trip.startLocation != null && trip.endLocation != null) {
          debugPrint('[Home] ✅ Using trip data directly from profile API');
          baseData = ParentLiveTripData(
            associatedTripId: trip.tripId,
            routeName: trip.routeName ?? 'Trip',
            status: trip.status,
            scheduledStartTime: '',
            driverName: '',
            vehicleId: trip.vehicle.vehicleId,
            startLocation: LatLng(trip.startLocation!.latitude, trip.startLocation!.longitude),
            endLocation: LatLng(trip.endLocation!.latitude, trip.endLocation!.longitude),
            startAddress: trip.startLocation!.address ?? 'Start',
            endAddress: trip.endLocation!.address ?? 'End',
            landmark: trip.routePoints.isNotEmpty ? (trip.routePoints.first.landmark ?? '') : '',
            tripType: trip.tripType,
            timeline: trip.routePoints.map((rp) => TripStop(
              id: rp.stopId,
              name: rp.name,
              location: LatLng(rp.latitude, rp.longitude),
              sequence: rp.sequence,
              address: rp.name,
              landmark: rp.landmark ?? '',
              scheduledTime: rp.approximateReachTime ?? '',
              isCompleted: rp.status == 'completed',
            )).toList(),
          );
        }
      }

      if (baseData == null) {
        debugPrint('[Home] 📍 Falling back to base trip data API');
        baseData = await _liveTrackingRepository.fetchBaseTripData(token, childId);
      }
      
      if (baseData == null) {
        debugPrint('[Home] ⚠️ No trip map data returned (null)');
        tripMapData.value = null;
        tripMapError.value = 'No active trip';
        if (showLoading) isFetchingTripMap.value = false;
        return;
      }

      // Filter timeline and set targetLocation based on trip_type
      final profile = parentProfile.value;
      if (profile != null) {
        LatLng? userTarget;
        if (baseData.tripType?.toLowerCase() == 'drop') {
          if (profile.dropoffLocation != null) {
            userTarget = LatLng(profile.dropoffLocation!.latitude, profile.dropoffLocation!.longitude);
          }
        } else if (baseData.tripType?.toLowerCase() == 'pickup') {
          if (profile.pickupLocation != null) {
            userTarget = LatLng(profile.pickupLocation!.latitude, profile.pickupLocation!.longitude);
          }
        }

        if (userTarget != null) {
          targetLocation.value = userTarget;
          debugPrint('[Home] 🎯 Target location set: $userTarget for tripType: ${baseData.tripType}');
          
          // Truncate timeline until the user's location is reached
          int stopIndex = -1;
          for (int i = 0; i < baseData.timeline.length; i++) {
            final stop = baseData.timeline[i];
            // Check if coordinates match within a small epsilon
            if ((stop.location.latitude - userTarget.latitude).abs() < 0.0001 &&
                (stop.location.longitude - userTarget.longitude).abs() < 0.0001) {
              stopIndex = i;
              break;
            }
          }

          if (stopIndex != -1) {
            debugPrint('[Home] ✂️ Truncating timeline at stop index $stopIndex');
            // Include stops up to and INCLUDING the target stop in the timeline
            final truncatedTimeline = baseData.timeline.sublist(0, stopIndex + 1);
            baseData = baseData.copyWith(
              timeline: truncatedTimeline,
              endLocation: userTarget,
            );
          } else {
            debugPrint('[Home] ⚠️ User location not found in trip timeline');
          }
        }
      }

      if (baseData.timeline.isEmpty) {
        debugPrint('[Home] ⚠️ Trip map data has NO stops! Timeline is empty');
        debugPrint('[Home] ⚠️ Route name: ${baseData.routeName}');
        debugPrint('[Home] ⚠️ Start location: ${baseData.startLocation}');
        debugPrint('[Home] ⚠️ End location: ${baseData.endLocation}');
      } else {
        debugPrint('[Home] ✅ Trip map data set with ${baseData.timeline.length} stops');
      }
      
      debugPrint('[Home] ✅ Route name: ${baseData.routeName}');
      debugPrint('[Home] ✅ Start: ${baseData.startLocation}');
      debugPrint('[Home] ✅ End: ${baseData.endLocation}');
      
      tripMapData.value = baseData;
      tripMapError.value = '';
      
      await _generateRoutePolyline(baseData);
      
      if (showLoading) isFetchingTripMap.value = false;

    } on exceptions.HttpException catch (e) {
      debugPrint('[Home] ❌ HttpException while fetching trip map: ${e.message}');
      debugPrint('[Home] Status Code: ${e.statusCode}');
      tripMapError.value = e.message;
      if (showLoading) isFetchingTripMap.value = false;
    } catch (e, stackTrace) {
      debugPrint('[Home] ❌ Exception in fetchTripMapData: $e');
      debugPrint('[Home] Stack trace: $stackTrace');
      tripMapError.value = e.toString();
      if (showLoading) isFetchingTripMap.value = false;
    }
  }

  Future<void> _generateRoutePolyline(ParentLiveTripData tripData) async {
    try {
      debugPrint('[Home] 🛣️ Generating route polyline through all stops...');
      
      final coordinates = [
        tripData.startLocation,
        ...tripData.timeline.map((stop) => stop.location),
        tripData.endLocation,
      ];

      debugPrint('[Home] 🛣️ Route coordinates count: ${coordinates.length}');

      final polylinePoints = await _openRouteService.getRouteThrough(coordinates);
      
      routePolylinePoints.value = polylinePoints;
      debugPrint('[Home] ✅ Route polyline generated with ${polylinePoints.length} points');
    } catch (e) {
      debugPrint('[Home] ❌ Error generating route polyline: $e');
      final coordinates = [
        tripData.startLocation,
        ...tripData.timeline.map((stop) => stop.location),
        tripData.endLocation,
      ];
      routePolylinePoints.value = coordinates;
      debugPrint('[Home] ℹ️ Using straight-line route as fallback');
    }
  }

  void refreshCurrentTrip() {
    fetchCurrentTrip(showLoading: true);
  }

  Future<void> refreshAllData() async {
    isFetchingTrip.value = true;
    isFetchingTripMap.value = true;
    try {
      await _fetchProfileAndGetVehicleId();
      await fetchCurrentTrip();
      await fetchTripMapData();
    } finally {
      isFetchingTrip.value = false;
      isFetchingTripMap.value = false;
    }
  }

  Future<void> _fetchProfileAndGetVehicleId() async {
    try {
      final token = sessionController.token.value;
      if (token.isEmpty) {
        debugPrint('[ParentHome] ❌ No token available for profile fetch');
        return;
      }

      debugPrint('[ParentHome] 📍 Fetching complete profile data');
      final response = await _profileRepository.getParentProfile(token);
      if (!response.error && response.data != null) {
        final profile = response.data!;
        parentProfile.value = profile;
        assignedVehicleId = profile.assignedVehicleId;
        debugPrint('[ParentHome] ✅ Profile fetched: ${profile.name}');
        debugPrint('[ParentHome] ✅ EndUserId: ${profile.endUserId}');
        debugPrint('[ParentHome] ✅ Associated Users: ${profile.associatedUsers.length}');
        debugPrint('[ParentHome] ✅ Assigned Vehicle ID: $assignedVehicleId');
        
        if (profile.vehicleDetails != null && assignedVehicleId != null) {
          assignedVehicleNumber = profile.vehicleDetails!.vehicleNumber;
          vehicleNumbers[assignedVehicleId!] = assignedVehicleNumber!;
          vehicleNumbers.refresh();
          debugPrint('[ParentHome] ✅ Assigned Vehicle Number: $assignedVehicleNumber');
        }
      } else {
        debugPrint('[ParentHome] ❌ Error in profile response: ${response.message}');
      }
    } catch (e, stackTrace) {
      debugPrint('[ParentHome] ❌ Error fetching profile: $e');
      debugPrint('[ParentHome] Stack trace: $stackTrace');
    }
  }

  void _setupSocketConnection() {
    debugPrint('[ParentHome] Setting up socket connection');
    _socketIOService.initialize();
    
    _socketIOService.onFrameUpdate = (data) {
      if (data is Map) {
        _handleSocketData(data);
      } else if (data is List) {
        for (var item in data) {
          if (item is Map) {
            _handleSocketData(item);
          }
        }
      }
    };
  }

  void _handleSocketData(Map data) {
    try {
      final vehicleId = data['vehicleId'] ?? data['vehicle_id'] ?? data['id'];
      final latitude = data['latitude'];
      final longitude = data['longitude'];
      final timestamp = data['timestamp'];
      final vehicleNumber = data['vehicleNumber'] ?? data['vehicle_number'];
      final course = data['course'] ?? data['heading'] ?? 0.0;

      if (vehicleId != null && latitude != null && longitude != null) {
        // Ensure latitude and longitude are doubles
        double lat = (latitude is int) ? latitude.toDouble() : (latitude is double ? latitude : double.tryParse(latitude.toString()) ?? 0.0);
        double lng = (longitude is int) ? longitude.toDouble() : (longitude is double ? longitude : double.tryParse(longitude.toString()) ?? 0.0);

        if (lat == 0.0 && lng == 0.0) return;

        final location = LatLng(lat, lng);
        vehicleLocations[vehicleId] = location;
        vehicleLocations.refresh();

        if (timestamp != null) {
          vehicleTimestamps[vehicleId] = DateTime.tryParse(timestamp.toString()) ?? DateTime.now();
          vehicleTimestamps.refresh();
        }

        if (vehicleNumber != null) {
          vehicleNumbers[vehicleId] = vehicleNumber;
          vehicleNumbers.refresh();
        }

        double heading = (course is int) ? course.toDouble() : (course is double ? course : double.tryParse(course.toString()) ?? 0.0);
        vehicleHeadings[vehicleId] = heading;
        vehicleHeadings.refresh();

        if (vehicleId == assignedVehicleId) {
          currentVehicleLocation.value = location;
          currentVehicleHeading.value = heading;
          debugPrint('[ParentHome] Updated currentVehicleLocation for $vehicleId: $location, Heading: $heading');
        }
      }
    } catch (e) {
      debugPrint('[ParentHome] Error handling socket data: $e');
    }
  }

  bool shouldAutoZoomOnFirstLogin() {
    return !_autoZoomDone;
  }

  void markAutoZoomComplete() {
    _autoZoomDone = true;
  }

  Future<void> fetchParentProfile() async {
    try {
      final token = sessionController.token.value;
      if (token.isEmpty) return;
      
      final response = await _profileRepository.getParentProfile(token);
      if (!response.error && response.data != null) {
        parentProfile.value = response.data;
      }
    } catch (e) {
      debugPrint('[ParentHome] Error fetching parent profile: $e');
    }
  }

  void triggerPageVisibilityRefresh() {
    pageVisibilityTrigger.toggle();
  }

  void zoomIn() {
    final currentZoom = mapController.camera.zoom;
    // Zoom towards vehicle location if available, otherwise current center
    final target = currentVehicleLocation.value ?? mapController.camera.center;
    _animatedMapMove(target, currentZoom + 1);
  }

  void zoomOut() {
    final currentZoom = mapController.camera.zoom;
    // Zoom out from vehicle location if available, otherwise current center
    final target = currentVehicleLocation.value ?? mapController.camera.center;
    _animatedMapMove(target, currentZoom - 1);
  }

  void _animatedMapMove(LatLng destLocation, double destZoom) {
    final latTween = Tween<double>(
        begin: mapController.camera.center.latitude, end: destLocation.latitude);
    final lngTween = Tween<double>(
        begin: mapController.camera.center.longitude, end: destLocation.longitude);
    final zoomTween = Tween<double>(
        begin: mapController.camera.zoom, end: destZoom);

    final controller = AnimationController(
        duration: const Duration(milliseconds: 500), vsync: this);
    
    final Animation<double> animation =
        CurvedAnimation(parent: controller, curve: Curves.fastOutSlowIn);

    controller.addListener(() {
      mapController.move(
          LatLng(latTween.evaluate(animation), lngTween.evaluate(animation)),
          zoomTween.evaluate(animation));
    });

    animation.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        controller.dispose();
      } else if (status == AnimationStatus.dismissed) {
        controller.dispose();
      }
    });

    controller.forward();
  }

  @override
  void onClose() {
    _isDisposed = true;
    _bannerTimer?.cancel();
    mapController.dispose();
    super.onClose();
  }
}

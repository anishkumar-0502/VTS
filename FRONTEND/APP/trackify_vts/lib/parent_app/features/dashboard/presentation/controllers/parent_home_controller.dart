import 'dart:async';
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
  final Rx<LatLng?> vehicleLocation = Rxn<LatLng>();
  Rx<LatLng?> get currentVehicleLocation => vehicleLocation;
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
  final Rx<double> vehicleHeading = 0.0.obs;
  String? assignedVehicleId;
  String? assignedVehicleNumber;
  String? assignedDeviceId;

  bool _autoZoomDone = false;
  final RxBool isInitializationComplete = false.obs;
  final RxBool pageVisibilityTrigger = false.obs;
  final RxBool showRouteBanner = false.obs;
  Timer? _bannerTimer;
  final MapController mapController = MapController();
  final RxDouble currentZoom = 13.0.obs;
  final RxBool isRouteStopsCollapsed = false.obs;

  void toggleRouteStops() {
    isRouteStopsCollapsed.value = !isRouteStopsCollapsed.value;
  }

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
    
    // Auto-fit when data arrives
    ever(tripMapData, (data) {
      if (data != null && !_autoZoomDone) {
        Future.delayed(const Duration(milliseconds: 1000), () => fitMapToRoute());
        // For upcoming trips, we consider route fitting as the main zoom
        if (isUpcomingTrip.value) {
          _autoZoomDone = true;
        }
      }
    });

    ever(vehicleLocation, (loc) {
      if (loc != null && !isUpcomingTrip.value && shouldAutoZoomOnFirstLogin()) {
        Future.delayed(const Duration(milliseconds: 1200), () => fitMapToVehicle());
        markAutoZoomComplete();
      }
    });

    // Listen to token changes to refresh data when a new user logs in
    ever(sessionController.token, (String token) {
      if (token.isNotEmpty) {
        debugPrint('[ParentHome] Token changed, re-initializing data...');
        clearState();
        _initializeData();
      } else {
        debugPrint('[ParentHome] Token cleared, clearing state...');
        clearState();
      }
    });

    _initializeData();
  }

  void clearState() {
    currentTrip.value = null;
    tripMapData.value = null;
    vehicleLocation.value = null;
    targetLocation.value = null;
    routePolylinePoints.clear();
    parentProfile.value = null;
    vehicleLocations.clear();
    vehicleColors.clear();
    vehicleTimestamps.clear();
    vehicleNumbers.clear();
    vehicleHeadings.clear();
    assignedVehicleId = null;
    assignedVehicleNumber = null;
    assignedDeviceId = null;
    _autoZoomDone = false;
    isInitializationComplete.value = false;
    tripError.value = '';
    tripMapError.value = '';
    _socketIOService.dispose();
  }

  Future<void> _initializeData() async {
    try {
      // Ensure session is initialized before proceeding
      await sessionController.ensureInitialized();
      
      await _fetchProfileAndGetVehicleId();
      await fetchCurrentTrip();
      await fetchTripMapData();

      if (isUpcomingTrip.value) {
        debugPrint('[ParentHome] Upcoming trip detected. Skipping socket connection.');
      } else {
        debugPrint('[ParentHome] Active trip detected. Connecting to socket.');
        _setupSocketConnection();
      }
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
        tripError.value = response.message;
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
          
          // Ensure we use the vehicle ID from the active trip for socket tracking
          if (trip.vehicle.vehicleId.isNotEmpty) {
            assignedVehicleId = trip.vehicle.vehicleId;
            assignedVehicleNumber = trip.vehicle.vehicleNumber;
            assignedDeviceId = trip.vehicle.assignedDeviceId;
            if (assignedVehicleNumber != null && assignedVehicleNumber != 'N/A') {
              vehicleNumbers[assignedVehicleId!] = assignedVehicleNumber!;
            } else {
              vehicleNumbers[assignedVehicleId!] = 'Vehicle';
            }
            vehicleNumbers.refresh();
            debugPrint('[Home] 🚗 Active Trip Vehicle: $assignedVehicleId ($assignedVehicleNumber), Device: $assignedDeviceId');
          }

          baseData = ParentLiveTripData(
            associatedTripId: trip.associatedTripId ?? trip.tripId,
            scheduledTripId: trip.scheduledTripId,
            routeName: trip.routeName ?? 'Trip',
            status: trip.status,
            scheduledStartTime: trip.scheduledStartTime ?? '',
            driverName: trip.driver?.name ?? '',
            vehicleId: trip.vehicle.vehicleId,
            startLocation: LatLng(trip.startLocation!.latitude, trip.startLocation!.longitude),
            endLocation: LatLng(trip.endLocation!.latitude, trip.endLocation!.longitude),
            startAddress: trip.startLocation!.address,
            endAddress: trip.endLocation!.address,
            landmark: trip.routePoints.isNotEmpty ? (trip.routePoints.first.landmark) : '',
            tripType: trip.tripType,
            timeline: trip.routePoints.map((rp) => TripStop(
              id: rp.stopId,
              name: rp.name,
              location: LatLng(rp.latitude, rp.longitude),
              sequence: rp.sequence,
              address: rp.name,
              landmark: rp.landmark,
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
      
      // Update assigned vehicle if trip map data has one
      if (baseData.vehicleId.isNotEmpty) {
        assignedVehicleId = baseData.vehicleId;
        debugPrint('[Home] 🚗 Tracking vehicle confirmed: $assignedVehicleId');
      }
      
      await _generateRoutePolyline(baseData);
      
      tripMapData.value = baseData;
      tripMapError.value = '';
      
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
    fetchTripMapData(showLoading: true);
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
          assignedDeviceId = profile.vehicleDetails!.assignedDeviceId;
          
          if (assignedVehicleNumber != null && assignedVehicleNumber != 'N/A') {
            vehicleNumbers[assignedVehicleId!] = assignedVehicleNumber!;
          } else {
            vehicleNumbers[assignedVehicleId!] = 'Vehicle';
          }
          vehicleNumbers.refresh();
          debugPrint('[ParentHome] ✅ Assigned Vehicle Number: $assignedVehicleNumber, Device: $assignedDeviceId');
        }
      } else {
        debugPrint('[ParentHome] ❌ Error in profile response: ${response.message}');
      }
    } catch (e, stackTrace) {
      debugPrint('[ParentHome] ❌ Error fetching profile: $e');
      debugPrint('[ParentHome] Stack trace: $stackTrace');
    }
  }

  void _setupSocketConnection() async {
    // Wait for session to be ready
    await sessionController.ensureInitialized();
    
    final token = sessionController.token.value;
    debugPrint('[ParentHome] Setting up socket connection (Token available: ${token.isNotEmpty})');
    _socketIOService.initialize(authToken: token);
    
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
      final vehicleId = (data['vehicleId'] ?? data['vehicle_id'] ?? data['id'])?.toString();
      final gpsDeviceId = data['gpsDeviceId']?.toString();
      final latitude = data['latitude'];
      final longitude = data['longitude'];
      final timestamp = data['timestamp'];
      final vehicleNumber = data['vehicleNumber'] ?? data['vehicle_number'];
      final course = data['course'] ?? data['heading'] ?? 0.0;

      if (vehicleId != null && latitude != null && longitude != null) {
        // Ensure latitude and longitude are doubles
        double lat = (latitude is int) ? latitude.toDouble() : (latitude is double ? latitude : double.tryParse(latitude.toString()) ?? 0.0);
        double lng = (longitude is int) ? longitude.toDouble() : (longitude is double ? longitude : double.tryParse(longitude.toString()) ?? 0.0);

        if (lat == 0.0 && lng == 0.0) {
          // Allow 0,0 for now to see if marker appears, but log it
          debugPrint('[ParentHome] ⚠️ Received 0,0 coordinates for vehicle $vehicleId');
          // return; // Uncommenting this to allow 0,0 for testing
        }

        final location = LatLng(lat, lng);
        vehicleLocations[vehicleId] = location;
        vehicleLocations.refresh();

        if (timestamp != null) {
          vehicleTimestamps[vehicleId] = DateTime.tryParse(timestamp.toString()) ?? DateTime.now();
          vehicleTimestamps.refresh();
        }

        if (vehicleNumber != null) {
          final vnStr = vehicleNumber.toString();
          if (vnStr != 'N/A') {
            vehicleNumbers[vehicleId] = vnStr;
          } else if (!vehicleNumbers.containsKey(vehicleId)) {
            vehicleNumbers[vehicleId] = 'Vehicle';
          }
          vehicleNumbers.refresh();
        }

        double heading = (course is int) ? course.toDouble() : (course is double ? course : double.tryParse(course.toString()) ?? 0.0);
        vehicleHeadings[vehicleId] = heading;
        vehicleHeadings.refresh();

        // Update connection status
        isSocketConnected.value = _socketIOService.isConnected;

        // Use a more robust comparison for IDs (match by vehicle ID OR device ID)
        bool isMatch = false;
        String? vidTrim = vehicleId.trim();
        String? avidTrim = assignedVehicleId?.trim();
        String? gdidTrim = gpsDeviceId?.trim();
        String? adidTrim = assignedDeviceId?.trim();

        if (avidTrim != null && vidTrim == avidTrim) {
          isMatch = true;
        } else if (adidTrim != null && gdidTrim != null && gdidTrim == adidTrim) {
          isMatch = true;
        }

        if (isMatch) {
          vehicleLocation.value = location;
          vehicleHeading.value = heading;
          debugPrint('[ParentHome] ✅ MATCHED VEHICLE: Updated vehicleLocation for $vidTrim: $location, Heading: $heading');
        } else {
          debugPrint('[ParentHome] ℹ️ No match for $vidTrim. (Assigned VID: $avidTrim, Frame GID: $gdidTrim, Assigned GID: $adidTrim)');
        }
      }
    } catch (e) {
      debugPrint('[ParentHome] ❌ Error handling socket data: $e');
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
    final target = vehicleLocation.value ?? mapController.camera.center;
    animatedMapMove(target, currentZoom + 1, offset: isRouteStopsCollapsed.value ? const Offset(0, 0.005) : const Offset(0, 0.012));
  }

  void zoomOut() {
    final currentZoom = mapController.camera.zoom;
    // Zoom out from vehicle location if available, otherwise current center
    final target = vehicleLocation.value ?? mapController.camera.center;
    animatedMapMove(target, currentZoom - 1, offset: isRouteStopsCollapsed.value ? const Offset(0, 0.005) : const Offset(0, 0.012));
  }

  void focusOnVehicle() {
    fitMapToVehicle();
  }

  void fitMapToRoute() {
    if (routePolylinePoints.isEmpty && tripMapData.value == null) return;

    final List<LatLng> points = routePolylinePoints.isNotEmpty
        ? routePolylinePoints
        : [
            tripMapData.value!.startLocation,
            ...tripMapData.value!.timeline.map((s) => s.location),
            tripMapData.value!.endLocation,
          ];

    if (points.isEmpty) return;

    final bounds = LatLngBounds.fromPoints(points);
    mapController.fitCamera(
      CameraFit.bounds(
        bounds: bounds,
        padding: isRouteStopsCollapsed.value 
            ? const EdgeInsets.only(top: 100, bottom: 100, left: 50, right: 50)
            : const EdgeInsets.only(top: 50, bottom: 400, left: 50, right: 50),
      ),
    );
  }

  void fitMapToVehicle() {
    final location = vehicleLocation.value ??
        (assignedVehicleId != null ? vehicleLocations[assignedVehicleId] : null);

    if (location != null) {
      animatedMapMove(location, 16.0, offset: isRouteStopsCollapsed.value ? const Offset(0, 0.005) : const Offset(0, 0.012));
    } else {
      debugPrint('[ParentHome] Vehicle location not available for fitting');
      // If no vehicle location, fit to route as fallback
      fitMapToRoute();
    }
  }

  void animatedMapMove(LatLng destLocation, double destZoom, {Offset offset = Offset.zero}) {
    // Apply offset to destination latitude
    final finalLat = destLocation.latitude + offset.dy;
    final finalLng = destLocation.longitude + offset.dx;

    final latTween = Tween<double>(
        begin: mapController.camera.center.latitude, end: finalLat);
    final lngTween = Tween<double>(
        begin: mapController.camera.center.longitude, end: finalLng);
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
    _bannerTimer?.cancel();
    mapController.dispose();
    super.onClose();
  }

  void reconnectSocket() {
    final token = sessionController.token.value;
    debugPrint('[ParentHome] Manual socket reconnection requested');
    _socketIOService.reconnect(authToken: token);
  }
}

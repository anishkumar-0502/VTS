import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:latlong2/latlong.dart';
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

class ParentHomeController extends GetxController with WidgetsBindingObserver {
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

  final Rx<ParentLiveTripData?> tripMapData = Rxn<ParentLiveTripData>();
  final RxBool isFetchingTripMap = false.obs;
  final RxString tripMapError = ''.obs;
  final Rx<LatLng?> currentVehicleLocation = Rxn<LatLng>();
  final RxList<LatLng> routePolylinePoints = <LatLng>[].obs;
  
  final Rx<ParentProfileData?> parentProfile = Rxn<ParentProfileData>();

  IO.Socket? socket;
  final RxBool isSocketConnected = false.obs;
  final RxMap<String, LatLng> vehicleLocations = <String, LatLng>{}.obs;
  final RxMap<String, Color> vehicleColors = <String, Color>{}.obs;
  final RxMap<String, DateTime> vehicleTimestamps = <String, DateTime>{}.obs;
  final RxMap<String, String> vehicleNumbers = <String, String>{}.obs;
  String? assignedVehicleId;
  String? assignedVehicleNumber;

  bool _isDisposed = false;
  bool _autoZoomDone = false;
  final RxBool isInitializationComplete = false.obs;
  final RxBool pageVisibilityTrigger = false.obs;

  @override
  void onInit() {
    super.onInit();
    print('[ParentHome] onInit called');
    _initializeData();
    _setupSocketConnection();
  }

  Future<void> _initializeData() async {
    try {
      await _fetchProfileAndGetVehicleId();
      await fetchCurrentTrip();
      await fetchTripMapData();
    } catch (e) {
      print('[Home] Error during initialization: $e');
    } finally {
      isInitializationComplete.value = true;
    }
  }

  String? _getChildId() {
    if (parentProfile.value != null) {
      final endUserId = parentProfile.value!.endUserId;
      if (endUserId.isNotEmpty) {
        print('[Home] ✅ Using endUserId: $endUserId');
        return endUserId;
      }
    }
    print('[Home] ❌ No child ID found!');
    return null;
  }

  Future<void> fetchCurrentTrip({bool showLoading = false}) async {
    try {
      final token = sessionController.token.value;
      if (token.isEmpty) {
        print('[Home] No authentication token');
        return;
      }

      final childId = _getChildId();
      if (childId == null) {
        print('[Home] No child ID found');
        return;
      }

      if (showLoading) isFetchingTrip.value = true;

      final response = await _profileRepository.getCurrentTrip(token, childId);
      
      if (!response.error && response.data != null) {
        currentTrip.value = response.data;
        tripError.value = '';
        print('[Home] Current trip set: ${currentTrip.value?.tripId}');
      } else {
        print('[Home] Error fetching trip: ${response.message}');
        tripError.value = response.message ?? '';
      }
    } on exceptions.HttpException catch (e) {
      print('[Home] HttpException: $e');
      tripError.value = e.message;
    } catch (e) {
      print('[Home] Exception: $e');
      tripError.value = '';
    } finally {
      if (showLoading) isFetchingTrip.value = false;
    }
  }

  Future<void> fetchTripMapData({bool showLoading = false}) async {
    try {
      final token = sessionController.token.value;
      if (token.isEmpty) {
        print('[Home] ❌ No token for trip map data');
        return;
      }

      final childId = _getChildId();
      if (childId == null) {
        print('[Home] ❌ No child ID found for map data');
        return;
      }

      if (showLoading) isFetchingTripMap.value = true;

      print('[Home] 📍 Fetching trip map data for childId: $childId');
      
      final response = await _profileRepository.getCurrentTrip(token, childId);
      print('[Home] 📊 API Response - Error: ${response.error}, Has Data: ${response.data != null}');
      print('[Home] 📊 Full API Response: ${jsonEncode(response.toJson())}');
      
      final baseData = await _liveTrackingRepository.fetchBaseTripData(token, childId);
      
      if (baseData == null) {
        print('[Home] ⚠️ No trip map data returned (null)');
        tripMapData.value = null;
        tripMapError.value = 'No active trip';
        if (showLoading) isFetchingTripMap.value = false;
        return;
      }

      if (baseData.timeline.isEmpty) {
        print('[Home] ⚠️ Trip map data has NO stops! Timeline is empty');
        print('[Home] ⚠️ Route name: ${baseData.routeName}');
        print('[Home] ⚠️ Start location: ${baseData.startLocation}');
        print('[Home] ⚠️ End location: ${baseData.endLocation}');
      } else {
        print('[Home] ✅ Trip map data set with ${baseData.timeline.length} stops');
      }
      
      print('[Home] ✅ Route name: ${baseData.routeName}');
      print('[Home] ✅ Start: ${baseData.startLocation}');
      print('[Home] ✅ End: ${baseData.endLocation}');
      
      tripMapData.value = baseData;
      tripMapError.value = '';
      
      await _generateRoutePolyline(baseData);
      
      if (showLoading) isFetchingTripMap.value = false;

    } on exceptions.HttpException catch (e) {
      print('[Home] ❌ HttpException while fetching trip map: ${e.message}');
      print('[Home] Status Code: ${e.statusCode}');
      tripMapError.value = e.message;
      if (showLoading) isFetchingTripMap.value = false;
    } catch (e, stackTrace) {
      print('[Home] ❌ Exception in fetchTripMapData: $e');
      print('[Home] Stack trace: $stackTrace');
      tripMapError.value = e.toString();
      if (showLoading) isFetchingTripMap.value = false;
    }
  }

  Future<void> _generateRoutePolyline(ParentLiveTripData tripData) async {
    try {
      print('[Home] 🛣️ Generating route polyline through all stops...');
      
      final coordinates = [
        tripData.startLocation,
        ...tripData.timeline.map((stop) => stop.location),
        tripData.endLocation,
      ];

      print('[Home] 🛣️ Route coordinates count: ${coordinates.length}');

      final polylinePoints = await _openRouteService.getRouteThrough(coordinates);
      
      routePolylinePoints.value = polylinePoints;
      print('[Home] ✅ Route polyline generated with ${polylinePoints.length} points');
    } catch (e) {
      print('[Home] ❌ Error generating route polyline: $e');
      final coordinates = [
        tripData.startLocation,
        ...tripData.timeline.map((stop) => stop.location),
        tripData.endLocation,
      ];
      routePolylinePoints.value = coordinates;
      print('[Home] ℹ️ Using straight-line route as fallback');
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
        print('[ParentHome] ❌ No token available for profile fetch');
        return;
      }

      print('[ParentHome] 📍 Fetching complete profile data');
      final response = await _profileRepository.getParentProfile(token);
      if (!response.error && response.data != null) {
        final profile = response.data!;
        parentProfile.value = profile;
        assignedVehicleId = profile.assignedVehicleId;
        print('[ParentHome] ✅ Profile fetched: ${profile.name}');
        print('[ParentHome] ✅ EndUserId: ${profile.endUserId}');
        print('[ParentHome] ✅ Associated Users: ${profile.associatedUsers.length}');
        print('[ParentHome] ✅ Assigned Vehicle ID: $assignedVehicleId');
        
        if (profile.vehicleDetails != null && assignedVehicleId != null) {
          assignedVehicleNumber = profile.vehicleDetails!.vehicleNumber;
          vehicleNumbers[assignedVehicleId!] = assignedVehicleNumber!;
          vehicleNumbers.refresh();
          print('[ParentHome] ✅ Assigned Vehicle Number: $assignedVehicleNumber');
        }
      } else {
        print('[ParentHome] ❌ Error in profile response: ${response.message}');
      }
    } catch (e, stackTrace) {
      print('[ParentHome] ❌ Error fetching profile: $e');
      print('[ParentHome] Stack trace: $stackTrace');
    }
  }

  void _setupSocketConnection() {
    print('[ParentHome] Setting up socket connection');
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

      if (vehicleId != null && latitude != null && longitude != null) {
        final location = LatLng(latitude as double, longitude as double);
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

        if (vehicleId == assignedVehicleId) {
          currentVehicleLocation.value = location;
          print('[ParentHome] Updated currentVehicleLocation for $vehicleId: $location');
        }
      }
    } catch (e) {
      print('[ParentHome] Error handling socket data: $e');
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
      print('[ParentHome] Error fetching parent profile: $e');
    }
  }

  void triggerPageVisibilityRefresh() {
    pageVisibilityTrigger.toggle();
  }

  @override
  void onClose() {
    _isDisposed = true;
    super.onClose();
  }
}

import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:latlong2/latlong.dart';
import 'package:http/http.dart' as http;
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:permission_handler/permission_handler.dart';

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
    isInitializationComplete.value = true;
  }

  Future<void> _initializeData() async {
    await _fetchProfileAndGetVehicleId();
    fetchCurrentTrip();
    fetchTripMapData();
  }

  String? _getChildId() {
    if (parentProfile.value != null && parentProfile.value!.associatedUsers.isNotEmpty) {
      return parentProfile.value!.associatedUsers.first.id;
    }
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
        print('[Home] No token for trip map data');
        return;
      }

      final childId = _getChildId();
      if (childId == null) {
        print('[Home] No child ID found for map data');
        return;
      }

      if (showLoading) isFetchingTripMap.value = true;

      final baseData = await _liveTrackingRepository.fetchBaseTripData(token, childId);
      
      tripMapData.value = baseData;
      tripMapError.value = '';
      print('[Home] Trip map data set with ${baseData.timeline.length} stops');
      
      if (showLoading) isFetchingTripMap.value = false;

    } on exceptions.HttpException catch (e) {
      print('[Home] HttpException while fetching trip map: $e');
      tripMapError.value = '';
      if (showLoading) isFetchingTripMap.value = false;
    } catch (e, stackTrace) {
      print('[Home] Exception in fetchTripMapData: $e');
      print('[Home] Stack trace: $stackTrace');
      tripMapError.value = '';
      if (showLoading) isFetchingTripMap.value = false;
    }
  }

  void refreshCurrentTrip() {
    fetchCurrentTrip(showLoading: true);
  }

  Future<void> _fetchProfileAndGetVehicleId() async {
    try {
      final token = sessionController.token.value;
      if (token.isEmpty) {
        print('[ParentHome] No token available for profile fetch');
        return;
      }

      print('[ParentHome] Fetching and updating complete profile data');
      final response = await _profileRepository.getParentProfile(token);
      if (!response.error && response.data != null) {
        final profile = response.data!;
        parentProfile.value = profile;
        assignedVehicleId = profile.assignedVehicleId;
        print('[ParentHome] Assigned Vehicle ID: $assignedVehicleId');
        
        if (profile.vehicleDetails != null && assignedVehicleId != null) {
          assignedVehicleNumber = profile.vehicleDetails!.vehicleNumber;
          vehicleNumbers[assignedVehicleId!] = assignedVehicleNumber!;
          vehicleNumbers.refresh();
          print('[ParentHome] Assigned Vehicle Number: $assignedVehicleNumber');
        }
      }
    } catch (e) {
      print('[ParentHome] Error fetching profile: $e');
    }
  }

  void _setupSocketConnection() {
    print('[ParentHome] Setting up socket connection');
    _socketIOService.initialize();
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

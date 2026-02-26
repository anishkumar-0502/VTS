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

enum MapFocusMode { vehicle, userStop, startLocation }

class ParentHomeController extends GetxController
    with WidgetsBindingObserver, GetTickerProviderStateMixin {
  final SessionController sessionController = Get.find<SessionController>();
  final ParentProfileRepository _profileRepository = ParentProfileRepository();
  final LiveTrackingRepository _liveTrackingRepository =
      LiveTrackingRepositoryImpl(
        LiveTrackingApi(LiveTrackingApiClient(httpClient: http.Client())),
      );
  final SocketIOService _socketIOService = SocketIOService();
  final OpenRouteService _openRouteService = OpenRouteService(
    trackify_vts.openRouteServiceApiKey,
  );

  final Rx<CurrentTrip?> currentTrip = Rxn<CurrentTrip>();
  final RxBool isFetchingTrip = false.obs;
  final RxString tripError = ''.obs;
  final RxBool isServerError = false.obs;
  final RxBool isUpcomingTrip = false.obs;
  final RxBool showGeofence = false.obs;
  bool _hasReachedUserStop = false;

  final Rx<ParentLiveTripData?> tripMapData = Rxn<ParentLiveTripData>();
  final RxBool isFetchingTripMap = false.obs;
  final RxString tripMapError = ''.obs;
  final Rx<LatLng?> vehicleLocation = Rxn<LatLng>();
  Rx<LatLng?> get currentVehicleLocation => vehicleLocation;
  final Rx<LatLng?> targetLocation = Rxn<LatLng>();
  final RxList<LatLng> routePolylinePoints = <LatLng>[].obs;

  final Rx<ParentProfileData?> parentProfile = Rxn<ParentProfileData>();
  final Rx<MapFocusMode> mapFocusMode = MapFocusMode.startLocation.obs;

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

  final Set<String> _geofenceAlertTriggered = {};
  final Distance _distance = const Distance();

  bool _autoZoomDone = false;
  final RxBool isInitializationComplete = false.obs;
  final RxBool pageVisibilityTrigger = false.obs;
  final RxBool showRouteBanner = false.obs;
  final RxString flashMessage = ''.obs;
  final RxString flashMessageType = 'info'.obs; // info, success, warning, error
  Timer? _bannerTimer;
  final MapController mapController = MapController();
  MapController? fullscreenMapController;
  MapController get activeController => fullscreenMapController ?? mapController;

  final RxDouble currentZoom = 13.0.obs;
  final RxBool isRouteStopsCollapsed = false.obs;
  late FrameUpdateCallback _frameUpdateCallback;
  bool _autoFitLocked = false;

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

  void showRouteBannerPersistently() {
    _bannerTimer?.cancel();
    showRouteBanner.value = true;
  }

  @override
  void onInit() {
    super.onInit();
    debugPrint('[ParentHome] onInit called');

   ever(tripMapData, (data) {
  if (data != null && !_autoFitLocked) {
    _autoFitLocked = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      fitMapToRoute();
    });
  }
});

    ever(vehicleLocation, (loc) {
      if (loc != null && !_autoFitLocked) {
        _autoFitLocked = true;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          fitMapToVehicle();
        });
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

    if (sessionController.token.value.isNotEmpty) {
      _initializeData();
    }
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
    _socketIOService.disconnect();
    _geofenceAlertTriggered.clear();
    showGeofence.value = false;
    _hasReachedUserStop = false;
  }

  Future<void> _initializeData() async {
    try {
      debugPrint('[ParentHome] 🚀 Starting fresh initialization (clearing stale state)');
      clearState(); // Force clear all reactive variables (markers, locations, etc.)

      // Ensure session is initialized before proceeding
      await sessionController.ensureInitialized();

      await _fetchProfileAndGetVehicleId();
      await fetchCurrentTrip();
      await fetchTripMapData();

      debugPrint('[ParentHome] Initializing socket connection for trip tracking.');
      _setupSocketConnection();
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
      // Cooldown to prevent spamming refreshes
      final now = DateTime.now();
      if (!showLoading && _lastRefreshTime != null && 
          now.difference(_lastRefreshTime!) < _refreshCooldown) {
        debugPrint('[Home] Skipping trip fetch (cooldown)');
        return;
      }
      _lastRefreshTime = now;

      isServerError.value = false;
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

      debugPrint('[Home] 🛰️ Calling API: /parent/current-trip?childId=$childId');
      final response = await _profileRepository.getCurrentTrip(token, childId);

      if (!response.error && response.data != null) {
        currentTrip.value = response.data;
        isUpcomingTrip.value =
            response.data!.status.toLowerCase() == 'scheduled' ||
            response.data!.status.toLowerCase() == 'pending' ||
            response.message.toLowerCase().contains('upcoming');

        // Handle flash message ONLY for completed trips
        if (response.message.isNotEmpty) {
          if (response.message.toLowerCase().contains('trip already completed') || 
              response.data!.status.toLowerCase() == 'completed') {
            flashMessage.value = response.message;
            flashMessageType.value = 'success'; // Green for completed
            showRouteBannerPersistently();
          } else {
            // Hide banner for all other states (upcoming, active, etc)
            showRouteBanner.value = false;
          }
        }

        tripError.value = '';
        debugPrint(
          '[Home] Current trip set: ${currentTrip.value?.tripId} (Upcoming: ${isUpcomingTrip.value})',
        );
      } else {
        debugPrint('[Home] Error fetching trip: ${response.message}');
        tripError.value = response.message;
        currentTrip.value = null; // Ensure it is cleared
        tripMapData.value = null; // Also clear map data if trip is gone
      }
    } on exceptions.HttpException catch (e) {
      debugPrint('[Home] HttpException: $e');
      tripError.value = e.message;
      if (e.statusCode == 503 || e.message.toLowerCase().contains('unable to reach')) {
        isServerError.value = true;
      }
      currentTrip.value = null;
      tripMapData.value = null;
    } catch (e) {
      debugPrint('[Home] Exception: $e');
      tripError.value = '';
      currentTrip.value = null;
      tripMapData.value = null;
    } finally {
      if (showLoading) isFetchingTrip.value = false;
    }
  }

  Future<void> fetchTripMapData({bool showLoading = false}) async {
    try {
      isServerError.value = false;
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

      debugPrint('[Home] 📍 Fetching trip map data: /parent/current-trip?childId=$childId');
      final response = await _profileRepository.getCurrentTrip(token, childId);
      debugPrint(
        '[Home] 📊 API Response - Error: ${response.error}, Has Data: ${response.data != null}',
      );

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
            if (assignedVehicleNumber != null &&
                assignedVehicleNumber != 'N/A') {
              vehicleNumbers[assignedVehicleId!] = assignedVehicleNumber!;
            } else {
              vehicleNumbers[assignedVehicleId!] = 'Vehicle';
            }
            vehicleNumbers.refresh();
            debugPrint(
              '[Home] 🚗 Active Trip Vehicle: $assignedVehicleId ($assignedVehicleNumber), Device: $assignedDeviceId',
            );
          }

          baseData = ParentLiveTripData(
            associatedTripId: trip.associatedTripId ?? trip.tripId,
            scheduledTripId: trip.scheduledTripId,
            routeName: trip.routeName ?? 'Trip',
            status: trip.status,
            scheduledStartTime: trip.scheduledStartTime ?? '',
            driverName: trip.driver?.name ?? '',
            vehicleId: trip.vehicle.vehicleId,
            startLocation: LatLng(
              trip.startLocation!.latitude,
              trip.startLocation!.longitude,
            ),
            endLocation: LatLng(
              trip.endLocation!.latitude,
              trip.endLocation!.longitude,
            ),
            startAddress: trip.startLocation!.address,
            endAddress: trip.endLocation!.address,
            landmark:
                trip.routePoints.isNotEmpty
                    ? (trip.routePoints.first.landmark)
                    : '',
            tripType: trip.tripType,
            timeline:
                trip.routePoints
                    .map(
                      (TripRoutePoint rp) => TripStop(
                        id: rp.stopId,
                        name: rp.name,
                        location: LatLng(rp.latitude, rp.longitude),
                        sequence: rp.sequence,
                        address: rp.name,
                        landmark: rp.landmark,
                        scheduledTime: rp.approximateReachTime ?? '',
                        isCompleted: rp.status == 'completed',
                        isUserStop: rp.isUserStop,
                        isStopReached: rp.isStopReached,
                        isStopCrossed: rp.isStopCrossed,
                        geofenceRadius: (rp.geofenceRadiusMeters as num?)?.toDouble() ?? 100.0,
                      ),
                    )
                    .toList(),
          );
        }
      }

      if (baseData == null) {
        debugPrint('[Home] 📍 Falling back to base trip data API');
        baseData = await _liveTrackingRepository.fetchBaseTripData(
          token,
          childId,
        );
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
      if (profile != null && baseData != null) {
        LatLng? userTarget;
        if (baseData.tripType?.toLowerCase() == 'drop') {
          if (profile.dropoffLocation != null) {
            userTarget = LatLng(
              profile.dropoffLocation!.latitude,
              profile.dropoffLocation!.longitude,
            );
          }
        } else if (baseData.tripType?.toLowerCase() == 'pickup') {
          if (profile.pickupLocation != null) {
            userTarget = LatLng(
              profile.pickupLocation!.latitude,
              profile.pickupLocation!.longitude,
            );
          }
        }

        if (userTarget != null) {
          targetLocation.value = userTarget;
          debugPrint(
            '[Home] 🎯 Target location set: $userTarget for tripType: ${baseData.tripType}',
          );
          
          // 🛡️ Ensure isUserStop is set in the timeline for the stop matching targetLocation
          bool userStopMarked = baseData.timeline.any((s) => s.isUserStop);
          if (!userStopMarked) {
            debugPrint('[Home] 🛡️ No user stop marked in API, searching by proximity...');
            final List<TripStop> updatedTimeline = [];
            double minDistance = double.infinity;
            int closestIndex = -1;
            
            for (int i = 0; i < baseData.timeline.length; i++) {
              final dist = _distance.as(LengthUnit.Meter, userTarget, baseData.timeline[i].location);
              if (dist < minDistance) {
                minDistance = dist;
                closestIndex = i;
              }
            }
            
            // If we found a stop within 100m, mark it
            if (closestIndex != -1 && minDistance < 100) {
              for (int i = 0; i < baseData.timeline.length; i++) {
                if (i == closestIndex) {
                  updatedTimeline.add(baseData.timeline[i].copyWith(isUserStop: true));
                  debugPrint('[Home] ✅ Marked stop ${baseData.timeline[i].name} as user stop (dist: $minDistance m)');
                } else {
                  updatedTimeline.add(baseData.timeline[i]);
                }
              }
              baseData = baseData.copyWith(timeline: updatedTimeline);
            }
          }
        }
      }

      if (baseData.timeline.isEmpty) {
        debugPrint('[Home] ⚠️ Trip map data has NO stops! Timeline is empty');
        debugPrint('[Home] ⚠️ Route name: ${baseData.routeName}');
        debugPrint('[Home] ⚠️ Start location: ${baseData.startLocation}');
        debugPrint('[Home] ⚠️ End location: ${baseData.endLocation}');
      } else {
        debugPrint(
          '[Home] ✅ Trip map data set with ${baseData.timeline.length} stops',
        );
      }

      debugPrint('[Home] ✅ Route name: ${baseData.routeName}');
      debugPrint('[Home] ✅ Start: ${baseData.startLocation}');
      debugPrint('[Home] ✅ End: ${baseData.endLocation}');

      // Update assigned vehicle if trip map data has one
      if (baseData.vehicleId.isNotEmpty) {
        assignedVehicleId = baseData.vehicleId;
        debugPrint('[Home] 🚗 Tracking vehicle confirmed: $assignedVehicleId');
      }

      tripMapData.value = baseData;
      tripMapError.value = '';

      if (showLoading) isFetchingTripMap.value = false;

      // 🛣️ Fetch polyline in background to avoid blocking the UI loading state
      // If the road-following route takes too long, the UI will still show the map
      _generateRoutePolyline(baseData);
    } on exceptions.HttpException catch (e) {
      debugPrint(
        '[Home] ❌ HttpException while fetching trip map: ${e.message}',
      );
      debugPrint('[Home] Status Code: ${e.statusCode}');
      tripMapError.value = e.message;
      if (e.statusCode == 503 || e.message.toLowerCase().contains('unable to reach')) {
        isServerError.value = true;
      }
      tripMapData.value = null;
      if (showLoading) isFetchingTripMap.value = false;
    } catch (e, stackTrace) {
      debugPrint('[Home] ❌ Exception in fetchTripMapData: $e');
      debugPrint('[Home] Stack trace: $stackTrace');
      tripMapError.value = e.toString();
      tripMapData.value = null;
      if (showLoading) isFetchingTripMap.value = false;
    }
  }

  Future<void> _generateRoutePolyline(ParentLiveTripData tripData) async {
    final isPickup = tripData.tripType?.toLowerCase() == 'pickup';
    final isDrop = tripData.tripType?.toLowerCase() == 'drop';
    
    debugPrint('[Home] 🛣️ Generating straight-line route for ${tripData.tripType}...');

    // Find user target stop index in timeline
    int userStopIndex = tripData.timeline.indexWhere((stop) => stop.isUserStop);

    final List<LatLng> coordinates = [];
    
    if (isPickup) {
      // Full route for Pickup: From Start Location to All Stops to End Location (School)
      coordinates.add(tripData.startLocation);
      coordinates.addAll(tripData.timeline.map((s) => s.location));
      coordinates.add(tripData.endLocation);
    } else if (isDrop) {
      // From Start Location (School) to User Stop
      coordinates.add(tripData.startLocation);
      if (userStopIndex != -1) {
        for (int i = 0; i <= userStopIndex; i++) {
          coordinates.add(tripData.timeline[i].location);
        }
      }
    } else {
      // Default: Full trip
      coordinates.add(tripData.startLocation);
      coordinates.addAll(tripData.timeline.map((s) => s.location));
      coordinates.add(tripData.endLocation);
    }

    if (coordinates.isEmpty) {
      coordinates.add(tripData.startLocation);
      coordinates.add(tripData.endLocation);
    }

    // Set initial straight-line route as fallback while fetching road-following route
    routePolylinePoints.value = coordinates;

    try {
      debugPrint('[Home] 🛣️ Fetching road-following route for ${coordinates.length} points');
      final roadPoints = await _openRouteService.getRouteThrough(coordinates);
      if (roadPoints.isNotEmpty) {
        routePolylinePoints.value = roadPoints;
        debugPrint('[Home] ✅ Road-following route generated with ${roadPoints.length} points');
      } else {
        // Fallback to straight lines if road points empty
        routePolylinePoints.value = coordinates;
        debugPrint('[Home] ⚠️ Empty road points, falling back to straight lines');
      }
    } catch (e) {
      debugPrint('[Home] ❌ Error generating road route: $e');
      // Fallback to straight lines
      routePolylinePoints.value = coordinates;
      debugPrint('[Home] ⚠️ Falling back to straight-line route');
    }
  }

  void refreshCurrentTrip() {
    fetchCurrentTrip(showLoading: true);
    fetchTripMapData(showLoading: true);
  }

  Future<void> refreshAllData() async {
    _autoFitLocked = false; // 🔑 allow one auto-fit again

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
      isServerError.value = false;
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
        debugPrint(
          '[ParentHome] ✅ Associated Users: ${profile.associatedUsers.length}',
        );
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
          debugPrint(
            '[ParentHome] ✅ Assigned Vehicle Number: $assignedVehicleNumber, Device: $assignedDeviceId',
          );
        }
      } else {
        debugPrint(
          '[ParentHome] ❌ Error in profile response: ${response.message}',
        );
      }
    } catch (e, stackTrace) {
      debugPrint('[ParentHome] ❌ Error fetching profile: $e');
      if (e.toString().toLowerCase().contains('unable to reach')) {
        isServerError.value = true;
      }
      debugPrint('[ParentHome] Stack trace: $stackTrace');
    }
  }

  void _setupSocketConnection() async {
    // Wait for session to be ready
    await sessionController.ensureInitialized();

    final token = sessionController.token.value;
    debugPrint(
      '[ParentHome] Setting up socket connection (Token available: ${token.isNotEmpty})',
    );
    _socketIOService.initialize(authToken: token);

    _frameUpdateCallback = (data) {
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

    _socketIOService.addFrameUpdateListener(_frameUpdateCallback);
  }

  DateTime? _lastRefreshTime;
  static const _refreshCooldown = Duration(seconds: 30);

  void _updateStateFromSocketFrame(Map data) {
    try {
      debugPrint('[ParentHome] 🔄 Updating UI state directly from socket frame (No API call)');
      final tripData = data['trip_data'];
      if (tripData == null || tripData is! Map) return;

      // Update currentTrip status if provided
      if (tripData['status'] != null && currentTrip.value != null) {
        final newStatus = tripData['status'].toString();
        currentTrip.value = currentTrip.value!.copyWith(
          status: newStatus,
        );
        
        // Also update isUpcomingTrip if the trip has started
        if (newStatus.toLowerCase() == 'active' || 
            newStatus.toLowerCase() == 'in-progress' || 
            newStatus.toLowerCase() == 'started') {
          isUpcomingTrip.value = false;
        }
      }

      // Update tripMapData timeline (stop statuses) if provided
      final routePoints = tripData['route_points'] as List?;
      if (routePoints != null && tripMapData.value != null) {
        final List<TripStop> oldTimeline = tripMapData.value!.timeline;
        final List<TripStop> updatedTimeline = [];
        
        for (var point in routePoints) {
          if (point is Map<String, dynamic>) {
            final newStop = TripStop.fromRoutePointJson(point);
            
            // 🛡️ Preserve isUserStop flag from existing timeline
            // Check both stop_id and location (in case ID changes but it's the same stop)
            final oldStop = oldTimeline.firstWhereOrNull((s) => 
              s.id == newStop.id || 
              (s.location.latitude == newStop.location.latitude && s.location.longitude == newStop.location.longitude)
            );
            
            bool isUserStop = newStop.isUserStop;
            if (oldStop != null && oldStop.isUserStop) {
              isUserStop = true;
            }
            
            if (isUserStop != newStop.isUserStop) {
              updatedTimeline.add(newStop.copyWith(isUserStop: isUserStop));
            } else {
              updatedTimeline.add(newStop);
            }
          }
        }
        
        if (updatedTimeline.isNotEmpty) {
          tripMapData.value = tripMapData.value!.copyWith(
            status: tripData['status']?.toString(),
            timeline: updatedTimeline,
          );
        }
      }
    } catch (e) {
      debugPrint('[ParentHome] Error updating state from socket: $e');
    }
  }

  void _handleSocketData(Map data) {
    try {
      debugPrint('[ParentHome] 📦 SOCKET FRAME RECEIVED: $data');
      
      // Handle nested data if it exists
      Map actualData = data;
      if (data.containsKey('data') && data['data'] is Map) {
        actualData = data['data'];
        debugPrint('[ParentHome] 📦 Using nested data: $actualData');
      }

      final type = (data['type'] ?? data['event'] ?? actualData['type'] ?? actualData['event'])?.toString();
      
      // Handle Trip Started, Stop Reached, and trp_updation messages
      final isDrop = tripMapData.value?.tripType?.toLowerCase() == 'drop';
      final isPickup = !isDrop;

      if (type == 'trip_started' || 
          type == 'trp_updation' || 
          type == 'destination_reached' || 
          type == 'source_reached' ||
          type == 'stop_status_update') {
        
        // Extract tripId from nested data if available, otherwise from top level
        final tripId = (actualData['tripId'] ?? actualData['trip_id'] ?? data['tripId'] ?? data['trip_id'])?.toString();
        
        // Also check inside trip_data if it exists
        String? frameScheduledTripId;
        if (actualData.containsKey('trip_data') && actualData['trip_data'] is Map) {
          frameScheduledTripId = actualData['trip_data']['scheduled_trip_id']?.toString();
        }
        frameScheduledTripId ??= (actualData['scheduledTripId'] ?? actualData['scheduled_trip_id'])?.toString();
        
        if (tripId != null && currentTrip.value != null) {
          final currentTripId = currentTrip.value!.tripId;
          final currentScheduledTripId = currentTrip.value!.scheduledTripId;
          
          bool isTripMatch = (tripId == currentTripId || tripId == currentScheduledTripId || 
                             (frameScheduledTripId != null && (frameScheduledTripId == currentTripId || frameScheduledTripId == currentScheduledTripId)));
          
          if (isTripMatch) {
            debugPrint('[ParentHome] ✅ Match! Event: $type');
            
            if (type == 'trip_started') {
              isUpcomingTrip.value = false;
            }

            // Handle stop_status_update (reached)
            if (type == 'stop_status_update' && (actualData['type'] == 'reached' || actualData['type'] == 'stop_reached')) {
              final stopName = (actualData['name'] ?? data['name'])?.toString() ?? 'Stop';
              final stopId = (actualData['stop_id'] ?? actualData['stopId'] ?? data['stop_id'] ?? data['stopId'])?.toString();
              
              debugPrint('[ParentHome] 📍 Stop reached: $stopName (ID: $stopId)');

              if (isDrop && tripMapData.value != null) {
                final lat = (actualData['latitude'] ?? data['latitude'])?.toDouble();
                final lng = (actualData['longitude'] ?? data['longitude'])?.toDouble();
                
                final userStop = tripMapData.value!.timeline.firstWhereOrNull((s) {
                  bool idMatch = (stopId != null && s.id == stopId);
                  bool nameMatch = (s.name != null && stopName != null && s.name == stopName);
                  bool proximityMatch = false;
                  if (lat != null && lng != null) {
                    final d = _distance.as(LengthUnit.Meter, LatLng(lat, lng), s.location);
                    proximityMatch = d < 100; // Increased proximity range for better matching
                  }
                  return idMatch || nameMatch || proximityMatch;
                });
                
                if (userStop != null && userStop.isUserStop) {
                  debugPrint('[ParentHome] 🎉 User stop reached! Hiding live marker.');
                  _hasReachedUserStop = true;
                  vehicleLocation.value = null;
                  showGeofence.value = false;
                  flashMessage.value = 'Your child has been successfully dropped';
                  flashMessageType.value = 'success';
                  showRouteBannerPersistently();
                }
              }
              
              // Update stop locally if trip_data missing
              if (!actualData.containsKey('trip_data') && tripMapData.value != null) {
                final updatedTimeline = tripMapData.value!.timeline.map((stop) {
                  if ((stopId != null && stop.id == stopId) || stop.name == stopName) {
                    return stop.copyWith(isStopReached: true);
                  }
                  return stop;
                }).toList();
                tripMapData.value = tripMapData.value!.copyWith(timeline: updatedTimeline);
              }
            }

            // Handle destination_reached
            if (type == 'destination_reached') {
              // Print exactly "destination reached" to terminal as requested
              debugPrint('destination reached');
              
              if (currentTrip.value != null) {
                currentTrip.value = currentTrip.value!.copyWith(status: 'completed');
              }
              if (tripMapData.value != null) {
                tripMapData.value = tripMapData.value!.copyWith(status: 'completed');
              }

              if (isDrop) {
                debugPrint('[ParentHome] 🏁 Destination reached for drop trip. Hiding live marker.');
                _hasReachedUserStop = true;
                vehicleLocation.value = null;
                showGeofence.value = false;
                flashMessage.value = 'Your child has been successfully dropped';
                flashMessageType.value = 'success';
                showRouteBannerPersistently();
              } else {
                debugPrint('[ParentHome] Pickup trip destination reached.');
              }
            }

            // Update state from trip_data if available
            if (actualData.containsKey('trip_data')) {
              _updateStateFromSocketFrame(actualData);
            }
          }
        }
      }

      final vehicleId =
          (actualData['vehicleId'] ?? actualData['vehicle_id'] ?? actualData['id'] ?? data['vehicleId'] ?? data['vehicle_id'] ?? data['id'])?.toString();
      final gpsDeviceId = (actualData['gpsDeviceId'] ?? data['gpsDeviceId'])?.toString();
      final latitude = actualData['latitude'] ?? data['latitude'];
      final longitude = actualData['longitude'] ?? data['longitude'];
      final timestamp = actualData['timestamp'] ?? data['timestamp'];
      final vehicleNumber = actualData['vehicleNumber'] ?? actualData['vehicle_number'] ?? data['vehicleNumber'] ?? data['vehicle_number'];
      final course = actualData['course'] ?? actualData['heading'] ?? data['course'] ?? data['heading'] ?? 0.0;

      if (vehicleId != null && latitude != null && longitude != null) {
        // Ensure latitude and longitude are doubles
        double lat =
            (latitude is int)
                ? latitude.toDouble()
                : (latitude is double
                    ? latitude
                    : double.tryParse(latitude.toString()) ?? 0.0);
        double lng =
            (longitude is int)
                ? longitude.toDouble()
                : (longitude is double
                    ? longitude
                    : double.tryParse(longitude.toString()) ?? 0.0);

        if (lat == 0.0 && lng == 0.0) {
          // Allow 0,0 for now to see if marker appears, but log it
          debugPrint(
            '[ParentHome] ⚠️ Received 0,0 coordinates for vehicle $vehicleId',
          );
          // return; // Uncommenting this to allow 0,0 for testing
        }

        final location = LatLng(lat, lng);
        vehicleLocations[vehicleId] = location;
        vehicleLocations.refresh();

        if (timestamp != null) {
          vehicleTimestamps[vehicleId] =
              DateTime.tryParse(timestamp.toString()) ?? DateTime.now();
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

        double heading =
            (course is int)
                ? course.toDouble()
                : (course is double
                    ? course
                    : double.tryParse(course.toString()) ?? 0.0);
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

        debugPrint('[ParentHome] 🔍 Checking Match - Incoming: $vidTrim (GID: $gdidTrim) vs Assigned: $avidTrim (GID: $adidTrim)');

        if (avidTrim != null && vidTrim == avidTrim) {
          isMatch = true;
        } else if (adidTrim != null &&
            gdidTrim != null &&
            gdidTrim == adidTrim) {
          isMatch = true;
        }

        if (isMatch) {
          final tripStatus = currentTrip.value?.status.toLowerCase();
          
          if (tripStatus == 'active' || tripStatus == 'in-progress' || tripStatus == 'started') {
            final isDrop = tripMapData.value?.tripType?.toLowerCase() == 'drop';
            
            // 🏠 If it's a drop trip and user home reached, don't update location (keep marker hidden)
            if (isDrop && _hasReachedUserStop) {
              vehicleLocation.value = null;
              debugPrint('[ParentHome] 🏠 Child dropped. Keeping live marker hidden.');
            } else {
              vehicleLocation.value = location;
              vehicleHeading.value = heading;
            }
            
            // 🛡️ Proximity-Based Geofencing Logic
            if (isUpcomingTrip.value || targetLocation.value == null) {
              showGeofence.value = false;
              _hasReachedUserStop = false;
            } else {
              final double dist = _distance.as(
                LengthUnit.Meter,
                location,
                targetLocation.value!,
              );

              // Enable geofencing when vehicle is near user home (within 100m)
              if (dist <= 100) {
                if (!showGeofence.value) {
                  showGeofence.value = true;
                  debugPrint('[ParentHome] 🛡️ Geofencing ENABLED (Vehicle within 100m)');
                }

                // Track if we've actually reached/passed the stop (within 10m)
                if (dist <= 10) {
                  if (!_hasReachedUserStop && isDrop) {
                    flashMessage.value = 'Your child has been successfully dropped';
                    flashMessageType.value = 'success';
                    showRouteBannerPersistently();
                    debugPrint('[ParentHome] 🏠 Proximity-based drop detected (dist <= 10m)');
                  }
                  _hasReachedUserStop = true;
                  showGeofence.value = false;
                }
              }
              // Disable geofencing after 10m of user stop (after having reached it)
              else if (_hasReachedUserStop && dist > 10) {
                showGeofence.value = false;
                // Only reset _hasReachedUserStop for PICKUP trips so marker can reappear if needed
                // For DROP trips, we want to KEEP it true so marker stays hidden
                if (!isDrop) {
                  _hasReachedUserStop = false; 
                  debugPrint('[ParentHome] 🛡️ Geofencing DISABLED (Vehicle passed stop by 10m)');
                } else {
                  debugPrint('[ParentHome] 🛡️ Geofencing DISABLED (Child already dropped)');
                }
              }
            }

            debugPrint(
              '[ParentHome] ✅ MATCHED VEHICLE: Updated vehicleLocation for $vidTrim: $location, Heading: $heading, GeofenceVisible: ${showGeofence.value}',
            );
          } else if (tripStatus != 'active' && tripStatus != 'in-progress' && tripStatus != 'started') {
            // Clear location if trip is not active (upcoming or completed)
            vehicleLocation.value = null;
            debugPrint('[ParentHome] ℹ️ Matched vehicle $vidTrim but trip status is "$tripStatus". Live marker hidden.');
          }
        } else {
          debugPrint(
            '[ParentHome] ℹ️ No match for $vidTrim. (Assigned VID: $avidTrim, Frame GID: $gdidTrim, Assigned GID: $adidTrim)',
          );
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
    // Nudge the map to prevent grey tiles on resume/visibility change
    WidgetsBinding.instance.addPostFrameCallback((_) {
      nudgeMap();
    });
  }

  void nudgeMap() {
    try {
      final currentCenter = activeController.camera.center;
      final currentZoomValue = activeController.camera.zoom;
      
      if (currentZoomValue.isNaN || currentZoomValue.isInfinite) return;
      if (currentCenter.latitude == 0.0 && currentCenter.longitude == 0.0) return;

      activeController.move(currentCenter, currentZoomValue + 0.0001);
      Future.delayed(const Duration(milliseconds: 100), () {
        activeController.move(currentCenter, currentZoomValue);
      });
    } catch (e) {
      debugPrint('Error nudging map: $e');
    }
  }

  void zoomIn() {
    _zoomBy(1);
  }

  void zoomOut() {
    _zoomBy(-1);
  }

  void _zoomBy(double delta) {
    LatLng? targetPos;
    
    if (mapFocusMode.value == MapFocusMode.userStop) {
      final trip = tripMapData.value;
      if (trip != null) {
        try {
          targetPos = trip.timeline.firstWhere((stop) => stop.isUserStop).location;
        } catch (_) {
          targetPos = targetLocation.value;
        }
      } else {
        targetPos = targetLocation.value;
      }
    } else if (mapFocusMode.value == MapFocusMode.startLocation) {
      final trip = tripMapData.value;
      if (trip != null) {
        targetPos = trip.startLocation;
      } else {
        // Fallback to center point or some reasonable default
        targetPos = activeController.camera.center;
      }
    } else {
      targetPos = vehicleLocation.value ??
          (assignedVehicleId != null
              ? vehicleLocations[assignedVehicleId]
              : null);
    }

    if (targetPos == null) {
      debugPrint('[Zoom] Target location not available');
      return;
    }

    final newZoom = activeController.camera.zoom + delta;
    activeController.move(targetPos, newZoom);
  }

  void focusOnVehicle() {
    mapFocusMode.value = MapFocusMode.vehicle;
    fitMapToVehicle();
  }

  void focusOnUserStop() {
    mapFocusMode.value = MapFocusMode.userStop;
    fitMapToUserStop();
  }

  void focusOnStartLocation() {
    final trip = tripMapData.value;
    if (trip != null) {
      animatedMapMove(trip.startLocation, 16.0);
    }
  }

  void fitMapToUserStop() {
    final trip = tripMapData.value;
    if (trip == null) {
      if (targetLocation.value != null) {
        animatedMapMove(targetLocation.value!, 14.5, offset: const Offset(0, -0.005));
      }
      return;
    }

    try {
      final userStop = trip.timeline.firstWhere((stop) => stop.isUserStop);
      animatedMapMove(userStop.location, 14.5, offset: const Offset(0, -0.005));
    } catch (e) {
      // No user stop found, fallback to targetLocation
      if (targetLocation.value != null) {
        animatedMapMove(targetLocation.value!, 14.5, offset: const Offset(0, -0.005));
      }
    }
  }

  void fitMapToRoute() {
    if (tripMapData.value == null) return;
    
    // Default focus to start location at zoom 16
    animatedMapMove(tripMapData.value!.startLocation, 16.0, offset: const Offset(0, -0.003));
  }

  void fitMapToVehicle() {
    final location =
        vehicleLocation.value ??
        (assignedVehicleId != null
            ? vehicleLocations[assignedVehicleId]
            : null);

    if (location != null) {
      animatedMapMove(location, 14.5, offset: const Offset(0, -0.005));
    } else {
      debugPrint('[ParentHome] Vehicle location not available for fitting');
      fitMapToRoute();
    }
  }

  void animatedMapMove(LatLng dest, double zoom, {Offset offset = Offset.zero}) {
    final latTween = Tween<double>(
      begin: activeController.camera.center.latitude,
      end: dest.latitude + offset.dy,
    );

    final lngTween = Tween<double>(
      begin: activeController.camera.center.longitude,
      end: dest.longitude + offset.dx,
    );

    final zoomTween = Tween<double>(
      begin: activeController.camera.zoom,
      end: zoom,
    );

    final controller = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );

    final animation = CurvedAnimation(
      parent: controller,
      curve: Curves.easeOut,
    );

    controller.addListener(() {
      try {
        activeController.move(
          LatLng(latTween.evaluate(animation), lngTween.evaluate(animation)),
          zoomTween.evaluate(animation),
        );
      } catch (e) {
        debugPrint('[ParentHome] Error during animatedMapMove: $e');
        controller.stop();
      }
    });

    animation.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        controller.dispose();
      }
    });

    controller.forward();
  }

  @override
  void onClose() {
    _bannerTimer?.cancel();
    mapController.dispose();
    _socketIOService.removeFrameUpdateListener(_frameUpdateCallback);
    super.onClose();
  }

  void reconnectSocket() {
    final token = sessionController.token.value;
    debugPrint('[ParentHome] Manual socket reconnection requested');
    _socketIOService.reconnect(authToken: token);
  }
}

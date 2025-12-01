import 'package:flutter_map/flutter_map.dart';
import 'package:get/get.dart';
import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:shared_preferences/shared_preferences.dart';

import '../../../../../core/core.dart';
import '../../../../../services/open_route_service.dart';
import '../../../profile/domain/models/parent_profile_model.dart';
import '../../../profile/domain/repositories/parent_profile_repository.dart';

class VehicleLiveTrackingController extends GetxController {
  final ParentProfileRepository _profileRepository = ParentProfileRepository();

  // Reactive variables
  final Rx<TripDetailsData?> tripDetails = Rxn<TripDetailsData>();
  final RxBool isLoadingTripDetails = false.obs;
  final RxString tripDetailsError = ''.obs;

  final Rx<LatLng?> currentVehicleLocation = Rxn<LatLng>();
  final RxBool isConnected = false.obs;
  final RxBool userHasZoomed = false.obs;
  final Rx<DateTime?> lastUserInteraction = Rxn<DateTime>();

  // Map and routing
  late MapController mapController;
  late OpenRouteService _routeService;
  final RxList<LatLng> routePolyline = <LatLng>[].obs;
  final RxBool isLoadingRoute = false.obs;

  // Socket
  IO.Socket? socket;

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
    _disconnectSocket();
    mapController.dispose();
    super.onClose();
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

        // Connect to socket for live tracking
        _connectSocket(token);
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

  Future<String> _getAuthToken() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString('token') ?? '';
    } catch (e) {
      return '';
    }
  }

  void _connectSocket(String authToken) {
    print('🔌 Attempting Socket.IO connection for vehicle tracking...');

    _disconnectSocket();

    Future.delayed(const Duration(milliseconds: 200), () {
      socket = IO.io(
        trackify_vts.socketUrl,
        IO.OptionBuilder()
            .setTransports(['websocket'])
            .setPath('/socket.io')
            .enableReconnection()
            .setReconnectionDelay(2000)
            .setReconnectionAttempts(20)
            .setTimeout(8000)
            .setAuth({'token': authToken})
            .setExtraHeaders({'Authorization': 'Bearer $authToken'})
            .disableAutoConnect()
            .build(),
      );

      socket?.connect();
      _setupSocketListeners();
    });
  }

  void _disconnectSocket() {
    if (socket != null) {
      print('🔌 Cleaning up existing socket...');
      socket?.clearListeners();
      if (socket?.connected ?? false) {
        print('🔌 Disconnecting socket...');
        socket?.disconnect();
      }
      socket?.dispose();
      socket = null;
    }
  }

  void _setupSocketListeners() {
    if (socket == null) return;

    socket?.onConnect((_) {
      print('✅ Socket.IO connected successfully!');
      isConnected.value = true;
      socket?.emit("join_parent");
      socket?.emit("subscribe_live_tracking", {});
    });

    socket?.onConnectError((e) {
      print('❌ Socket.IO connection error: $e');
      isConnected.value = false;
    });

    socket?.onError((e) {
      print('❌ Socket.IO error: $e');
      isConnected.value = false;
    });

    socket?.onDisconnect((reason) {
      print('⚠️ Socket.IO disconnected: $reason');
      isConnected.value = false;
    });

    socket?.on("live_tracking_update", (data) {
      print("--------------------------------------------------");
      print("📡 LIVE TRACKING FRAME RECEIVED");
      print("Raw Data: $data");
      print("Timestamp: ${DateTime.now()}");
      print("--------------------------------------------------");

      if (data is Map &&
          data["vehicleId"] == tripDetails.value?.trip.vehicleId.vehicleId) {
        print("🎯 Frame belongs to this vehicle: ${data["vehicleId"]}");

        LatLng? newLocation;
        if (data["latitude"] != null && data["longitude"] != null) {
          final lat = double.tryParse(data["latitude"].toString());
          final lng = double.tryParse(data["longitude"].toString());

          print("➡️ Parsed Latitude : $lat");
          print("➡️ Parsed Longitude: $lng");

          if (lat != null && lng != null) {
            newLocation = LatLng(lat, lng);
          }
        } else {
          print("⚠️ No latitude/longitude found inside frame.");
        }

        if (newLocation != null) {
          currentVehicleLocation.value = newLocation;

          bool shouldAutoZoom = !userHasZoomed.value ||
              (lastUserInteraction.value != null &&
                  DateTime.now().difference(lastUserInteraction.value!).inSeconds > 30);

          print("🔍 Auto Zoom Status: $shouldAutoZoom");

          if (shouldAutoZoom) {
            mapController.move(newLocation, 15.0);
            userHasZoomed.value = false;
          }
        }

        print("--------------------------------------------------");
      } else {
        print("⚠️ Frame does NOT belong to this vehicle.");
        print("--------------------------------------------------");
      }
    });
  }

  void onMapPositionChanged(MapPosition position, bool hasGesture) {
    if (hasGesture) {
      userHasZoomed.value = true;
      lastUserInteraction.value = DateTime.now();
    }
  }
}
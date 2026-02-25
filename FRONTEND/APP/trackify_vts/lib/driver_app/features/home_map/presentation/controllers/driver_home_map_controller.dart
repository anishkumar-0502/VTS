import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:get/get.dart';
import 'package:latlong2/latlong.dart';
import 'package:trackify_vts/driver_app/Sessionhandler/session_controller.dart';
import 'package:trackify_vts/driver_app/features/dashboard/domain/repositories/dashboard_repositories.dart';
import 'package:trackify_vts/driver_app/features/scheduled_trips/domain/repositories/scheduled_trips_repository.dart';
import 'package:trackify_vts/driver_app/features/scheduled_trips/domain/models/scheduled_trip_model.dart';
import 'package:trackify_vts/services/open_route_service.dart';
import 'package:trackify_vts/services/socket_io_service.dart';
import 'package:trackify_vts/driver_app/features/dashboard/presentation/controllers/driver_dashboard_controller.dart';

class DriverHomeMapController extends GetxController 
    with GetTickerProviderStateMixin, WidgetsBindingObserver {
  final DashboardRepositories _dashboardRepository = DashboardRepositories();
  final ScheduledTripsRepository _scheduledRepository = ScheduledTripsRepository();
  final SessionController _sessionController = Get.find<SessionController>(tag: 'driver');
  final SocketIOService _socketIOService = SocketIOService();
  
  // OpenRouteService (now uses OSRM internally)
  final OpenRouteService _openRouteService = OpenRouteService('5b3ce3597851110001cf6248c8230752528747209765870503076135');
  
  // Track app lifecycle state
  AppLifecycleState? _appLifecycleState;

  final Rxn<ActiveTrip> activeTrip = Rxn<ActiveTrip>();
  final RxList<ScheduledTrip> scheduledTrips = RxList<ScheduledTrip>();
  final RxBool isLoading = false.obs;
  final RxBool isDashboardLoading = false.obs;
  final RxString error = ''.obs;

  // Map related
  late final MapController mapController;
  final RxList<LatLng> routePolyline = RxList<LatLng>();
  final RxList<RoutePoint> stops = RxList<RoutePoint>();
  final Rxn<LatLng> startLocation = Rxn<LatLng>();
  final Rxn<LatLng> endLocation = Rxn<LatLng>();
  final Rxn<LatLng> vehicleLocation = Rxn<LatLng>();
  final RxDouble vehicleHeading = 0.0.obs;
  final RxString currentRouteName = ''.obs;
  
  // To track which trip we are showing
  final RxnString showingTripId = RxnString();
  
  // Store callback reference for cleanup
  late FrameUpdateCallback _frameUpdateCallback;

  @override
  void onInit() {
    super.onInit();
    mapController = MapController();
    
    // Register lifecycle observer for auto-refresh
    WidgetsBinding.instance.addObserver(this);
    
    // Initialize socket with token if available (before syncing with dashboard)
    final token = _sessionController.token.value;
    if (token.isNotEmpty) {
      _socketIOService.initialize(authToken: token);
    } else {
      _socketIOService.initialize();
    }
    
    _frameUpdateCallback = (data) {
      if (data is Map) {
        final lat = data['latitude'];
        final lng = data['longitude'];
        final heading = data['heading'] ?? data['course'];
        
        if (lat != null && lng != null) {
          if (activeTrip.value != null) {
            final assignedDeviceId = activeTrip.value!.vehicleId.assignedDeviceId;
            final vehicleId = activeTrip.value!.vehicleId.vehicleId;
            
            final incomingDeviceId = data['gpsDeviceId'];
            final incomingVehicleId = data['vehicleId'] ?? data['vehicle_id'];
            
            bool isMatch = false;
            if (assignedDeviceId.isNotEmpty && incomingDeviceId == assignedDeviceId) {
              isMatch = true;
              debugPrint('[DriverHomeMap] ✅ Matched by Device ID: $incomingDeviceId == $assignedDeviceId');
            }
            else if (vehicleId.isNotEmpty && incomingVehicleId == vehicleId) {
              isMatch = true;
              debugPrint('[DriverHomeMap] ✅ Matched by Vehicle ID: $incomingVehicleId == $vehicleId');
            }
            else {
              debugPrint('[DriverHomeMap] ❌ No match - Device: $incomingDeviceId vs $assignedDeviceId, Vehicle: $incomingVehicleId vs $vehicleId');
            }
            
            if (isMatch) {
              vehicleLocation.value = LatLng((lat as num).toDouble(), (lng as num).toDouble());
              if (heading != null) {
                vehicleHeading.value = (heading as num).toDouble();
              }
              debugPrint('🚗 Vehicle updated: ${vehicleLocation.value}, Heading: ${vehicleHeading.value}');
            }
          } else {
            debugPrint('[DriverHomeMap] ⚠️ No active trip to match against');
          }
        }
      }
    };
    
    _socketIOService.addFrameUpdateListener(_frameUpdateCallback);
    
    // Attempt to sync with Dashboard Controller
    _syncWithDashboardController();
    
    // Load initial data
    loadData();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _appLifecycleState = state;
    debugPrint('[DriverHomeMap] App Lifecycle State: $state');
    
    if (state == AppLifecycleState.resumed) {
      debugPrint('[DriverHomeMap] App resumed - Refreshing data...');
      
      if (!_socketIOService.isConnected) {
        debugPrint('[DriverHomeMap] Socket not connected, reconnecting...');
        _socketIOService.reconnect();
      }
      
      if (activeTrip.value != null) {
        final vehicleId = activeTrip.value!.vehicleId.vehicleId;
        final deviceId = activeTrip.value!.vehicleId.assignedDeviceId;
        debugPrint('[DriverHomeMap] Setting vehicle filter - DeviceId: $deviceId, VehicleId: $vehicleId');
        _socketIOService.setVehicleFilter(deviceId.isNotEmpty ? deviceId : vehicleId);
      }
      
      loadData();
    }
  }

  void _syncWithDashboardController() {
    try {
      if (Get.isRegistered<DriverDashboardController>(tag: 'driver_dashboard')) {
        final dashboardController = Get.find<DriverDashboardController>(tag: 'driver_dashboard');
        
        // Listen to active trip changes
        ever(dashboardController.activeTrip, (trip) {
          activeTrip.value = trip;
          
          if (trip != null) {
            final vehicleId = trip.vehicleId.vehicleId;
            final deviceId = trip.vehicleId.assignedDeviceId;
            debugPrint('[DriverHomeMap] Active trip changed - Setting vehicle filter - DeviceId: $deviceId, VehicleId: $vehicleId');
            _socketIOService.setVehicleFilter(deviceId.isNotEmpty ? deviceId : vehicleId);
          }
          
          _updateMapData();
        });
        
        // Initial value if available
        if (dashboardController.activeTrip.value != null) {
          activeTrip.value = dashboardController.activeTrip.value;
          final trip = dashboardController.activeTrip.value!;
          final vehicleId = trip.vehicleId.vehicleId;
          final deviceId = trip.vehicleId.assignedDeviceId;
          debugPrint('[DriverHomeMap] Initial active trip - Setting vehicle filter - DeviceId: $deviceId, VehicleId: $vehicleId');
          _socketIOService.setVehicleFilter(deviceId.isNotEmpty ? deviceId : vehicleId);
          _updateMapData();
        }
      }
    } catch (e) {
      debugPrint('Error syncing with dashboard controller: $e');
    }
  }

  @override
  void onClose() {
    WidgetsBinding.instance.removeObserver(this);
    _socketIOService.removeFrameUpdateListener(_frameUpdateCallback);
    super.onClose();
  }

  void zoomIn() {
    final currentZoom = mapController.camera.zoom;
    LatLng target = mapController.camera.center;

    if (activeTrip.value != null) {
      // Focus on live tracking (vehicle location) for active trips
      target = vehicleLocation.value ?? startLocation.value ?? mapController.camera.center;
    } else if (scheduledTrips.isNotEmpty) {
      // Focus on start location for upcoming trips
      target = startLocation.value ?? mapController.camera.center;
    }
    
    _animatedMapMove(target, currentZoom + 1);
  }

  void zoomOut() {
    final currentZoom = mapController.camera.zoom;
    LatLng target = mapController.camera.center;

    if (activeTrip.value != null) {
      // Focus on live tracking (vehicle location) for active trips
      target = vehicleLocation.value ?? startLocation.value ?? mapController.camera.center;
    } else if (scheduledTrips.isNotEmpty) {
      // Focus on start location for upcoming trips
      target = startLocation.value ?? mapController.camera.center;
    }
    
    _animatedMapMove(target, currentZoom - 1);
  }

  void _animatedMapMove(LatLng destLocation, double destZoom) {
    // Create some variables that will be used during the animation
    final latTween = Tween<double>(
        begin: mapController.camera.center.latitude, end: destLocation.latitude);
    final lngTween = Tween<double>(
        begin: mapController.camera.center.longitude, end: destLocation.longitude);
    final zoomTween = Tween<double>(
        begin: mapController.camera.zoom, end: destZoom);

    // Create a animation controller that has a duration and a TickerProvider
    final controller = AnimationController(
        duration: const Duration(milliseconds: 500), vsync: this);
    // The animation determines what path the animation will take. You can try different Curves values, although I found
    // fastOutSlowIn to be my favorite.
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

  Future<void> loadData() async {
    try {
      isLoading.value = true;
      error.value = '';
      
      final token = _sessionController.token.value;
      if (token.isEmpty) {
        error.value = 'Authentication token not found';
        return;
      }

      // Ensure socket is connected before fetching data
      if (!_socketIOService.isConnected) {
        debugPrint('[DriverHomeMap] Socket not connected, initializing...');
        await _socketIOService.reconnect(authToken: token);
      }

      // 1. Fetch Active Trip
      final activeResponse = await _scheduledRepository.getActiveTrip(token);
      if (!activeResponse.error && activeResponse.data != null) {
        activeTrip.value = activeResponse.data;
        
        // Set vehicle filter after fetching active trip
        if (activeResponse.data != null) {
          final trip = activeResponse.data!;
          final vehicleId = trip.vehicleId.vehicleId;
          final deviceId = trip.vehicleId.assignedDeviceId;
          debugPrint('[DriverHomeMap] Loaded active trip - Setting vehicle filter - DeviceId: $deviceId, VehicleId: $vehicleId');
          _socketIOService.setVehicleFilter(deviceId.isNotEmpty ? deviceId : vehicleId);
        }
      } else {
        activeTrip.value = null;
      }

      // 2. Fetch Scheduled Trips (if no active trip or just to have them)
      // We always fetch scheduled trips because if active is null, we show first scheduled
      final scheduledResponse = await _dashboardRepository.gettodayscheduletrip(token);
      if (!scheduledResponse.error && scheduledResponse.data != null) {
        scheduledTrips.assignAll(scheduledResponse.data!);
      }

      _updateMapData();

    } catch (e) {
      error.value = 'Failed to load data: $e';
      debugPrint('Error loading home map data: $e');
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> refreshData() async {
    debugPrint('[DriverHomeMap] 🔄 Manual refresh triggered');
    await loadData();
  }

  void _updateMapData() {
    // Priority: Active Trip -> First Scheduled Trip
    if (activeTrip.value != null) {
      _displayActiveTrip(activeTrip.value!);
    } else if (scheduledTrips.isNotEmpty) {
      _displayScheduledTrip(scheduledTrips.first);
    } else {
      // No trips
      _clearMap();
    }

    // Focus camera on the relevant target
    WidgetsBinding.instance.addPostFrameCallback((_) {
      try {
        LatLng? target;
        if (activeTrip.value != null) {
          target = vehicleLocation.value ?? startLocation.value;
        } else if (scheduledTrips.isNotEmpty) {
          target = startLocation.value;
        }
        
        if (target != null) {
          _animatedMapMove(target, 13);
        }
      } catch (e) {
        debugPrint('Error focusing camera: $e');
      }
    });
  }

  void _displayActiveTrip(ActiveTrip trip) {
    showingTripId.value = trip.tripId;
    currentRouteName.value = trip.routeName;
    
    if (trip.vehicleId.standingLocation != null) {
      final lat = trip.vehicleId.standingLocation!.latitude;
      final lng = trip.vehicleId.standingLocation!.longitude;
      if (lat != 0 && lng != 0) {
        vehicleLocation.value = LatLng(lat, lng);
      }
    }
    
    // Set stops
    final sortedStops = List<RoutePoint>.from(trip.routePoints);
    sortedStops.sort((a, b) => a.order.compareTo(b.order));
    stops.assignAll(sortedStops);

    if (trip.startLocation.latitude != 0) {
      startLocation.value = LatLng(trip.startLocation.latitude, trip.startLocation.longitude);
    } else if (sortedStops.isNotEmpty) {
      final first = sortedStops.first;
      startLocation.value = LatLng(first.latitude, first.longitude);
    }

    if (trip.endLocation != null) {
      endLocation.value = LatLng(trip.endLocation!.latitude, trip.endLocation!.longitude);
    } else if (sortedStops.isNotEmpty) {
      final last = sortedStops.last;
      endLocation.value = LatLng(last.latitude, last.longitude);
    }

    _fetchRoutePolyline();
  }

  void _displayScheduledTrip(ScheduledTrip trip) {
    showingTripId.value = trip.scheduledTripId;
    currentRouteName.value = trip.routeName;

    final sortedStops = List<RoutePoint>.from(trip.routePoints);
    sortedStops.sort((a, b) => a.order.compareTo(b.order));
    stops.assignAll(sortedStops);

    if (trip.startLocation != null) {
      startLocation.value = LatLng(trip.startLocation!.latitude, trip.startLocation!.longitude);
    } else if (sortedStops.isNotEmpty) {
      final first = sortedStops.first;
      startLocation.value = LatLng(first.latitude, first.longitude);
    }

    if (trip.endLocation != null) {
      endLocation.value = LatLng(trip.endLocation!.latitude, trip.endLocation!.longitude);
    } else if (sortedStops.isNotEmpty) {
      final last = sortedStops.last;
      endLocation.value = LatLng(last.latitude, last.longitude);
    }

    _fetchRoutePolyline();
  }

  void _clearMap() {
    showingTripId.value = null;
    currentRouteName.value = '';
    stops.clear();
    routePolyline.clear();
    startLocation.value = null;
    endLocation.value = null;
  }

  Future<void> _fetchRoutePolyline() async {
    if (stops.isEmpty && startLocation.value == null && endLocation.value == null) return;

    try {
      final points = <LatLng>[];
      
      // Add start
      if (startLocation.value != null) {
        points.add(startLocation.value!);
      }
      
      // Add stops
      // Filter out stops that are 0,0 or excessively far from start (> 50km) to prevent loops
      for (var stop in stops) {
        if (stop.latitude != 0 && stop.longitude != 0) {
           final stopLatLng = LatLng(stop.latitude, stop.longitude);
           
           if (startLocation.value != null) {
              final distance = const Distance().as(LengthUnit.Kilometer, startLocation.value!, stopLatLng);
              if (distance > 50) {
                debugPrint('⚠️ Ignoring stop ${stop.name} - Too far ($distance km)');
                continue;
              }
           }
           points.add(stopLatLng);
        }
      }
      
      // Add end
      if (endLocation.value != null) {
        points.add(endLocation.value!);
      }

      // Remove CONSECUTIVE duplicates only to preserve order (e.g. loops)
      final cleanPoints = <LatLng>[];
      if (points.isNotEmpty) {
        cleanPoints.add(points.first);
        for (int i = 1; i < points.length; i++) {
           final p = points[i];
           final prev = points[i-1];
           // Simple equality check
           if (p.latitude != prev.latitude || p.longitude != prev.longitude) {
             cleanPoints.add(p);
           }
        }
      }

      if (cleanPoints.length < 2) return;

      final polyline = await _openRouteService.getRouteThrough(cleanPoints);
      
      // Ensure visual connection to Start/End markers
      // OSRM returns geometry starting/ending at snapped points on the road.
      // We prepend/append the actual marker locations to close any visual gap.
      if (polyline.isNotEmpty) {
         if (startLocation.value != null) {
            final start = startLocation.value!;
            // If the first point isn't exactly the start point, prepend it
            if (polyline.first.latitude != start.latitude || polyline.first.longitude != start.longitude) {
               polyline.insert(0, start);
            }
         }
         
         if (endLocation.value != null) {
            final end = endLocation.value!;
            // If the last point isn't exactly the end point, append it
            if (polyline.last.latitude != end.latitude || polyline.last.longitude != end.longitude) {
               polyline.add(end);
            }
         }
      }

      routePolyline.assignAll(polyline);
      
    } catch (e) {
      debugPrint('Error fetching route polyline: $e');
      // Fallback: draw straight lines between points
      final points = <LatLng>[];
      if (startLocation.value != null) points.add(startLocation.value!);
      for (var stop in stops) {
        if (stop.latitude != 0 && stop.longitude != 0) {
           points.add(LatLng(stop.latitude, stop.longitude));
        }
      }
      if (endLocation.value != null) points.add(endLocation.value!);
      
      routePolyline.assignAll(points);
    } finally {
      // Fit bounds after route is updated
      fitMapToBounds();
    }
  }

  Future<void> startTrip(String tripId) async {
    isLoading.value = true;
    try {
      final token = _sessionController.token.value;
      if (token.isEmpty) return;

      final response = await _scheduledRepository.startScheduledTrip(
        token: token,
        scheduledTripId: tripId,
      );

      if (response['error'] == false) {
        // Refresh active trip to update UI
        final activeResponse = await _scheduledRepository.getActiveTrip(token);
        if (!activeResponse.error && activeResponse.data != null) {
          activeTrip.value = activeResponse.data;
          _displayActiveTrip(activeTrip.value!);
          
          // Emit socket event for live tracking
          // The vehicle_id is needed for tracking
          // Assuming activeTrip data has it or we can get it from driver profile
          // But start trip response also has vehicle_id
          final startData = response['data'];
          if (startData != null && startData['vehicle_id'] != null) {
            _socketIOService.emitTestFrame(startData['vehicle_id']); // Just to test connection
            // Ideally backend handles live tracking emission, 
            // but we might need to subscribe to our own vehicle if we want to see it moving on map?
            // Or just start location updates service.
          }
        }
      }
    } catch (e) {
      debugPrint('Error starting trip: $e');
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> stopTrip(String tripId) async {
    isLoading.value = true;
    try {
      final token = _sessionController.token.value;
      if (token.isEmpty) return;
      
      // Using dummy location data for now as per previous implementation logic
      // In a real scenario, we'd get current location
      final payload = {
        'end_location': {
          'latitude': 0.0,
          'longitude': 0.0,
          'address': 'Ended from Map'
        },
        'distance_traveled': 0.0
      };

      final response = await _scheduledRepository.endTrip(
        token: token,
        tripId: tripId,
        body: payload
      );

      if (response['error'] == false) {
        activeTrip.value = null;
        // Refresh to show scheduled trips again
        final scheduledResponse = await _dashboardRepository.gettodayscheduletrip(token);
        if (!scheduledResponse.error && scheduledResponse.data != null) {
          scheduledTrips.assignAll(scheduledResponse.data!);
          if (scheduledTrips.isNotEmpty) {
             _displayScheduledTrip(scheduledTrips.first);
          } else {
            _clearMap();
          }
        } else {
          _clearMap();
        }
      }
    } catch (e) {
      debugPrint('Error stopping trip: $e');
    } finally {
      isLoading.value = false;
    }
  }

  void fitMapToBounds() {
    // If active trip & vehicle location known, prioritize focusing on vehicle
    if (activeTrip.value != null && vehicleLocation.value != null) {
      Future.delayed(const Duration(milliseconds: 500), () {
        try {
          _animatedMapMove(vehicleLocation.value!, 16.0);
        } catch (_) {}
      });
      return;
    }

    // Collect all relevant points
    final points = <LatLng>[];
    if (startLocation.value != null) points.add(startLocation.value!);
    if (endLocation.value != null) points.add(endLocation.value!);
    for (var stop in stops) {
       points.add(LatLng(stop.latitude, stop.longitude));
    }
    // Also include polyline points if available for better fit
    if (routePolyline.isNotEmpty) {
      points.addAll(routePolyline);
    }

    if (points.isEmpty) return;

    try {
      final bounds = LatLngBounds.fromPoints(points);
      
      // Animate camera to fit bounds
      // We can't determine perfect zoom level without map dimensions, 
      // but flutter_map's CameraFit handles this if map is laid out.
      // Since we want animation, we might need to rely on mapController.fitCamera 
      
      // Wait, if map is not ready, this throws.
      // We should wrap in a slight delay or check if map is ready.
       Future.delayed(const Duration(milliseconds: 500), () {
        try {
           mapController.fitCamera(
            CameraFit.bounds(
              bounds: bounds,
              padding: const EdgeInsets.all(50),
            ),
          );
        } catch (_) {}
      });

    } catch (e) {
      debugPrint('Error fitting map to bounds: $e');
    }
  }
}
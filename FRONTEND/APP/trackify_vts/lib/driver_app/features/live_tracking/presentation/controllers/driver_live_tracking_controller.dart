import 'package:get/get.dart';
import 'package:trackify_vts/driver_app/features/scheduled_trips/domain/models/scheduled_trip_model.dart' as trip_model;
import 'package:trackify_vts/driver_app/features/scheduled_trips/presentation/controllers/scheduled_trips_controller.dart';

class DriverLiveTrackingController extends GetxController {
  final RxDouble routeProgress = 0.38.obs;
  final RxString gpsSignal = 'Strong'.obs;
  final RxString currentSpeed = '32 km/h'.obs;
  final RxString estimatedArrival = '08:12 AM'.obs;
  final RxString batteryStatus = '92%'.obs;
  final RxString tripStatus = 'On schedule'.obs;
  final RxBool isTripActive = false.obs;
  final RxBool isSocketConnected = true.obs;

  final Rx<trip_model.LocationData?> startLocation = Rx<trip_model.LocationData?>(null);
  final Rx<trip_model.LocationData?> endLocation = Rx<trip_model.LocationData?>(null);
  final RxList<trip_model.RoutePoint> routePoints = <trip_model.RoutePoint>[].obs;

  @override
  void onInit() {
    super.onInit();
    print('🔥🔥🔥 DriverLiveTrackingController.onInit() CALLED');
    _setupActiveTripListener();
  }

  void _setupActiveTripListener() {
    try {
      final scheduledTripsController = Get.find<ScheduledTripsController>(tag: 'scheduled_trips');
      
      if (scheduledTripsController.activeTrip.value != null) {
        print('🔥 FORCE APPLY ACTIVE TRIP (Initial Value)');
        setActiveTripData(scheduledTripsController.activeTrip.value);
      }
      
      ever(scheduledTripsController.activeTrip, (activeTrip) {
        if (activeTrip != null) {
          print('🔥 FORCE APPLY ACTIVE TRIP (Changed)');
          setActiveTripData(activeTrip);
        }
      });
    } catch (e) {
      print('❌ Could not setup active trip listener: $e');
    }
  }

  final List<Map<String, String>> locationTimeline = [
    {'time': '07:32 AM', 'event': 'Departed depot'},
    {'time': '07:41 AM', 'event': 'Picked up at Maple Street'},
    {'time': '07:50 AM', 'event': 'Picked up at Pine Avenue'},
    {'time': '07:58 AM', 'event': 'Approaching Oak Crescent'},
  ];

  void setTripData(trip_model.LocationData? start, trip_model.LocationData? end, List<trip_model.RoutePoint> points) {
    startLocation.value = start;
    endLocation.value = end;
    routePoints.assignAll(points);
  }

  void setTripFromScheduledTrip(trip_model.ScheduledTrip trip) {
    print('📍 setTripFromScheduledTrip: SCHEDULED TRIP - disabling live marker');
    print('🚨 CLEARING PREVIOUS STATE');
    routePoints.clear();
    startLocation.value = trip.startLocation;
    endLocation.value = trip.endLocation;
    routePoints.assignAll(trip.routePoints);
    isTripActive.value = false;
    tripStatus.value = trip.status;
    print('✅ Scheduled Trip Loaded - Route Points: ${routePoints.length}');
  }

  void setTripActive(bool active) {
    isTripActive.value = active;
  }

  void clearLiveTracking() {
    print('🔌 clearLiveTracking: Clearing all live tracking data');
    startLocation.value = null;
    endLocation.value = null;
    routePoints.clear();
    isTripActive.value = false;
    tripStatus.value = 'idle';
  }

  void setActiveTripData(dynamic activeTrip) {
    try {
      if (activeTrip == null) {
        print('❌ setActiveTripData: activeTrip is null');
        return;
      }

      print('🔥 APPLYING ACTIVE TRIP — RESETTING STATE');
      
      routePoints.clear();
      startLocation.value = activeTrip.startLocation;
      
      List<trip_model.RoutePoint> points = [];
      if (activeTrip.routePoints != null && activeTrip.routePoints is List && (activeTrip.routePoints as List).isNotEmpty) {
        points = (activeTrip.routePoints as List)
            .map((p) {
              if (p is trip_model.RoutePoint) {
                return p;
              } else if (p is Map<String, dynamic>) {
                return trip_model.RoutePoint.fromJson(p);
              } else {
                return trip_model.RoutePoint.fromJson(p as Map<String, dynamic>);
              }
            })
            .toList();
        print('✅ Active Trip route points used: ${points.length}');
      } else {
        print('⚠️ Active Trip has NO route points');
      }
      
      routePoints.assignAll(points);
      
      if (activeTrip.endLocation != null) {
        endLocation.value = activeTrip.endLocation;
      } else if (points.isNotEmpty) {
        final lastPoint = points.last;
        endLocation.value = trip_model.LocationData(
          latitude: lastPoint.latitude,
          longitude: lastPoint.longitude,
          address: lastPoint.name,
        );
      }
      
      isTripActive.value = true;
      tripStatus.value = activeTrip.status ?? 'en_route';
      
      print('🔴 END MARKER SOURCE: ${endLocation.value?.latitude}, ${endLocation.value?.longitude}');
      print('🚨 ROUTE POINT COUNT AFTER ASSIGNMENT: ${routePoints.length}');
    } catch (e, stackTrace) {
      print('❌ Error in setActiveTripData: $e');
      print('   Stack: $stackTrace');
    }
  }
}

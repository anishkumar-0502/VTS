import 'package:get/get.dart';

class DriverLiveTrackingController extends GetxController {
  final RxDouble routeProgress = 0.38.obs;
  final RxString gpsSignal = 'Strong'.obs;
  final RxString currentSpeed = '32 km/h'.obs;
  final RxString estimatedArrival = '08:12 AM'.obs;
  final RxString batteryStatus = '92%'.obs;
  final RxString tripStatus = 'On schedule'.obs;
  final RxBool isMapFullscreen = false.obs;

  final List<Map<String, String>> locationTimeline = [
    {'time': '07:32 AM', 'event': 'Departed depot'},
    {'time': '07:41 AM', 'event': 'Picked up at Maple Street'},
    {'time': '07:50 AM', 'event': 'Picked up at Pine Avenue'},
    {'time': '07:58 AM', 'event': 'Approaching Oak Crescent'},
  ];

  final List<String> stops = [
    'Maple Street',
    'Pine Avenue',
    'Oak Crescent',
    'Elm Boulevard',
  ];

  void toggleMapFullscreen() {
    isMapFullscreen.toggle();
  }
}

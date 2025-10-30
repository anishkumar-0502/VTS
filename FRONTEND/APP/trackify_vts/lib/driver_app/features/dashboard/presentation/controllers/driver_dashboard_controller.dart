import 'package:get/get.dart';

class DriverDashboardController extends GetxController {
  final RxInt currentIndex = 0.obs;
  final RxBool tripActive = false.obs;
  final RxBool isOffline = false.obs;
  final RxString selectedRouteName = 'Morning Route A'.obs;
  final RxString tripStatus = 'Trip idle'.obs;
  final Rxn<DateTime> lastSyncedAt = Rxn<DateTime>(DateTime.now());

  final List<Map<String, String>> keyMetrics = [
    {'label': 'Students on board', 'value': '18/24'},
    {'label': 'Next stop', 'value': 'Maple Street'},
    {'label': 'ETA to school', 'value': '12 mins'},
  ];

  final List<Map<String, String>> upcomingStops = [
    {'time': '07:40 AM', 'name': 'Maple Street', 'status': 'Pending'},
    {'time': '07:48 AM', 'name': 'Pine Avenue', 'status': 'Pending'},
    {'time': '07:55 AM', 'name': 'Oak Crescent', 'status': 'Pending'},
  ];

  final List<Map<String, String>> quickActions = [
    {'title': 'Notify delay', 'subtitle': 'Send update to all parents'},
    {'title': 'Message school', 'subtitle': 'Share schedule change'},
    {'title': 'Report issue', 'subtitle': 'Alert transport admin'},
  ];

  void switchTab(int index) {
    currentIndex.value = index;
  }

  void toggleTrip() {
    tripActive.toggle();
    tripStatus.value = tripActive.value ? 'Trip in progress' : 'Trip idle';
  }

  void toggleOfflineMode() {
    isOffline.toggle();
  }

  void markSynced() {
    lastSyncedAt.value = DateTime.now();
    isOffline.value = false;
  }
}

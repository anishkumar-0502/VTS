import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import '../../domain/repositories/dashboard_repositories.dart';
import '../../domain/models/dashboard_model.dart';
import 'package:trackify_vts/driver_app/Sessionhandler/session_controller.dart';

class DriverDashboardController extends GetxController {
  final RxInt currentIndex = 0.obs;
  final RxBool tripActive = false.obs;
  final RxBool isOffline = false.obs;
  final RxString selectedRouteName = 'Morning Route A'.obs;
  final RxString tripStatus = 'Trip idle'.obs;
  final Rxn<DateTime> lastSyncedAt = Rxn<DateTime>(DateTime.now());

  // Trip related variables
  final DashboardRepositories _repository = DashboardRepositories();
  final SessionController _sessionController = Get.find<SessionController>();
  final RxList<ScheduledTrip> scheduledTrips = RxList<ScheduledTrip>();
  final Rxn<ScheduledTrip> selectedTrip = Rxn<ScheduledTrip>();
  final RxBool isLoadingTrips = false.obs;
  final RxString tripsError = ''.obs;

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

  @override
  void onInit() {
    super.onInit();
    fetchTodaysScheduledTrips();
  }

  /// Fetch today's scheduled trips from the API
  Future<void> fetchTodaysScheduledTrips() async {
    try {
      isLoadingTrips.value = true;
      tripsError.value = '';

      final token = _sessionController.token.value;
      if (token.isEmpty) {
        tripsError.value = 'Authentication token not found';
        return;
      }

      final response = await _repository.gettodayscheduletrip(token);

      if (!response.error && response.data != null) {
        scheduledTrips.assignAll(response.data!);

        // Set the first trip as selected
        if (scheduledTrips.isNotEmpty) {
          selectedTrip.value = scheduledTrips[0];
          selectedRouteName.value = scheduledTrips[0].routeName;
          tripStatus.value = _getTripStatusDisplay(scheduledTrips[0].status);
        }
      } else {
        tripsError.value = response.message;
      }
    } catch (e) {
      tripsError.value = 'Failed to load trips: ${e.toString()}';
      debugPrint('Error fetching trips: $e');
    } finally {
      isLoadingTrips.value = false;
    }
  }

  /// Select a specific trip from the list
  void selectTrip(ScheduledTrip trip) {
    selectedTrip.value = trip;
    selectedRouteName.value = trip.routeName;
    tripStatus.value = _getTripStatusDisplay(trip.status);
  }

  /// Get human-readable trip status
  String _getTripStatusDisplay(String status) {
    switch (status.toLowerCase()) {
      case 'in-progress':
        return 'Trip in progress';
      case 'completed':
        return 'Trip completed';
      case 'pending':
        return 'Trip pending';
      default:
        return 'Trip ${status.toLowerCase()}';
    }
  }

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

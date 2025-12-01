import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../domain/repositories/dashboard_repositories.dart';
import '../../domain/models/dashboard_model.dart' as dashboard_models;
import 'package:trackify_vts/driver_app/Sessionhandler/session_controller.dart';
import '../../../scheduled_trips/domain/repositories/scheduled_trips_repository.dart';
import '../../../scheduled_trips/domain/models/scheduled_trip_model.dart'
as scheduled_models;
import 'package:trackify_vts/utilities/widgets/status_banner.dart';

class DriverDashboardController extends GetxController {
  final RxInt currentIndex = 0.obs;
  final RxBool tripActive = false.obs;
  final RxBool isOffline = false.obs;
  final RxString selectedRouteName = ''.obs;
  final RxString tripStatus = 'Trip idle'.obs;
  final Rxn<DateTime> lastSyncedAt = Rxn<DateTime>(DateTime.now());

  // Trip related variables
  final DashboardRepositories _repository = DashboardRepositories();
  final ScheduledTripsRepository _scheduledRepository =
  ScheduledTripsRepository();
  final SessionController _sessionController = Get.find<SessionController>(tag: 'driver');
  final RxList<scheduled_models.ScheduledTrip> scheduledTrips =
  RxList<scheduled_models.ScheduledTrip>();
  final Rxn<scheduled_models.ScheduledTrip> selectedTrip =
  Rxn<scheduled_models.ScheduledTrip>();
  final RxBool isLoadingTrips = false.obs;
  final RxString tripsError = ''.obs;
  final Rxn<scheduled_models.ActiveTrip> activeTrip =
  Rxn<scheduled_models.ActiveTrip>();
  final RxList<dashboard_models.DriverTripHistory> tripHistory =
  RxList<dashboard_models.DriverTripHistory>();
  final RxBool isLoadingTripHistory = false.obs;
  final RxString tripHistoryError = ''.obs;
  final Rxn<dashboard_models.DriverTripDetailData> activeTripDetail =
  Rxn<dashboard_models.DriverTripDetailData>();
  final RxBool isLoadingTripDetail = false.obs;
  final RxBool isStartingTrip = false.obs;
  final RxBool isStoppingTrip = false.obs;
  final RxBool tripStoppedSuccessfully = false.obs;
  final RxString tripDetailError = ''.obs;

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
    fetchActiveTrip();
    fetchTripHistory();
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

  /// Fetch active trip from the API
  Future<void> fetchActiveTrip() async {
    try {
      final token = _sessionController.token.value;
      if (token.isEmpty) {
        return;
      }

      final response = await _scheduledRepository.getActiveTrip(token);
      if (!response.error && response.data != null) {
        activeTrip.value = response.data;
        tripStoppedSuccessfully.value = false; // Reset stopped state for new active trip
      } else {
        activeTrip.value = null;
        // Don't reset stopped state here - it might have just been stopped
      }
    } catch (e) {
      activeTrip.value = null;
      // Don't reset stopped state on error - preserve the stopped state
      debugPrint('Error fetching active trip: $e');
    }
  }

  Future<void> fetchTripHistory() async {
    try {
      isLoadingTripHistory.value = true;
      tripHistoryError.value = '';
      final token = _sessionController.token.value;
      if (token.isEmpty) {
        tripHistory.clear();
        tripHistoryError.value = 'Authentication token not found';
        return;
      }

      final response = await _repository.getDriverTrips(token);
      if (!response.error && response.data != null) {
        tripHistory.assignAll(response.data!);
      } else {
        tripHistory.clear();
        tripHistoryError.value = response.message;
      }
    } catch (e) {
      tripHistory.clear();
      tripHistoryError.value = 'Failed to load trip history: ${e.toString()}';
      debugPrint('Error fetching trip history: $e');
    } finally {
      isLoadingTripHistory.value = false;
    }
  }

  Future<dashboard_models.DriverTripDetailData?> fetchTripDetail(
      String tripId,
      ) async {
    try {
      isLoadingTripDetail.value = true;
      tripDetailError.value = '';
      final token = _sessionController.token.value;
      if (token.isEmpty) {
        activeTripDetail.value = null;
        tripDetailError.value = 'Authentication token not found';
        return null;
      }

      final response = await _repository.getTripDetail(token, tripId);
      if (!response.error && response.data != null) {
        activeTripDetail.value = response.data;
        return response.data;
      } else {
        activeTripDetail.value = null;
        tripDetailError.value = response.message;
        return null;
      }
    } catch (e) {
      activeTripDetail.value = null;
      tripDetailError.value = 'Failed to load trip details: ${e.toString()}';
      debugPrint('Error fetching trip detail: $e');
      return null;
    } finally {
      isLoadingTripDetail.value = false;
    }
  }

  Future<bool> startScheduledTrip({
    required String scheduledTripId,
  }) async {
    final token = _sessionController.token.value;
    if (token.isEmpty) {
      showStatusBanner(
        'Authentication token not found',
        Colors.redAccent,
        Icons.error_outline,
      );
      return false;
    }

    try {
      isStartingTrip.value = true;
      tripStoppedSuccessfully.value = false; // Reset stopped state when starting new trip
      final response = await _scheduledRepository.startScheduledTrip(
        token: token,
        scheduledTripId: scheduledTripId,
      );

      if (response['error'] == true) {
        final message =
            response['message']?.toString() ?? 'Unable to start trip.';
        showStatusBanner(
          message,
          Colors.redAccent,
          Icons.error_outline,
        );
        return false;
      }

      final message =
          response['message']?.toString() ?? 'Trip started successfully.';
      showStatusBanner(
        message,
        Colors.green,
        Icons.check_circle_outline,
      );
      await fetchActiveTrip();
      await fetchTodaysScheduledTrips();
      await fetchTripHistory();
      return true;
    } catch (e) {
      showStatusBanner(
        'An unexpected error occurred while starting the trip.',
        Colors.redAccent,
        Icons.error_outline,
      );
      return false;
    } finally {
      isStartingTrip.value = false;
    }
  }

  Future<bool> stopActiveTrip({
    required String tripId,
    required Map<String, dynamic> payload,
  }) async {
    final token = _sessionController.token.value;
    if (token.isEmpty) {
      showStatusBanner(
        'Authentication token not found',
        Colors.redAccent,
        Icons.error_outline,
      );
      return false;
    }

    try {
      isStoppingTrip.value = true;
      final response = await _scheduledRepository.endTrip(
        token: token,
        tripId: tripId,
        body: payload,
      );

      if (response['error'] == true) {
        final message =
            response['message']?.toString() ?? 'Unable to stop trip.';
        showStatusBanner(
          message,
          Colors.redAccent,
          Icons.error_outline,
        );
        return false;
      }

      final message =
          response['message']?.toString() ?? 'Trip ended successfully.';
      showStatusBanner(
        message,
        Colors.green,
        Icons.check_circle_outline,
      );
      tripStoppedSuccessfully.value = true;
      await fetchActiveTrip();
      await fetchTodaysScheduledTrips();
      await fetchTripHistory();
      return true;
    } catch (e) {
      showStatusBanner(
        'An unexpected error occurred while stopping the trip.',
        Colors.redAccent,
        Icons.error_outline,
      );
      return false;
    } finally {
      isStoppingTrip.value = false;
    }
  }

  /// Select a specific trip from the list
  void selectTrip(scheduled_models.ScheduledTrip trip) {
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

  /// Refresh all dashboard data
  Future<void> refreshAllData() async {
    await fetchTodaysScheduledTrips();
    await fetchActiveTrip();
    await fetchTripHistory();
  }
}
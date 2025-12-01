import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:trackify_vts/driver_app/Sessionhandler/session_controller.dart';
import 'package:trackify_vts/driver_app/features/scheduled_trips/domain/models/scheduled_trip_model.dart';
import 'package:trackify_vts/driver_app/features/scheduled_trips/domain/repositories/scheduled_trips_repository.dart';
import 'package:trackify_vts/utilities/exception/exception.dart';
import 'package:trackify_vts/utilities/widgets/status_banner.dart';

class ScheduledTripsController extends GetxController {
  final ScheduledTripsRepository _repository = ScheduledTripsRepository();
  final SessionController _sessionController = Get.find<SessionController>(tag: 'driver');

  // Observable states
  var isLoading = false.obs;
  var allTrips = <ScheduledTrip>[].obs;
  var todayTrips = <ScheduledTrip>[].obs;
  var errorMessage = ''.obs;
  var selectedTabIndex = 0.obs;
  var isStartingTrip = false.obs;
  var isStoppingTrip = false.obs;
  var currentActiveTripId = RxnString();
  var activeTrip = Rxn<ActiveTrip>();

  @override
  void onInit() {
    super.onInit();
    fetchScheduledTrips();
    fetchActiveTrip();
  }

  Future<void> fetchScheduledTrips() async {
    try {
      isLoading.value = true;
      errorMessage.value = '';

      final token = _sessionController.token.value;
      if (token.isEmpty) {
        errorMessage.value = 'Authentication token not found';
        isLoading.value = false;
        return;
      }

      // Fetch today's trips first (contains full vehicle data with vehicle_number)
      final todayResponse = await _repository.getTodayScheduledTrips(token);
      if (!todayResponse.error && todayResponse.data != null) {
        todayTrips.value = todayResponse.data!;
        // Use today's trips as the base for all-trips since it has complete vehicle info
        allTrips.value = todayResponse.data!;
      }

      // Fetch all trips and merge with today's trips to include future trips
      final allTripsResponse = await _repository.getAllScheduledTrips(token);
      if (!allTripsResponse.error && allTripsResponse.data != null) {
        // Get all trip IDs from today's trips to identify which trips are today's
        final todayTripIds = Set<String>.from(
          todayResponse.data?.map((t) => t.scheduledTripId) ?? []
        );

        // Add trips from all-trips that aren't in today's trips
        final upcomingTrips = allTripsResponse.data!
            .where((trip) => !todayTripIds.contains(trip.scheduledTripId))
            .toList();

        // Combine: today's trips (with full vehicle data) + upcoming trips (without full data)
        allTrips.value = [...(todayResponse.data ?? []), ...upcomingTrips];
      } else {
        // If all-trips fails, just use today's trips
        if (allTripsResponse.message.isNotEmpty) {
          errorMessage.value = allTripsResponse.message;
        }
      }

      if (allTrips.isNotEmpty || todayTrips.isNotEmpty) {
        errorMessage.value = '';
      }

      isLoading.value = false;
    } on HttpException catch (e) {
      errorMessage.value = e.message;
      isLoading.value = false;
      Get.snackbar('Error', e.message);
    } catch (e) {
      debugPrint('Unexpected error in fetchScheduledTrips: $e');
      errorMessage.value = 'An unexpected error occurred';
      isLoading.value = false;
      showStatusBanner(
        'An unexpected error occurred while loading trips.',
        Colors.red,
        Icons.error_outline,
      );
    }
  }

  Future<void> fetchActiveTrip() async {
    try {
      final token = _sessionController.token.value;
      if (token.isEmpty) {
        return;
      }

      final response = await _repository.getActiveTrip(token);
      if (!response.error && response.data != null) {
        activeTrip.value = response.data;
      } else {
        activeTrip.value = null;
      }
    } catch (e) {
      activeTrip.value = null;
      debugPrint('Error fetching active trip: $e');
    }
  }

  Future<void> refreshTrips() async {
    await fetchScheduledTrips();
    await fetchActiveTrip();
  }

  Future<void> startTrip(String scheduledTripId, {VoidCallback? onSuccess}) async {
    final token = _sessionController.token.value;
    if (token.isEmpty) {
      showStatusBanner(
        'Authentication token not found. Please log in again.',
        Colors.red,
        Icons.error_outline,
      );
      return;
    }

    try {
      isStartingTrip.value = true;
      final response = await _repository.startScheduledTrip(
        token: token,
        scheduledTripId: scheduledTripId,
      );

      if (response['error'] == true) {
        final message =
            response['message']?.toString() ?? 'Unable to start trip.';
        showStatusBanner(message, Colors.red, Icons.error_outline);
        return;
      }

      final message =
          response['message']?.toString() ?? 'Trip started successfully.';
      showStatusBanner(message, Colors.green, Icons.check_circle_outline);
      currentActiveTripId.value =
          (response['data'] as Map<String, dynamic>?)?['trip_id']?.toString();
      await fetchScheduledTrips();
      await fetchActiveTrip();
      refreshTrips();
      onSuccess?.call();
    } on HttpException catch (e) {
      showStatusBanner(e.message, Colors.red, Icons.error_outline);
    } catch (e) {
      showStatusBanner(
        'An unexpected error occurred.',
        Colors.red,
        Icons.error_outline,
      );
    } finally {
      isStartingTrip.value = false;
    }
  }

  Future<void> stopTrip({
    required String tripId,
    required Map<String, dynamic> payload,
    VoidCallback? onSuccess,
  }) async {
    final token = _sessionController.token.value;
    if (token.isEmpty) {
      showStatusBanner(
        'Authentication token not found. Please log in again.',
        Colors.red,
        Icons.error_outline,
      );
      return;
    }

    try {
      isStoppingTrip.value = true;
      final response = await _repository.endTrip(
        token: token,
        tripId: tripId,
        body: payload,
      );

      if (response['error'] == true) {
        final message =
            response['message']?.toString() ?? 'Unable to stop trip.';
        showStatusBanner(message, Colors.red, Icons.error_outline);
        return;
      }

      final message =
          response['message']?.toString() ?? 'Trip ended successfully.';
      showStatusBanner(message, Colors.green, Icons.check_circle_outline);
      currentActiveTripId.value = null;
      await fetchScheduledTrips();
      await fetchActiveTrip();
      refreshTrips();
      onSuccess?.call();
    } on HttpException catch (e) {
      showStatusBanner(e.message, Colors.red, Icons.error_outline);
    } catch (e) {
      showStatusBanner(
        'An unexpected error occurred while stopping the trip.',
        Colors.red,
        Icons.error_outline,
      );
    } finally {
      isStoppingTrip.value = false;
    }
  }

  void selectTrip(ScheduledTrip trip) {
    Get.toNamed('/driver/trip-details', arguments: trip);
  }

  void setSelectedTab(int index) {
    selectedTabIndex.value = index;
  }

  List<ScheduledTrip> get currentTrips =>
      selectedTabIndex.value == 0 ? allTrips : todayTrips;
}

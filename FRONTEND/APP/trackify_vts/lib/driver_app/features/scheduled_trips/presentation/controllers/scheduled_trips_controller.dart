import 'package:get/get.dart';
import 'package:trackify_vts/driver_app/Sessionhandler/session_controller.dart';
import 'package:trackify_vts/driver_app/features/scheduled_trips/domain/models/scheduled_trip_model.dart';
import 'package:trackify_vts/driver_app/features/scheduled_trips/domain/repositories/scheduled_trips_repository.dart';
import 'package:trackify_vts/utilities/exception/exception.dart';

class ScheduledTripsController extends GetxController {
  final ScheduledTripsRepository _repository = ScheduledTripsRepository();
  final SessionController _sessionController = Get.find<SessionController>();

  // Observable states
  var isLoading = false.obs;
  var allTrips = <ScheduledTrip>[].obs;
  var todayTrips = <ScheduledTrip>[].obs;
  var errorMessage = ''.obs;
  var selectedTabIndex = 0.obs;

  @override
  void onInit() {
    super.onInit();
    fetchScheduledTrips();
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

      // Fetch all trips
      final allTripsResponse = await _repository.getAllScheduledTrips(token);
      if (!allTripsResponse.error && allTripsResponse.data != null) {
        allTrips.value = allTripsResponse.data!;
      } else {
        errorMessage.value = allTripsResponse.message;
      }

      // Fetch today's trips
      final todayResponse = await _repository.getTodayScheduledTrips(token);
      if (!todayResponse.error && todayResponse.data != null) {
        todayTrips.value = todayResponse.data!;
      }

      isLoading.value = false;
    } on HttpException catch (e) {
      errorMessage.value = e.message;
      isLoading.value = false;
      Get.snackbar('Error', e.message);
    } catch (e) {
      errorMessage.value = 'An unexpected error occurred';
      isLoading.value = false;
      Get.snackbar('Error', 'An unexpected error occurred');
    }
  }

  Future<void> refreshTrips() async {
    await fetchScheduledTrips();
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

import 'package:get/get.dart';
import 'package:http/http.dart' as http;
import '../controllers/child_location_tracking_controller.dart';
import '../../domain/repositories/live_tracking_repository.dart';
import '../../data/api.dart';

class ChildLocationTrackingBinding extends Bindings {
  @override
  void dependencies() {
    final apiClient = LiveTrackingApiClient(httpClient: http.Client());
    final api = LiveTrackingApi(apiClient);
    final repository = LiveTrackingRepositoryImpl(api);
    Get.put<ChildLocationTrackingController>(
      ChildLocationTrackingController(repository: repository),
    );
  }
}

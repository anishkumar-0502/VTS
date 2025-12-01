import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../../Sessionhandler/session_controller.dart';
import '../../../profile/domain/models/parent_profile_model.dart';
import '../../../profile/domain/repositories/parent_profile_repository.dart';
import '../../../../../utilities/exception/exception.dart' as exceptions;

class ParentHomeController extends GetxController {
  final SessionController sessionController = Get.find<SessionController>();
  final ParentProfileRepository _profileRepository = ParentProfileRepository();

  final Rx<CurrentTrip?> currentTrip = Rxn<CurrentTrip>();
  final RxBool isFetchingTrip = false.obs;
  final RxString tripError = ''.obs;
  final Rx<TrackChild?> trackChild = Rxn<TrackChild>();
  final RxBool isFetchingTrackChild = false.obs;
  final RxString trackChildError = ''.obs;

  @override
  void onInit() {
    super.onInit();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await sessionController.ensureInitialized();
      tripError.value = '';
      trackChildError.value = '';
      fetchCurrentTrip();
      fetchTrackChild();
    });
  }

  Future<void> fetchCurrentTrip({bool showLoading = false}) async {
    try {
      final token = sessionController.token.value;
      if (token.isEmpty) {
        print('No authentication token found for fetching current trip');
        return;
      }

      final childId = sessionController.parentData.value?['end_user_id'] as String?;
      if (childId == null || childId.isEmpty) {
        print('No child ID found in session');
        return;
      }

      if (showLoading) isFetchingTrip.value = true;

      print('Fetching current trip for child: $childId');
      final response = await _profileRepository.getCurrentTrip(token, childId);

      print(
        'Got current trip response: error=${response.error}, message=${response.message}, data!=null=${response.data != null}',
      );

      if (response.error) {
        print('Error fetching current trip: ${response.message}');
        tripError.value = response.message ?? 'Unable to reach the server. Please check your connection or try again later.';
      } else if (response.data != null) {
        currentTrip.value = response.data;
        tripError.value = '';
        print('Current trip data set: ${currentTrip.value?.tripId}');
        print('VERIFY: currentTrip.value is now: ${currentTrip.value}');
      } else {
        print('Current trip response data is null');
        tripError.value = '';
      }
    } on exceptions.HttpException catch (e) {
      print('HttpException while fetching current trip: $e');
      tripError.value = 'Unable to reach the server. Please check your connection or try again later.';
    } catch (e, stackTrace) {
      print('Exception in fetchCurrentTrip: $e');
      print('Stack trace: $stackTrace');
      tripError.value = 'Error loading trip: ${e.toString()}';
    } finally {
      if (showLoading) isFetchingTrip.value = false;
    }
  }

  Future<void> fetchTrackChild({bool showLoading = false}) async {
    try {
      final token = sessionController.token.value;
      if (token.isEmpty) {
        print('No authentication token found for fetching track child');
        return;
      }

      final childId = sessionController.parentData.value?['end_user_id'] as String?;
      if (childId == null || childId.isEmpty) {
        print('No child ID found in session');
        return;
      }

      if (showLoading) isFetchingTrackChild.value = true;

      print('Fetching track child for child: $childId');
      final response = await _profileRepository.trackChild(token, childId);

      print(
        'Got track child response: error=${response.error}, message=${response.message}, data!=null=${response.data != null}',
      );

      if (response.error) {
        print('Error fetching track child: ${response.message}');
        trackChildError.value = response.message ?? 'Unable to reach the server. Please check your connection or try again later.';
      } else if (response.data != null) {
        trackChild.value = response.data;
        trackChildError.value = '';
        print('Track child data set');
      } else {
        print('Track child response data is null');
        trackChildError.value = '';
      }
    } on exceptions.HttpException catch (e) {
      print('HttpException while fetching track child: $e');
      trackChildError.value = 'Unable to reach the server. Please check your connection or try again later.';
    } catch (e, stackTrace) {
      print('Exception in fetchTrackChild: $e');
      print('Stack trace: $stackTrace');
      trackChildError.value = 'Error loading tracking data: ${e.toString()}';
    } finally {
      if (showLoading) isFetchingTrackChild.value = false;
    }
  }

  void refreshCurrentTrip() {
    fetchCurrentTrip(showLoading: true);
    fetchTrackChild(showLoading: true);
  }
}

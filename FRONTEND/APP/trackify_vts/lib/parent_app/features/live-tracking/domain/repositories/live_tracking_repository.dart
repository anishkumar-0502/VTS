import '../../data/api.dart';
import '../models/live_tracking_model.dart';

abstract class LiveTrackingRepository {
  // 1. Fetches all trip details (route, timeline)
  Future<ParentLiveTripData> fetchBaseTripData(String token, String childId);

  // 2. Fetches the child's live location
  Future<ChildLocation> getChildLocation(String token, String childId);

  // 3. Fetches only the next stop details
  Future<NextStopDetails> getNextStop(String token, String tripId, String childId);

  // 4. Fetches the child's specific status
  Future<String> getPassengerStatus(String token, String tripId, String childId); 
}

// Concrete Implementation
class LiveTrackingRepositoryImpl implements LiveTrackingRepository {
  final LiveTrackingApi _api;

  LiveTrackingRepositoryImpl(this._api);

  @override
  Future<ParentLiveTripData> fetchBaseTripData(String token, String childId) async {
    final response = await _api.getCurrentTrip(token, childId);
    return ParentLiveTripData.fromCurrentTripJson(response);
  }

  @override
  Future<ChildLocation> getChildLocation(String token, String childId) async {
    final response = await _api.getTrackChild(token, childId);
    return ChildLocation.fromJson(response);
  }

  @override
  Future<NextStopDetails> getNextStop(String token, String tripId, String childId) async {
    final response = await _api.getNextStop(token, tripId, childId);
    return NextStopDetails.fromJson(response);
  }

  @override
  Future<String> getPassengerStatus(String token, String tripId, String childId) async {
    final response = await _api.getPassengerStatus(token, tripId, childId);
    // Assuming the passenger status API returns a simple status string in its 'data' field.
    return response['data']?.toString() ?? 'Unknown Status';
  }
}
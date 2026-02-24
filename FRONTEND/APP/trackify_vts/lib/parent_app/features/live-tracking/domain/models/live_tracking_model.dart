import 'package:latlong2/latlong.dart';

// Represents a stop, primarily from the 'route_points' array of current-trip API
class TripStop {
  final String id;
  final String name;
  final String address;
  final String landmark;
  final LatLng location;
  final int sequence;
  final String scheduledTime; // Added this field to fix UI error
  final bool isCompleted; 
  final bool isChildStop; 
  final bool isReminder; // Added this field to fix UI error
  final bool isUserStop;

  TripStop({
    required this.id,
    required this.name,
    required this.address,
    required this.landmark,
    required this.location,
    required this.sequence,
    required this.scheduledTime,
    this.isCompleted = false, 
    this.isChildStop = false, 
    this.isReminder = false,
    this.isUserStop = false,
  });

  // Factory to create from the 'route_points' array in the current-trip API response
  factory TripStop.fromRoutePointJson(Map<String, dynamic> json) {
    final lat = (json['latitude'] as num?)?.toDouble() ?? 0.0;
    final lng = (json['longitude'] as num?)?.toDouble() ?? 0.0;
    
    final address = json['name']?.toString() ?? 'Address not available'; 

    return TripStop(
      id: json['stop_id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Unknown Stop',
      address: address, 
      landmark: json['landmark']?.toString() ?? '',
      location: LatLng(lat, lng),
      sequence: json['sequence'] as int? ?? 0,
      scheduledTime: json['approximate_reach_time']?.toString() ?? json['scheduled_time']?.toString() ?? '00:00',
      isCompleted: json['is_completed'] as bool? ?? false, 
      isChildStop: json['is_child_stop'] as bool? ?? false, 
      isReminder: json['is_reminder'] as bool? ?? false,
      isUserStop: json['is_user_stop'] as bool? ?? false,
    );
  }
}

// Represents the child's live location from track-child API
class ChildLocation {
  final LatLng location;
  final String name;

  ChildLocation({required this.location, required this.name});

  factory ChildLocation.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>? ?? {};
    final lat = (data['latitude'] as num?)?.toDouble() ?? 0.0;
    final lng = (data['longitude'] as num?)?.toDouble() ?? 0.0;

    return ChildLocation(
      location: LatLng(lat, lng),
      name: data['name']?.toString() ?? 'Unknown Location',
    );
  }
}

// Represents the next stop details from the next-stop API
class NextStopDetails {
  final String nextStopId;
  final String name;
  final LatLng location;

  NextStopDetails({
    required this.nextStopId,
    required this.name,
    required this.location,
  });

  factory NextStopDetails.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>? ?? {};
    final lat = (data['latitude'] as num?)?.toDouble() ?? 0.0;
    final lng = (data['longitude'] as num?)?.toDouble() ?? 0.0;

    return NextStopDetails(
      nextStopId: data['stop_id']?.toString() ?? '',
      name: data['name']?.toString() ?? 'N/A',
      location: LatLng(lat, lng),
    );
  }
}

// The main aggregated model used by the Controller/UI
class ParentLiveTripData {
  // From API 1: current-trip
  final String associatedTripId;
  final String? scheduledTripId;
  final String routeName;
  final String status;
  final String scheduledStartTime;
  final String driverName;
  final String vehicleId;
  final List<TripStop> timeline;
  final LatLng startLocation;
  final LatLng endLocation;
  final String startAddress;
  final String endAddress;
  final String landmark;
  final String? tripType;

  // Live/Dynamic properties
  final LatLng? currentVehicleLocation; 
  final String? childStatus; 
  final NextStopDetails? nextStop; 

  ParentLiveTripData({
    required this.associatedTripId,
    this.scheduledTripId,
    required this.routeName,
    required this.status,
    required this.scheduledStartTime,
    required this.driverName,
    required this.vehicleId,
    required this.timeline,
    required this.startLocation,
    required this.endLocation,
    required this.startAddress,
    required this.endAddress,
    required this.landmark,
    this.tripType,
    this.currentVehicleLocation,
    this.childStatus,
    this.nextStop,
  });

  // FIX: The required copyWith method
  ParentLiveTripData copyWith({
    String? associatedTripId,
    String? scheduledTripId,
    String? routeName,
    String? status,
    String? scheduledStartTime,
    String? driverName,
    String? vehicleId,
    List<TripStop>? timeline,
    LatLng? startLocation,
    LatLng? endLocation,
    String? startAddress,
    String? endAddress,
    String? landmark,
    String? tripType,
    LatLng? currentVehicleLocation,
    String? childStatus,
    NextStopDetails? nextStop,
  }) {
    return ParentLiveTripData(
      associatedTripId: associatedTripId ?? this.associatedTripId,
      scheduledTripId: scheduledTripId ?? this.scheduledTripId,
      routeName: routeName ?? this.routeName,
      status: status ?? this.status,
      scheduledStartTime: scheduledStartTime ?? this.scheduledStartTime,
      driverName: driverName ?? this.driverName,
      vehicleId: vehicleId ?? this.vehicleId,
      timeline: timeline ?? this.timeline,
      startLocation: startLocation ?? this.startLocation,
      endLocation: endLocation ?? this.endLocation,
      startAddress: startAddress ?? this.startAddress,
      endAddress: endAddress ?? this.endAddress,
      landmark: landmark ?? this.landmark,
      tripType: tripType ?? this.tripType,
      currentVehicleLocation: currentVehicleLocation ?? this.currentVehicleLocation,
      childStatus: childStatus ?? this.childStatus,
      nextStop: nextStop ?? this.nextStop,
    );
  }

  // Factory to create the BASE data from the current-trip API (API 1)
  factory ParentLiveTripData.fromCurrentTripJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>? ?? {};
    
    final driverId = data['driver_id']?.toString() ?? 'N/A';
    final routePointsData = data['route_points'] as List? ?? [];
    
    // Parse start_location
    final startLocData = data['start_location'] as Map<String, dynamic>? ?? {};
    final startLat = (startLocData['latitude'] as num?)?.toDouble() ?? 0.0;
    final startLng = (startLocData['longitude'] as num?)?.toDouble() ?? 0.0;
    final startAddress = startLocData['address']?.toString() ?? 'Start Point';
    
    // Parse end_location
    final endLocData = data['end_location'] as Map<String, dynamic>? ?? {};
    final endLat = (endLocData['latitude'] as num?)?.toDouble() ?? 0.0;
    final endLng = (endLocData['longitude'] as num?)?.toDouble() ?? 0.0;
    final endAddress = endLocData['address']?.toString() ?? 'End Point';

    final String landmark =
    routePointsData.isNotEmpty
        ? (routePointsData.first['landmark']?.toString() ?? '')
        : '';



    return ParentLiveTripData(
      associatedTripId: data['associated_trip_id']?.toString() ?? data['trip_id']?.toString() ?? '',
      scheduledTripId: data['scheduled_trip_id']?.toString(),
      routeName: data['route_name']?.toString() ?? 'N/A',
      status: data['status']?.toString() ?? 'inactive',
      scheduledStartTime: data['scheduled_start_time']?.toString() ?? 'N/A',
      driverName: data['driver_name']?.toString() ?? 'Driver $driverId',
      vehicleId: data['vehicle_id']?.toString() ?? '',
      timeline: routePointsData.map((item) => TripStop.fromRoutePointJson(item as Map<String, dynamic>)).toList(),
      startLocation: LatLng(startLat, startLng),
      endLocation: LatLng(endLat, endLng),
      startAddress: startAddress,
      endAddress: endAddress,
      landmark: landmark,
      tripType: data['trip_type']?.toString(),
    );
  }
}

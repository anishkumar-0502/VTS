class ScheduledTripsResponse {
  final bool error;
  final String message;
  final List<ScheduledTrip>? data;

  ScheduledTripsResponse({
    required this.error,
    required this.message,
    this.data,
  });

  factory ScheduledTripsResponse.fromJson(Map<String, dynamic> json) {
    return ScheduledTripsResponse(
      error: json['error'] as bool,
      message: json['message'] as String,
      data:
          json['data'] != null
              ? (json['data'] as List)
                  .map(
                    (trip) =>
                        ScheduledTrip.fromJson(trip as Map<String, dynamic>),
                  )
                  .toList()
              : null,
    );
  }
}

class ScheduledTrip {
  final String scheduledTripId;
  final String routeName;
  final String scheduledStartTime;
  final String tripPeriod;
  final String status;
  final LocationData? startLocation;
  final LocationData? endLocation;
  final VehicleData? vehicleId;
  final String driverId;
  final String operatorId;
  final RepeatDays? repeatDays;
  final bool isActive;
  final String? associatedTripId;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  ScheduledTrip({
    required this.scheduledTripId,
    required this.routeName,
    required this.scheduledStartTime,
    required this.tripPeriod,
    required this.status,
    this.startLocation,
    this.endLocation,
    this.vehicleId,
    required this.driverId,
    required this.operatorId,
    this.repeatDays,
    required this.isActive,
    this.associatedTripId,
    this.createdAt,
    this.updatedAt,
  });

  factory ScheduledTrip.fromJson(Map<String, dynamic> json) {
    return ScheduledTrip(
      scheduledTripId: json['scheduled_trip_id'] as String? ?? '',
      routeName: json['route_name'] as String? ?? '',
      scheduledStartTime: json['scheduled_start_time'] as String? ?? '',
      tripPeriod: json['trip_period'] as String? ?? '',
      status: json['status'] as String? ?? '',
      startLocation:
          json['start_location'] != null
              ? LocationData.fromJson(
                json['start_location'] as Map<String, dynamic>,
              )
              : null,
      endLocation:
          json['end_location'] != null
              ? LocationData.fromJson(
                json['end_location'] as Map<String, dynamic>,
              )
              : null,
      vehicleId:
          json['vehicle_id'] != null
              ? VehicleData.fromJson(json['vehicle_id'] as Map<String, dynamic>)
              : null,
      driverId: json['driver_id'] as String? ?? '',
      operatorId: json['operator_id'] as String? ?? '',
      repeatDays:
          json['repeat_days'] != null
              ? RepeatDays.fromJson(json['repeat_days'] as Map<String, dynamic>)
              : null,
      isActive: json['is_active'] as bool? ?? false,
      associatedTripId: json['associated_trip_id'] as String?,
      createdAt:
          json['createdAt'] != null
              ? DateTime.tryParse(json['createdAt'] as String)
              : null,
      updatedAt:
          json['updatedAt'] != null
              ? DateTime.tryParse(json['updatedAt'] as String)
              : null,
    );
  }
}

class LocationData {
  final double latitude;
  final double longitude;
  final String address;

  LocationData({
    required this.latitude,
    required this.longitude,
    required this.address,
  });

  factory LocationData.fromJson(Map<String, dynamic> json) {
    return LocationData(
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      address: json['address'] as String? ?? '',
    );
  }
}

class VehicleData {
  final String id;
  final String vehicleNumber;
  final String vehicleType;
  final String routeName;
  final int capacity;
  final String currentStatus;
  final bool status;
  final double speed;
  final List<RoutePoint> routePoints;
  final LocationData? standingLocation;
  final String registrationNumber;
  final String chassisNumber;
  final String color;
  final int seatingCapacity;
  final String vehicleId;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  VehicleData({
    required this.id,
    required this.vehicleNumber,
    required this.vehicleType,
    required this.routeName,
    required this.capacity,
    required this.currentStatus,
    required this.status,
    required this.speed,
    required this.routePoints,
    this.standingLocation,
    required this.registrationNumber,
    required this.chassisNumber,
    required this.color,
    required this.seatingCapacity,
    required this.vehicleId,
    this.createdAt,
    this.updatedAt,
  });

  factory VehicleData.fromJson(Map<String, dynamic> json) {
    return VehicleData(
      id: json['_id'] as String? ?? '',
      vehicleNumber: json['vehicle_number'] as String? ?? '',
      vehicleType: json['vehicle_type'] as String? ?? '',
      routeName: json['route_name'] as String? ?? '',
      capacity: json['capacity'] as int? ?? 0,
      currentStatus: json['current_status'] as String? ?? '',
      status: json['status'] as bool? ?? false,
      speed: (json['speed'] as num?)?.toDouble() ?? 0.0,
      routePoints:
          json['route_points'] != null
              ? (json['route_points'] as List)
                  .map(
                    (point) =>
                        RoutePoint.fromJson(point as Map<String, dynamic>),
                  )
                  .toList()
              : [],
      standingLocation:
          json['standing_location'] != null
              ? LocationData.fromJson(
                json['standing_location'] as Map<String, dynamic>,
              )
              : null,
      registrationNumber: json['registration_number'] as String? ?? '',
      chassisNumber: json['chassis_number'] as String? ?? '',
      color: json['color'] as String? ?? '',
      seatingCapacity: json['seating_capacity'] as int? ?? 0,
      vehicleId: json['vehicle_id'] as String? ?? '',
      createdAt:
          json['createdAt'] != null
              ? DateTime.tryParse(json['createdAt'] as String)
              : null,
      updatedAt:
          json['updatedAt'] != null
              ? DateTime.tryParse(json['updatedAt'] as String)
              : null,
    );
  }
}

class RoutePoint {
  final String name;
  final double latitude;
  final double longitude;
  final int order;
  final String id;

  RoutePoint({
    required this.name,
    required this.latitude,
    required this.longitude,
    required this.order,
    required this.id,
  });

  factory RoutePoint.fromJson(Map<String, dynamic> json) {
    return RoutePoint(
      name: json['name'] as String? ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      order: json['order'] as int? ?? 0,
      id: json['_id'] as String? ?? '',
    );
  }
}

class RepeatDays {
  final bool monday;
  final bool tuesday;
  final bool wednesday;
  final bool thursday;
  final bool friday;
  final bool saturday;
  final bool sunday;

  RepeatDays({
    required this.monday,
    required this.tuesday,
    required this.wednesday,
    required this.thursday,
    required this.friday,
    required this.saturday,
    required this.sunday,
  });

  factory RepeatDays.fromJson(Map<String, dynamic> json) {
    return RepeatDays(
      monday: json['Monday'] as bool? ?? false,
      tuesday: json['Tuesday'] as bool? ?? false,
      wednesday: json['Wednesday'] as bool? ?? false,
      thursday: json['Thursday'] as bool? ?? false,
      friday: json['Friday'] as bool? ?? false,
      saturday: json['Saturday'] as bool? ?? false,
      sunday: json['Sunday'] as bool? ?? false,
    );
  }

  List<String> getActiveDays() {
    final days = <String>[];
    if (monday) days.add('Mon');
    if (tuesday) days.add('Tue');
    if (wednesday) days.add('Wed');
    if (thursday) days.add('Thu');
    if (friday) days.add('Fri');
    if (saturday) days.add('Sat');
    if (sunday) days.add('Sun');
    return days;
  }

  bool isDayActive(int index) {
    if (index < 0 || index > 6) {
      return false;
    }

    final dayValues = [
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      sunday,
    ];

    return dayValues[index];
  }
}

// Trip Model
class ScheduledTrip {
  final String? scheduledTripId;
  final Location startLocation;
  final Location endLocation;
  final VehicleData vehicleId;
  final String? driverId;
  final String? operatorId;
  final String routeName;
  final String scheduledStartTime;
  final String tripPeriod;
  final RepeatDays repeatDays;
  final bool isActive;
  final String? associatedTripId;
  final String status;
  final String? createdAt;
  final String? updatedAt;

  ScheduledTrip({
    required this.scheduledTripId,
    required this.startLocation,
    required this.endLocation,
    required this.vehicleId,
    this.driverId,
    this.operatorId,
    required this.routeName,
    required this.scheduledStartTime,
    required this.tripPeriod,
    required this.repeatDays,
    required this.isActive,
    this.associatedTripId,
    required this.status,
    this.createdAt,
    this.updatedAt,
  });

  factory ScheduledTrip.fromJson(Map<String, dynamic> json) {
    return ScheduledTrip(
      scheduledTripId: json['scheduled_trip_id'] as String?,
      startLocation: Location.fromJson(json['start_location'] ?? {}),
      endLocation: Location.fromJson(json['end_location'] ?? {}),
      vehicleId: VehicleData.fromJson(json['vehicle_id'] ?? {}),
      driverId: json['driver_id'] as String?,
      operatorId: json['operator_id'] as String?,
      routeName: json['route_name'] as String? ?? '',
      scheduledStartTime: json['scheduled_start_time'] as String? ?? '',
      tripPeriod: json['trip_period'] as String? ?? '',
      repeatDays: RepeatDays.fromJson(json['repeat_days'] ?? {}),
      isActive: json['is_active'] as bool? ?? false,
      associatedTripId: json['associated_trip_id'] as String?,
      status: json['status'] as String? ?? 'idle',
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'scheduled_trip_id': scheduledTripId,
      'start_location': startLocation.toJson(),
      'end_location': endLocation.toJson(),
      'vehicle_id': vehicleId.toJson(),
      'driver_id': driverId,
      'operator_id': operatorId,
      'route_name': routeName,
      'scheduled_start_time': scheduledStartTime,
      'trip_period': tripPeriod,
      'repeat_days': repeatDays.toJson(),
      'is_active': isActive,
      'associated_trip_id': associatedTripId,
      'status': status,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}

class Location {
  final double latitude;
  final double longitude;
  final String address;

  Location({
    required this.latitude,
    required this.longitude,
    required this.address,
  });

  factory Location.fromJson(Map<String, dynamic> json) {
    return Location(
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      address: json['address'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {'latitude': latitude, 'longitude': longitude, 'address': address};
  }
}

class VehicleData {
  final String? id;
  final String? vehicleNumber;
  final String? operatorId;
  final String? assignedDeviceId;
  final String? vehicleType;
  final String? routeName;
  final String? assignedDriverId;
  final int? capacity;
  final String? currentStatus;
  final bool? status;
  final int? speed;
  final List<RoutePoint> routePoints;
  final Location? standingLocation;
  final String? registrationNumber;
  final String? chassisNumber;
  final String? color;
  final int? seatingCapacity;
  final String? vehicleId;

  VehicleData({
    this.id,
    this.vehicleNumber,
    this.operatorId,
    this.assignedDeviceId,
    this.vehicleType,
    this.routeName,
    this.assignedDriverId,
    this.capacity,
    this.currentStatus,
    this.status,
    this.speed,
    required this.routePoints,
    this.standingLocation,
    this.registrationNumber,
    this.chassisNumber,
    this.color,
    this.seatingCapacity,
    this.vehicleId,
  });

  factory VehicleData.fromJson(Map<String, dynamic> json) {
    return VehicleData(
      id: json['_id'] as String?,
      vehicleNumber: json['vehicle_number'] as String?,
      operatorId: json['operator_id'] as String?,
      assignedDeviceId: json['assigned_device_id'] as String?,
      vehicleType: json['vehicle_type'] as String?,
      routeName: json['route_name'] as String?,
      assignedDriverId: json['assigned_driver_id'] as String?,
      capacity: json['capacity'] as int?,
      currentStatus: json['current_status'] as String?,
      status: json['status'] as bool?,
      speed: json['speed'] as int?,
      routePoints:
          ((json['route_points'] as List?) ?? [])
              .cast<Map<String, dynamic>>()
              .map((p) => RoutePoint.fromJson(p))
              .toList(),
      standingLocation:
          json['standing_location'] != null
              ? Location.fromJson(json['standing_location'])
              : null,
      registrationNumber: json['registration_number'] as String?,
      chassisNumber: json['chassis_number'] as String?,
      color: json['color'] as String?,
      seatingCapacity: json['seating_capacity'] as int?,
      vehicleId: json['vehicle_id'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'vehicle_number': vehicleNumber,
      'operator_id': operatorId,
      'assigned_device_id': assignedDeviceId,
      'vehicle_type': vehicleType,
      'route_name': routeName,
      'assigned_driver_id': assignedDriverId,
      'capacity': capacity,
      'current_status': currentStatus,
      'status': status,
      'speed': speed,
      'route_points': routePoints.map((p) => p.toJson()).toList(),
      'standing_location': standingLocation?.toJson(),
      'registration_number': registrationNumber,
      'chassis_number': chassisNumber,
      'color': color,
      'seating_capacity': seatingCapacity,
      'vehicle_id': vehicleId,
    };
  }
}

class RoutePoint {
  final String name;
  final double latitude;
  final double longitude;
  final int order;
  final String? id;

  RoutePoint({
    required this.name,
    required this.latitude,
    required this.longitude,
    required this.order,
    this.id,
  });

  factory RoutePoint.fromJson(Map<String, dynamic> json) {
    return RoutePoint(
      name: json['name'] as String? ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      order: json['order'] as int? ?? 0,
      id: json['_id'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'latitude': latitude,
      'longitude': longitude,
      'order': order,
      '_id': id,
    };
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

  Map<String, dynamic> toJson() {
    return {
      'Monday': monday,
      'Tuesday': tuesday,
      'Wednesday': wednesday,
      'Thursday': thursday,
      'Friday': friday,
      'Saturday': saturday,
      'Sunday': sunday,
    };
  }
}

class GettodaystripResponse {
  final bool error; // Updated to match the response structure
  final String message; // Message field
  final List<ScheduledTrip>? data;

  GettodaystripResponse({
    required this.error,
    required this.message,
    this.data,
  });

  // Factory constructor for creating an instance from JSON
  factory GettodaystripResponse.fromJson(Map<String, dynamic> json) {
    List<ScheduledTrip>? trips;
    if (json['data'] is List) {
      trips =
          (json['data'] as List)
              .cast<Map<String, dynamic>>()
              .map((t) => ScheduledTrip.fromJson(t))
              .toList();
    }
    return GettodaystripResponse(
      error: json['error'] as bool, // Parse 'error' field
      message: json['message'] as String, // Parse 'message' field
      data: trips,
    );
  }

  // Method to convert the instance back to JSON
  Map<String, dynamic> toJson() {
    return {
      'error': error,
      'message': message,
      'data': data?.map((t) => t.toJson()).toList(),
    };
  }
}

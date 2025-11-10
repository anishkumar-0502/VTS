import '../../../scheduled_trips/domain/models/scheduled_trip_model.dart'
    as scheduled_models;

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
      capacity: (json['capacity'] as num?)?.toInt(),
      currentStatus: json['current_status'] as String?,
      status: json['status'] as bool?,
      speed: (json['speed'] as num?)?.toInt(),
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
      seatingCapacity: (json['seating_capacity'] as num?)?.toInt(),
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
      order: (json['order'] as num?)?.toInt() ?? 0,
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
  final List<scheduled_models.ScheduledTrip>? data;

  GettodaystripResponse({
    required this.error,
    required this.message,
    this.data,
  });

  // Factory constructor for creating an instance from JSON
  factory GettodaystripResponse.fromJson(Map<String, dynamic> json) {
    List<scheduled_models.ScheduledTrip>? trips;
    if (json['data'] is List) {
      trips =
          (json['data'] as List)
              .cast<Map<String, dynamic>>()
              .map((t) => scheduled_models.ScheduledTrip.fromJson(t))
              .toList();
    }
    return GettodaystripResponse(
      error: json['error'] as bool, // Parse 'error' field
      message: json['message'] as String, // Parse 'message' field
      data: trips,
    );
  }
}

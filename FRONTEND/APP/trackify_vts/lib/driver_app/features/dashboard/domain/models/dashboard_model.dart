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
      id: json['stop_id'] as String?,
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
  final bool error;
  final String message;
  final List<scheduled_models.ScheduledTrip>? data;

  GettodaystripResponse({
    required this.error,
    required this.message,
    this.data,
  });

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
      error: json['error'] as bool? ?? true,
      message: json['message'] as String? ?? '',
      data: trips,
    );
  }
}

class DriverTripHistoryResponse {
  final bool error;
  final String message;
  final List<DriverTripHistory>? data;

  DriverTripHistoryResponse({
    required this.error,
    required this.message,
    this.data,
  });

  factory DriverTripHistoryResponse.fromJson(Map<String, dynamic> json) {
    List<DriverTripHistory>? trips;
    if (json['data'] is List) {
      trips =
          (json['data'] as List)
              .map((t) => DriverTripHistory.fromJson(t as Map<String, dynamic>))
              .toList();
    }
    return DriverTripHistoryResponse(
      error: json['error'] as bool? ?? true,
      message: json['message'] as String? ?? '',
      data: trips,
    );
  }
}

class DriverTripHistory {
  final Location? startLocation;
  final Location? endLocation;
  final scheduled_models.VehicleData? vehicleId;
  final String driverId;
  final String operatorId;
  final String? routeName;
  final String? scheduledTripId;
  final String startTime;
  final String status;
  final bool speedAlarmEnabled;
  final int speedLimit;
  final String tripId;
  final List<dynamic> stops;
  final List<dynamic> speedViolations;
  final List<dynamic> routeDeviations;
  final List<dynamic> passengers;
  final List<scheduled_models.RoutePoint> routePoints;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  DriverTripHistory({
    required this.startLocation,
    required this.endLocation,
    required this.vehicleId,
    required this.driverId,
    required this.operatorId,
    required this.routeName,
    required this.scheduledTripId,
    required this.startTime,
    required this.status,
    required this.speedAlarmEnabled,
    required this.speedLimit,
    required this.tripId,
    required this.stops,
    required this.speedViolations,
    required this.routeDeviations,
    required this.passengers,
    required this.routePoints,
    required this.createdAt,
    required this.updatedAt,
  });

  factory DriverTripHistory.fromJson(Map<String, dynamic> json) {
    return DriverTripHistory(
      startLocation:
      json['start_location'] != null && json['start_location'] is Map
          ? Location.fromJson(json['start_location'] as Map<String, dynamic>)
          : null,
      endLocation:
      json['end_location'] != null && json['end_location'] is Map
          ? Location.fromJson(json['end_location'] as Map<String, dynamic>)
          : null,
      vehicleId:
      json['vehicle_id'] != null && json['vehicle_id'] is Map
          ? scheduled_models.VehicleData.fromJson(
        json['vehicle_id'] as Map<String, dynamic>,
      )
          : null,
      driverId: json['driver_id'] as String? ?? '',
      operatorId: json['operator_id'] as String? ?? '',
      routeName: json['route_name'] as String?,
      scheduledTripId: json['scheduled_trip_id'] as String?,
      startTime: json['start_time'] as String? ?? '',
      status: json['status'] as String? ?? '',
      speedAlarmEnabled: json['speed_alarm_enabled'] as bool? ?? false,
      speedLimit: (json['speed_limit'] as num?)?.toInt() ?? 0,
      tripId: json['trip_id'] as String? ?? '',
      stops: List<dynamic>.from((json['stops'] as List?) ?? []),
      speedViolations:
      List<dynamic>.from((json['speed_violations'] as List?) ?? []),
      routeDeviations:
      List<dynamic>.from((json['route_deviations'] as List?) ?? []),
      passengers: List<dynamic>.from((json['passengers'] as List?) ?? []),
      routePoints:
      (json['route_points'] as List?)
          ?.map(
            (e) => scheduled_models.RoutePoint.fromJson(
          e as Map<String, dynamic>,
        ),
      )
          .toList() ??
          (json['stops'] as List?)
              ?.map(
                (e) => scheduled_models.RoutePoint.fromJson(
              e as Map<String, dynamic>,
            ),
          )
              .toList() ??
          <scheduled_models.RoutePoint>[],
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

class DriverTripDetailResponse {
  final bool error;
  final String message;
  final DriverTripDetailData? data;

  DriverTripDetailResponse({
    required this.error,
    required this.message,
    this.data,
  });

  factory DriverTripDetailResponse.fromJson(Map<String, dynamic> json) {
    return DriverTripDetailResponse(
      error: json['error'] as bool? ?? true,
      message: json['message'] as String? ?? '',
      data:
      json['data'] != null
          ? DriverTripDetailData.fromJson(json['data'] as Map<String, dynamic>)
          : null,
    );
  }
}

class DriverTripDetailData {
  final DriverTripDetail? trip;
  final DriverTripAnalytics? analytics;

  DriverTripDetailData({
    required this.trip,
    required this.analytics,
  });

  factory DriverTripDetailData.fromJson(Map<String, dynamic> json) {
    return DriverTripDetailData(
      trip:
      json['trip'] != null
          ? DriverTripDetail.fromJson(json['trip'] as Map<String, dynamic>)
          : null,
      analytics:
      json['analytics'] != null
          ? DriverTripAnalytics.fromJson(json['analytics'] as Map<String, dynamic>)
          : null,
    );
  }
}

class DriverTripDetail {
  final Location? startLocation;
  final Location? endLocation;
  final scheduled_models.VehicleData? vehicleId;
  final String driverId;
  final String operatorId;
  final String? routeName;
  final String? scheduledTripId;
  final String startTime;
  final String status;
  final bool speedAlarmEnabled;
  final int speedLimit;
  final String tripId;
  final List<dynamic> stops;
  final List<dynamic> speedViolations;
  final List<dynamic> routeDeviations;
  final List<dynamic> passengers;
  final List<scheduled_models.RoutePoint> routePoints;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  DriverTripDetail({
    required this.startLocation,
    required this.endLocation,
    required this.vehicleId,
    required this.driverId,
    required this.operatorId,
    required this.routeName,
    required this.scheduledTripId,
    required this.startTime,
    required this.status,
    required this.speedAlarmEnabled,
    required this.speedLimit,
    required this.tripId,
    required this.stops,
    required this.speedViolations,
    required this.routeDeviations,
    required this.passengers,
    required this.routePoints,
    required this.createdAt,
    required this.updatedAt,
  });

  factory DriverTripDetail.fromJson(Map<String, dynamic> json) {
    return DriverTripDetail(
      startLocation:
      json['start_location'] != null
          ? Location.fromJson(json['start_location'] as Map<String, dynamic>)
          : null,
      endLocation:
      json['end_location'] != null
          ? Location.fromJson(json['end_location'] as Map<String, dynamic>)
          : null,
      vehicleId:
      json['vehicle_id'] != null
          ? scheduled_models.VehicleData.fromJson(
        json['vehicle_id'] as Map<String, dynamic>,
      )
          : null,
      driverId: json['driver_id'] as String? ?? '',
      operatorId: json['operator_id'] as String? ?? '',
      routeName: json['route_name'] as String?,
      scheduledTripId: json['scheduled_trip_id'] as String?,
      startTime: json['start_time'] as String? ?? '',
      status: json['status'] as String? ?? '',
      speedAlarmEnabled: json['speed_alarm_enabled'] as bool? ?? false,
      speedLimit: (json['speed_limit'] as num?)?.toInt() ?? 0,
      tripId: json['trip_id'] as String? ?? '',
      stops: List<dynamic>.from((json['stops'] as List?) ?? []),
      speedViolations:
      List<dynamic>.from((json['speed_violations'] as List?) ?? []),
      routeDeviations:
      List<dynamic>.from((json['route_deviations'] as List?) ?? []),
      passengers: List<dynamic>.from((json['passengers'] as List?) ?? []),
      routePoints:
      (json['route_points'] as List?)
          ?.map(
            (e) => scheduled_models.RoutePoint.fromJson(
          e as Map<String, dynamic>,
        ),
      )
          .toList() ??
          <scheduled_models.RoutePoint>[],
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

class DriverTripAnalytics {
  final String tripId;
  final String vehicleId;
  final String driverId;
  final String startTime;
  final int speedViolationsCount;
  final int routeDeviationsCount;
  final int totalStops;
  final int trackingPoints;

  DriverTripAnalytics({
    required this.tripId,
    required this.vehicleId,
    required this.driverId,
    required this.startTime,
    required this.speedViolationsCount,
    required this.routeDeviationsCount,
    required this.totalStops,
    required this.trackingPoints,
  });

  factory DriverTripAnalytics.fromJson(Map<String, dynamic> json) {
    return DriverTripAnalytics(
      tripId: json['trip_id'] as String? ?? '',
      vehicleId: json['vehicle_id'] as String? ?? '',
      driverId: json['driver_id'] as String? ?? '',
      startTime: json['start_time'] as String? ?? '',
      speedViolationsCount: (json['speed_violations_count'] as num?)?.toInt() ?? 0,
      routeDeviationsCount: (json['route_deviations_count'] as num?)?.toInt() ?? 0,
      totalStops: (json['total_stops'] as num?)?.toInt() ?? 0,
      trackingPoints: (json['tracking_points'] as num?)?.toInt() ?? 0,
    );
  }
}
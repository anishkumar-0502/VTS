// Models for detailed trip information
class TripDetailsResponse {
  final bool error;
  final String message;
  final TripDetailsData? data;

  TripDetailsResponse({
    required this.error,
    required this.message,
    this.data,
  });

  factory TripDetailsResponse.fromJson(Map<String, dynamic> json) {
    return TripDetailsResponse(
      error: json['error'] is bool ? json['error'] : (json['error'].toString().toLowerCase() == 'true'),
      message: json['message']?.toString() ?? '',
      data: json['data'] != null ? TripDetailsData.fromJson(json['data']) : null,
    );
  }
}

class TripDetailsData {
  final DetailedTrip trip;
  final TripAnalytics analytics;

  TripDetailsData({
    required this.trip,
    required this.analytics,
  });

  factory TripDetailsData.fromJson(Map<String, dynamic> json) {
    return TripDetailsData(
      trip: DetailedTrip.fromJson(json['trip']),
      analytics: TripAnalytics.fromJson(json['analytics']),
    );
  }
}

class DetailedTrip {
  final Location startLocation;
  final Location endLocation;
  final DetailedVehicle vehicleId;
  final String driverId;
  final String operatorId;
  final String routeName;
  final String? scheduledTripId;
  final String plannedDate;
  final String plannedStartTime;
  final String plannedEndTime;
  final String? startTime;
  final String status;
  final int totalPassengers;
  final List<TripPassenger> passengers;
  final List<RoutePoint> routePoints;
  final int currentStopIndex;
  final bool speedAlarmEnabled;
  final int speedLimit;
  final String tripId;
  final List<StopDetails> stops;
  final List<dynamic> speedViolations;
  final List<dynamic> routeDeviations;
  final List<dynamic> anomalies;

  DetailedTrip({
    required this.startLocation,
    required this.endLocation,
    required this.vehicleId,
    required this.driverId,
    required this.operatorId,
    required this.routeName,
    this.scheduledTripId,
    required this.plannedDate,
    required this.plannedStartTime,
    required this.plannedEndTime,
    this.startTime,
    required this.status,
    required this.totalPassengers,
    required this.passengers,
    required this.routePoints,
    required this.currentStopIndex,
    required this.speedAlarmEnabled,
    required this.speedLimit,
    required this.tripId,
    required this.stops,
    required this.speedViolations,
    required this.routeDeviations,
    required this.anomalies,
  });

  factory DetailedTrip.fromJson(Map<String, dynamic> json) {
    return DetailedTrip(
      startLocation: Location.fromJson(json['start_location']),
      endLocation: Location.fromJson(json['end_location']),
      vehicleId: DetailedVehicle.fromJson(json['vehicle_id']),
      driverId: json['driver_id']?.toString() ?? '',
      operatorId: json['operator_id']?.toString() ?? '',
      routeName: json['route_name']?.toString() ?? '',
      scheduledTripId: json['scheduled_trip_id']?.toString(),
      plannedDate: json['planned_date']?.toString() ?? '',
      plannedStartTime: json['planned_start_time']?.toString() ?? '',
      plannedEndTime: json['planned_end_time']?.toString() ?? '',
      startTime: json['start_time']?.toString(),
      status: json['status']?.toString() ?? '',
      totalPassengers: (json['total_passengers'] as num?)?.toInt() ?? 0,
      passengers: (json['passengers'] as List?)
          ?.map((p) => TripPassenger.fromJson(p))
          .toList() ?? [],
      routePoints: (json['route_points'] as List?)
          ?.map((p) => RoutePoint.fromJson(p))
          .toList() ?? [],
      currentStopIndex: (json['current_stop_index'] as num?)?.toInt() ?? 0,
      speedAlarmEnabled: json['speed_alarm_enabled'] as bool? ?? false,
      speedLimit: (json['speed_limit'] as num?)?.toInt() ?? 0,
      tripId: json['trip_id']?.toString() ?? '',
      stops: (json['stops'] as List?)
          ?.map((s) => StopDetails.fromJson(s))
          .toList() ?? [],
      speedViolations: json['speed_violations'] as List? ?? [],
      routeDeviations: json['route_deviations'] as List? ?? [],
      anomalies: json['anomalies'] as List? ?? [],
    );
  }
}

class DetailedVehicle {
  final String id;
  final String vehicleNumber;
  final String operatorId;
  final String assignedDeviceId;
  final String vehicleType;
  final String assignedDriverId;
  final List<String> endUserIds;
  final int capacity;
  final String currentStatus;
  final bool status;
  final int speed;
  final Location? standingLocation;
  final String registrationNumber;
  final String chassisNumber;
  final String color;
  final int seatingCapacity;
  final String vehicleId;
  final String createdAt;
  final String updatedAt;
  final String lastUpdate;
  final double latitude;
  final double longitude;
  final String currentTripId;
  final String deviceId;
  final String driverId;

  DetailedVehicle({
    required this.id,
    required this.vehicleNumber,
    required this.operatorId,
    required this.assignedDeviceId,
    required this.vehicleType,
    required this.assignedDriverId,
    required this.endUserIds,
    required this.capacity,
    required this.currentStatus,
    required this.status,
    required this.speed,
    required this.registrationNumber,
    required this.chassisNumber,
    required this.color,
    required this.seatingCapacity,
    required this.vehicleId,
    required this.createdAt,
    required this.updatedAt,
    required this.lastUpdate,
    required this.latitude,
    required this.longitude,
    required this.currentTripId,
    required this.deviceId,
    required this.driverId,
    this.standingLocation,
  });

  factory DetailedVehicle.fromJson(Map<String, dynamic> json) {
    return DetailedVehicle(
      id: json['_id']?.toString() ?? '',
      vehicleNumber: json['vehicle_number']?.toString() ?? '',
      operatorId: json['operator_id']?.toString() ?? '',
      assignedDeviceId: json['assigned_device_id']?.toString() ?? '',
      vehicleType: json['vehicle_type']?.toString() ?? '',
      assignedDriverId: json['assigned_driver_id']?.toString() ?? '',
      endUserIds: (json['end_user_ids'] as List?)?.map((e) => e.toString()).toList() ?? [],
      capacity: (json['capacity'] as num?)?.toInt() ?? 0,
      currentStatus: json['current_status']?.toString() ?? '',
      status: json['status'] is bool ? json['status'] : (json['status'].toString().toLowerCase() == 'true'),
      speed: (json['speed'] as num?)?.toInt() ?? 0,
      standingLocation: json['standing_location'] != null
          ? Location.fromJson(json['standing_location'])
          : null,
      registrationNumber: json['registration_number']?.toString() ?? '',
      chassisNumber: json['chassis_number']?.toString() ?? '',
      color: json['color']?.toString() ?? '',
      seatingCapacity: (json['seating_capacity'] as num?)?.toInt() ?? 0,
      vehicleId: json['vehicle_id']?.toString() ?? '',
      createdAt: json['createdAt']?.toString() ?? '',
      updatedAt: json['updatedAt']?.toString() ?? '',
      lastUpdate: json['last_update']?.toString() ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      currentTripId: json['current_trip_id']?.toString() ?? '',
      deviceId: (json['deviceId'] ?? json['assigned_device_id'])?.toString() ?? '',
      driverId: (json['driverId'] ?? json['assigned_driver_id'])?.toString() ?? '',
    );
  }
}

class TripPassenger {
  final Location pickupStop;
  final Location dropStop;
  final String userId;
  final String? name;
  final String? phoneNumber;
  final bool pickedUp;
  final bool dropped;
  final String? parentContact;
  final bool parentConfirmedPickup;
  final bool parentConfirmedDropoff;
  final bool notificationSentBeforePickup;
  final bool notificationSentBeforeDropoff;
  final bool geofenceExitAlertSent;
  final String id;

  TripPassenger({
    required this.pickupStop,
    required this.dropStop,
    required this.userId,
    this.name,
    this.phoneNumber,
    required this.pickedUp,
    required this.dropped,
    this.parentContact,
    required this.parentConfirmedPickup,
    required this.parentConfirmedDropoff,
    required this.notificationSentBeforePickup,
    required this.notificationSentBeforeDropoff,
    required this.geofenceExitAlertSent,
    required this.id,
  });

  factory TripPassenger.fromJson(Map<String, dynamic> json) {
    return TripPassenger(
      pickupStop: Location.fromJson(json['pickup_stop']),
      dropStop: Location.fromJson(json['drop_stop']),
      userId: json['user_id']?.toString() ?? '',
      name: json['name']?.toString(),
      phoneNumber: json['phone_number']?.toString(),
      pickedUp: json['picked_up'] is bool ? json['picked_up'] : (json['picked_up'].toString().toLowerCase() == 'true'),
      dropped: json['dropped'] is bool ? json['dropped'] : (json['dropped'].toString().toLowerCase() == 'true'),
      parentContact: json['parent_contact']?.toString(),
      parentConfirmedPickup: json['parent_confirmed_pickup'] is bool ? json['parent_confirmed_pickup'] : (json['parent_confirmed_pickup'].toString().toLowerCase() == 'true'),
      parentConfirmedDropoff: json['parent_confirmed_dropoff'] is bool ? json['parent_confirmed_dropoff'] : (json['parent_confirmed_dropoff'].toString().toLowerCase() == 'true'),
      notificationSentBeforePickup: json['notification_sent_before_pickup'] is bool ? json['notification_sent_before_pickup'] : (json['notification_sent_before_pickup'].toString().toLowerCase() == 'true'),
      notificationSentBeforeDropoff: json['notification_sent_before_dropoff'] is bool ? json['notification_sent_before_dropoff'] : (json['notification_sent_before_dropoff'].toString().toLowerCase() == 'true'),
      geofenceExitAlertSent: json['geofence_exit_alert_sent'] is bool ? json['geofence_exit_alert_sent'] : (json['geofence_exit_alert_sent'].toString().toLowerCase() == 'true'),
      id: json['_id']?.toString() ?? '',
    );
  }
}

class RoutePoint {
  final String stopId;
  final String name;
  final double latitude;
  final double longitude;
  final int sequence;
  final int order;
  final int dwellTargetSeconds;
  final int slaArrivalBufferSeconds;
  final int geofenceRadiusMeters;
  final String status;
  final int delaySeconds;
  final bool arrivalNotified;
  final bool requiredActionsCompleted;
  final List<dynamic> checklist;
  final List<dynamic> photoNotes;
  final List<dynamic> incidents;

  RoutePoint({
    required this.stopId,
    required this.name,
    required this.latitude,
    required this.longitude,
    required this.sequence,
    required this.order,
    required this.dwellTargetSeconds,
    required this.slaArrivalBufferSeconds,
    required this.geofenceRadiusMeters,
    required this.status,
    required this.delaySeconds,
    required this.arrivalNotified,
    required this.requiredActionsCompleted,
    required this.checklist,
    required this.photoNotes,
    required this.incidents,
  });

  factory RoutePoint.fromJson(Map<String, dynamic> json) {
    return RoutePoint(
      stopId: json['stop_id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      sequence: (json['sequence'] as num?)?.toInt() ?? 0,
      order: (json['order'] as num?)?.toInt() ?? 0,
      dwellTargetSeconds: (json['dwell_target_seconds'] as num?)?.toInt() ?? 0,
      slaArrivalBufferSeconds: (json['sla_arrival_buffer_seconds'] as num?)?.toInt() ?? 0,
      geofenceRadiusMeters: (json['geofence_radius_meters'] as num?)?.toInt() ?? 0,
      status: json['status']?.toString() ?? '',
      delaySeconds: (json['delay_seconds'] as num?)?.toInt() ?? 0,
      arrivalNotified: json['arrival_notified'] is bool ? json['arrival_notified'] : (json['arrival_notified'].toString().toLowerCase() == 'true'),
      requiredActionsCompleted: json['required_actions_completed'] is bool ? json['required_actions_completed'] : (json['required_actions_completed'].toString().toLowerCase() == 'true'),
      checklist: json['checklist'] as List? ?? [],
      photoNotes: json['photo_notes'] as List? ?? [],
      incidents: json['incidents'] as List? ?? [],
    );
  }
}

class StopDetails {
  final String stopId;
  final String name;
  final double latitude;
  final double longitude;
  final int sequence;
  final int order;
  final int dwellTargetSeconds;
  final int slaArrivalBufferSeconds;
  final int geofenceRadiusMeters;
  final String status;
  final int delaySeconds;
  final bool arrivalNotified;
  final bool requiredActionsCompleted;
  final List<dynamic> checklist;
  final List<dynamic> photoNotes;
  final List<dynamic> incidents;

  StopDetails({
    required this.stopId,
    required this.name,
    required this.latitude,
    required this.longitude,
    required this.sequence,
    required this.order,
    required this.dwellTargetSeconds,
    required this.slaArrivalBufferSeconds,
    required this.geofenceRadiusMeters,
    required this.status,
    required this.delaySeconds,
    required this.arrivalNotified,
    required this.requiredActionsCompleted,
    required this.checklist,
    required this.photoNotes,
    required this.incidents,
  });

  factory StopDetails.fromJson(Map<String, dynamic> json) {
    return StopDetails(
      stopId: json['stop_id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      sequence: (json['sequence'] as num?)?.toInt() ?? 0,
      order: (json['order'] as num?)?.toInt() ?? 0,
      dwellTargetSeconds: (json['dwell_target_seconds'] as num?)?.toInt() ?? 0,
      slaArrivalBufferSeconds: (json['sla_arrival_buffer_seconds'] as num?)?.toInt() ?? 0,
      geofenceRadiusMeters: (json['geofence_radius_meters'] as num?)?.toInt() ?? 0,
      status: json['status']?.toString() ?? '',
      delaySeconds: (json['delay_seconds'] as num?)?.toInt() ?? 0,
      arrivalNotified: json['arrival_notified'] is bool ? json['arrival_notified'] : (json['arrival_notified'].toString().toLowerCase() == 'true'),
      requiredActionsCompleted: json['required_actions_completed'] is bool ? json['required_actions_completed'] : (json['required_actions_completed'].toString().toLowerCase() == 'true'),
      checklist: json['checklist'] as List? ?? [],
      photoNotes: json['photo_notes'] as List? ?? [],
      incidents: json['incidents'] as List? ?? [],
    );
  }
}

class Location {
  final double latitude;
  final double longitude;
  final String address;
  final String name;

  Location({
    required this.latitude,
    required this.longitude,
    required this.address,
    required this.name,
  });

  factory Location.fromJson(Map<String, dynamic> json) {
    return Location(
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      address: json['address'] != null ? (json['address'] as dynamic?)?.toString() ?? '' : '',
      name: json['name'] != null ? (json['name'] as dynamic?)?.toString() ?? '' : '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'latitude': latitude,
      'longitude': longitude,
      'address': address,
      'name': name,
    };
  }
}

class TripAnalytics {
  final String tripId;
  final String vehicleId;
  final String driverId;
  final String startTime;
  final int speedViolationsCount;
  final int routeDeviationsCount;
  final int totalStops;
  final int trackingPoints;

  TripAnalytics({
    required this.tripId,
    required this.vehicleId,
    required this.driverId,
    required this.startTime,
    required this.speedViolationsCount,
    required this.routeDeviationsCount,
    required this.totalStops,
    required this.trackingPoints,
  });

  factory TripAnalytics.fromJson(Map<String, dynamic> json) {
    return TripAnalytics(
      tripId: json['trip_id']?.toString() ?? '',
      vehicleId: json['vehicle_id']?.toString() ?? '',
      driverId: json['driver_id']?.toString() ?? '',
      startTime: json['start_time']?.toString() ?? '',
      speedViolationsCount: (json['speed_violations_count'] as num?)?.toInt() ?? 0,
      routeDeviationsCount: (json['route_deviations_count'] as num?)?.toInt() ?? 0,
      totalStops: (json['total_stops'] as num?)?.toInt() ?? 0,
      trackingPoints: (json['tracking_points'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'trip_id': tripId,
      'vehicle_id': vehicleId,
      'driver_id': driverId,
      'start_time': startTime,
      'speed_violations_count': speedViolationsCount,
      'route_deviations_count': routeDeviationsCount,
      'total_stops': totalStops,
      'tracking_points': trackingPoints,
    };
  }
}
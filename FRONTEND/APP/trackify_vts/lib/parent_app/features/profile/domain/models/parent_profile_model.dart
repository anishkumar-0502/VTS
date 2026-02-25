import "package:flutter/foundation.dart";
import '../../../dashboard/domain/models/trip_details_models.dart';
import '../../../../../driver_app/features/profile/domain/models/profile_model.dart';

class GetParentProfileResponse {
  final bool error;
  final String message;
  final ParentProfileData? data;

  GetParentProfileResponse({required this.error, required this.message, this.data});

  factory GetParentProfileResponse.fromJson(Map<String, dynamic> json) {
    final rawData = json['data'];
    return GetParentProfileResponse(
      error: json['error'] as bool? ?? false,
      message: json['message']?.toString() ?? '',
      data:
          rawData == null || (rawData is Map && rawData.isEmpty)
              ? null
              : ParentProfileData.fromJson(rawData as Map<String, dynamic>),
    );
  }

  Map<String, dynamic> toJson() {
    return {'error': error, 'message': message, 'data': data?.toJson()};
  }
}

class ParentProfileData {
  final String name;
  final String email;
  final int phoneNumber;
  final int roleId;
  final bool status;
  final String operatorId;
  final String? assignedVehicleId;
  final String endUserId;
  final List<String> fcmTokens;
  final String userId;
  final SOSContact? sosContact;
  final String roleName;
  final OperatorDetails? operatorDetails;
  final List<OperatorDetails> associatedOperators;
  final Location? pickupLocation;
  final Location? dropoffLocation;
  final VehicleDetails? vehicleDetails;
  final EndUserProfile? endUserProfile;
  final List<AssociatedUser> associatedUsers;

  ParentProfileData({
    required this.name,
    required this.email,
    required this.phoneNumber,
    required this.roleId,
    required this.status,
    required this.operatorId,
    this.assignedVehicleId,
    required this.endUserId,
    this.fcmTokens = const [],
    required this.userId,
    this.sosContact,
    required this.roleName,
    this.operatorDetails,
    required this.associatedOperators,
    this.pickupLocation,
    this.dropoffLocation,
    this.vehicleDetails,
    this.endUserProfile,
    required this.associatedUsers,
  });

  factory ParentProfileData.fromJson(Map<String, dynamic> json) {
    return ParentProfileData(
      name: json['name'] != null ? (json['name'] as dynamic)?.toString() ?? '' : '',
      email: json['email'] != null ? (json['email'] as dynamic)?.toString() ?? '' : '',
      phoneNumber: json['phone_number'] != null
          ? int.tryParse(json['phone_number'].toString()) ?? 0
          : 0,
      roleId: (json['role_id'] as num?)?.toInt() ?? 0,
      status: json['status'] as bool? ?? false,
      operatorId: json['operator_id'] != null ? (json['operator_id'] as dynamic)?.toString() ?? '' : '',
      assignedVehicleId: json['assigned_vehicle_id'] != null ? (json['assigned_vehicle_id'] as dynamic)?.toString() : null,
      endUserId: json['end_user_id'] != null ? (json['end_user_id'] as dynamic)?.toString() ?? '' : '',
      fcmTokens:
          json['fcm_tokens'] != null
              ? List<String>.from(json['fcm_tokens'])
              : const [],
      userId: json['user_id'] != null ? (json['user_id'] as dynamic)?.toString() ?? '' : '',
      sosContact:
          json['sos_contact'] != null
              ? SOSContact.fromJson(json['sos_contact'])
              : null,
      roleName: json['role_name'] != null ? (json['role_name'] as dynamic)?.toString() ?? '' : '',
      operatorDetails:
          json['operator_details'] != null
              ? (() {
                try {
                  return OperatorDetails.fromJson(json['operator_details']);
                } catch (e) {
                  debugPrint('Error parsing operator details: $e');
                  return null;
                }
              })()
              : null,
      associatedOperators:
          json['associated_operators'] != null
              ? (json['associated_operators'] as List)
                  .map(
                    (e) =>
                        (() {
                          try {
                            return OperatorDetails.fromJson(
                              e as Map<String, dynamic>,
                            );
                          } catch (e) {
                            debugPrint('Error parsing associated operator: $e');
                            return null;
                          }
                        })(),
                  )
                  .where((e) => e != null)
                  .cast<OperatorDetails>()
                  .toList()
              : [],
      pickupLocation:
          json['pickup_location'] != null
              ? Location.fromJson(json['pickup_location'])
              : null,
      dropoffLocation:
          json['dropoff_location'] != null
              ? Location.fromJson(json['dropoff_location'])
              : null,
      vehicleDetails:
          json['vehicle_details'] != null
              ? VehicleDetails.fromJson(json['vehicle_details'])
              : null,
      endUserProfile:
          json['end_user_profile'] != null
              ? EndUserProfile.fromJson(json['end_user_profile'])
              : null,
      associatedUsers:
          json['associated_users'] != null
              ? (json['associated_users'] as List)
                  .map((e) => AssociatedUser.fromJson(e as Map<String, dynamic>))
                  .toList()
              : [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'email': email,
      'phone_number': phoneNumber,
      'role_id': roleId,
      'status': status,
      'operator_id': operatorId,
      'assigned_vehicle_id': assignedVehicleId,
      'end_user_id': endUserId,
      'fcm_tokens': fcmTokens,
      'user_id': userId,
      'sos_contact': sosContact?.toJson(),
      'role_name': roleName,
      'operator_details': operatorDetails?.toJson(),
      'associated_operators':
          associatedOperators.map((e) => e.toJson()).toList(),
      'pickup_location': pickupLocation?.toJson(),
      'dropoff_location': dropoffLocation?.toJson(),
      'vehicle_details': vehicleDetails?.toJson(),
      'end_user_profile': endUserProfile?.toJson(),
      'associated_users': associatedUsers.map((e) => e.toJson()).toList(),
    };
  }
}

// Trip Details Models
class TripDetailsResponse {
  final bool error;
  final String message;
  final TripDetailsData? data;

  TripDetailsResponse({required this.error, required this.message, this.data});

  factory TripDetailsResponse.fromJson(Map<String, dynamic> json) {
    final rawData = json['data'];
    return TripDetailsResponse(
      error: json['error'] as bool? ?? false,
      message: json['message']?.toString() ?? '',
      data: rawData == null || (rawData is Map && rawData.isEmpty)
          ? null
          : TripDetailsData.fromJson(rawData as Map<String, dynamic>),
    );
  }
}

class TripDetailsData {
  final TripDetails trip;
  final TripAnalytics analytics;

  TripDetailsData({required this.trip, required this.analytics});

  factory TripDetailsData.fromJson(Map<String, dynamic> json) {
    return TripDetailsData(
      trip: TripDetails.fromJson(json['trip'] as Map<String, dynamic>),
      analytics: TripAnalytics.fromJson(json['analytics'] as Map<String, dynamic>),
    );
  }
}

class TripDetails {
  final Location startLocation;
  final Location endLocation;
  final TripVehicleDetails vehicleId;
  final String driverId;
  final String operatorId;
  final String routeName;
  final String scheduledTripId;
  final String plannedDate;
  final String plannedStartTime;
  final String plannedEndTime;
  final String? startTime;
  final String status;
  final int totalPassengers;
  final List<TripPassenger> passengers;
  final List<TripRoutePoint> routePoints;
  final int currentStopIndex;
  final bool speedAlarmEnabled;
  final int speedLimit;
  final String tripId;
  final List<dynamic> stops;
  final List<dynamic> speedViolations;
  final List<dynamic> routeDeviations;
  final List<dynamic> anomalies;
  final String createdAt;
  final String updatedAt;

  TripDetails({
    required this.startLocation,
    required this.endLocation,
    required this.vehicleId,
    required this.driverId,
    required this.operatorId,
    required this.routeName,
    required this.scheduledTripId,
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
    required this.createdAt,
    required this.updatedAt,
  });

  factory TripDetails.fromJson(Map<String, dynamic> json) {
    _toInt(dynamic value) {
      if (value == null) return 0;
      if (value is int) return value;
      if (value is double) return value.toInt();
      if (value is String) return int.tryParse(value) ?? 0;
      return 0;
    }

    return TripDetails(
      startLocation: json['start_location'] != null ? Location.fromJson(json['start_location'] as Map<String, dynamic>) : Location(latitude: 0.0, longitude: 0.0, address: '', name: ''),
      endLocation: json['end_location'] != null ? Location.fromJson(json['end_location'] as Map<String, dynamic>) : Location(latitude: 0.0, longitude: 0.0, address: '', name: ''),
      vehicleId: json['vehicle_id'] != null ? TripVehicleDetails.fromJson(json['vehicle_id'] as Map<String, dynamic>) : TripVehicleDetails(id: '', vehicleNumber: '', operatorId: '', assignedDeviceId: '', vehicleType: '', assignedDriverId: '', endUserIds: [], capacity: 0, currentStatus: '', status: false, speed: 0, registrationNumber: '', chassisNumber: '', color: '', seatingCapacity: 0, vehicleId: '', createdAt: '', updatedAt: '', lastUpdate: '', latitude: 0.0, longitude: 0.0, currentTripId: '', deviceId: '', driverId: ''),
      driverId: (json['driver_id'] as dynamic)?.toString() ?? '',
      operatorId: (json['operator_id'] as dynamic)?.toString() ?? '',
      routeName: (json['route_name'] as dynamic)?.toString() ?? '',
      scheduledTripId: (json['scheduled_trip_id'] as dynamic)?.toString() ?? '',
      plannedDate: (json['planned_date'] as dynamic)?.toString() ?? '',
      plannedStartTime: (json['planned_start_time'] as dynamic)?.toString() ?? '',
      plannedEndTime: (json['planned_end_time'] as dynamic)?.toString() ?? '',
      startTime: json['start_time'] != null ? (json['start_time'] as dynamic)?.toString() : null,
      status: (json['status'] as dynamic)?.toString() ?? '',
      totalPassengers: _toInt(json['total_passengers']),
      passengers: json['passengers'] != null ? (json['passengers'] as List<dynamic>).map((e) => TripPassenger.fromJson(e as Map<String, dynamic>)).toList() : [],
      routePoints: json['route_points'] != null ? (json['route_points'] as List<dynamic>).map((e) => TripRoutePoint.fromJson(e as Map<String, dynamic>)).toList() : [],
      currentStopIndex: _toInt(json['current_stop_index']),
      speedAlarmEnabled: json['speed_alarm_enabled'] as bool? ?? false,
      speedLimit: _toInt(json['speed_limit']),
      tripId: (json['trip_id'] as dynamic)?.toString() ?? '',
      stops: (json['stops'] as List<dynamic>?) ?? [],
      speedViolations: (json['speed_violations'] as List<dynamic>?) ?? [],
      routeDeviations: (json['route_deviations'] as List<dynamic>?) ?? [],
      anomalies: (json['anomalies'] as List<dynamic>?) ?? [],
      createdAt: (json['createdAt'] as dynamic)?.toString() ?? '',
      updatedAt: (json['updatedAt'] as dynamic)?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'start_location': startLocation.toJson(),
      'end_location': endLocation.toJson(),
      'vehicle_id': vehicleId.toJson(),
      'driver_id': driverId,
      'operator_id': operatorId,
      'route_name': routeName,
      'scheduled_trip_id': scheduledTripId,
      'planned_date': plannedDate,
      'planned_start_time': plannedStartTime,
      'planned_end_time': plannedEndTime,
      'start_time': startTime,
      'status': status,
      'total_passengers': totalPassengers,
      'passengers': passengers.map((e) => e.toJson()).toList(),
      'route_points': routePoints.map((e) => e.toJson()).toList(),
      'current_stop_index': currentStopIndex,
      'speed_alarm_enabled': speedAlarmEnabled,
      'speed_limit': speedLimit,
      'trip_id': tripId,
      'stops': stops,
      'speed_violations': speedViolations,
      'route_deviations': routeDeviations,
      'anomalies': anomalies,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}

class TripVehicleDetails {
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

  TripVehicleDetails({
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
  });

  factory TripVehicleDetails.fromJson(Map<String, dynamic> json) {
    _toInt(dynamic value) {
      if (value == null) return 0;
      if (value is int) return value;
      if (value is double) return value.toInt();
      if (value is String) return int.tryParse(value) ?? 0;
      return 0;
    }

    _toDouble(dynamic value) {
      if (value == null) return 0.0;
      if (value is double) return value;
      if (value is int) return value.toDouble();
      if (value is String) return double.tryParse(value) ?? 0.0;
      return 0.0;
    }

    return TripVehicleDetails(
      id: (json['_id'] ?? json['id'] as dynamic)?.toString() ?? '',
      vehicleNumber: (json['vehicle_number'] as dynamic)?.toString() ?? '',
      operatorId: (json['operator_id'] as dynamic)?.toString() ?? '',
      assignedDeviceId: (json['assigned_device_id'] as dynamic)?.toString() ?? '',
      vehicleType: (json['vehicle_type'] as dynamic)?.toString() ?? '',
      assignedDriverId: (json['assigned_driver_id'] as dynamic)?.toString() ?? '',
      endUserIds:
          json['end_user_ids'] != null
              ? List<String>.from(json['end_user_ids'])
              : const [],
      capacity: _toInt(json['capacity']),
      currentStatus: (json['current_status'] as dynamic)?.toString() ?? '',
      status: json['status'] as bool? ?? false,
      speed: _toInt(json['speed']),
      registrationNumber: (json['registration_number'] as dynamic)?.toString() ?? '',
      chassisNumber: (json['chassis_number'] as dynamic)?.toString() ?? '',
      color: (json['color'] as dynamic)?.toString() ?? '',
      seatingCapacity: _toInt(json['seating_capacity']),
      vehicleId: (json['vehicle_id'] as dynamic)?.toString() ?? '',
      createdAt: (json['createdAt'] as dynamic)?.toString() ?? '',
      updatedAt: (json['updatedAt'] as dynamic)?.toString() ?? '',
      lastUpdate: (json['last_update'] as dynamic)?.toString() ?? '',
      latitude: _toDouble(json['latitude']),
      longitude: _toDouble(json['longitude']),
      currentTripId: (json['current_trip_id'] as dynamic)?.toString() ?? '',
      deviceId: (json['deviceId'] as dynamic)?.toString() ?? '',
      driverId: (json['driverId'] as dynamic)?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'vehicle_number': vehicleNumber,
      'operator_id': operatorId,
      'assigned_device_id': assignedDeviceId,
      'vehicle_type': vehicleType,
      'assigned_driver_id': assignedDriverId,
      'end_user_ids': endUserIds,
      'capacity': capacity,
      'current_status': currentStatus,
      'status': status,
      'speed': speed,
      'registration_number': registrationNumber,
      'chassis_number': chassisNumber,
      'color': color,
      'seating_capacity': seatingCapacity,
      'vehicle_id': vehicleId,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      'last_update': lastUpdate,
      'latitude': latitude,
      'longitude': longitude,
      'current_trip_id': currentTripId,
      'deviceId': deviceId,
      'driverId': driverId,
    };
  }
}

class TripPassenger {
  final Location pickupStop;
  final Location dropStop;
  final String userId;
  final bool pickedUp;
  final bool dropped;
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
    required this.pickedUp,
    required this.dropped,
    required this.parentConfirmedPickup,
    required this.parentConfirmedDropoff,
    required this.notificationSentBeforePickup,
    required this.notificationSentBeforeDropoff,
    required this.geofenceExitAlertSent,
    required this.id,
  });

  factory TripPassenger.fromJson(Map<String, dynamic> json) {
    return TripPassenger(
      pickupStop: Location.fromJson(json['pickup_stop'] as Map<String, dynamic>),
      dropStop: Location.fromJson(json['drop_stop'] as Map<String, dynamic>),
      userId: (json['user_id'] as dynamic)?.toString() ?? '',
      pickedUp: json['picked_up'] as bool? ?? false,
      dropped: json['dropped'] as bool? ?? false,
      parentConfirmedPickup: json['parent_confirmed_pickup'] as bool? ?? false,
      parentConfirmedDropoff: json['parent_confirmed_dropoff'] as bool? ?? false,
      notificationSentBeforePickup: json['notification_sent_before_pickup'] as bool? ?? false,
      notificationSentBeforeDropoff: json['notification_sent_before_dropoff'] as bool? ?? false,
      geofenceExitAlertSent: json['geofence_exit_alert_sent'] as bool? ?? false,
      id: (json['_id'] as dynamic)?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'pickup_stop': pickupStop.toJson(),
      'drop_stop': dropStop.toJson(),
      'user_id': userId,
      'picked_up': pickedUp,
      'dropped': dropped,
      'parent_confirmed_pickup': parentConfirmedPickup,
      'parent_confirmed_dropoff': parentConfirmedDropoff,
      'notification_sent_before_pickup': notificationSentBeforePickup,
      'notification_sent_before_dropoff': notificationSentBeforeDropoff,
      'geofence_exit_alert_sent': geofenceExitAlertSent,
      'id': id,
    };
  }
}

class TripRoutePoint {
  final String stopId;
  final String name;
  final double latitude;
  final double longitude;
  final int sequence;
  final int order;
  final int dwellTargetSeconds;
  final int slaArrivalBufferSeconds;
  final int geofenceRadiusMeters;
  final String landmark;
  final String status;
  final int delaySeconds;
  final String? approximateReachTime;
  final bool arrivalNotified;
  final bool requiredActionsCompleted;
  final List<dynamic> checklist;
  final List<dynamic> photoNotes;
  final List<dynamic> incidents;
  final bool isUserStop;
  final bool isStopReached;
  final bool isStopCrossed;

  TripRoutePoint({
    required this.stopId,
    required this.name,
    required this.latitude,
    required this.longitude,
    required this.sequence,
    required this.order,
    required this.dwellTargetSeconds,
    required this.slaArrivalBufferSeconds,
    required this.geofenceRadiusMeters,
    required this.landmark,
    required this.status,
    required this.delaySeconds,
    this.approximateReachTime,
    required this.arrivalNotified,
    required this.requiredActionsCompleted,
    required this.checklist,
    required this.photoNotes,
    required this.incidents,
    this.isUserStop = false,
    this.isStopReached = false,
    this.isStopCrossed = false,
  });

  factory TripRoutePoint.fromJson(Map<String, dynamic> json) {
    _toInt(dynamic value) {
      if (value == null) return 0;
      if (value is int) return value;
      if (value is double) return value.toInt();
      if (value is String) return int.tryParse(value) ?? 0;
      return 0;
    }

    _toDouble(dynamic value) {
      if (value == null) return 0.0;
      if (value is double) return value;
      if (value is int) return value.toDouble();
      if (value is String) return double.tryParse(value) ?? 0.0;
      return 0.0;
    }

    return TripRoutePoint(
      stopId: (json['stop_id'] as dynamic)?.toString() ?? '',
      name: (json['name'] as dynamic)?.toString() ?? '',
      latitude: _toDouble(json['latitude']),
      longitude: _toDouble(json['longitude']),
      sequence: _toInt(json['sequence']),
      order: _toInt(json['order']),
      dwellTargetSeconds: _toInt(json['dwell_target_seconds']),
      slaArrivalBufferSeconds: _toInt(json['sla_arrival_buffer_seconds']),
      geofenceRadiusMeters: _toInt(json['geofence_radius_meters']),
      landmark: (json['landmark'] as dynamic)?.toString() ?? '',
      status: (json['status'] as dynamic)?.toString() ?? '',
      delaySeconds: _toInt(json['delay_seconds']),
      approximateReachTime: (json['approximate_reach_time'] ?? json['scheduled_time'] as dynamic)?.toString(),
      arrivalNotified: json['arrival_notified'] as bool? ?? false,
      requiredActionsCompleted: json['required_actions_completed'] as bool? ?? false,
      checklist: (json['checklist'] as List<dynamic>?) ?? [],
      photoNotes: (json['photo_notes'] as List<dynamic>?) ?? [],
      incidents: (json['incidents'] as List<dynamic>?) ?? [],
      isUserStop: json['is_user_stop'] as bool? ?? false,
      isStopReached: json['is_stop_reached'] as bool? ?? false,
      isStopCrossed: json['is_stop_crossed'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'stop_id': stopId,
      'name': name,
      'latitude': latitude,
      'longitude': longitude,
      'sequence': sequence,
      'order': order,
      'dwell_target_seconds': dwellTargetSeconds,
      'sla_arrival_buffer_seconds': slaArrivalBufferSeconds,
      'geofence_radius_meters': geofenceRadiusMeters,
      'landmark': landmark,
      'status': status,
      'delay_seconds': delaySeconds,
      'approximate_reach_time': approximateReachTime,
      'arrival_notified': arrivalNotified,
      'required_actions_completed': requiredActionsCompleted,
      'checklist': checklist,
      'photo_notes': photoNotes,
      'incidents': incidents,
      'is_user_stop': isUserStop,
      'is_stop_reached': isStopReached,
      'is_stop_crossed': isStopCrossed,
    };
  }
}

class SOSContact {
  final String name;
  final int phoneNumber;

  SOSContact({required this.name, required this.phoneNumber});

  factory SOSContact.fromJson(Map<String, dynamic> json) {
    return SOSContact(
      name: (json['name'] as dynamic)?.toString() ?? '',
      phoneNumber: (json['phone_number'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {'name': name, 'phone_number': phoneNumber};
  }
}

class EndUserProfile {
  final String endUserId;
  final String name;
  final int? phoneNumber;
  final String operatorId;
  final String? profileImage;

  EndUserProfile({
    required this.endUserId,
    required this.name,
    this.phoneNumber,
    required this.operatorId,
    this.profileImage,
  });

  factory EndUserProfile.fromJson(Map<String, dynamic> json) {
    return EndUserProfile(
      endUserId: (json['end_user_id'] as dynamic)?.toString() ?? '',
      name: (json['name'] as dynamic)?.toString() ?? '',
      phoneNumber: (json['phone_number'] as num?)?.toInt(),
      operatorId: (json['operator_id'] as dynamic)?.toString() ?? '',
      profileImage: json['profile_image']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'end_user_id': endUserId,
      'name': name,
      'phone_number': phoneNumber,
      'operator_id': operatorId,
      'profile_image': profileImage,
    };
  }
}

class AssociatedUser {
  final String userId;
  final String name;
  final int phoneNumber;

  AssociatedUser({
    required this.userId,
    required this.name,
    required this.phoneNumber,
  });

  factory AssociatedUser.fromJson(Map<String, dynamic> json) {
    return AssociatedUser(
      userId: (json['user_id'] as dynamic)?.toString() ?? '',
      name: (json['name'] as dynamic)?.toString() ?? '',
      phoneNumber: (json['phone_number'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {'user_id': userId, 'name': name, 'phone_number': phoneNumber};
  }
}

class CurrentTrip {
  final String tripId;
  final String? associatedTripId;
  final String status;
  final Location? currentLocation;
  final TripDetails? tripDetails;
  final TripVehicleDetails vehicle;
  final OperatorDetails? driver;
  final String? routeName;
  final List<TripRoutePoint> routePoints;
  final Location? startLocation;
  final Location? endLocation;
  final String? scheduledTripId;
  final String? tripType;
  final String? scheduledStartTime;

  CurrentTrip({
    required this.tripId,
    this.associatedTripId,
    required this.status,
    this.currentLocation,
    this.tripDetails,
    required this.vehicle,
    this.driver,
    this.routeName,
    this.routePoints = const [],
    this.startLocation,
    this.endLocation,
    this.scheduledTripId,
    this.tripType,
    this.scheduledStartTime,
  });

  factory CurrentTrip.fromJson(Map<String, dynamic> json) {
    // Determine vehicle details
    TripVehicleDetails vehicleDetails;
    if (json['vehicle'] != null) {
      vehicleDetails = TripVehicleDetails.fromJson(json['vehicle']);
    } else {
      // Create a default vehicle if only vehicle_id is present
      vehicleDetails = TripVehicleDetails(
        id: (json['vehicle_id'] as dynamic)?.toString() ?? '',
        vehicleNumber: (json['vehicle_number'] as dynamic)?.toString() ?? 'N/A',
        operatorId: (json['operator_id'] as dynamic)?.toString() ?? '',
        assignedDeviceId: '',
        vehicleType: '',
        assignedDriverId: '',
        endUserIds: [],
        capacity: 0,
        currentStatus: 'unknown',
        status: false,
        speed: 0,
        registrationNumber: '',
        chassisNumber: '',
        color: '',
        seatingCapacity: 0,
        vehicleId: (json['vehicle_id'] as dynamic)?.toString() ?? '',
        createdAt: '',
        updatedAt: '',
        lastUpdate: '',
        latitude: 0.0,
        longitude: 0.0,
        currentTripId: (json['associated_trip_id'] ?? json['trip_id'] ?? json['scheduled_trip_id'] as dynamic)?.toString() ?? '',
        deviceId: '',
        driverId: (json['driver_id'] as dynamic)?.toString() ?? '',
      );
    }

    return CurrentTrip(
      tripId: (json['trip_id'] ?? json['scheduled_trip_id'] as dynamic)?.toString() ?? '',
      associatedTripId: (json['associated_trip_id'] as dynamic)?.toString(),
      status: json['status'] != null ? (json['status'] as dynamic)?.toString() ?? '' : 'scheduled',
      currentLocation: json['current_location'] != null
          ? Location.fromJson(json['current_location'])
          : null,
      tripDetails: json['trip_details'] != null
          ? TripDetails.fromJson(json['trip_details'])
          : null,
      vehicle: vehicleDetails,
      driver: json['driver'] != null
          ? OperatorDetails.fromJson(json['driver'])
          : null,
      routeName: (json['route_name'] as dynamic)?.toString(),
      routePoints: json['route_points'] != null
          ? (json['route_points'] as List<dynamic>)
              .map((e) => TripRoutePoint.fromJson(e as Map<String, dynamic>))
              .toList()
          : [],
      startLocation: json['start_location'] != null
          ? Location.fromJson(json['start_location'])
          : null,
      endLocation: json['end_location'] != null
          ? Location.fromJson(json['end_location'])
          : null,
      scheduledTripId: (json['scheduled_trip_id'] as dynamic)?.toString(),
      tripType: json['trip_type']?.toString(),
      scheduledStartTime: json['scheduled_start_time']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'trip_id': tripId,
      'associated_trip_id': associatedTripId,
      'status': status,
      'current_location': currentLocation?.toJson(),
      'trip_details': tripDetails?.toJson(),
      'vehicle': vehicle.toJson(),
      'driver': driver?.toJson(),
      'route_name': routeName,
      'route_points': routePoints.map((e) => e.toJson()).toList(),
      'start_location': startLocation?.toJson(),
      'end_location': endLocation?.toJson(),
      'scheduled_trip_id': scheduledTripId,
      'trip_type': tripType,
      'scheduled_start_time': scheduledStartTime,
    };
  }
}

class TrackChild {
  final String childId;
  final String name;
  final Location? currentLocation;
  final String status;
  final ChildProfile child;
  final TripVehicleDetails vehicle;
  final Location location;

  TrackChild({
    required this.childId,
    required this.name,
    this.currentLocation,
    required this.status,
    required this.child,
    required this.vehicle,
    required this.location,
  });

  factory TrackChild.fromJson(Map<String, dynamic> json) {
    return TrackChild(
      childId: (json['child_id'] as dynamic)?.toString() ?? '',
      name: (json['name'] as dynamic)?.toString() ?? 'N/A',
      currentLocation: json['current_location'] != null
          ? Location.fromJson(json['current_location'])
          : null,
      status: (json['status'] as dynamic)?.toString() ?? 'unknown',
      child: json['child'] != null
          ? ChildProfile.fromJson(json['child'])
          : ChildProfile(id: '', name: 'N/A', phoneNumber: null),
      vehicle: json['vehicle'] != null
          ? TripVehicleDetails.fromJson(json['vehicle'])
          : TripVehicleDetails(
              id: '',
              vehicleNumber: 'N/A',
              operatorId: '',
              assignedDeviceId: '',
              vehicleType: '',
              assignedDriverId: '',
              endUserIds: [],
              capacity: 0,
              currentStatus: 'unknown',
              status: false,
              speed: 0,
              registrationNumber: '',
              chassisNumber: '',
              color: '',
              seatingCapacity: 0,
              vehicleId: '',
              createdAt: '',
              updatedAt: '',
              lastUpdate: '',
              latitude: 0.0,
              longitude: 0.0,
              currentTripId: '',
              deviceId: '',
              driverId: '',
            ),
      location: json['location'] != null
          ? Location.fromJson(json['location'])
          : Location(latitude: 0.0, longitude: 0.0, address: '', name: ''),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'child_id': childId,
      'name': name,
      'current_location': currentLocation?.toJson(),
      'status': status,
      'child': child.toJson(),
      'vehicle': vehicle.toJson(),
      'location': location.toJson(),
    };
  }
}

class CurrentTripResponse {
  final bool error;
  final String message;
  final CurrentTrip? data;
  final List<CurrentTrip> allTrips;

  CurrentTripResponse({
    required this.error,
    required this.message,
    this.data,
    this.allTrips = const [],
  });

  factory CurrentTripResponse.fromJson(Map<String, dynamic> json) {
    final rawData = json['data'];
    CurrentTrip? currentTrip;
    List<CurrentTrip> trips = [];

    if (rawData != null) {
      if (rawData is List) {
        trips = rawData
            .map((e) => CurrentTrip.fromJson(e as Map<String, dynamic>))
            .toList();
        if (trips.isNotEmpty) {
          // Prefer active trips, otherwise take the first one
          try {
            currentTrip = trips.firstWhere(
              (t) => t.status.toLowerCase() == 'active' || t.status.toLowerCase() == 'in-progress',
            );
          } catch (e) {
            currentTrip = trips.first;
          }
        }
      } else if (rawData is Map && rawData.isNotEmpty) {
        currentTrip = CurrentTrip.fromJson(rawData as Map<String, dynamic>);
        trips = [currentTrip];
      }
    }

    return CurrentTripResponse(
      error: json['error'] as bool? ?? false,
      message: json['message'] as String? ?? '',
      data: currentTrip,
      allTrips: trips,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'error': error,
      'message': message,
      'data': data?.toJson(),
      'all_trips': allTrips.map((e) => e.toJson()).toList(),
    };
  }
}

class TrackChildResponse {
  final bool error;
  final String message;
  final TrackChild? data;

  TrackChildResponse({
    required this.error,
    required this.message,
    this.data,
  });

  factory TrackChildResponse.fromJson(Map<String, dynamic> json) {
    return TrackChildResponse(
      error: json['error'] as bool? ?? true,
      message: json['message'] as String? ?? '',
      data: json['data'] != null ? TrackChild.fromJson(json['data']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'error': error,
      'message': message,
      'data': data?.toJson(),
    };
  }
}

class VehicleDetails {
  final String id;
  final String vehicleNumber;
  final String vehicleType;
  final String registrationNumber;
  final String color;
  final int seatingCapacity;
  final String? assignedDeviceId;
  final String? currentStatus;

  VehicleDetails({
    required this.id,
    required this.vehicleNumber,
    required this.vehicleType,
    required this.registrationNumber,
    required this.color,
    required this.seatingCapacity,
    this.assignedDeviceId,
    this.currentStatus,
  });

  factory VehicleDetails.fromJson(Map<String, dynamic> json) {
    return VehicleDetails(
      id: (json['_id'] ?? json['id'] ?? json['vehicle_id'] as dynamic)?.toString() ?? '',
      vehicleNumber: json['vehicle_number']?.toString() ?? '',
      vehicleType: json['vehicle_type']?.toString() ?? '',
      registrationNumber: json['registration_number']?.toString() ?? '',
      color: json['color']?.toString() ?? '',
      seatingCapacity: (json['seating_capacity'] as num?)?.toInt() ?? 0,
      assignedDeviceId: json['assigned_device_id']?.toString(),
      currentStatus: json['current_status']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'vehicle_number': vehicleNumber,
      'vehicle_type': vehicleType,
      'registration_number': registrationNumber,
      'color': color,
      'seating_capacity': seatingCapacity,
      'assigned_device_id': assignedDeviceId,
      'current_status': currentStatus,
    };
  }
}

class ChildProfile {
  final String id;
  final String name;
  final int? phoneNumber;

  ChildProfile({
    required this.id,
    required this.name,
    this.phoneNumber,
  });

  factory ChildProfile.fromJson(Map<String, dynamic> json) {
    return ChildProfile(
      id: (json['_id'] ?? json['id'] ?? json['user_id'] as dynamic)?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      phoneNumber: (json['phone_number'] as num?)?.toInt(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone_number': phoneNumber,
    };
  }
}

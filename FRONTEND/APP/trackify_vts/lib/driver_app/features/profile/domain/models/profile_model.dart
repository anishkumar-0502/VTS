class GetProfileResponse {
  final bool error;
  final String message;
  final ProfileData? data;

  GetProfileResponse({required this.error, required this.message, this.data});

  factory GetProfileResponse.fromJson(Map<String, dynamic> json) {
    final rawData = json['data'];
    return GetProfileResponse(
      error: json['error'] as bool,
      message: json['message'] as String,
      data:
          rawData == null || (rawData is Map && rawData.isEmpty)
              ? null
              : ProfileData.fromJson(rawData as Map<String, dynamic>),
    );
  }

  Map<String, dynamic> toJson() {
    return {'error': error, 'message': message, 'data': data?.toJson()};
  }
}

class ProfileData {
  final String id;
  final String name;
  final String email;
  final int phoneNumber;
  final int roleId;
  final bool status;
  final String operatorId;
  final String? assignedVehicleId;
  final String licenseNumber;
  final String licenseExpiry;
  final String? parentId;
  final List<String> fcmTokens;
  final String userId;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime lastLogin;
  final String roleName;
  final OperatorDetails? operatorDetails;
  final List<OperatorDetails> associatedOperators;
  final DriverProfile? driverProfile;
  final AssignedVehicle? assignedVehicle;

  ProfileData({
    required this.id,
    required this.name,
    required this.email,
    required this.phoneNumber,
    required this.roleId,
    required this.status,
    required this.operatorId,
    required this.assignedVehicleId,
    required this.licenseNumber,
    required this.licenseExpiry,
    required this.parentId,
    this.fcmTokens = const [],
    required this.userId,
    required this.createdAt,
    required this.updatedAt,
    required this.lastLogin,
    required this.roleName,
    this.operatorDetails,
    required this.associatedOperators,
    this.driverProfile,
    this.assignedVehicle,
  });

  factory ProfileData.fromJson(Map<String, dynamic> json) {
    return ProfileData(
      id: json['user_id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      phoneNumber: json['phone_number'] as int,
      roleId: json['role_id'] as int,
      status: json['status'] as bool,
      operatorId: json['operator_id'] as String,
      assignedVehicleId: json['assigned_vehicle_id'] as String?,
      licenseNumber: json['license_number'] as String,
      licenseExpiry: json['license_expiry'] as String,
      parentId: json['end_user_id'] as String?,
      fcmTokens:
          json['fcm_tokens'] != null
              ? List<String>.from(json['fcm_tokens'])
              : const [],
      userId: json['user_id'] as String,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.now(),
      lastLogin: json['last_login'] != null
          ? DateTime.parse(json['last_login'] as String)
          : DateTime.now(),
      roleName: json['role_name'] as String,
      operatorDetails:
          json['operator_details'] != null
              ? (() {
                try {
                  return OperatorDetails.fromJson(json['operator_details']);
                } catch (e) {
                  print('Error parsing operator details: $e');
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
                            print('Error parsing associated operator: $e');
                            return null;
                          }
                        })(),
                  )
                  .where((e) => e != null)
                  .cast<OperatorDetails>()
                  .toList()
              : [],
      driverProfile:
          json['driver_profile'] != null
              ? (() {
                try {
                  return DriverProfile.fromJson(json['driver_profile']);
                } catch (e) {
                  print('Error parsing driver profile: $e');
                  return null;
                }
              })()
              : null,
      assignedVehicle:
          json['assigned_vehicle'] != null
              ? (() {
                try {
                  return AssignedVehicle.fromJson(json['assigned_vehicle']);
                } catch (e) {
                  print('Error parsing assigned vehicle: $e');
                  return null;
                }
              })()
              : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'name': name,
      'email': email,
      'phone_number': phoneNumber,
      'role_id': roleId,
      'status': status,
      'operator_id': operatorId,
      'assigned_vehicle_id': assignedVehicleId,
      'license_number': licenseNumber,
      'license_expiry': licenseExpiry,
      'parent_id': parentId,
      'fcm_tokens': fcmTokens,
      'user_id': userId,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'last_login': lastLogin.toIso8601String(),
      'role_name': roleName,
      'operator_details': operatorDetails?.toJson(),
      'associated_operators':
          associatedOperators.map((e) => e.toJson()).toList(),
      'driver_profile': driverProfile?.toJson(),
      'assigned_vehicle': assignedVehicle?.toJson(),
    };
  }
}

class OperatorDetails {
  final String id;
  final String name;
  final String email;
  final String phone;
  final String? companyName;
  final String registrationNumber;
  final String address;
  final String city;
  final String state;
  final String postalCode;
  final String country;
  final bool status;
  final String subscriptionPlan;
  final int totalVehicles;
  final int totalDrivers;
  final String operatorId;
  final DateTime createdAt;
  final DateTime updatedAt;

  OperatorDetails({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    this.companyName,
    required this.registrationNumber,
    required this.address,
    required this.city,
    required this.state,
    required this.postalCode,
    required this.country,
    required this.status,
    required this.subscriptionPlan,
    required this.totalVehicles,
    required this.totalDrivers,
    required this.operatorId,
    required this.createdAt,
    required this.updatedAt,
  });

  factory OperatorDetails.fromJson(Map<String, dynamic> json) {
    return OperatorDetails(
      id: json['_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      companyName: json['company_name'] as String?,
      registrationNumber: json['registration_number'] as String? ?? '',
      address: json['address'] as String? ?? '',
      city: json['city'] as String? ?? '',
      state: json['state'] as String? ?? '',
      postalCode: json['postal_code'] as String? ?? '',
      country: json['country'] as String? ?? '',
      status: json['status'] as bool? ?? false,
      subscriptionPlan: json['subscription_plan'] as String? ?? '',
      totalVehicles:
          int.tryParse((json['total_vehicles']?.toString()) ?? '0') ?? 0,
      totalDrivers:
          int.tryParse((json['total_drivers']?.toString()) ?? '0') ?? 0,
      operatorId: json['operator_id']?.toString() ?? '',
      createdAt:
          json['createdAt'] != null
              ? DateTime.parse(json['createdAt'] as String)
              : DateTime.now(),
      updatedAt:
          json['updatedAt'] != null
              ? DateTime.parse(json['updatedAt'] as String)
              : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'name': name,
      'email': email,
      'phone': phone,
      'company_name': companyName,
      'registration_number': registrationNumber,
      'address': address,
      'city': city,
      'state': state,
      'postal_code': postalCode,
      'country': country,
      'status': status,
      'subscription_plan': subscriptionPlan,
      'total_vehicles': totalVehicles,
      'total_drivers': totalDrivers,
      'operator_id': operatorId,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

class DriverProfile {
  final String id;
  final String userId;
  final String operatorId;
  final String name;
  final String email;
  final int phoneNumber;
  final String? assignedVehicleId;
  final String licenseNumber;
  final String licenseExpiry;
  final bool status;
  final String driverId;
  final DateTime createdAt;
  final DateTime updatedAt;

  DriverProfile({
    required this.id,
    required this.userId,
    required this.operatorId,
    required this.name,
    required this.email,
    required this.phoneNumber,
    required this.assignedVehicleId,
    required this.licenseNumber,
    required this.licenseExpiry,
    required this.status,
    required this.driverId,
    required this.createdAt,
    required this.updatedAt,
  });

  factory DriverProfile.fromJson(Map<String, dynamic> json) {
    return DriverProfile(
      id: json['_id'] as String? ?? '',
      userId: json['user_id'] as String? ?? '',
      operatorId: json['operator_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phoneNumber: json['phone_number'] as int? ?? 0,
      assignedVehicleId: json['assigned_vehicle_id'] as String?,
      licenseNumber: json['license_number'] as String? ?? '',
      licenseExpiry: json['license_expiry'] as String? ?? '',
      status: json['status'] as bool? ?? false,
      driverId: json['driver_id'] as String? ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'user_id': userId,
      'operator_id': operatorId,
      'name': name,
      'email': email,
      'phone_number': phoneNumber,
      'assigned_vehicle_id': assignedVehicleId,
      'license_number': licenseNumber,
      'license_expiry': licenseExpiry,
      'status': status,
      'driver_id': driverId,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

class AssignedVehicle {
  final String id;
  final String vehicleNumber;
  final String operatorId;
  final String vehicleType;
  final String routeName;
  final String assignedDriverId;
  final int capacity;
  final String currentStatus;
  final bool status;
  final int speed;
  final List<RoutePoint> routePoints;
  final StandingLocation standingLocation;
  final String registrationNumber;
  final String chassisNumber;
  final String color;
  final int seatingCapacity;
  final String vehicleId;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? assignedDeviceId;

  AssignedVehicle({
    required this.id,
    required this.vehicleNumber,
    required this.operatorId,
    required this.vehicleType,
    required this.routeName,
    required this.assignedDriverId,
    required this.capacity,
    required this.currentStatus,
    required this.status,
    required this.speed,
    required this.routePoints,
    required this.standingLocation,
    required this.registrationNumber,
    required this.chassisNumber,
    required this.color,
    required this.seatingCapacity,
    required this.vehicleId,
    required this.createdAt,
    required this.updatedAt,
    required this.assignedDeviceId,
  });

  factory AssignedVehicle.fromJson(Map<String, dynamic> json) {
    return AssignedVehicle(
      id: json['_id'] as String? ?? '',
      vehicleNumber: json['vehicle_number'] as String? ?? '',
      operatorId: json['operator_id'] as String? ?? '',
      vehicleType: json['vehicle_type'] as String? ?? '',
      routeName: json['route_name'] as String? ?? '',
      assignedDriverId: json['assigned_driver_id'] as String? ?? '',
      capacity: (json['capacity'] as num?)?.toInt() ?? 0,
      currentStatus: json['current_status'] as String? ?? '',
      status: json['status'] as bool? ?? false,
      speed: (json['speed'] as num?)?.toInt() ?? 0,
      routePoints:
          json['route_points'] != null
              ? (json['route_points'] as List)
                  .map((e) => RoutePoint.fromJson(e as Map<String, dynamic>))
                  .toList()
              : [],
      standingLocation:
          json['standing_location'] != null
              ? StandingLocation.fromJson(json['standing_location'] as Map<String, dynamic>)
              : StandingLocation(name: '', latitude: 0.0, longitude: 0.0),
      registrationNumber: json['registration_number'] as String? ?? '',
      chassisNumber: json['chassis_number'] as String? ?? '',
      color: json['color'] as String? ?? '',
      seatingCapacity: (json['seating_capacity'] as num?)?.toInt() ?? 0,
      vehicleId: json['vehicle_id'] as String? ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.now(),
      assignedDeviceId: json['assigned_device_id'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'vehicle_number': vehicleNumber,
      'operator_id': operatorId,
      'vehicle_type': vehicleType,
      'route_name': routeName,
      'assigned_driver_id': assignedDriverId,
      'capacity': capacity,
      'current_status': currentStatus,
      'status': status,
      'speed': speed,
      'route_points': routePoints.map((e) => e.toJson()).toList(),
      'standing_location': standingLocation.toJson(),
      'registration_number': registrationNumber,
      'chassis_number': chassisNumber,
      'color': color,
      'seating_capacity': seatingCapacity,
      'vehicle_id': vehicleId,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'assigned_device_id': assignedDeviceId,
    };
  }
}

class RoutePoint {
  final String name;
  final double latitude;
  final double longitude;
  final int order;
  final DateTime? arrivalTime;
  final String id;

  RoutePoint({
    required this.name,
    required this.latitude,
    required this.longitude,
    required this.order,
    required this.arrivalTime,
    required this.id,
  });

  factory RoutePoint.fromJson(Map<String, dynamic> json) {
    return RoutePoint(
      name: json['name'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      order: (json['order'] as num).toInt(),
      arrivalTime:
          json['arrival_time'] != null
              ? DateTime.parse(json['arrival_time'] as String)
              : null,
      id: json['_id'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'latitude': latitude,
      'longitude': longitude,
      'order': order,
      'arrival_time': arrivalTime?.toIso8601String(),
      '_id': id,
    };
  }
}

class StandingLocation {
  final String name;
  final double latitude;
  final double longitude;

  StandingLocation({
    required this.name,
    required this.latitude,
    required this.longitude,
  });

  factory StandingLocation.fromJson(Map<String, dynamic> json) {
    return StandingLocation(
      name: json['name'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {'name': name, 'latitude': latitude, 'longitude': longitude};
  }
}

class ChangePasswordResponse {
  final bool error;
  final String message;
  final Map<String, dynamic>? data;

  ChangePasswordResponse({
    required this.error,
    required this.message,
    this.data,
  });

  factory ChangePasswordResponse.fromJson(Map<String, dynamic> json) {
    return ChangePasswordResponse(
      error: json['error'] as bool,
      message: json['message'] as String,
      data:
          json['data'] != null ? Map<String, dynamic>.from(json['data']) : null,
    );
  }
}

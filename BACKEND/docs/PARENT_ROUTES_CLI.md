# Parent/End-User Routes CLI Documentation

## Authentication
All parent endpoints require JWT token in Authorization header.

```bash
Authorization: Bearer <JWT_TOKEN>
```

## Base URL
```
http://localhost:8787/api/parent
```

---

## 1. HOME SCREEN - LIVE TRACKING

### Get Current Trip (Real-time Map & Tracking)
Retrieve active trip with route polyline, vehicle location, and route points.

```bash
curl -X GET "http://localhost:8787/api/parent/current-trip?childId=CHILD_001" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "error": false,
  "message": "Current trip retrieved successfully",
  "data": {
    "trip_id": "TRIP_001",
    "vehicle": {
      "_id": "VEH_001",
      "vehicle_number": "DL01AB1234",
      "current_status": "active",
      "latitude": 28.7050,
      "longitude": 77.1030,
      "speed": 45,
      "route_points": [
        {
          "name": "School Gate",
          "latitude": 28.7041,
          "longitude": 77.1025,
          "order": 1
        },
        {
          "name": "Park Avenue Stop",
          "latitude": 28.7055,
          "longitude": 77.1045,
          "order": 2
        }
      ]
    },
    "driver": {
      "name": "John Doe",
      "phone": 9876543210
    },
    "selected_start": {
      "name": "School Gate",
      "latitude": 28.7041,
      "longitude": 77.1025
    },
    "selected_end": {
      "name": "Main Road Stop",
      "latitude": 28.7120,
      "longitude": 77.1100
    },
    "current_location": {
      "latitude": 28.7050,
      "longitude": 77.1030,
      "speed": 45,
      "timestamp": "2025-10-28T08:20:00Z"
    },
    "status": "active"
  }
}
```

### Track Child Location
Get real-time child location (via vehicle tracking).

```bash
curl -X GET "http://localhost:8787/api/parent/track-child?childId=CHILD_001" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "error": false,
  "message": "Child location retrieved successfully",
  "data": {
    "child": {
      "name": "Alex Sharma",
      "phone_number": 9123456789
    },
    "vehicle": {
      "vehicle_number": "DL01AB1234",
      "current_status": "active",
      "speed": 45
    },
    "location": {
      "latitude": 28.7050,
      "longitude": 77.1030,
      "speed": 45,
      "timestamp": "2025-10-28T08:20:00Z"
    }
  }
}
```

### Get Next Stop with ETA
Get child's next stop and estimated time of arrival.

```bash
curl -X GET "http://localhost:8787/api/parent/next-stop?tripId=TRIP_001&childId=CHILD_001" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "error": false,
  "message": "Next stop retrieved successfully",
  "data": {
    "stop": {
      "name": "Main Road Stop",
      "latitude": 28.7120,
      "longitude": 77.1100
    },
    "distance_km": 2.5,
    "eta_minutes": 3,
    "current_location": {
      "latitude": 28.7050,
      "longitude": 77.1030,
      "speed": 45
    }
  }
}
```

### Get Passenger Status
Get child's pickup/drop status with confirmations.

```bash
curl -X GET "http://localhost:8787/api/parent/passenger-status?tripId=TRIP_001&childId=CHILD_001" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "error": false,
  "message": "Passenger status retrieved successfully",
  "data": {
    "name": "Alex Sharma",
    "picked_up": true,
    "picked_up_time": "2025-10-28T08:10:00Z",
    "dropped": false,
    "parent_confirmed_pickup": false,
    "parent_confirmed_dropoff": false
  }
}
```

---

## 2. HOME SCREEN - CONFIRMATIONS

### Confirm Child Pickup
Parent confirms child was picked up (after driver marks picked_up).

```bash
curl -X POST http://localhost:8787/api/parent/confirm-pickup \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "TRIP_001",
    "childId": "CHILD_001"
  }'
```

**Response:**
```json
{
  "error": false,
  "message": "Pickup confirmed successfully",
  "data": {
    "name": "Alex Sharma",
    "picked_up": true,
    "picked_up_time": "2025-10-28T08:10:00Z",
    "parent_confirmed_pickup": true,
    "parent_pickup_confirmation_time": "2025-10-28T08:12:00Z"
  }
}
```

### Confirm Child Dropoff
Parent confirms child was dropped off safely (after driver marks dropped).

```bash
curl -X POST http://localhost:8787/api/parent/confirm-dropoff \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "TRIP_001",
    "childId": "CHILD_001"
  }'
```

**Response:**
```json
{
  "error": false,
  "message": "Dropoff confirmed successfully",
  "data": {
    "name": "Alex Sharma",
    "dropped": true,
    "dropped_time": "2025-10-28T08:35:00Z",
    "parent_confirmed_dropoff": true,
    "parent_dropoff_confirmation_time": "2025-10-28T08:36:00Z"
  }
}
```

---

## 3. HOME SCREEN - COMMUNICATION

### Get Driver Contact
Get driver's name and phone number for direct contact.

```bash
curl -X GET "http://localhost:8787/api/parent/driver-contact?tripId=TRIP_001&childId=CHILD_001" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "error": false,
  "message": "Driver contact retrieved successfully",
  "data": {
    "driver_id": "DRV_001",
    "driver_name": "John Doe",
    "driver_phone": 9876543210,
    "vehicle_number": "DL01AB1234"
  }
}
```

### Initiate Call to Driver
Send call request notification to driver (for in-app calling).

```bash
curl -X POST http://localhost:8787/api/parent/call-driver \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "TRIP_001",
    "childId": "CHILD_001"
  }'
```

**Response:**
```json
{
  "error": false,
  "message": "Call initiated successfully",
  "data": {
    "call_id": "CALL_001",
    "driver_phone": 9876543210,
    "driver_name": "John Doe"
  }
}
```

**Driver Receives Firebase Notification:**
```
Title: "Call from Parent"
Body: "Parent of Alex Sharma is calling you"
```

### Report SOS to Operator
Emergency SOS alert to operator when child/parent feels unsafe.

```bash
curl -X POST http://localhost:8787/api/parent/sos-alert \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "TRIP_001",
    "childId": "CHILD_001",
    "location": {
      "latitude": 28.7050,
      "longitude": 77.1030,
      "address": "Main Road Near Park"
    }
  }'
```

**Response:**
```json
{
  "error": false,
  "message": "SOS alert sent to operator successfully",
  "data": {
    "_id": "NOTIF_001",
    "type": "parent_sos_alert",
    "title": "SOS Alert from Parent",
    "message": "Parent of Alex Sharma reported SOS"
  }
}
```

**Operator Receives Firebase Notification:**
```
Title: "SOS Alert from Parent"
Body: "Parent of Alex Sharma reported SOS. Child on trip with driver John Doe"
```

---

## 4. TRIP DETAILS

### Get Trip Status
Get active trip status and completion information.

```bash
curl -X GET "http://localhost:8787/api/parent/trip-status?childId=CHILD_001" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "error": false,
  "message": "Active trip retrieved successfully",
  "data": {
    "_id": "TRIP_001",
    "vehicle_id": { ... },
    "status": "active",
    "start_time": "2025-10-28T08:00:00Z"
  }
}
```

### Get Location History
Get historical location data for a specific number of days.

```bash
curl -X GET "http://localhost:8787/api/parent/location-history?childId=CHILD_001&days=7" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "error": false,
  "message": "Location history retrieved successfully",
  "data": [
    {
      "latitude": 28.7050,
      "longitude": 77.1030,
      "speed": 45,
      "timestamp": "2025-10-28T08:20:00Z"
    },
    {
      "latitude": 28.7055,
      "longitude": 77.1035,
      "speed": 40,
      "timestamp": "2025-10-28T08:21:00Z"
    }
  ]
}
```

---

## 5. NOTIFICATIONS

### Get All Notifications
Retrieve notification history.

```bash
curl -X GET http://localhost:8787/api/parent/notifications \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "error": false,
  "message": "Notifications retrieved successfully",
  "data": [
    {
      "_id": "NOTIF_001",
      "type": "student_picked_up",
      "title": "Alex Sharma picked up",
      "message": "Your child has been picked up at School Gate",
      "read": false,
      "created_at": "2025-10-28T08:10:00Z"
    }
  ]
}
```

### Get Unread Notification Count
Get count of unread notifications.

```bash
curl -X GET http://localhost:8787/api/parent/notifications/unread-count \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "error": false,
  "message": "Unread count retrieved successfully",
  "data": {
    "unreadCount": 3
  }
}
```

### Mark Notification as Read
Mark a specific notification as read.

```bash
curl -X PUT http://localhost:8787/api/parent/notifications/NOTIF_001/read \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "error": false,
  "message": "Notification marked as read",
  "data": {
    "_id": "NOTIF_001",
    "read": true
  }
}
```

---

## 6. PROFILE MANAGEMENT

### Get Parent Profile
Retrieve parent/end-user profile information.

```bash
curl -X GET http://localhost:8787/api/parent/profile \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "error": false,
  "message": "Parent profile retrieved successfully",
  "data": {
    "user_id": "PARENT_001",
    "name": "Raj Sharma",
    "email": "raj.sharma@email.com",
    "phone_number": 9123456789,
    "sos_contact": {
      "name": "Emergency Contact",
      "phone_number": 9987654321
    }
  }
}
```

### Update Parent Profile
Update parent information.

```bash
curl -X PUT http://localhost:8787/api/parent/profile \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Raj Sharma",
    "phone_number": 9123456789,
    "email": "raj.sharma@email.com",
    "sos_contact": {
      "name": "Priya Sharma",
      "phone_number": 9987654321
    }
  }'
```

**Response:**
```json
{
  "error": false,
  "message": "Parent profile updated successfully",
  "data": {
    "user_id": "PARENT_001",
    "name": "Raj Sharma",
    "email": "raj.sharma@email.com",
    "phone_number": 9123456789
  }
}
```

---

## 7. NOTIFICATION PREFERENCES

### Get Notification Preferences
Retrieve notification settings and customization options.

```bash
curl -X GET http://localhost:8787/api/parent/notification-preferences \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "error": false,
  "message": "Notification preferences retrieved successfully",
  "data": {
    "speed_alerts_enabled": true,
    "pickup_notification_enabled": true,
    "dropoff_notification_enabled": true,
    "stop_notification_enabled": true,
    "notification_advance_minutes": 5
  }
}
```

### Update Notification Preferences
Customize notification settings (e.g., get alerts 5 minutes before stop).

```bash
curl -X PUT http://localhost:8787/api/parent/notification-preferences \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "speed_alerts_enabled": true,
    "pickup_notification_enabled": true,
    "dropoff_notification_enabled": true,
    "stop_notification_enabled": true,
    "notification_advance_minutes": 10
  }'
```

**Response:**
```json
{
  "error": false,
  "message": "Notification preferences updated successfully",
  "data": {
    "speed_alerts_enabled": true,
    "pickup_notification_enabled": true,
    "dropoff_notification_enabled": true,
    "stop_notification_enabled": true,
    "notification_advance_minutes": 10
  }
}
```

**Notification Advance Customization:**
- `notification_advance_minutes: 5` - Notify 5 minutes before reaching child's stop
- `notification_advance_minutes: 10` - Notify 10 minutes before reaching child's stop
- `notification_advance_minutes: 2` - Notify 2 minutes before reaching child's stop

---

## 8. FCM - PUSH NOTIFICATIONS

### Register FCM Token
Register device token for push notifications (call after app launches).

```bash
curl -X POST http://localhost:8787/api/parent/fcm-token/register \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "f-Iw9Oi7R1q_aB-xJ2kL9mN3oP5qR7sT9u"
  }'
```

**Response:**
```json
{
  "error": false,
  "message": "FCM token registered successfully",
  "data": {
    "fcm_token": "f-Iw9Oi7R1q_aB-xJ2kL9mN3oP5qR7sT9u"
  }
}
```

### Unregister FCM Token
Unregister device token (call on logout).

```bash
curl -X POST http://localhost:8787/api/parent/fcm-token/unregister \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "f-Iw9Oi7R1q_aB-xJ2kL9mN3oP5qR7sT9u"
  }'
```

**Response:**
```json
{
  "error": false,
  "message": "FCM token unregistered successfully",
  "data": {
    "removed": "f-Iw9Oi7R1q_aB-xJ2kL9mN3oP5qR7sT9u"
  }
}
```

---

## 9. FIREBASE PUSH NOTIFICATION TYPES

### Student Picked Up Notification
Sent when child is picked up at their stop.

```
Title: "Alex Sharma picked up"
Body: "Your child has been picked up at School Gate"
Data: {
  "type": "student_picked_up",
  "studentName": "Alex Sharma",
  "location": { "name": "School Gate", "latitude": 28.7041, "longitude": 77.1025 },
  "timestamp": "2025-10-28T08:10:00Z"
}
```

### Student Dropped Off Notification
Sent when child is dropped at their destination.

```
Title: "Alex Sharma dropped off"
Body: "Your child has been dropped at Main Road Stop"
Data: {
  "type": "student_dropped",
  "studentName": "Alex Sharma",
  "location": { "name": "Main Road Stop", "latitude": 28.7120, "longitude": 77.1100 },
  "timestamp": "2025-10-28T08:35:00Z"
}
```

### Speed Alert Notification
Sent when vehicle exceeds speed limit.

```
Title: "Speed Alert - Driver Speeding"
Body: "Bus is exceeding speed limit: 75 km/h (limit: 60 km/h)"
Data: {
  "type": "speed_alert",
  "currentSpeed": "75",
  "speedLimit": "60",
  "timestamp": "2025-10-28T08:20:00Z"
}
```

### Stop Approaching Notification
Sent X minutes before child's stop (configurable).

```
Title: "Stop Approaching"
Body: "Bus will reach Main Road Stop in approximately 5 minutes"
Data: {
  "type": "stop_approaching",
  "stopName": "Main Road Stop",
  "eta_minutes": "5",
  "timestamp": "2025-10-28T08:30:00Z"
}
```

---

## 10. SETTINGS

### Enable/Disable Speed Alerts
Enable or disable speed violation alerts for a child.

```bash
curl -X POST http://localhost:8787/api/parent/speed-alerts \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "childId": "CHILD_001",
    "enabled": true
  }'
```

**Response:**
```json
{
  "error": false,
  "message": "Speed alerts enabled successfully",
  "data": { ... }
}
```

### Set Geofence
Define a geographical boundary for child safety.

```bash
curl -X POST http://localhost:8787/api/parent/geofence \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "childId": "CHILD_001",
    "latitude": 28.7041,
    "longitude": 77.1025,
    "radius_meters": 500
  }'
```

**Response:**
```json
{
  "error": false,
  "message": "Geofence set successfully",
  "data": {
    "geofence": {
      "latitude": 28.7041,
      "longitude": 77.1025,
      "radius_meters": 500
    }
  }
}
```

---

## 11. STATISTICS

### Get Child Statistics
Get trip statistics for the child.

```bash
curl -X GET "http://localhost:8787/api/parent/child-stats?childId=CHILD_001" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "error": false,
  "message": "Child statistics retrieved successfully",
  "data": {
    "total_trips": 45,
    "completed_trips": 44,
    "active_trip": "TRIP_001"
  }
}
```

---

## FLUTTER APP INTEGRATION EXAMPLE

```dart
// 1. Login with credentials
Future<void> login(String email, String password) async {
  final response = await dio.post('/api/auth/login', data: {
    'email': email,
    'password': password
  });
  final token = response.data['data']['token'];
  secureStorage.write(key: 'jwt_token', value: token);
}

// 2. Register FCM token on app launch
Future<void> registerFCMToken() async {
  final token = await FirebaseMessaging.instance.getToken();
  final jwtToken = await secureStorage.read(key: 'jwt_token');
  await dio.post(
    '/api/parent/fcm-token/register',
    data: {'fcmToken': token},
    options: Options(headers: {'Authorization': 'Bearer $jwtToken'})
  );
}

// 3. Listen for Firebase push notifications
void setupNotificationListeners() {
  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    final data = message.data;
    
    if (data['type'] == 'student_picked_up') {
      showNotification('${data['studentName']} picked up');
      playPickupSound();
    } else if (data['type'] == 'student_dropped') {
      showNotification('${data['studentName']} dropped off');
      playDropSound();
    } else if (data['type'] == 'speed_alert') {
      showNotification('Speed Alert: ${data['currentSpeed']} km/h');
      playSpeedAlarmSound();
    } else if (data['type'] == 'stop_approaching') {
      showNotification('Bus approaching ${data['stopName']}');
    }
  });
}

// 4. Get current trip with live map
Future<void> loadLiveMap(String childId) async {
  final response = await dio.get(
    '/api/parent/current-trip?childId=$childId',
    options: Options(headers: {'Authorization': 'Bearer $jwtToken'})
  );
  
  final data = response.data['data'];
  
  // Draw polyline on map from route_points
  final routePoints = data['route_points'].map((point) =>
    LatLng(point['latitude'], point['longitude'])
  ).toList();
  
  // Add markers for stops
  routePoints.forEach((point) {
    addMarker(LatLng(point.latitude, point.longitude));
  });
  
  // Show current vehicle location
  addVehicleMarker(
    LatLng(data['current_location']['latitude'], data['current_location']['longitude']),
    data['vehicle']['speed']
  );
}

// 5. Confirm pickup/dropoff
Future<void> confirmPickup(String tripId, String childId) async {
  await dio.post(
    '/api/parent/confirm-pickup',
    data: {'tripId': tripId, 'childId': childId},
    options: Options(headers: {'Authorization': 'Bearer $jwtToken'})
  );
  showSnackBar('Pickup confirmed!');
}

// 6. Call driver directly
Future<void> callDriver(String tripId, String childId) async {
  final response = await dio.post(
    '/api/parent/call-driver',
    data: {'tripId': tripId, 'childId': childId},
    options: Options(headers: {'Authorization': 'Bearer $jwtToken'})
  );
  
  final driverPhone = response.data['data']['driver_phone'];
  launchURL('tel:$driverPhone');
}

// 7. Report SOS
Future<void> reportSOS(String tripId, String childId) async {
  final location = await getCurrentLocation();
  
  await dio.post(
    '/api/parent/sos-alert',
    data: {
      'tripId': tripId,
      'childId': childId,
      'location': {
        'latitude': location.latitude,
        'longitude': location.longitude,
        'address': await getAddressFromCoordinates(location)
      }
    },
    options: Options(headers: {'Authorization': 'Bearer $jwtToken'})
  );
  
  showSnackBar('SOS Alert Sent to Operator');
}

// 8. Update notification preferences
Future<void> updateNotificationPrefs() async {
  await dio.put(
    '/api/parent/notification-preferences',
    data: {
      'speed_alerts_enabled': true,
      'stop_notification_enabled': true,
      'notification_advance_minutes': 5
    },
    options: Options(headers: {'Authorization': 'Bearer $jwtToken'})
  );
}
```

---

## NOTIFICATION FLOW SUMMARY

```
Timeline:
08:00 - Driver starts trip
08:05 - Student picked up -> Notification sent to parent
08:15 - Speed exceeded -> Speed alarm notification (if enabled)
08:25 - 5 minutes before drop-off stop -> Stop approaching notification
08:30 - Student dropped off -> Notification sent to parent
08:35 - Parent confirms dropoff
```

---

## Testing Checklist

- [ ] Login with parent credentials
- [ ] Get current trip with map rendering
- [ ] Track real-time child location
- [ ] Get next stop with ETA
- [ ] Receive pickup notification when driver marks picked_up
- [ ] Confirm pickup in app
- [ ] Receive stop approaching notification (5 min before)
- [ ] Receive speed alert when exceeding limit
- [ ] Call driver directly
- [ ] Report SOS alert
- [ ] Receive dropoff notification
- [ ] Confirm dropoff in app
- [ ] Update notification preferences
- [ ] Test speed alarm sound on notification
- [ ] Test location history retrieval
- [ ] View child statistics
- [ ] Update profile information

# Driver Routes CLI Documentation

## Authentication
All driver endpoints require JWT token in Authorization header.

```bash
Authorization: Bearer <JWT_TOKEN>
```

## Base URL
```
http://localhost:8787/api/driver
```

---

## 1. HOME SCREEN - DAILY TRIPS

### Get All Daily Trips
Retrieve all trips scheduled for today.

```bash
curl -X GET http://localhost:8787/api/driver/daily-trips \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "error": false,
  "message": "Daily trips retrieved successfully",
  "data": [
    {
      "_id": "TRIP_001",
      "vehicle_id": {
        "_id": "VEH_001",
        "vehicle_number": "DL01AB1234",
        "route_points": [
          {
            "name": "School Gate",
            "latitude": 28.7041,
            "longitude": 77.1025,
            "order": 1
          }
        ],
        "capacity": 45
      },
      "route_name": "Morning Route",
      "status": "active",
      "passengers": []
    }
  ]
}
```

---

## 2. HOME SCREEN - TRIP SELECTION

### Get Available Trips & Route Points
Get active trips and vehicle route points for selection.

```bash
curl -X GET http://localhost:8787/api/driver/available-trips \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "error": false,
  "message": "Available trips retrieved successfully",
  "data": {
    "vehicle": {
      "_id": "VEH_001",
      "vehicle_number": "DL01AB1234",
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
      ],
      "capacity": 45
    },
    "trips": [
      {
        "_id": "TRIP_001",
        "route_name": "Morning Route",
        "passengers": []
      }
    ]
  }
}
```

### Select Trip Start & End Points
Driver selects starting and ending pickup/drop points for the trip.

```bash
curl -X POST http://localhost:8787/api/driver/trips/select-start-end \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "TRIP_001",
    "startPointIndex": 0,
    "endPointIndex": 5
  }'
```

**Response:**
```json
{
  "error": false,
  "message": "Trip start and end points selected successfully",
  "data": {
    "_id": "TRIP_001",
    "selected_start_point": {
      "name": "School Gate",
      "latitude": 28.7041,
      "longitude": 77.1025
    },
    "selected_end_point": {
      "name": "Main Road Stop",
      "latitude": 28.7120,
      "longitude": 77.1100
    }
  }
}
```

---

## 3. ACTIVE TRIP - MANAGEMENT

### Start Trip
Begin a new trip with selected vehicle.

```bash
curl -X POST http://localhost:8787/api/driver/trips/start \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "VEH_001",
    "route_name": "Morning Route",
    "start_location": {
      "latitude": 28.7041,
      "longitude": 77.1025,
      "address": "School Gate"
    }
  }'
```

**Response:**
```json
{
  "error": false,
  "message": "Trip started successfully",
  "data": {
    "_id": "TRIP_001",
    "vehicle_id": "VEH_001",
    "driver_id": "DRV_001",
    "status": "active",
    "start_time": "2025-10-28T12:00:00Z"
  }
}
```

### Get Active Trip
Retrieve current active trip details.

```bash
curl -X GET http://localhost:8787/api/driver/trips/active \
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
    "vehicle_id": {
      "_id": "VEH_001",
      "vehicle_number": "DL01AB1234"
    },
    "route_points": [],
    "passengers": [
      {
        "_id": "PASS_001",
        "name": "John Doe",
        "pickup_stop": { "name": "Stop 1" },
        "drop_stop": { "name": "Stop 5" },
        "picked_up": false,
        "dropped": false
      }
    ],
    "status": "active"
  }
}
```

### Get Trip Details
Get detailed analytics for a completed trip.

```bash
curl -X GET http://localhost:8787/api/driver/trips/TRIP_001 \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "error": false,
  "message": "Trip details retrieved successfully",
  "data": {
    "trip": { ... },
    "analytics": {
      "trip_id": "TRIP_001",
      "duration_minutes": 45,
      "distance_traveled": 12.5,
      "average_speed": 25,
      "max_speed": 60,
      "speed_violations_count": 2,
      "total_stops": 8
    }
  }
}
```

### End Trip
Complete the active trip.

```bash
curl -X PUT http://localhost:8787/api/driver/trips/TRIP_001/end \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "end_location": {
      "latitude": 28.7120,
      "longitude": 77.1100,
      "address": "School Gate"
    },
    "distance_traveled": 12.5
  }'
```

**Response:**
```json
{
  "error": false,
  "message": "Trip ended successfully",
  "data": {
    "_id": "TRIP_001",
    "status": "completed",
    "end_time": "2025-10-28T12:45:00Z"
  }
}
```

### Get Trip History
Retrieve all completed trips for the driver.

```bash
curl -X GET http://localhost:8787/api/driver/trips \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "error": false,
  "message": "Trip history retrieved successfully",
  "data": [
    {
      "_id": "TRIP_001",
      "vehicle_id": { ... },
      "status": "completed",
      "start_time": "2025-10-28T08:00:00Z",
      "end_time": "2025-10-28T08:45:00Z"
    }
  ]
}
```

---

## 4. ACTIVE TRIP - PASSENGER MANAGEMENT

### Update Passenger Status (Picked Up / Dropped)
Mark student as picked up or dropped off. **Sends Firebase notification to parent.**

```bash
curl -X POST http://localhost:8787/api/driver/trips/passenger/update-status \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "TRIP_001",
    "passengerId": "PASS_001",
    "status": "picked_up"
  }'
```

**Possible Status Values:**
- `picked_up` - Student picked up from stop
- `dropped` - Student dropped at destination

**Response:**
```json
{
  "error": false,
  "message": "Passenger marked as picked_up successfully",
  "data": {
    "_id": "PASS_001",
    "name": "John Doe",
    "picked_up": true,
    "picked_up_time": "2025-10-28T08:15:00Z",
    "parent_contact": "PARENT_001"
  }
}
```

**Firebase Notification Sent to Parent:**
```
Title: "John Doe picked up"
Body: "Your child has been picked up at Stop 1"
Data: {
  "type": "student_picked_up",
  "studentName": "John Doe",
  "location": { "name": "Stop 1", "latitude": 28.7041, "longitude": 77.1025 }
}
```

---

## 5. ACTIVE TRIP - SPEED MONITORING

### Record Current Speed
Report vehicle speed for real-time monitoring and overspeed detection.

```bash
curl -X POST http://localhost:8787/api/driver/speed/record \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "TRIP_001",
    "currentSpeed": 65,
    "location": {
      "latitude": 28.7050,
      "longitude": 77.1030,
      "address": "Main Road"
    }
  }'
```

**Response:**
```json
{
  "error": false,
  "message": "Speed recorded successfully",
  "data": {
    "current_speed": 65,
    "speed_limit": 60,
    "alarm_triggered": true,
    "timestamp": "2025-10-28T08:20:00Z"
  }
}
```

### Update Speed Alarm Settings
Configure speed limits and enable/disable alarms for trip.

```bash
curl -X PUT http://localhost:8787/api/driver/speed-alarm/settings \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "TRIP_001",
    "speedAlarmEnabled": true,
    "speedLimit": 60
  }'
```

**Response:**
```json
{
  "error": false,
  "message": "Speed alarm settings updated successfully",
  "data": {
    "speed_alarm_enabled": true,
    "speed_limit": 60
  }
}
```

### Record Speed Violation
Log speed violation event during trip.

```bash
curl -X POST http://localhost:8787/api/driver/speed-violation \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "TRIP_001",
    "speed": 75,
    "speed_limit": 60,
    "location": {
      "latitude": 28.7050,
      "longitude": 77.1030
    }
  }'
```

**Response:**
```json
{
  "error": false,
  "message": "Speed violation recorded",
  "data": {
    "_id": "TRIP_001",
    "speed_violations": [
      {
        "timestamp": "2025-10-28T08:20:00Z",
        "speed": 75,
        "speed_limit": 60
      }
    ]
  }
}
```

---

## 6. ACTIVE TRIP - EMERGENCY & SOS

### Report SOS Alert
Emergency alert - notifies operator immediately.

```bash
curl -X POST http://localhost:8787/api/driver/sos \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "VEH_001",
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
  "message": "SOS alert sent successfully",
  "data": {
    "_id": "NOTIF_001",
    "type": "sos_alert",
    "title": "SOS Alert",
    "message": "Driver reported SOS from vehicle DL01AB1234",
    "priority": "critical"
  }
}
```

**Firebase Notification Sent to Operators:**
```
Title: "SOS Alert - Driver Emergency"
Body: "Driver John Doe has activated SOS at location: Main Road Near Park"
Data: {
  "type": "sos_alert",
  "driverName": "John Doe",
  "location": { "latitude": 28.7050, "longitude": 77.1030 }
}
```

---

## 7. PROFILE MANAGEMENT

### Get Driver Profile
Retrieve driver's profile information.

```bash
curl -X GET http://localhost:8787/api/driver/profile \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "error": false,
  "message": "Driver profile retrieved successfully",
  "data": {
    "user_id": "DRV_001",
    "name": "John Doe",
    "email": "john@school.com",
    "phone_number": 9876543210,
    "license_number": "DL-0123456789",
    "license_expiry": "2026-10-28",
    "vehicle_id": {
      "_id": "VEH_001",
      "vehicle_number": "DL01AB1234"
    },
    "last_login": "2025-10-28T07:30:00Z"
  }
}
```

### Update Driver Profile
Update driver's personal information.

```bash
curl -X PUT http://localhost:8787/api/driver/profile \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phone_number": 9876543210,
    "email": "john.doe@school.com"
  }'
```

**Response:**
```json
{
  "error": false,
  "message": "Driver profile updated successfully",
  "data": {
    "user_id": "DRV_001",
    "name": "John Doe",
    "email": "john.doe@school.com",
    "phone_number": 9876543210
  }
}
```

---

## 8. FCM - PUSH NOTIFICATIONS

### Register FCM Token
Register device token for push notifications (call after app launches).

```bash
curl -X POST http://localhost:8787/api/driver/fcm-token/register \
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
curl -X POST http://localhost:8787/api/driver/fcm-token/unregister \
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

## 9. VEHICLE STATUS & STATS

### Get Vehicle Status
Retrieve current vehicle status and latest tracking data.

```bash
curl -X GET http://localhost:8787/api/driver/vehicles/VEH_001/status \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "error": false,
  "message": "Vehicle status retrieved successfully",
  "data": {
    "vehicle": {
      "_id": "VEH_001",
      "vehicle_number": "DL01AB1234",
      "current_status": "active",
      "latitude": 28.7050,
      "longitude": 77.1030,
      "speed": 45
    },
    "latestTracking": {
      "_id": "TRACK_001",
      "latitude": 28.7050,
      "longitude": 77.1030,
      "speed": 45,
      "timestamp": "2025-10-28T08:20:00Z"
    }
  }
}
```

### Get Driver Statistics
Get summary statistics for the driver.

```bash
curl -X GET http://localhost:8787/api/driver/stats \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "error": false,
  "message": "Driver stats retrieved successfully",
  "data": {
    "totalTrips": 125,
    "completedTrips": 120,
    "activeTrips": 1
  }
}
```

---

## 10. ERROR RESPONSES

### Missing Fields
```json
{
  "error": true,
  "message": "Missing required fields"
}
```

### Unauthorized Access
```json
{
  "error": true,
  "message": "Unauthorized"
}
```

### Resource Not Found
```json
{
  "error": true,
  "message": "Trip not found"
}
```

---

## Flutter App Integration Example

```dart
// Register FCM token on app launch
Future<void> registerFCMToken() async {
  final token = await FirebaseMessaging.instance.getToken();
  await dio.post(
    '/api/driver/fcm-token/register',
    data: {'fcmToken': token},
    options: Options(headers: {'Authorization': 'Bearer $jwtToken'})
  );
}

// Listen for passenger updates
FirebaseMessaging.onMessage.listen((RemoteMessage message) {
  if (message.data['type'] == 'student_picked_up') {
    showSnackBar('${message.data['studentName']} picked up');
  }
});

// Record speed periodically
Future<void> recordSpeed(String tripId, double speed) async {
  await dio.post(
    '/api/driver/speed/record',
    data: {
      'tripId': tripId,
      'currentSpeed': speed,
      'location': currentLocation
    }
  );
}

// Update passenger status
Future<void> markStudentPickedUp(String tripId, String passengerId) async {
  await dio.post(
    '/api/driver/trips/passenger/update-status',
    data: {
      'tripId': tripId,
      'passengerId': passengerId,
      'status': 'picked_up'
    }
  );
}
```

---

## Socket.IO Real-time Events (Optional)

```javascript
// Subscribe to trip updates
socket.emit('subscribe_trip_tracking', { tripId: 'TRIP_001' });

// Receive real-time speed updates
socket.on('trip_speed_update', (data) => {
  console.log('Current speed:', data.speed);
  if (data.speedAlarm) {
    playSpeedAlarmSound();
  }
});

// Receive passenger update notifications
socket.on('passenger_status_updated', (data) => {
  console.log(`${data.studentName} has been ${data.status}`);
});
```

---

## Testing Checklist

- [ ] Login with driver credentials
- [ ] Get daily trips for today
- [ ] Select trip and route points
- [ ] Start trip successfully
- [ ] Register FCM token
- [ ] Record speed and trigger alarms
- [ ] Update passenger status (test parent notifications)
- [ ] Report SOS alert
- [ ] End trip with completion
- [ ] View trip history
- [ ] Update driver profile
- [ ] Verify all error scenarios

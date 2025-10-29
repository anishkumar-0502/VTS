# VTS Backend API Routes Documentation

## Authentication Routes (`/auth`)
Base URL: `http://localhost:8787/auth`

### POST `/register`
**Description**: Register a new user
**Auth**: None (Rate Limited)
**Body**:
```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "password": "string",
  "role_name": "driver|operator|parent|superadmin"
}
```
**Response**: User object with ID, name, email, phone, role

### POST `/login`
**Description**: User login
**Auth**: None (Rate Limited)
**Body**:
```json
{
  "email": "string",
  "password": "string"
}
```
**Response**: User object + JWT token

### GET `/profile`
**Description**: Get current user profile
**Auth**: JWT Token Required
**Response**: Full user object with all fields

### PUT `/profile`
**Description**: Update current user profile
**Auth**: JWT Token Required
**Body**:
```json
{
  "name": "string",
  "phone": "string",
  "sos_contact": {
    "name": "string",
    "phone": "string"
  },
  "profile_image": "string (URL)"
}
```
**Response**: Updated user object

### POST `/change-password`
**Description**: Change user password
**Auth**: JWT Token Required
**Body**:
```json
{
  "oldPassword": "string",
  "newPassword": "string"
}
```
**Response**: Success message

---

## Superadmin Routes (`/superadmin`)
Base URL: `http://localhost:8787/superadmin`
**Auth**: JWT Token + Superadmin Role Required

### Operator Management
- `POST /operators` - Create new operator
- `GET /operators` - List all operators
- `GET /operators/:operatorId` - Get operator details
- `PUT /operators/:operatorId` - Update operator

### User Management
- `GET /users` - List all users
- `PUT /users/:userId/toggle-status` - Enable/disable user

### Device Management
- `GET /devices` - List all devices
- `POST /devices` - Create new device

### Role Management
- `POST /roles` - Create new role

### System Statistics
- `GET /stats` - Get system statistics (total operators, users, vehicles, devices, etc.)

---

## Operator Routes (`/operator`)
Base URL: `http://localhost:8787/operator`
**Auth**: JWT Token + Operator Role Required

### Driver Management
- `POST /drivers` - Create new driver
- `GET /drivers` - List operator's drivers

### Vehicle Management
- `POST /vehicles` - Create new vehicle
- `GET /vehicles` - List operator's vehicles
- `GET /vehicles/:vehicleId` - Get vehicle details
- `PUT /vehicles/:vehicleId` - Update vehicle

### Device Assignment
- `POST /assign-device` - Assign GPS device to vehicle
- `GET /devices` - List operator's devices

### Statistics
- `GET /stats` - Get operator statistics (vehicles, devices, drivers)

---

## Driver Routes (`/driver`)
Base URL: `http://localhost:8787/driver`
**Auth**: JWT Token + Driver Role Required

### Trip Management
- `POST /trips/start` - Start a new trip
- `GET /trips/active` - Get currently active trip
- `PUT /trips/:tripId/end` - End active trip
- `GET /trips` - Get trip history
- `GET /trips/:tripId` - Get trip analytics

**Trip Start Body**:
```json
{
  "vehicle_id": "string (ObjectId)",
  "route_name": "string",
  "start_location": {
    "latitude": "number",
    "longitude": "number",
    "address": "string"
  }
}
```

**Trip End Body**:
```json
{
  "end_location": {
    "latitude": "number",
    "longitude": "number",
    "address": "string"
  },
  "distance_traveled": "number (km)"
}
```

### Emergency
- `POST /sos` - Report emergency (SOS)

**SOS Body**:
```json
{
  "vehicle_id": "string",
  "location": {
    "latitude": "number",
    "longitude": "number"
  }
}
```

### Violations
- `POST /speed-violation` - Report speed violation

### Vehicle Status
- `GET /vehicles/:vehicleId/status` - Get current vehicle status

### Statistics
- `GET /stats` - Get driver statistics (total trips, completed trips)

---

## Parent Routes (`/parent`)
Base URL: `http://localhost:8787/parent`
**Auth**: JWT Token + Parent Role Required

### Tracking
- `GET /track-child` - Get child's current location
- `GET /location-history?childId=&days=` - Get location history
- `GET /trip-status?childId=` - Get child's active trip status

### Notifications
- `GET /notifications` - List user notifications
- `PUT /notifications/:notificationId/read` - Mark notification as read
- `GET /notifications/unread-count` - Get unread notification count

### Safety Settings
- `POST /speed-alerts` - Enable/disable speed alerts for child
- `POST /geofence` - Set geofence boundaries

**Geofence Body**:
```json
{
  "childId": "string",
  "latitude": "number",
  "longitude": "number",
  "radius_meters": "number"
}
```

---

## Webhook Routes (`/webhook`)
Base URL: `http://localhost:8787/webhook`
**Auth**: API Key in header (`X-API-Key`) - Rate Limited

### POST `/`
**Description**: Receive GPS telemetry data from devices
**Headers**:
```
X-API-Key: my-secret-key-123
Content-Type: application/json
```

**Body Format** (OCPP-like array format):
```json
[
  [2, "1", "BootNotification", {"vehicle_id": "IMEI123"}],
  [2, "2", "LocationUpdate", {
    "vehicle_id": "IMEI123",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "speed_kmh": 45,
    "course": 180,
    "altitude": 10,
    "satellites": 12,
    "fix_quality": 1,
    "hdop": 0.8,
    "timestamp": "2025-10-28T14:46:16Z",
    "battery_level": 85
  }],
  [2, "3", "Heartbeat", {"vehicle_id": "IMEI123", "battery_level": 85}],
  [2, "4", "StatusNotification", {"vehicle_id": "IMEI123", "fix_status": "valid"}]
]
```

**Message Types**:
- `BootNotification` - Device startup/registration
- `LocationUpdate` - GPS position update
- `Heartbeat` - Device keep-alive signal
- `StatusNotification` - GPS fix quality status

**Response**:
```json
{
  "error": false,
  "message": "Telemetry processed",
  "responses": [
    {
      "message_type": "BootNotification",
      "vehicle_id": "IMEI123",
      "status": "success",
      "data": {...}
    }
  ]
}
```

---

## Error Responses

All endpoints return consistent error format:

**400 Bad Request**:
```json
{
  "error": true,
  "message": "Description of error",
  "errors": ["Specific error 1", "Specific error 2"]
}
```

**401 Unauthorized**:
```json
{
  "error": true,
  "message": "Invalid or expired token"
}
```

**403 Forbidden**:
```json
{
  "error": true,
  "message": "Insufficient permissions"
}
```

**404 Not Found**:
```json
{
  "error": true,
  "message": "Resource not found"
}
```

**429 Too Many Requests**:
```json
{
  "error": true,
  "message": "Too Many Requests. Please try again later."
}
```

**500 Internal Server Error**:
```json
{
  "error": true,
  "message": "Internal Server Error"
}
```

---

## Rate Limiting

- **API Limiter**: 1000 requests per 15 minutes
- **Auth Limiter**: 5 requests per 15 minutes
- **Webhook Limiter**: 10000 requests per 1 minute

---

## Health Check

**GET `/health`**
Returns server uptime and connection status.

**Response**:
```json
{
  "message": "Server is running",
  "timestamp": "2025-10-28T14:46:16Z",
  "uptime": 3600,
  "connectedUsers": 5
}
```

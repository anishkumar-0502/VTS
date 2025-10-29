# VTS Backend System Flow

## Overall Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VTS BACKEND SYSTEM                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐           │
│  │  REST API    │    │   Webhooks   │    │  Socket.io   │           │
│  │  Port 8787   │    │  Port 8787   │    │  Port 8787   │           │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘           │
│         │                   │                   │                   │
│         └───────────────────┼───────────────────┘                   │
│                             │                                        │
│                      ┌──────▼──────┐                                 │
│                      │   Express   │                                 │
│                      │  Middleware │                                 │
│                      └──────┬──────┘                                 │
│                             │                                        │
│        ┌────────────────────┼────────────────────┐                  │
│        │                    │                    │                  │
│   ┌────▼──────┐      ┌──────▼──────┐      ┌─────▼────┐             │
│   │Controllers│      │   Services  │      │  Models  │             │
│   └────┬──────┘      └──────┬──────┘      └─────┬────┘             │
│        │                    │                    │                  │
│        └────────────────────┼────────────────────┘                  │
│                             │                                        │
│                    ┌────────▼────────┐                              │
│                    │    MongoDB      │                              │
│                    │   MongoClient   │                              │
│                    └────────┬────────┘                              │
│                             │                                        │
│                    ┌────────▼────────┐                              │
│                    │     Database    │                              │
│                    │   Collections   │                              │
│                    └─────────────────┘                              │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

```
User Input (Email, Password)
         ↓
    POST /auth/login
         ↓
   authMiddleware (validates syntax)
         ↓
  authLimiter (rate limiting)
         ↓
  AuthController.login()
         ↓
   UserService.loginUser()
         ↓
  User.findOne({email})
         ↓
  comparePassword() [bcrypt]
         ↓
  generateToken() [JWT]
         ↓
   Response with token
         ↓
   User stores token locally
         ↓
   Token sent in Authorization header for future requests
```

---

## Authorization Flow

```
Protected Request with JWT Token
         ↓
   authMiddleware
         ↓
  Extract token from header
         ↓
  verifyToken() [JWT validation]
         ↓
  Attach user data to req.user
         ↓
  roleMiddleware(['operator', 'driver'])
         ↓
  Check req.user.role against allowed roles
         ↓
  ✓ Proceed / ✗ Return 403 Forbidden
```

---

## GPS Telemetry Webhook Flow

```
GPS Device sends telemetry data
         ↓
  POST /webhook (with API key in header)
         ↓
  webhookLimiter (10,000 req/min)
         ↓
  API Key Validation
         ↓
  Payload Array Validation
         ↓
  WebhookRouter.routeTelemetryMessage()
         ↓
  TelemetryValidator validates each message type
         ↓
  ┌─────────────────────────────────────────┐
  │ Message Type Determination              │
  ├─────────────────────────────────────────┤
  │ • BootNotification → Register device    │
  │ • LocationUpdate → Store GPS data       │
  │ • Heartbeat → Update status             │
  │ • StatusNotification → Update fix state │
  └─────────────────────────────────────────┘
         ↓
  TelemetryHandler processes each type
         ↓
  MongoDB Operations:
  • Find/Create Vehicle record
  • Find/Create GPSDevice record
  • Insert TrackingData document
  • Update device status & battery
         ↓
  Broadcast to Socket.io clients
         ↓
  Response with processing results
```

---

## Location Update Flow (LocationUpdate Message Type)

```
GPS Device sends:
{
  "message_type": "LocationUpdate",
  "vehicle_id": "IMEI123",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "speed_kmh": 45,
  "timestamp": "2025-10-28T14:46:16Z",
  "battery_level": 85
}
         ↓
  TelemetryHandler.handleLocationUpdate()
         ↓
  Find Vehicle by vehicle_number (IMEI)
         ↓
  Find or Create GPSDevice for vehicle
         ↓
  Insert TrackingData with:
  - vehicle_id
  - gps_device_id
  - latitude, longitude, speed
  - timestamp
         ↓
  Update Vehicle collection:
  - Set latest latitude, longitude
  - Update last_update timestamp
  - Set status = true
         ↓
  Update GPSDevice collection:
  - Set last_signal timestamp
  - Update battery_level
  - Set status = true
         ↓
  Broadcast location_update event via Socket.io:
  {
    "vehicleId": ObjectId,
    "gpsDeviceId": ObjectId,
    "latitude": 40.7128,
    "longitude": -74.0060,
    "speed": 45,
    "timestamp": "2025-10-28T14:46:16Z",
    "device": {
      "status": true,
      "battery_level": 85,
      "last_signal": "2025-10-28T14:46:16Z"
    }
  }
         ↓
  Dashboard receives update in real-time
```

---

## Trip Management Flow

### Start Trip
```
Driver calls POST /driver/trips/start
         ↓
  Authenticate (JWT) & check role (driver)
         ↓
  DriverController.startTrip()
         ↓
  TripService.startTrip()
         ↓
  Create Trip document:
  - vehicle_id, driver_id, operator_id
  - start_time = now()
  - status = 'active'
  - start_location from request
         ↓
  Update Vehicle status = 'active'
         ↓
  Return Trip object
```

### During Trip
```
Socket.io broadcasts location_update events
         ↓
  Dashboard displays real-time vehicle position
         ↓
  TrackingData documents inserted for each update
         ↓
  Monitor speed violations
         ↓
  Monitor route deviations
         ↓
  Check geofence boundaries
```

### End Trip
```
Driver calls PUT /driver/trips/:tripId/end
         ↓
  DriverController.endTrip()
         ↓
  TripService.endTrip()
         ↓
  Fetch Trip document
         ↓
  Set:
  - end_time = now()
  - end_location from request
  - distance_traveled from request
  - status = 'completed'
  - duration = (end_time - start_time)
         ↓
  Update Vehicle status = 'idle'
         ↓
  Return Trip object
```

---

## Device Assignment Flow

```
Operator calls POST /operator/assign-device
         ↓
  Authenticate (JWT) & check role (operator)
         ↓
  OperatorController.assignDeviceToVehicle()
         ↓
  DeviceService.assignDeviceToVehicle()
         ↓
  Find Device by deviceId
         ↓
  Find Vehicle by vehicleId
         ↓
  Update Device:
  - vehicle_id = vehicleId
  - assigned_date = now()
         ↓
  Update Vehicle:
  - device_id = deviceId
         ↓
  Next LocationUpdate from device will associate tracking data
         ↓
  Dashboard now shows vehicle tracking
```

---

## Real-Time Socket.io Broadcasting

```
Global socketManager instance maintains connections
         ↓
  Client connects to /socket.io
         ↓
  Client emits 'join_admin' | 'join_operator' | etc.
         ↓
  Socket joins room (admin, operator_<id>, vehicle_<id>, device_<id>)
         ↓
  When LocationUpdate received:
         ↓
  TelemetryHandler calls:
  global.socketManager.broadcastLocationUpdate()
         ↓
  Emits to rooms:
  - 'admin' (all admins see all vehicles)
  - 'vehicle_<vehicleId>' (specific vehicle watchers)
  - 'device_<gpsDeviceId>' (specific device watchers)
         ↓
  Clients in rooms receive live event
         ↓
  Dashboard updates UI in real-time
```

---

## Notification Flow

```
Event occurs (speed violation, device offline, etc.)
         ↓
  Service creates Notification document:
  - user_id
  - type (speed_alert, device_offline, etc.)
  - title, message
  - priority, channel
         ↓
  Store in Database
         ↓
  Optionally broadcast via Socket.io
         ↓
  Parent/Operator fetches:
  GET /parent/notifications
         ↓
  Returns list of unread notifications
         ↓
  Parent marks as read:
  PUT /parent/notifications/:id/read
         ↓
  Update read = true, read_at = now()
```

---

## Request Lifecycle

```
1. Request arrives at Express middleware stack
         ↓
2. helmet() - Security headers
         ↓
3. cors() - Enable CORS
         ↓
4. compression() - Gzip compression
         ↓
5. bodyParser - Parse JSON body
         ↓
6. apiLimiter - Global rate limiting
         ↓
7. Custom middleware - Logging, response helpers
         ↓
8. Route matching - Find correct handler
         ↓
9. authMiddleware - Validate JWT (if needed)
         ↓
10. roleMiddleware - Check permissions (if needed)
         ↓
11. Controller - Execute business logic
         ↓
12. Service - Data operations
         ↓
13. Database - Query/update
         ↓
14. Response - Send result
         ↓
15. errorHandler - Catch & format errors
```

---

## Database Schema Relationships

```
┌─────────────────────┐
│       User          │
├─────────────────────┤
│ _id                 │
│ name, email, phone  │
│ role_id (ref: Role) │
│ operator_id         │
│ vehicle_id          │
│ license_number      │
└──────────┬──────────┘
           │
    ┌──────┴────────┬─────────────┐
    │               │             │
    ▼               ▼             ▼
┌────────┐   ┌──────────┐   ┌────────────┐
│ Role   │   │Operator  │   │  Vehicle   │
├────────┤   ├──────────┤   ├────────────┤
│ _id    │   │ _id      │   │ _id        │
│ name   │   │ name     │   │ vehicle_#  │
│ perms  │   │ company  │   │ operator_id│
└────────┘   │ email    │   │ driver_id  │
             └────┬─────┘   │ device_id  │
                  │         │ latitude   │
             ┌────▼──────┐  │ longitude  │
             │  Device   │  └────┬───────┘
             ├───────────┤       │
             │ _id       │◄──────┘
             │ imei      │
             │ vehicle_id│
             │ battery   │
             └────┬──────┘
                  │
             ┌────▼──────────┐
             │ TrackingData   │
             ├────────────────┤
             │ _id            │
             │ vehicle_id     │
             │ device_id      │
             │ latitude       │
             │ longitude      │
             │ speed          │
             │ timestamp      │
             └────────────────┘
```

---

## Error Handling

```
Error occurs in any layer
         ↓
  Service throws error with message
         ↓
  Controller catches error
         ↓
  Pass to Express error middleware
         ↓
  errorHandler (express middleware)
         ↓
  Log error details
         ↓
  Format response:
  - statusCode (default 500)
  - message
  - stack (if development)
         ↓
  Send JSON response to client
```

---

## Data Flow Summary

```
GPS Device
   ↓
Webhook (/webhook)
   ↓
WebhookRouter
   ↓
TelemetryHandler
   ↓
MongoDB (vehicles, gpsdevices, trackingdata)
   ↓
Socket.io Broadcast
   ↓
Connected Clients (Dashboard, Mobile)
```

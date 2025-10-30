# Operator Routes - CLI Reference Guide

**Base URL**: `http://localhost:8787/operator`

**Authentication**: All routes require JWT token in `Authorization: Bearer {token}` header

**Role**: Operator (role_id: 2)

---

## 📊 Analytics & Dashboard

### Get Dashboard Analytics
Retrieve overall analytics for operator's specific data.

```bash
curl -X GET http://localhost:8787/operator/analytics/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response**: Total drivers, end-users, vehicles, devices, active count, and recent tracking data

### Get Live Tracking Data (Initial Load)
Retrieve current tracking data for operator's vehicles. For live updates, use Socket.IO.

```bash
curl -X GET "http://localhost:8787/operator/tracking/live-data?vehicleId=VEH-xxx&deviceId=DEV-xxx&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Query Parameters**:
- `vehicleId`: Filter by specific vehicle (optional)
- `deviceId`: Filter by specific device (optional)
- `limit`: Number of records (default: 50, optional)

---

## 👨‍💼 Manage Drivers

### Create Driver
Create a single driver. Password is auto-generated (6-digit number).

```bash
curl -X POST http://localhost:8787/operator/drivers/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "email": "john.driver@school.com",
    "phone_number": 9876543210,
    "license_number": "DL-123456",
    "license_expiry": "2027-12-31",
    "assigned_vehicle_id": "VEH-xxx"
  }'
```

**Response**: Driver object with auto-generated password

### List All Drivers
```bash
curl -X GET http://localhost:8787/operator/drivers/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### View Specific Driver
```bash
curl -X GET http://localhost:8787/operator/drivers/USR-xxx/view \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Update Driver
```bash
curl -X PUT http://localhost:8787/operator/drivers/USR-xxx/update \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith Updated",
    "phone_number": 9876543211,
    "license_number": "DL-123457",
    "assigned_vehicle_id": "VEH-yyy"
  }'
```

### Deactivate Driver (Soft Delete)
```bash
curl -X PUT http://localhost:8787/operator/drivers/USR-xxx/deactivate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Bulk Create Drivers
Create multiple drivers at once. Returns credentials for each.

```bash
curl -X POST http://localhost:8787/operator/drivers/bulk-create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "drivers": [
      {
        "name": "Driver 1",
        "email": "driver1@school.com",
        "phone_number": 9876543210,
        "license_number": "DL-001",
        "license_expiry": "2027-12-31",
        "assigned_vehicle_id": "VEH-xxx"
      },
      {
        "name": "Driver 2",
        "email": "driver2@school.com",
        "phone_number": 9876543211,
        "license_number": "DL-002",
        "license_expiry": "2027-12-31",
        "assigned_vehicle_id": "VEH-yyy"
      }
    ]
  }'
```

**Response**: Returns created drivers count and all credentials (email + 6-digit password)

---

## 👨‍👩‍👧‍👦 Manage End-Users (Parents/Students)

### Create End-User
Create a single parent/student. Password is auto-generated (6-digit number).

```bash
curl -X POST http://localhost:8787/operator/end-users/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rajesh Kumar",
    "email": "rajesh.parent@school.com",
    "phone_number": 9876543210,
    "sos_contact": {
      "name": "Emergency Contact",
      "phone_number": 9999999999
    }
  }'
```

**Response**: End-user object with auto-generated password

### List All End-Users
```bash
curl -X GET http://localhost:8787/operator/end-users/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### View Specific End-User
```bash
curl -X GET http://localhost:8787/operator/end-users/USR-xxx/view \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Update End-User
```bash
curl -X PUT http://localhost:8787/operator/end-users/USR-xxx/update \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rajesh Kumar Updated",
    "phone_number": 9876543211,
    "sos_contact": {
      "name": "Updated Contact",
      "phone_number": 9999999998
    }
  }'
```

### Deactivate End-User (Soft Delete)
```bash
curl -X PUT http://localhost:8787/operator/end-users/USR-xxx/deactivate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Bulk Create End-Users
Create multiple end-users at once. Returns credentials for each.

```bash
curl -X POST http://localhost:8787/operator/end-users/bulk-create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endUsers": [
      {
        "name": "Parent 1",
        "email": "parent1@school.com",
        "phone_number": 9876543210,
        "sos_contact": { "name": "Contact 1", "phone_number": 9999999990 }
      },
      {
        "name": "Parent 2",
        "email": "parent2@school.com",
        "phone_number": 9876543211,
        "sos_contact": { "name": "Contact 2", "phone_number": 9999999991 }
      }
    ]
  }'
```

**Response**: Returns created end-users count and all credentials

---

## 🔌 Manage Devices

### Create Device
```bash
curl -X POST http://localhost:8787/operator/devices/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_name": "GPS-BUS-001",
    "device_type": "GPS",
    "manufacturer": "Garmin",
    "model": "DriveSmart 65",
    "sim_number": "9876543210",
    "api_key": "unique-api-key-123"
  }'
```

### List All Devices
```bash
curl -X GET http://localhost:8787/operator/devices/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### View Specific Device
```bash
curl -X GET http://localhost:8787/operator/devices/DEV-xxx/view \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Update Device
```bash
curl -X PUT http://localhost:8787/operator/devices/DEV-xxx/update \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_name": "GPS-BUS-001-Updated",
    "sim_number": "9876543211",
    "model": "DriveSmart 66"
  }'
```

### Deactivate Device (Soft Delete)
```bash
curl -X PUT http://localhost:8787/operator/devices/DEV-xxx/deactivate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Bulk Assign Devices to Vehicle
```bash
curl -X POST http://localhost:8787/operator/devices/bulk-assign \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_ids": ["DEV-xxx", "DEV-yyy", "DEV-zzz"],
    "vehicle_id": "VEH-abc"
  }'
```

---

## 🚐 Manage Vehicles

### Create Vehicle
Create a bus/vehicle with optional pickup/drop points and standing location.

```bash
curl -X POST http://localhost:8787/operator/vehicles/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_number": "KA-01-AB-1234",
    "vehicle_type": "bus",
    "route_name": "Route A - Downtown",
    "capacity": 50,
    "driver_id": "USR-xxx",
    "registration_number": "REG-123456",
    "chassis_number": "CHASSIS-789",
    "color": "Yellow",
    "seating_capacity": 48,
    "route_points": [
      {
        "name": "Pickup Point 1",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "order": 1
      },
      {
        "name": "Pickup Point 2",
        "latitude": 12.9352,
        "longitude": 77.6245,
        "order": 2
      }
    ],
    "standing_location": {
      "name": "School Main Gate",
      "latitude": 12.9716,
      "longitude": 77.5946
    }
  }'
```

### List All Vehicles
```bash
curl -X GET http://localhost:8787/operator/vehicles/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### View Specific Vehicle
```bash
curl -X GET http://localhost:8787/operator/vehicles/VEH-xxx/view \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Update Vehicle
```bash
curl -X PUT http://localhost:8787/operator/vehicles/VEH-xxx/update \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_number": "KA-01-AB-1234",
    "route_name": "Route A - Updated",
    "capacity": 52,
    "route_points": [
      {
        "name": "New Pickup Point",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "order": 1
      }
    ],
    "standing_location": {
      "name": "School Parking",
      "latitude": 12.9716,
      "longitude": 77.5950
    }
  }'
```

### Deactivate Vehicle (Soft Delete)
```bash
curl -X PUT http://localhost:8787/operator/vehicles/VEH-xxx/deactivate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Assign Driver to Vehicle (Single)
```bash
curl -X POST http://localhost:8787/operator/vehicles/assign-driver \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": "USR-xxx",
    "vehicle_id": "VEH-yyy"
  }'
```

### Bulk Assign Drivers to Vehicles
```bash
curl -X POST http://localhost:8787/operator/vehicles/bulk-assign-drivers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assignments": [
      { "driver_id": "USR-001", "vehicle_id": "VEH-001" },
      { "driver_id": "USR-002", "vehicle_id": "VEH-002" },
      { "driver_id": "USR-003", "vehicle_id": "VEH-003" }
    ]
  }'
```

---

## 🔗 Assignment Management

### Assign Device to Vehicle (Single)
```bash
curl -X POST http://localhost:8787/operator/assignments/device-to-vehicle \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "DEV-xxx",
    "vehicle_id": "VEH-yyy"
  }'
```

---

## 👤 Profile Management

### Get Own Profile
```bash
curl -X GET http://localhost:8787/operator/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Update Own Profile (CRU - No Delete)
```bash
curl -X PUT http://localhost:8787/operator/profile/update \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Operator Name Updated",
    "phone_number": 9876543210
  }'
```

---

## 📈 Statistics

### Get Dashboard Statistics
```bash
curl -X GET http://localhost:8787/operator/stats/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "totalVehicles": 5,
  "activeVehicles": 3,
  "totalDevices": 5,
  "activeDevices": 5,
  "totalDrivers": 5,
  "totalEndUsers": 120
}
```

---

## 🛰️ Socket.IO Events - Live Tracking

### Subscribe to Operator Live Tracking
Real-time GPS updates for operator's vehicles.

```javascript
const socket = io('http://localhost:8787', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

socket.emit('subscribe_operator_tracking', 'OPR-xxx', {
  vehicleId: 'VEH-xxx',    // optional filter
  deviceId: 'DEV-xxx'      // optional filter
});
```

### Listen for Live Updates
```javascript
socket.on('operator_tracking_update', (data) => {
  console.log({
    vehicleId: data.vehicleId,
    deviceId: data.gpsDeviceId,
    latitude: data.latitude,
    longitude: data.longitude,
    speed: data.speed,
    timestamp: data.timestamp,
    device: data.device
  });
});
```

### Subscription Confirmation
```javascript
socket.on('operator_tracking_subscribed', (data) => {
  console.log('Successfully subscribed:', data);
  // data contains: { status, roomId, operatorId, filters }
});
```

### Unsubscribe from Live Tracking
```javascript
socket.emit('unsubscribe_operator_tracking', 'OPR-xxx');
```

---

## 📋 Endpoint Summary Table

| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET** | `/analytics/dashboard` | Operator dashboard analytics |
| **GET** | `/tracking/live-data` | Live tracking data (initial load) |
| **POST** | `/drivers/create` | Create driver |
| **GET** | `/drivers/list` | List drivers |
| **GET** | `/drivers/:driverId/view` | View driver |
| **PUT** | `/drivers/:driverId/update` | Update driver |
| **PUT** | `/drivers/:driverId/deactivate` | Deactivate driver |
| **POST** | `/drivers/bulk-create` | Bulk create drivers |
| **POST** | `/end-users/create` | Create end-user/parent |
| **GET** | `/end-users/list` | List end-users |
| **GET** | `/end-users/:userId/view` | View end-user |
| **PUT** | `/end-users/:userId/update` | Update end-user |
| **PUT** | `/end-users/:userId/deactivate` | Deactivate end-user |
| **POST** | `/end-users/bulk-create` | Bulk create end-users |
| **POST** | `/devices/create` | Create device |
| **GET** | `/devices/list` | List devices |
| **GET** | `/devices/:deviceId/view` | View device |
| **PUT** | `/devices/:deviceId/update` | Update device |
| **PUT** | `/devices/:deviceId/deactivate` | Deactivate device |
| **POST** | `/devices/bulk-assign` | Bulk assign devices to vehicle |
| **POST** | `/vehicles/create` | Create vehicle |
| **GET** | `/vehicles/list` | List vehicles |
| **GET** | `/vehicles/:vehicleId/view` | View vehicle |
| **PUT** | `/vehicles/:vehicleId/update` | Update vehicle |
| **PUT** | `/vehicles/:vehicleId/deactivate` | Deactivate vehicle |
| **POST** | `/vehicles/assign-driver` | Assign driver to vehicle |
| **POST** | `/vehicles/bulk-assign-drivers` | Bulk assign drivers |
| **POST** | `/assignments/device-to-vehicle` | Assign device to vehicle |
| **GET** | `/profile` | Get own profile |
| **PUT** | `/profile/update` | Update own profile |
| **GET** | `/stats/dashboard` | Get statistics |

---

## 🔐 Key Features

1. **Auto-Generated Passwords**: 6-digit numeric passwords for drivers and end-users
2. **Soft Delete**: Status = true/false instead of hard deletion
3. **Bulk Operations**: Create and assign in bulk from array data
4. **Route Management**: Add pickup/drop points and standing locations to vehicles
5. **Live Tracking**: Real-time GPS updates via Socket.IO
6. **Operator Isolation**: All data filtered by operator_id
7. **Credentials Return**: Bulk operations return email + password for each user

---

## 📝 Notes

1. **JWT Token**: All endpoints require valid operator JWT token
2. **Operator Isolation**: All data is automatically filtered by operator_id from JWT
3. **Soft Delete**: Use deactivate endpoints (status = false), not delete
4. **Password Format**: 6-digit numeric (e.g., "123456")
5. **Route Points**: Array of pickup/drop locations with GPS coordinates and order
6. **Standing Location**: Where vehicle rests (separate from current tracking location)
7. **Bulk Creation**: Returns count of created users + all credentials for notification

---

## 🚀 Frontend Integration Example

```javascript
// 1. Subscribe to live tracking
socket.emit('subscribe_operator_tracking', operatorId, {
  vehicleId: selectedVehicleId
});

// 2. Listen for real-time updates
socket.on('operator_tracking_update', (trackingData) => {
  updateVehicleMarkerOnMap(trackingData.vehicleId, {
    lat: trackingData.latitude,
    lng: trackingData.longitude,
    speed: trackingData.speed
  });
});

// 3. Create driver with auto-generated password
const response = await fetch('/operator/drivers/create', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    name: 'Driver Name',
    email: 'driver@school.com',
    phone_number: 9876543210,
    license_number: 'DL-123',
    license_expiry: '2027-12-31',
    vehicle_id: vehicleId
  })
});
const { data } = await response.json();
// data contains: password (6-digit) for sending to driver via SMS/Email

// 4. Bulk create with credentials
const bulkResponse = await fetch('/operator/drivers/bulk-create', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ drivers: [...] })
});
const { data: { credentials } } = await bulkResponse.json();
// credentials array contains: { email, password, name } for each driver
```

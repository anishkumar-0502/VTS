# Superadmin Routes - CLI Reference Guide

**Base URL**: `http://localhost:8787/superadmin`

**Authentication**: All routes require JWT token in `Authorization: Bearer {token}` header

---

## 📊 Analytics & Dashboard

### Get Dashboard Analytics
Retrieve overall system statistics including counts of operators, users, devices, vehicles, and recent tracking data.

```bash
curl -X GET http://localhost:8787/superadmin/analytics/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response**: Dashboard analytics with total/active counts and recent data

---

## 🛰️ Live GPS Tracking

### Get Live Tracking Data (Initial Load)
Retrieve current tracking data. For live updates, use Socket.IO subscription.

```bash
curl -X GET "http://localhost:8787/superadmin/tracking/live-data?operatorId=OPR-xxx&vehicleId=VEH-xxx&deviceId=DEV-xxx&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Query Parameters**:
- `operatorId`: Filter by operator (optional)
- `vehicleId`: Filter by vehicle (optional)
- `deviceId`: Filter by device (optional)
- `limit`: Number of records (default: 50, optional)

### Subscribe to Live Tracking (Socket.IO)
```javascript
const socket = io('http://localhost:8787', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

socket.emit('subscribe_live_tracking', {
  operatorId: 'OPR-xxx',
  vehicleId: 'VEH-xxx',
  deviceId: 'DEV-xxx'
});

socket.on('live_tracking_update', (data) => {
  console.log('Real-time tracking update:', data);
});

socket.on('unsubscribe_live_tracking', () => {
  console.log('Unsubscribed from live tracking');
});
```

---

## 👥 Operator Management

### Create Operator
```bash
curl -X POST http://localhost:8787/superadmin/operators/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ABC Transport",
    "email": "operator@company.com",
    "phone_number": 9876543210,
    "company_name": "ABC Transport Co.",
    "registration_number": "REG-123456",
    "address": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postal_code": "400001",
    "country": "India"
  }'
```

### List All Operators
```bash
curl -X GET http://localhost:8787/superadmin/operators/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### View Specific Operator
```bash
curl -X GET http://localhost:8787/superadmin/operators/OPR-xxx/view \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Update Operator
```bash
curl -X PUT http://localhost:8787/superadmin/operators/OPR-xxx/update \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "email": "newemail@company.com",
    "phone_number": 9876543211
  }'
```

### Deactivate Operator
```bash
curl -X PUT http://localhost:8787/superadmin/operators/OPR-xxx/deactivate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 👤 User Management

### Create User
```bash
curl -X POST http://localhost:8787/superadmin/users/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone_number": 9876543210,
    "password": "SecurePassword123",
    "role_id": 2,
    "operator_id": "OPR-xxx"
  }'
```

### List All Users
```bash
curl -X GET "http://localhost:8787/superadmin/users/list?role_id=2&status=true&operator_id=OPR-xxx" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Query Parameters** (all optional):
- `role_id`: Filter by role (1=superadmin, 2=operator, 3=driver, 4=parent)
- `status`: Filter by status (true/false)
- `operator_id`: Filter by operator

### View Specific User
```bash
curl -X GET http://localhost:8787/superadmin/users/USR-xxx/view \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Update User
```bash
curl -X PUT http://localhost:8787/superadmin/users/USR-xxx/update \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone_number": 9876543211
  }'
```

### Deactivate User
```bash
curl -X PUT http://localhost:8787/superadmin/users/USR-xxx/deactivate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 🔌 Device Management

### Create Device
```bash
curl -X POST http://localhost:8787/superadmin/devices/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_name": "GPS-001",
    "device_type": "GPS",
    "manufacturer": "Garmin",
    "model": "DriveSmart",
    "sim_number": "9876543210",
    "api_key": "unique-api-key-123"
  }'
```

### List All Devices
```bash
curl -X GET http://localhost:8787/superadmin/devices/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### View Specific Device
```bash
curl -X GET http://localhost:8787/superadmin/devices/DEV-xxx/view \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Update Device
```bash
curl -X PUT http://localhost:8787/superadmin/devices/DEV-xxx/update \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_name": "GPS-001-Updated",
    "sim_number": "9876543211"
  }'
```

### Deactivate Device
```bash
curl -X PUT http://localhost:8787/superadmin/devices/DEV-xxx/deactivate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Assign Device to Operator
```bash
curl -X POST http://localhost:8787/superadmin/devices/assign \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "DEV-xxx",
    "operator_id": "OPR-xxx"
  }'
```

### Bulk Assign Devices
```bash
curl -X POST http://localhost:8787/superadmin/devices/bulk-assign \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_ids": ["DEV-xxx", "DEV-yyy", "DEV-zzz"],
    "operator_id": "OPR-xxx"
  }'
```

---

## 🔐 Role Management

### Create Role
```bash
curl -X POST http://localhost:8787/superadmin/roles/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role_name": "custom_role",
    "description": "Custom role description",
    "permissions": ["view_dashboard", "manage_users"]
  }'
```

### List All Roles
```bash
curl -X GET http://localhost:8787/superadmin/roles/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### View Specific Role
```bash
curl -X GET http://localhost:8787/superadmin/roles/1/view \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Update Role
```bash
curl -X PUT http://localhost:8787/superadmin/roles/ROL-xxx/update \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description",
    "permissions": ["view_dashboard", "manage_users", "manage_devices"]
  }'
```

### Deactivate Role
```bash
curl -X PUT http://localhost:8787/superadmin/roles/ROL-xxx/deactivate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 📈 System Statistics

### Get System Statistics
Retrieve overall system metrics including active users, vehicles, devices, and more.

```bash
curl -X GET http://localhost:8787/superadmin/stats/system \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 🔐 Authentication

### Register Superadmin User
```bash
curl -X POST http://localhost:8787/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@vts.com",
    "phone_number": 9876543210,
    "password": "Admin@123",
    "role_id": 1
  }'
```

### Login
```bash
curl -X POST http://localhost:8787/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vts.com",
    "password": "Admin@123"
  }'
```

**Response includes**:
```json
{
  "token": "JWT_TOKEN_HERE",
  "user_id": "USR-xxx",
  "email": "admin@vts.com",
  "role_id": 1,
  "role_name": "superadmin"
}
```

---

## 📋 Endpoint Summary Table

| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET** | `/analytics/dashboard` | Get dashboard analytics |
| **GET** | `/tracking/live-data` | Get live tracking data (REST initial load) |
| **POST** | `/operators/create` | Create operator |
| **GET** | `/operators/list` | List all operators |
| **GET** | `/operators/:operatorId/view` | View specific operator |
| **PUT** | `/operators/:operatorId/update` | Update operator |
| **PUT** | `/operators/:operatorId/deactivate` | Deactivate operator |
| **POST** | `/users/create` | Create user |
| **GET** | `/users/list` | List all users |
| **GET** | `/users/:userId/view` | View specific user |
| **PUT** | `/users/:userId/update` | Update user |
| **PUT** | `/users/:userId/deactivate` | Deactivate user |
| **POST** | `/devices/create` | Create device |
| **GET** | `/devices/list` | List all devices |
| **GET** | `/devices/:deviceId/view` | View specific device |
| **PUT** | `/devices/:deviceId/update` | Update device |
| **PUT** | `/devices/:deviceId/deactivate` | Deactivate device |
| **POST** | `/devices/assign` | Assign device to operator |
| **POST** | `/devices/bulk-assign` | Bulk assign devices |
| **POST** | `/roles/create` | Create role |
| **GET** | `/roles/list` | List all roles |
| **GET** | `/roles/:roleId/view` | View specific role |
| **PUT** | `/roles/:roleId/update` | Update role |
| **PUT** | `/roles/:roleId/deactivate` | Deactivate role |
| **GET** | `/stats/system` | Get system statistics |

---

## 🔗 Socket.IO Events

### Live Tracking Events

**Subscribe to Live Tracking**
```javascript
socket.emit('subscribe_live_tracking', {
  operatorId: 'OPR-xxx',      // optional filter
  vehicleId: 'VEH-xxx',        // optional filter
  deviceId: 'DEV-xxx'          // optional filter
});
```

**Listen for Live Updates**
```javascript
socket.on('live_tracking_update', (data) => {
  // Receives real-time tracking data as it comes in
  console.log({
    vehicleId: data.vehicleId,
    latitude: data.latitude,
    longitude: data.longitude,
    speed: data.speed,
    timestamp: data.timestamp,
    device: data.device
  });
});
```

**Subscription Confirmation**
```javascript
socket.on('tracking_subscribed', (data) => {
  console.log('Successfully subscribed:', data);
});
```

**Unsubscribe from Live Tracking**
```javascript
socket.emit('unsubscribe_live_tracking');
```

---

## 📝 Notes

1. **JWT Token**: All endpoints require valid JWT token from login
2. **Soft Delete**: Users are deactivated, not deleted (status = false)
3. **UUID Format**: 
   - Users: `USR-xxxxx`
   - Operators: `OPR-xxxxx`
   - Devices: `DEV-xxxxx`
   - Vehicles: `VEH-xxxxx`
   - Roles: Numeric (1-4)
4. **Live Tracking**: 
   - Initial load via REST endpoint `/tracking/live-data`
   - Continuous updates via Socket.IO `subscribe_live_tracking`
5. **Phone Number**: Stored as integer, include country code in frontend if needed

---

## 🚀 Example Frontend Integration

```javascript
// Connect and authenticate
const socket = io('http://localhost:8787', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

// Subscribe to live tracking
socket.emit('subscribe_live_tracking', {
  operatorId: 'OPR-123'
});

// Receive real-time updates
socket.on('live_tracking_update', (trackingData) => {
  updateMapMarker(trackingData.vehicleId, {
    lat: trackingData.latitude,
    lng: trackingData.longitude,
    speed: trackingData.speed,
    timestamp: trackingData.timestamp
  });
});

// Handle disconnection
socket.on('disconnect', () => {
  console.log('Disconnected from tracking');
});
```


# VTS Backend Role-Based Access Control Matrix

## Role Definitions

| Role | Description | Primary Function |
|------|-------------|------------------|
| **superadmin** | System administrator | Manage operators, devices, users, roles, system statistics |
| **operator** | Fleet/Transportation operator | Manage vehicles, drivers, device assignments, track fleet |
| **driver** | Vehicle driver | Manage trips, report SOS, view vehicle status |
| **parent** | School parent/guardian | Track child's location, view notifications, set geofences |

---

## Endpoint Access Matrix

### Authentication Routes (`/auth`)

| Endpoint | Superadmin | Operator | Driver | Parent | Auth Required |
|----------|:----------:|:--------:|:------:|:------:|:-------------:|
| POST /register | ✓ | ✓ | ✓ | ✓ | ✗ |
| POST /login | ✓ | ✓ | ✓ | ✓ | ✗ |
| GET /profile | ✓ | ✓ | ✓ | ✓ | ✓ |
| PUT /profile | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST /change-password | ✓ | ✓ | ✓ | ✓ | ✓ |

### Superadmin Routes (`/superadmin`)

| Endpoint | Superadmin | Operator | Driver | Parent | Notes |
|----------|:----------:|:--------:|:------:|:------:|:-----:|
| POST /operators | ✓ | ✗ | ✗ | ✗ | Create operator account |
| GET /operators | ✓ | ✗ | ✗ | ✗ | List all operators |
| GET /operators/:id | ✓ | ✗ | ✗ | ✗ | Get specific operator |
| PUT /operators/:id | ✓ | ✗ | ✗ | ✗ | Update operator |
| GET /users | ✓ | ✗ | ✗ | ✗ | List all users |
| PUT /users/:id/toggle-status | ✓ | ✗ | ✗ | ✗ | Enable/disable user |
| GET /devices | ✓ | ✗ | ✗ | ✗ | List all devices |
| POST /devices | ✓ | ✗ | ✗ | ✗ | Create new device |
| POST /roles | ✓ | ✗ | ✗ | ✗ | Create new role |
| GET /stats | ✓ | ✗ | ✗ | ✗ | System statistics |

### Operator Routes (`/operator`)

| Endpoint | Superadmin | Operator | Driver | Parent | Notes |
|----------|:----------:|:--------:|:------:|:------:|:-----:|
| POST /drivers | ✗ | ✓ | ✗ | ✗ | Create driver in operator's fleet |
| GET /drivers | ✗ | ✓ | ✗ | ✗ | List operator's drivers only |
| POST /vehicles | ✗ | ✓ | ✗ | ✗ | Create vehicle in operator's fleet |
| GET /vehicles | ✗ | ✓ | ✗ | ✗ | List operator's vehicles only |
| GET /vehicles/:id | ✗ | ✓ | ✗ | ✗ | Get operator's vehicle details |
| PUT /vehicles/:id | ✗ | ✓ | ✗ | ✗ | Update operator's vehicle |
| POST /assign-device | ✗ | ✓ | ✗ | ✗ | Assign GPS device to vehicle |
| GET /devices | ✗ | ✓ | ✗ | ✗ | List operator's devices only |
| GET /stats | ✗ | ✓ | ✗ | ✗ | Operator fleet statistics |

### Driver Routes (`/driver`)

| Endpoint | Superadmin | Operator | Driver | Parent | Notes |
|----------|:----------:|:--------:|:------:|:------:|:-----:|
| POST /trips/start | ✗ | ✗ | ✓ | ✗ | Start new trip for own vehicle |
| GET /trips/active | ✗ | ✗ | ✓ | ✗ | Get driver's active trip |
| PUT /trips/:id/end | ✗ | ✗ | ✓ | ✗ | End driver's active trip |
| GET /trips | ✗ | ✗ | ✓ | ✗ | Get driver's trip history |
| GET /trips/:id | ✗ | ✗ | ✓ | ✗ | Get specific trip analytics |
| POST /sos | ✗ | ✗ | ✓ | ✗ | Report emergency (SOS) |
| POST /speed-violation | ✗ | ✗ | ✓ | ✗ | Log speed violation (during trip) |
| GET /vehicles/:id/status | ✗ | ✗ | ✓ | ✗ | Get own vehicle status |
| GET /stats | ✗ | ✗ | ✓ | ✗ | Driver statistics |

### Parent Routes (`/parent`)

| Endpoint | Superadmin | Operator | Driver | Parent | Notes |
|----------|:----------:|:--------:|:------:|:------:|:-----:|
| GET /track-child | ✗ | ✗ | ✗ | ✓ | Get child's current location |
| GET /location-history | ✗ | ✗ | ✗ | ✓ | Get child's location history |
| GET /trip-status | ✗ | ✗ | ✗ | ✓ | Get child's active trip status |
| GET /notifications | ✗ | ✗ | ✗ | ✓ | List parent's notifications |
| PUT /notifications/:id/read | ✗ | ✗ | ✗ | ✓ | Mark notification as read |
| GET /notifications/unread-count | ✗ | ✗ | ✗ | ✓ | Get unread count |
| POST /speed-alerts | ✗ | ✗ | ✗ | ✓ | Enable/disable speed alerts |
| POST /geofence | ✗ | ✗ | ✗ | ✓ | Set geofence for child |

### Webhook Routes (`/webhook`)

| Endpoint | Method | Auth | Rate Limit | Notes |
|----------|:------:|:----:|:----------:|:-----:|
| / | POST | API Key | 10,000/min | GPS telemetry endpoint - public |

---

## Data Ownership & Visibility

### User Data
| Role | Can View | Can Modify | Scope |
|------|:--------:|:----------:|:-----:|
| Superadmin | All users | All users | System-wide |
| Operator | Own users | Own users | Operator's team only |
| Driver | Own profile | Own profile | Self only |
| Parent | Own profile | Own profile | Self only |

### Vehicle Data
| Role | Can View | Can Modify | Scope |
|------|:--------:|:----------:|:-----:|
| Superadmin | All vehicles | All vehicles | System-wide |
| Operator | Own vehicles | Own vehicles | Operator's fleet only |
| Driver | Assigned vehicle | None | Assigned vehicle only |
| Parent | Child's vehicle | None | Child's assigned vehicle only |

### Trip Data
| Role | Can View | Can Modify | Scope |
|------|:--------:|:----------:|:-----:|
| Superadmin | All trips | Limit trips (cancel) | System-wide |
| Operator | Fleet trips | Limit trips (monitor) | Operator's fleet |
| Driver | Own trips | Own trips (start/end) | Own trips only |
| Parent | Child trips | None | Child's trips only |

### Tracking Data
| Role | Can View | Retention |
|------|:--------:|:---------:|
| Superadmin | All tracking | No limit |
| Operator | Fleet tracking | Per subscription |
| Driver | Own vehicle | Current trip |
| Parent | Child vehicle | Per subscription |

### Device Data
| Role | Can Create | Can Manage | Can Assign | Scope |
|------|:----------:|:----------:|:----------:|:-----:|
| Superadmin | ✓ | ✓ | ✓ | System-wide |
| Operator | ✗ | ✓ | ✓ | Operator's devices |
| Driver | ✗ | ✗ | ✗ | N/A |
| Parent | ✗ | ✗ | ✗ | N/A |

---

## Permission Scope Rules

### Superadmin
- Unrestricted access to all endpoints
- Can manage all operators, users, devices
- Can view system-wide statistics
- Can modify any user's status
- Can create roles

### Operator
- Limited to own operator_id scope
- Can create/manage drivers in own fleet
- Can create/manage vehicles in own fleet
- Can view/manage own devices
- Can assign devices to own vehicles
- Can view only own fleet statistics
- Cannot access other operators' data

### Driver
- Limited to own user_id scope
- Can start/end own trips
- Can view own trip history
- Can report SOS and violations
- Can only view assigned vehicle status
- Cannot view other drivers' data

### Parent
- Limited to own children
- Can track assigned child's location
- Can view child's trips and history
- Can manage own notifications
- Can set geofences and alerts for child
- Cannot access other parents' data

---

## Security Considerations

### Authentication & Authorization
1. **JWT Tokens** - Expire after 7 days (configurable via JWT_EXPIRY)
2. **Role Checking** - Every protected route validates user role
3. **Scope Validation** - Services check ownership before operations
4. **API Keys** - Webhook endpoint uses fixed API key (X-API-Key header)

### Rate Limiting
- **Global (API)**: 1000 req/15min
- **Auth**: 5 attempts/15min (prevent brute force)
- **Webhook**: 10,000 req/1min (high volume expected)

### Data Protection
- **Passwords** - Hashed with bcryptjs (10 rounds)
- **Sensitive Fields** - Not returned in list endpoints
- **Audit Logging** - All important actions logged

### Cross-Operator Data Leakage Prevention
- Every query filters by operator_id (for operator routes)
- Services validate ownership before returning data
- Controllers check req.user.operator_id against resource owner

---

## Role Transition & Permissions

### New User Registration
- Registers with specified role
- Cannot register as superadmin (superadmin creates these)
- Cannot register as operator (superadmin creates these)

### Role Assignment
- Superadmin can create users with any role
- Operator can create driver accounts (limited to own fleet)
- Drivers/Parents cannot create accounts

### Permission Inheritance
- Roles are hierarchical: superadmin > operator > driver/parent
- Lower roles cannot perform higher-level operations
- Cross-role access is explicitly denied

---

## Audit Trail

All actions are logged with:
- Timestamp
- User ID
- Action type
- Resource ID
- IP address
- HTTP method & endpoint

Sensitive operations (user creation, permission changes) are logged at INFO level.

# Swagger JSDoc Examples - Complete Reference

This file provides complete JSDoc examples for different types of endpoints in the VTS API.

---

## 📚 Table of Contents

1. [Simple GET Endpoint](#simple-get-endpoint)
2. [GET with Path Parameters](#get-with-path-parameters)
3. [GET with Query Parameters](#get-with-query-parameters)
4. [POST with Request Body](#post-with-request-body)
5. [PUT with Path Parameter and Body](#put-with-path-parameter-and-body)
6. [POST with Complex Nested Body](#post-with-complex-nested-body)
7. [Protected Endpoint (Requires Auth)](#protected-endpoint-requires-auth)
8. [Endpoint with Multiple Response Codes](#endpoint-with-multiple-response-codes)
9. [File Upload Endpoint](#file-upload-endpoint)
10. [Batch Operation](#batch-operation)

---

## Simple GET Endpoint

**When to use:** Retrieving a list of items without filters

```javascript
/**
 * @swagger
 * /operator/vehicles/list:
 *   get:
 *     summary: Get all vehicles
 *     description: Retrieve a list of all vehicles for the operator
 *     tags: [Operator]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vehicles list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               error: false
 *               message: Vehicles retrieved successfully
 *               data:
 *                 - vehicle_id: VEH-001
 *                   vehicle_name: Vehicle 1
 *                   status: active
 *                 - vehicle_id: VEH-002
 *                   vehicle_name: Vehicle 2
 *                   status: active
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error
 */
router.get('/vehicles/list', authMiddleware, OperatorController.getVehicles);
```

---

## GET with Path Parameters

**When to use:** Getting a specific resource by ID

```javascript
/**
 * @swagger
 * /driver/trips/{tripId}:
 *   get:
 *     summary: Get trip details
 *     description: Retrieve detailed information about a specific trip
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique trip identifier
 *         example: TRIP-001
 *     responses:
 *       200:
 *         description: Trip details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               error: false
 *               message: Trip retrieved successfully
 *               data:
 *                 trip_id: TRIP-001
 *                 vehicle_id: VEH-001
 *                 route_name: Downtown Route
 *                 start_time: 2024-01-15T08:00:00Z
 *                 status: active
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Trip not found
 *       500:
 *         description: Server error
 */
router.get('/trips/:tripId', authMiddleware, DriverController.getTripDetails);
```

---

## GET with Query Parameters

**When to use:** Retrieving filtered or paginated lists

```javascript
/**
 * @swagger
 * /parent/trips/history:
 *   get:
 *     summary: Get trip history
 *     description: Retrieve trip history with optional filters and pagination
 *     tags: [Parent/Guardian]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: childId
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by child ID
 *         example: CHILD-001
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [completed, ongoing, cancelled]
 *         description: Filter by trip status
 *         example: completed
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering (ISO 8601)
 *         example: 2024-01-01T00:00:00Z
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering (ISO 8601)
 *         example: 2024-01-31T23:59:59Z
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Trip history retrieved successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Server error
 */
router.get('/trips/history', authMiddleware, ParentController.getTripHistory);
```

---

## POST with Request Body

**When to use:** Creating a new resource

```javascript
/**
 * @swagger
 * /operator/drivers/create:
 *   post:
 *     summary: Create a new driver
 *     description: Create a new driver account for the operator
 *     tags: [Operator]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone_number, license_number, license_expiry]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: John Smith
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               phone_number:
 *                 type: string
 *                 pattern: '^\+?[0-9]{10,}$'
 *                 example: '+1234567890'
 *               license_number:
 *                 type: string
 *                 example: DL123456
 *               license_expiry:
 *                 type: string
 *                 format: date
 *                 example: 2025-12-31
 *               vehicle_id:
 *                 type: string
 *                 example: VEH-001
 *           example:
 *             name: John Smith
 *             email: john@example.com
 *             phone_number: '+1234567890'
 *             license_number: DL123456
 *             license_expiry: '2025-12-31'
 *             vehicle_id: VEH-001
 *     responses:
 *       201:
 *         description: Driver created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               error: false
 *               message: Driver created successfully
 *               data:
 *                 driver_id: DRV-001
 *                 name: John Smith
 *                 email: john@example.com
 *                 status: active
 *       400:
 *         description: Validation error - missing or invalid fields
 *       409:
 *         description: Driver with this email already exists
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error
 */
router.post('/drivers/create', authMiddleware, OperatorController.createDriver);
```

---

## PUT with Path Parameter and Body

**When to use:** Updating an existing resource

```javascript
/**
 * @swagger
 * /operator/vehicles/{vehicleId}/update:
 *   put:
 *     summary: Update vehicle information
 *     description: Update details of a specific vehicle
 *     tags: [Operator]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: The vehicle ID to update
 *         example: VEH-001
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicle_name:
 *                 type: string
 *                 example: Toyota Hiace
 *               license_plate:
 *                 type: string
 *                 example: ABC-1234
 *               vehicle_type:
 *                 type: string
 *                 enum: [bus, van, truck, car]
 *                 example: bus
 *               capacity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 40
 *               registration_number:
 *                 type: string
 *                 example: REG123456
 *           example:
 *             vehicle_name: Toyota Hiace
 *             license_plate: ABC-1234
 *             vehicle_type: bus
 *             capacity: 40
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid vehicle data
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Vehicle not found
 *       409:
 *         description: License plate already exists
 *       500:
 *         description: Server error
 */
router.put('/vehicles/:vehicleId/update', authMiddleware, OperatorController.updateVehicle);
```

---

## POST with Complex Nested Body

**When to use:** Creating resources with complex nested structures

```javascript
/**
 * @swagger
 * /driver/trips/start:
 *   post:
 *     summary: Start a new trip
 *     description: Begin a new trip with start location and route information
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vehicle_id, route_name, start_location]
 *             properties:
 *               vehicle_id:
 *                 type: string
 *                 example: VEH-001
 *               route_name:
 *                 type: string
 *                 example: Downtown Express Route
 *               start_location:
 *                 type: object
 *                 required: [latitude, longitude]
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     format: float
 *                     minimum: -90
 *                     maximum: 90
 *                     example: 40.7128
 *                   longitude:
 *                     type: number
 *                     format: float
 *                     minimum: -180
 *                     maximum: 180
 *                     example: -74.0060
 *                   address:
 *                     type: string
 *                     example: 123 Main Street, New York, NY
 *               estimated_stops:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     latitude:
 *                       type: number
 *                       example: 40.7200
 *                     longitude:
 *                       type: number
 *                       example: -74.0100
 *                     address:
 *                       type: string
 *                       example: 456 Park Ave, New York, NY
 *               notes:
 *                 type: string
 *                 example: School transport for Route 5
 *           example:
 *             vehicle_id: VEH-001
 *             route_name: Downtown Express Route
 *             start_location:
 *               latitude: 40.7128
 *               longitude: -74.0060
 *               address: 123 Main Street
 *             estimated_stops:
 *               - latitude: 40.7200
 *                 longitude: -74.0100
 *             notes: Morning route
 *     responses:
 *       201:
 *         description: Trip started successfully
 *       400:
 *         description: Invalid trip data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vehicle not found
 *       500:
 *         description: Server error
 */
router.post('/trips/start', authMiddleware, DriverController.startTrip);
```

---

## Protected Endpoint (Requires Auth)

**When to use:** All endpoints that need authentication

```javascript
/**
 * @swagger
 * /driver/speed-alerts:
 *   get:
 *     summary: Get speed violation alerts
 *     description: Retrieve all speed violation alerts for the driver
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Speed alerts retrieved successfully
 *       401:
 *         description: Unauthorized - Token missing, invalid, or expired
 *       403:
 *         description: Forbidden - Insufficient permissions for this resource
 *       500:
 *         description: Server error
 */
router.get('/speed-alerts', authMiddleware, DriverController.getSpeedAlerts);
```

**Note:** The `security: [{ bearerAuth: [] }]` block tells Swagger that this endpoint requires authentication. Users must:
1. Log in via `/auth/login`
2. Click the "Authorize" button in Swagger UI
3. Enter the token returned from login

---

## Endpoint with Multiple Response Codes

**When to use:** Showing comprehensive error handling

```javascript
/**
 * @swagger
 * /parent/confirmations/pickup:
 *   post:
 *     summary: Confirm child pickup
 *     description: Confirm that a child has been picked up
 *     tags: [Parent/Guardian]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tripId, childId]
 *             properties:
 *               tripId:
 *                 type: string
 *                 example: TRIP-001
 *               childId:
 *                 type: string
 *                 example: CHILD-001
 *               confirmation_time:
 *                 type: string
 *                 format: date-time
 *                 example: 2024-01-15T08:15:00Z
 *               notes:
 *                 type: string
 *                 example: Child picked up successfully
 *     responses:
 *       200:
 *         description: Pickup confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: |
 *           Validation error:
 *           - Missing required fields (tripId, childId)
 *           - Invalid trip or child ID format
 *       401:
 *         description: |
 *           Authentication error:
 *           - Token missing or invalid
 *           - Token expired
 *       403:
 *         description: |
 *           Permission error:
 *           - Not authorized to confirm this trip
 *           - Not the child's guardian
 *       404:
 *         description: |
 *           Resource not found:
 *           - Trip not found
 *           - Child not found
 *           - Confirmation record not found
 *       409:
 *         description: |
 *           Conflict error:
 *           - Pickup already confirmed
 *           - Trip already completed
 *       422:
 *         description: |
 *           Unprocessable entity:
 *           - Child not in this trip
 *           - Trip not in pickup phase
 *       500:
 *         description: Server error - Unable to process request
 */
router.post('/confirmations/pickup', authMiddleware, ParentController.confirmPickup);
```

---

## File Upload Endpoint

**When to use:** Handling file uploads (profile images, documents, etc.)

```javascript
/**
 * @swagger
 * /auth/profile/upload-image:
 *   post:
 *     summary: Upload profile image
 *     description: Upload a new profile image for the authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Profile image file (JPEG, PNG, WebP)
 *               description:
 *                 type: string
 *                 maxLength: 200
 *                 example: My new profile photo
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               error: false
 *               message: Image uploaded successfully
 *               data:
 *                 image_url: /uploads/profiles/user-123.jpg
 *       400:
 *         description: Invalid file format or size
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: File too large (max 5MB)
 *       500:
 *         description: Server error
 */
router.post('/profile/upload-image', authMiddleware, upload.single('image'), AuthController.uploadProfileImage);
```

---

## Batch Operation

**When to use:** Operations that process multiple items at once

```javascript
/**
 * @swagger
 * /superadmin/devices/bulk-assign:
 *   post:
 *     summary: Bulk assign devices to operator
 *     description: Assign multiple GPS tracking devices to an operator in a single operation
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [device_ids, operator_id]
 *             properties:
 *               device_ids:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 1000
 *                 items:
 *                   type: string
 *                 description: Array of device IDs to assign
 *                 example: [DEV-001, DEV-002, DEV-003]
 *               operator_id:
 *                 type: string
 *                 description: Target operator ID
 *                 example: OP-123
 *               transfer:
 *                 type: boolean
 *                 default: false
 *                 description: If true, unassign from current operator first
 *           example:
 *             device_ids: [DEV-001, DEV-002, DEV-003]
 *             operator_id: OP-123
 *             transfer: true
 *     responses:
 *       200:
 *         description: Devices assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               error: false
 *               message: 3 devices assigned successfully
 *               data:
 *                 assigned_count: 3
 *                 failed_count: 0
 *                 details:
 *                   - device_id: DEV-001
 *                     status: success
 *                   - device_id: DEV-002
 *                     status: success
 *                   - device_id: DEV-003
 *                     status: success
 *       400:
 *         description: Invalid request - empty array or missing fields
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Operator not found
 *       413:
 *         description: Request too large (max 1000 devices)
 *       500:
 *         description: Server error
 */
router.post('/devices/bulk-assign', authMiddleware, SuperadminController.bulkAssignDevices);
```

---

## Common Parameter Types Reference

### Integer Parameter
```javascript
- in: query
  name: limit
  schema:
    type: integer
    minimum: 1
    maximum: 100
    default: 20
  example: 50
```

### String Parameter
```javascript
- in: query
  name: search
  schema:
    type: string
    minLength: 2
    maxLength: 100
  example: John
```

### Enum Parameter
```javascript
- in: query
  name: status
  schema:
    type: string
    enum: [active, inactive, pending]
  example: active
```

### Date Parameter
```javascript
- in: query
  name: created_date
  schema:
    type: string
    format: date
  example: 2024-01-15
```

### DateTime Parameter
```javascript
- in: query
  name: created_at
  schema:
    type: string
    format: date-time
  example: 2024-01-15T08:30:00Z
```

### Boolean Parameter
```javascript
- in: query
  name: is_active
  schema:
    type: boolean
  example: true
```

---

## HTTP Methods Guide

| Method | Use Case | Status Code |
|--------|----------|-------------|
| `GET` | Retrieve data | 200, 400, 401, 404, 500 |
| `POST` | Create resource | 201, 400, 401, 409, 500 |
| `PUT` | Update resource | 200, 400, 401, 404, 500 |
| `PATCH` | Partial update | 200, 400, 401, 404, 500 |
| `DELETE` | Remove resource | 204, 400, 401, 404, 500 |

---

## Response Status Code Convention

```javascript
responses:
  200:
    description: Success (GET, PUT, PATCH)
  201:
    description: Created (POST)
  204:
    description: No content (DELETE)
  400:
    description: Bad request (validation error)
  401:
    description: Unauthorized (auth required/invalid)
  403:
    description: Forbidden (insufficient permissions)
  404:
    description: Not found (resource doesn't exist)
  409:
    description: Conflict (duplicate/constraint violation)
  422:
    description: Unprocessable entity (validation failed)
  429:
    description: Too many requests (rate limited)
  500:
    description: Server error
  503:
    description: Service unavailable
```

---

## How to Apply These Examples

1. **Choose the appropriate example** for your endpoint type
2. **Replace placeholders** with your actual paths and field names
3. **Update tags** to match your API's tag categories
4. **Add to your route file** directly above the `router.method()` line
5. **Restart the server** to see changes in Swagger UI
6. **Test using Try-it-out** in Swagger UI

---

**Last Updated:** 2024
**Version:** 1.0
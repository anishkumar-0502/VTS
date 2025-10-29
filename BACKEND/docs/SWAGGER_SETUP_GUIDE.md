# Swagger/OpenAPI Integration Guide - VTS Backend

## Overview
This guide explains the complete Swagger (OpenAPI 3.0.0) integration into the VTS Express.js backend. The documentation is auto-generated from JSDoc comments in your route files.

---

## 📋 Table of Contents
1. [Installation](#installation)
2. [Configuration](#configuration)
3. [File Structure](#file-structure)
4. [Access Documentation](#access-documentation)
5. [JSDoc Comment Format](#jsdoc-comment-format)
6. [Adding New Endpoints](#adding-new-endpoints)
7. [Examples](#examples)
8. [Authentication](#authentication)
9. [Testing with Swagger](#testing-with-swagger)

---

## Installation

### Prerequisites
- Node.js v14 or higher
- Express.js v4.18.2+

### Packages Installed
```bash
npm install swagger-jsdoc swagger-ui-express
```

**Version Information:**
- `swagger-jsdoc`: ^6.2.8 - Converts JSDoc comments to OpenAPI spec
- `swagger-ui-express`: ^5.0.0 - Serves interactive Swagger UI

---

## Configuration

### 1. Main Configuration File: `config/swagger.js`

This file contains:
- **OpenAPI 3.0.0 specification**
- **API metadata** (title, version, description)
- **Server configurations** (development, production)
- **Security schemes** (JWT Bearer authentication)
- **Reusable schemas** for request/response bodies
- **API tags** for route grouping

**Key sections:**
```javascript
// Swagger Definition
- openapi: '3.0.0'
- info: API title, version, description, contact
- servers: Development and production URLs
- components.securitySchemes: Bearer token auth
- components.schemas: Reusable request/response models
- tags: Route categories for UI organization
```

### 2. Integration in `app.js`

```javascript
// Import
const { setupSwaggerDocs } = require('./config/swagger');

// Apply middleware (after health check, before routes)
setupSwaggerDocs(app);
```

This sets up:
- `GET /api-docs` - Interactive Swagger UI
- `GET /api-docs.json` - OpenAPI specification in JSON format

---

## File Structure

```
BACKEND/
├── config/
│   └── swagger.js                 # Main Swagger configuration
├── routes/
│   ├── authRoutes.js             # Documented with JSDoc
│   ├── superadminRoutes.js       # Documented with JSDoc
│   ├── operatorRoutes.js         # (Add JSDoc comments)
│   ├── driverRoutes.js           # (Add JSDoc comments)
│   └── parentRoutes.js           # (Add JSDoc comments)
├── app.js                         # Swagger middleware integrated
├── SWAGGER_SETUP_GUIDE.md        # This file
└── package.json                   # Contains swagger packages
```

---

## Access Documentation

### Running the Server
```bash
npm run dev
```

### View Documentation
1. **Interactive UI (Recommended)**
   - URL: `http://localhost:8787/api-docs`
   - Features: Try-it-out, authentication, request/response viewing

2. **OpenAPI JSON Spec**
   - URL: `http://localhost:8787/api-docs.json`
   - Use this to import into other tools (Postman, Insomnia, etc.)

### Server Startup Messages
```
🎯 Swagger API Documentation: http://localhost:8787/api-docs
📋 API Spec (JSON): http://localhost:8787/api-docs.json
📖 Markdown Documentation: http://localhost:8787/docs/API_ROUTES.md
```

---

## JSDoc Comment Format

### Basic Structure
```javascript
/**
 * @swagger
 * /path/to/endpoint:
 *   methodType:
 *     summary: Brief description
 *     description: Detailed description
 *     tags: [TagName]
 *     security:
 *       - bearerAuth: []
 *     parameters: [...]
 *     requestBody: {...}
 *     responses: {...}
 */
router.methodType('/path', controllerMethod);
```

### Full Example: GET Endpoint
```javascript
/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get user profile
 *     description: Retrieve the authenticated user's profile information
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 */
router.get('/profile', authMiddleware, AuthController.getProfile);
```

### Full Example: POST Endpoint with Parameters
```javascript
/**
 * @swagger
 * /superadmin/operators/create:
 *   post:
 *     summary: Create a new operator
 *     description: Create a new operator account with company details
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOperatorRequest'
 *     responses:
 *       201:
 *         description: Operator created successfully
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Operator with this email already exists
 */
router.post('/operators/create', SuperadminController.createOperator);
```

### Full Example: GET with Query Parameters
```javascript
/**
 * @swagger
 * /superadmin/users/list:
 *   get:
 *     summary: Get all users
 *     description: Retrieve list of all users with optional filtering
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role_id
 *         schema:
 *           type: integer
 *         description: Filter by role ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: boolean
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get('/users/list', SuperadminController.getAllUsers);
```

### Full Example: GET with Path Parameters
```javascript
/**
 * @swagger
 * /superadmin/operators/{operatorId}/view:
 *   get:
 *     summary: Get operator by ID
 *     description: Retrieve detailed information about a specific operator
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: operatorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Operator ID
 *     responses:
 *       200:
 *         description: Operator retrieved successfully
 *       404:
 *         description: Operator not found
 */
router.get('/operators/:operatorId/view', SuperadminController.getOperatorById);
```

---

## Adding New Endpoints

### Step-by-Step Process

#### 1. Create the Route
```javascript
router.post('/your-route', YourController.method);
```

#### 2. Add JSDoc Comments Above It
```javascript
/**
 * @swagger
 * /your-prefix/your-route:
 *   post:
 *     summary: What does this do?
 *     description: Detailed explanation
 *     tags: [YourTag]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field1:
 *                 type: string
 *               field2:
 *                 type: number
 *     responses:
 *       200:
 *         description: Success description
 *       400:
 *         description: Error description
 */
router.post('/your-route', YourController.method);
```

#### 3. If Using a Reusable Schema
Create it in `config/swagger.js` in `components.schemas`:
```javascript
YourSchema: {
  type: 'object',
  required: ['field1'],
  properties: {
    field1: { type: 'string' },
    field2: { type: 'number' }
  }
}
```

Then reference it:
```javascript
schema:
  $ref: '#/components/schemas/YourSchema'
```

#### 4. Reload Documentation
The documentation auto-regenerates on server restart.

---

## Examples

### Authentication Endpoint
**Route File:** `authRoutes.js`

```javascript
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user with email, password, and role_id
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: john@example.com
 *             password: SecurePass123!
 *             role_id: 2
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials
 */
router.post('/login', authLimiter, AuthController.login);
```

### Admin Endpoint with Complex Body
**Route File:** `superadminRoutes.js`

```javascript
/**
 * @swagger
 * /superadmin/devices/bulk-assign:
 *   post:
 *     summary: Bulk assign devices to operator
 *     description: Assign multiple devices to an operator at once
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
 *                 items:
 *                   type: string
 *               operator_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Devices bulk assigned successfully
 */
router.post('/devices/bulk-assign', SuperadminController.bulkAssignDevices);
```

### Endpoint with Multiple Query Parameters
```javascript
/**
 * @swagger
 * /superadmin/tracking/live-data:
 *   get:
 *     summary: Get GPS tracking live data
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: operatorId
 *         schema: { type: string }
 *       - in: query
 *         name: vehicleId
 *         schema: { type: string }
 *       - in: query
 *         name: deviceId
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: GPS tracking data retrieved
 */
router.get('/tracking/live-data', SuperadminController.getGPSTracking);
```

---

## Authentication

### Bearer Token (JWT) in Swagger UI

1. **Login First**
   - Use the `/auth/login` endpoint
   - Copy the returned `token` value

2. **Add Token to Swagger UI**
   - Click the lock icon (🔒) or "Authorize" button
   - Paste the token in the dialog
   - Click "Authorize"

3. **All Subsequent Requests**
   - The token is automatically included in the `Authorization: Bearer <token>` header

### In JSDoc Comments
```javascript
security:
  - bearerAuth: []  // Indicates this endpoint requires authentication
```

### Endpoints Without Authentication
```javascript
security: []  // Empty array means no auth required
```

---

## Testing with Swagger

### 1. Try-It-Out Feature
- Click the "Try it out" button on any endpoint
- Fill in the required parameters
- Click "Execute"
- View the response and HTTP status code

### 2. View Request/Response Details
- **Headers sent** are visible in the UI
- **Curl command** is generated for copying
- **Response body** is formatted and syntax-highlighted

### 3. Export Requests
- Requests can be exported for use in other tools:
  - Postman
  - Insomnia
  - Thunder Client

---

## Available Tags for Organization

Your API is organized into these tags:

```
- Auth                  : Authentication endpoints
- SuperAdmin            : Super Administrator endpoints
- Operator              : Operator management
- Driver                : Driver and trip management
- Parent/Guardian       : Guardian tracking features
- Health                : System health check
```

Each endpoint must have `tags: [TagName]` to appear in the correct section.

---

## Reusable Schemas in config/swagger.js

Pre-defined schemas for consistency:

### Request Schemas
- `RegisterRequest` - User registration
- `LoginRequest` - User login
- `ChangePasswordRequest` - Password change
- `CreateOperatorRequest` - Operator creation
- `CreateDeviceRequest` - Device creation
- `StartTripRequest` - Trip start
- `EndTripRequest` - Trip end
- `CreateRoleRequest` - Role creation

### Response Schemas
- `SuccessResponse` - Standard success response
- `ErrorResponse` - Standard error response
- `LoginResponse` - Login success response

Reference them:
```javascript
schema:
  $ref: '#/components/schemas/LoginRequest'
```

---

## Troubleshooting

### 1. Documentation Not Updating
**Solution:** Restart the server
```bash
# Stop: Ctrl+C
# Restart: npm run dev
```

### 2. JSDoc Comments Not Appearing
**Checklist:**
- ✅ Comments are properly formatted with `@swagger` tag
- ✅ File is in the `apis` array in `config/swagger.js`
- ✅ Comment is directly above the `router.method()` line
- ✅ No syntax errors in the YAML structure

### 3. Schema Not Found Error
**Solution:** Ensure schema is defined in `config/swagger.js` under `components.schemas`

### 4. Authorization Header Not Working
- Ensure endpoint has `security: [{ bearerAuth: [] }]`
- Click the lock/Authorize button in Swagger UI
- Token must be valid JWT from `/auth/login`

---

## Best Practices

### 1. Naming Conventions
- Use clear, descriptive summaries (50 characters max)
- Descriptions should explain business logic
- Tags should match role/feature area

### 2. Request/Response Consistency
- Use reusable schemas when possible
- Include examples for clarity
- Document all response codes (200, 400, 401, 404, 500)

### 3. Documentation Maintenance
- Update JSDoc when changing endpoints
- Keep schemas synchronized with code
- Remove documentation for deleted endpoints

### 4. Status Code Conventions
- `200` - Successful GET/PUT
- `201` - Successful POST (resource created)
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found (resource doesn't exist)
- `409` - Conflict (duplicate resource)
- `500` - Server error

---

## Quick Reference: JSDoc Template

```javascript
/**
 * @swagger
 * /path:
 *   methodType:
 *     summary: Brief description
 *     description: Detailed description
 *     tags: [TagName]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query|path
 *         name: paramName
 *         required: true|false
 *         schema:
 *           type: string|number|boolean
 *         description: Parameter description
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SchemaName'
 *           example: { field: 'value' }
 *     responses:
 *       200:
 *         description: Success message
 *       400:
 *         description: Error message
 */
router.methodType('/path', middleware, controller.method);
```

---

## Next Steps

1. ✅ **Review Current Documentation**: Visit `http://localhost:8787/api-docs`
2. ✅ **Add JSDoc to Remaining Routes**: `operatorRoutes.js`, `driverRoutes.js`, `parentRoutes.js`
3. ✅ **Test All Endpoints**: Use Try-it-out feature
4. ✅ **Export to Postman**: Use `/api-docs.json` URL
5. ✅ **Share Documentation**: Send `http://localhost:8787/api-docs` to team

---

## Useful Links

- [OpenAPI 3.0.0 Specification](https://spec.openapis.org/oas/v3.0.0)
- [Swagger-JSDoc Documentation](https://github.com/Surnet/swagger-jsdoc)
- [Swagger-UI-Express Documentation](https://github.com/scottie1984/swagger-ui-express)

---

**Last Updated:** 2024
**Swagger Version:** OpenAPI 3.0.0
**Maintained By:** VTS Development Team
# Backend API Integration - Admin Frontend

This document outlines the integration of the VTS Backend API with the Admin Frontend.

## Overview

The admin frontend has been successfully integrated with the backend API. The application now fetches real data from the backend and displays it in the dashboard components while maintaining the original template design.

## Configuration

### Environment Setup

The `.env.local` file contains the API base URL:

```env
VITE_API_URL=http://localhost:3000
```

**Important:** Make sure the backend server is running on port 3000 before starting the admin frontend.

## API Integration Points

### 1. **API Service** (`src/services/api.ts`)

A centralized API service module that handles all backend communication:

- **Base URL**: `http://localhost:3000` (configurable via `VITE_API_URL`)
- **Authentication**: Bearer token sent via `Authorization` header from localStorage
- **Methods**: GET, POST, PUT, DELETE with automatic error handling

#### Available API Endpoints:

**Authentication:**
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

**Operators Management:**
- `GET /superadmin/operators` - Get all operators
- `POST /superadmin/operators` - Create new operator
- `PUT /superadmin/operators/:operatorId` - Update operator
- `DELETE /superadmin/operators/:operatorId` - Delete operator
- `GET /superadmin/dashboard/:superadminId` - Get dashboard data

**Vehicles Management:**
- `GET /vehicles` - Get all vehicles
- `GET /vehicles/:vehicleId` - Get specific vehicle
- `POST /vehicles` - Create new vehicle
- `PUT /vehicles/:vehicleId` - Update vehicle
- `DELETE /vehicles/:vehicleId` - Delete vehicle
- `GET /vehicles/:vehicleId/status` - Get vehicle status

**Drivers Management:**
- `GET /driver` - Get all drivers
- `GET /driver/:driverId` - Get specific driver
- `POST /driver` - Create new driver
- `PUT /driver/:driverId` - Update driver
- `DELETE /driver/:driverId` - Delete driver

**Tracking:**
- `GET /tracking` - Get all tracking data
- `GET /tracking/latest/:deviceId` - Get latest location
- `GET /tracking/history/:deviceId` - Get tracking history

**Alerts:**
- `GET /alerts` - Get all alerts
- `GET /alerts/:alertId` - Get specific alert
- `POST /alerts` - Create new alert
- `PUT /alerts/:alertId` - Update alert
- `DELETE /alerts/:alertId` - Delete alert

**GPS Devices:**
- `GET /gps/devices` - Get all GPS devices
- `GET /gps/devices/:deviceId` - Get specific device
- `POST /gps/devices` - Create new device
- `PUT /gps/devices/:deviceId` - Update device
- `DELETE /gps/devices/:deviceId` - Delete device

## Updated Components

### 1. **EcommerceMetrics** (`src/components/ecommerce/EcommerceMetrics.tsx`)

- Fetches operator and vehicle counts from the backend
- Displays real-time metrics on the dashboard
- Shows loading state while fetching data

### 2. **RecentOrders** (`src/components/ecommerce/RecentOrders.tsx`)

- Renamed to display "Recent Vehicles"
- Fetches latest 5 vehicles from the backend
- Shows vehicle details: number, type, model, and status
- Displays vehicle status badges (Active/Pending)

### 3. **BasicTableOne** (`src/components/tables/BasicTables/BasicTableOne.tsx`)

- Updated to display driver information
- Shows driver details: name, license number, phone, and status
- Displays all drivers from the backend API
- Uses status badges to indicate active/inactive drivers

## Data Flow

1. **Component Mount** → `useEffect` hook triggers
2. **API Call** → Fetches data from backend service
3. **State Update** → Updates component state with fetched data
4. **Render** → Displays data in the template with original design intact

## Error Handling

- Try-catch blocks handle network errors
- Console logging for debugging
- Graceful fallbacks with "No data found" messages
- Loading states prevent blank screens

## Authentication

To use protected endpoints (operators, vehicles, drivers):

1. Store the authentication token from login in localStorage:
   ```javascript
   localStorage.setItem('authToken', token);
   ```

2. The API service automatically includes the token in the Authorization header:
   ```
   Authorization: Bearer <token>
   ```

## Development

### Starting the Application

1. **Backend Server** (if not already running):
   ```bash
   cd /Users/outdid/Desktop/Work/VTS/BACKEND
   npm install
   npm start
   ```

2. **Admin Frontend**:
   ```bash
   cd /Users/outdid/Desktop/Work/VTS/FRONTEND/ADMIN
   npm install
   npm run dev
   ```

3. **Access the Application**:
   - Admin: `http://localhost:5173` (default Vite port)
   - Backend: `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The build output is in the `dist/` directory.

## Key Features

✅ **Real-time Data**: Dashboard metrics update from backend
✅ **Template Preserved**: Original design and styling maintained
✅ **Type Safety**: Full TypeScript support with proper interfaces
✅ **Error Handling**: Graceful error management and user feedback
✅ **Responsive**: Works on all device sizes
✅ **Loading States**: Better UX with loading indicators

## Notes

- The application maintains the original Tailwind CSS design
- All API endpoints are centralized in `src/services/api.ts`
- Components are responsive and work with real backend data
- Authentication tokens are managed locally
- Consider implementing refresh token logic for production

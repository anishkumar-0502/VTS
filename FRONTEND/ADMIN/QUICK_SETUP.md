# Quick Setup Guide - VTS Admin Frontend with Backend API

## Prerequisites

- **Node.js**: v16.x or higher
- **Backend Server**: Running on `http://localhost:3000`
- **MongoDB**: Connected to backend (as per backend setup)

## Installation

### 1. Install Dependencies

```bash
cd /Users/outdid/Desktop/Work/VTS/FRONTEND/ADMIN
npm install
```

### 2. Environment Configuration

The `.env.local` file is already configured:

```env
VITE_API_URL=http://localhost:3000
```

✅ **No additional configuration needed!**

## Starting the Application

### Terminal 1: Start Backend Server

```bash
cd /Users/outdid/Desktop/Work/VTS/BACKEND
npm start
```

The backend will be available at: **http://localhost:3000**

### Terminal 2: Start Admin Frontend

```bash
cd /Users/outdid/Desktop/Work/VTS/FRONTEND/ADMIN
npm run dev
```

The admin will be available at: **http://localhost:5173**

## What's Integrated

### Dashboard Metrics
- ✅ Operators count from backend
- ✅ Vehicles count from backend
- ✅ Real-time loading states

### Recent Vehicles Table
- ✅ Fetches latest vehicles from API
- ✅ Shows vehicle details (number, type, model, status)
- ✅ Displays vehicle status badges

### Drivers Table
- ✅ Displays all drivers from backend
- ✅ Shows driver info (name, license, phone, status)
- ✅ Real-time status indicators

### Authentication (SignIn)
- ✅ Email/password authentication
- ✅ Token-based authentication with localStorage
- ✅ Error handling and validation
- ✅ Remember me functionality

## API Usage

All API calls are centralized in `src/services/api.ts`. To use an API endpoint:

```typescript
import { vehiclesAPI, driversAPI, operatorsAPI } from '@/services/api';

// Get all vehicles
const response = await vehiclesAPI.getAll();

// Get all drivers
const response = await driversAPI.getAll();

// Get all operators
const response = await operatorsAPI.getAll();
```

## Authentication

### Login Flow

1. User enters email and password on SignIn page
2. Credentials sent to backend `/auth/login`
3. Backend returns JWT token
4. Token stored in localStorage
5. Token automatically included in all subsequent API calls

### Store Auth Token

```typescript
localStorage.setItem('authToken', token);
```

### Clear Auth Token (on logout)

```typescript
localStorage.removeItem('authToken');
```

## Common Issues

### Issue: "Cannot connect to backend"

**Solution:**
1. Ensure backend is running: `npm start` in BACKEND folder
2. Check if port 3000 is in use: `lsof -i :3000`
3. Verify `.env.local` has correct API URL

### Issue: "401 Unauthorized" errors

**Solution:**
1. Check if you're logged in
2. Verify token is in localStorage: `localStorage.getItem('authToken')`
3. Token might be expired - login again

### Issue: "No data showing in tables"

**Solution:**
1. Check browser console for errors
2. Ensure backend has data created
3. Verify API response in Network tab
4. Check if user has proper authorization

## Production Build

```bash
npm run build
```

Output files will be in the `dist/` directory.

To preview production build:

```bash
npm run preview
```

## Project Structure

```
FRONTEND/ADMIN/
├── src/
│   ├── components/          # React components
│   │   ├── auth/           # Authentication components
│   │   ├── ecommerce/      # Dashboard components (integrated with API)
│   │   ├── tables/         # Table components (integrated with API)
│   │   └── ...
│   ├── pages/              # Page components
│   ├── services/           # API service (NEW)
│   │   └── api.ts          # Centralized API calls
│   ├── context/            # React context
│   ├── hooks/              # Custom hooks
│   ├── layout/             # Layout components
│   └── main.tsx
├── .env.local              # Environment variables (NEW)
├── API_INTEGRATION.md      # Detailed API documentation
└── package.json
```

## Features Implemented

### ✅ Backend Integration
- Centralized API service
- Bearer token authentication
- Error handling
- Loading states

### ✅ Components Updated
- EcommerceMetrics (real operators & vehicles count)
- RecentOrders (real vehicles data)
- BasicTableOne (real drivers data)
- SignInForm (API authentication)

### ✅ Design
- Original template design preserved
- Responsive layout maintained
- Dark/light mode support

## Next Steps

1. **Add More Integrations**
   - Update forms to submit to API
   - Add create/edit/delete functionality
   - Implement search and filtering

2. **Improve Authentication**
   - Add refresh token logic
   - Implement role-based access control
   - Add logout functionality

3. **Add Real-time Updates**
   - Implement WebSocket for live updates
   - Add notification system
   - Real-time location tracking

4. **Performance Optimization**
   - Add data caching
   - Implement pagination
   - Code splitting for better load times

## Support

For issues or questions:
1. Check console for error messages
2. Review API response in Network tab
3. Verify backend is running
4. Check API_INTEGRATION.md for detailed documentation

## Documentation

- **API_INTEGRATION.md** - Detailed API endpoints and usage
- **README.md** - General project information
- **package.json** - Project dependencies

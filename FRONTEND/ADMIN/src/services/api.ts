const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
  status?: number;
}

const getAuthToken = () => {
 return localStorage.getItem("token");
};

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const api = {
  get: async <T = any>(endpoint: string): Promise<ApiResponse<T>> => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "GET",
        headers: getHeaders(),
      });
      const data = await response.json();
      return { ...data, status: response.status }; // ✅ include status
    } catch (error) {
      console.error("API GET Error:", error);
      return { success: false, message: "Network error", status: 500 };
    }
  },

  post: async <T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });
      const json = await response.json();
      return { ...json, status: response.status }; // ✅ include status
    } catch (error) {
      console.error("API POST Error:", error);
      return { success: false, message: "Network error", status: 500 };
    }
  },

  put: async <T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "PUT",
        headers: getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });
      const json = await response.json();
      return { ...json, status: response.status }; // ✅ include status
    } catch (error) {
      console.error("API PUT Error:", error);
      return { success: false, message: "Network error", status: 500 };
    }
  },

  delete: async <T = any>(endpoint: string): Promise<ApiResponse<T>> => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      const json = await response.json();
      return { ...json, status: response.status }; // ✅ include status
    } catch (error) {
      console.error("API DELETE Error:", error);
      return { success: false, message: "Network error", status: 500 };
    }
  },
};


export const authAPI = {
  signin: (data: { email?: string; phone_number?: string; password: string; role?: string }) =>
    api.post('/auth/login', data),
  signup: (data: any) =>
    api.post('/auth/register', data),
  validateToken: () =>
    api.get('/auth/validate'),
  logout: () =>
    api.post('/auth/logout', {}),
};

export const operatorsAPI = {
  // ✅ Get all operators
  getAll: () => api.get('/superadmin/operators/list'),

  // ✅ Create operator
  create: (data: any) => api.post('/superadmin/operators/create', data),

  // ✅ View operator details
  getById: (operatorId: string) =>
    api.get(`/superadmin/operators/${operatorId}/view`),

  // ✅ Update operator details
  update: (operatorId: string, data: any) =>
    api.post(`/superadmin/operators/${operatorId}/update`, data),

  // ✅ Toggle active/inactive
  toggleStatus: (operatorId: string) =>
    api.put(`/superadmin/operators/${operatorId}/deactivate`),
};


export const usersAPI = {
  getAll: () => api.get('/superadmin/operators'),
  create: (data: any) => api.post('/superadmin/operators/create', data), 
  update: (userId: string, data: any) =>
    api.put(`/superadmin/operators/${userId}`, data),
  delete: (userId: string) =>
    api.delete(`/superadmin/operators/${userId}`),
};

export const vehiclesAPI = {
  getAll: () => api.get('/vehicles'),
  getById: (vehicleId: string) => api.get(`/vehicles/${vehicleId}`),
  create: (data: any) => api.post('/vehicles', data),
  update: (vehicleId: string, data: any) =>
    api.put(`/vehicles/${vehicleId}`, data),
  delete: (vehicleId: string) =>
    api.delete(`/vehicles/${vehicleId}`),
  getStatus: (vehicleId: string) =>
    api.get(`/vehicles/${vehicleId}/status`),
};

export const driversAPI = {
  getAll: () => api.get('/driver'),
  getById: (driverId: string) => api.get(`/driver/${driverId}`),
  getProfile: (driverId: string) => api.get(`/driver/profile/${driverId}`),
  create: (data: any) => api.post('/driver', data),
  update: (driverId: string, data: any) =>
    api.put(`/driver/${driverId}`, data),
  updateProfile: (driverId: string, data: any) =>
    api.put(`/driver/profile/${driverId}`, data),
  delete: (driverId: string) =>
    api.delete(`/driver/${driverId}`),
  getAssignedVehicle: (driverId: string) =>
    api.get(`/driver/vehicle/${driverId}`),
  getLiveLocation: (driverId: string) =>
    api.get(`/driver/location/${driverId}`),
  getTripHistory: (driverId: string) =>
    api.get(`/driver/trips/${driverId}`),
};

export const trackingAPI = {
  getAll: () => api.get('/tracking'),
  getLatest: (deviceId: string) =>
    api.get(`/tracking/latest/${deviceId}`),
  getHistory: (deviceId: string, startDate: string, endDate: string) =>
    api.get(`/tracking/history/${deviceId}?startDate=${startDate}&endDate=${endDate}`),
  getLiveTracking: (vehicleId: string) =>
    api.get(`/tracking/live/${vehicleId}`),
  getTripHistory: (vehicleId: string) =>
    api.get(`/tracking/history/${vehicleId}`),
  getTrackingStats: (vehicleId: string) =>
    api.get(`/tracking/stats/${vehicleId}`),
  getAllVehiclesLive: () =>
    api.get(`/tracking/all/live`),
};

export const alertsAPI = {
  getAll: () => api.get('/alerts'),
  getById: (alertId: string) => api.get(`/alerts/${alertId}`),
  create: (data: any) => api.post('/alerts', data),
  update: (alertId: string, data: any) =>
    api.put(`/alerts/${alertId}`, data),
  updateStatus: (alertId: string, data: any) =>
    api.put(`/alerts/${alertId}/is-active`, data),
  delete: (alertId: string) =>
    api.delete(`/alerts/${alertId}`),
  acknowledge: (alertId: string) =>
    api.put(`/alerts/${alertId}/acknowledge`),
  getVehicleAlerts: (vehicleId: string) =>
    api.get(`/alerts/vehicle/${vehicleId}`),
  getAlertStats: () =>
    api.get(`/alerts/stats/analytics`),
};

export const gpsAPI = {
   getAll: () => api.get('/superadmin/devices/list'),

  // Create a new device
  create: (data: any) => api.post('/superadmin/devices/create', data),

  // Get device by ID
  getById: (deviceId: string) => api.get(`/superadmin/devices/${deviceId}/view`),

  // Update device
  update: (deviceId: string, data: any) =>
    api.post(`/superadmin/devices/${deviceId}/update`, data),

  // Toggle active/inactive status
  toggleStatus: (deviceId: string) =>
    api.put(`/superadmin/devices/${deviceId}/deactivate`),
};

export const gpsDevicesAPI = {
  getAll: () => api.get('/gps/devices'),
  create: (data: any) => api.post('/gps/devices', data),
  update: (deviceId: string, data: any) =>
    api.put(`/gps/devices/${deviceId}`, data),
  delete: (deviceId: string) =>
    api.delete(`/gps/devices/${deviceId}`),
};

export const profileAPI = {
  getProfile: () => api.get('/superadmin/profile'),
  updateProfile: (data: any) =>
    api.put('/superadmin/profile', data),
  changePassword: (data: any) =>
    api.put('/auth/change-password', data),
};

export const rolesAPI = {
  getAll: () => api.get('/roles'),
  getById: (roleId: string) => api.get(`/roles/${roleId}`),
  create: (data: any) => api.post('/roles', data),
  update: (roleId: string, data: any) =>
    api.put(`/roles/${roleId}`, data),
  delete: (roleId: string) =>
    api.delete(`/roles/${roleId}`),
};

export const appUsersAPI = {
  register: (data: any) => api.post('/app/users/register', data),
  getOperatorUsers: (operatorId: string) =>
    api.get(`/app/users/operator/${operatorId}/users`),
  getProfile: (userId: string) =>
    api.get(`/app/users/${userId}`),
  update: (userId: string, data: any) =>
    api.put(`/app/users/${userId}`, data),
  deactivate: (userId: string) =>
    api.put(`/app/users/${userId}/deactivate`, {}),
  getLiveLocation: (userId: string) =>
    api.get(`/app/users/${userId}/location/live`),
  getLocationHistory: (userId: string, startDate?: string, endDate?: string) =>
    api.get(`/app/users/${userId}/location/history${startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : ''}`),
};

export const superadminAppUsersAPI = {
  getAll: (status?: string, limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    const queryString = params.toString();
    return api.get(`/superadmin/app-users${queryString ? `?${queryString}` : ''}`);
  },
  deactivate: (appUserId: string) =>
    api.put(`/superadmin/app-users/${appUserId}/deactivate`, {}),
};

export default api;

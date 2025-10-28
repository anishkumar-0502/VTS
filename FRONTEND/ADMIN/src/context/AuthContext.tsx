import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

export interface Permissions {
  manage_users: boolean;
  view_devices: boolean;
  manage_devices: boolean;
  view_telemetry: boolean;
  view_analytics: boolean;
  manage_notifications: boolean;
  view_dashboard: boolean;
  manage_roles: boolean;
  manage_alerts: boolean;
}

interface RoleData {
  id: number;
  name: string;
  description: string;
  permissions: Permissions;
}

interface User {
  id: string;
  name: string;
  email: string;
  role_id: number;
  role: string;
  phone_number?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: Permissions | null;
  roleData: RoleData | null;
  login: (credentials: { email?: string; phone_number?: string; password: string; role?: string }) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [roleData, setRoleData] = useState<RoleData | null>(null);

  const clearAuthState = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('permissions');
    localStorage.removeItem('roleData');
    setToken(null);
    setUser(null);
    setPermissions(null);
    setRoleData(null);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedToken = localStorage.getItem('authToken');
      if (storedToken) {
        setToken(storedToken);
        const storedPermissions = localStorage.getItem('permissions');
        if (storedPermissions) {
          try {
            setPermissions(JSON.parse(storedPermissions));
          } catch {
            localStorage.removeItem('permissions');
            setPermissions(null);
          }
        }
        const storedRoleData = localStorage.getItem('roleData');
        if (storedRoleData) {
          try {
            setRoleData(JSON.parse(storedRoleData));
          } catch {
            localStorage.removeItem('roleData');
            setRoleData(null);
          }
        }
        const response = await authAPI.validateToken();
        if (response.success && response.data?.user) {
          setUser(response.data.user);
          if ('permissions' in (response.data || {})) {
            if (response.data.permissions) {
              setPermissions(response.data.permissions);
              localStorage.setItem('permissions', JSON.stringify(response.data.permissions));
            } else {
              localStorage.removeItem('permissions');
              setPermissions(null);
            }
          }
          if ('role' in (response.data || {})) {
            if (response.data.role) {
              setRoleData(response.data.role);
              localStorage.setItem('roleData', JSON.stringify(response.data.role));
            } else {
              localStorage.removeItem('roleData');
              setRoleData(null);
            }
          }
        } else {
          clearAuthState();
        }
      } else {
        clearAuthState();
      }
    } catch {
      clearAuthState();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async ({ email, phone_number, password, role }: { email?: string; phone_number?: string; password: string; role?: string }) => {
    const response = await authAPI.signin({ email, phone_number, password, role });
    if (response.success && response.data?.token) {
      localStorage.setItem('authToken', response.data.token);
      setToken(response.data.token);
      if (response.data?.user) {
        setUser(response.data.user);
      }
      if ('permissions' in (response.data || {})) {
        if (response.data.permissions) {
          setPermissions(response.data.permissions);
          localStorage.setItem('permissions', JSON.stringify(response.data.permissions));
        } else {
          localStorage.removeItem('permissions');
          setPermissions(null);
        }
      }
      if ('role' in (response.data || {})) {
        if (response.data.role) {
          setRoleData(response.data.role);
          localStorage.setItem('roleData', JSON.stringify(response.data.role));
        } else {
          localStorage.removeItem('roleData');
          setRoleData(null);
        }
      }
    } else {
      throw new Error(response.message || 'Login failed');
    }
  };

  const signup = async (data: { firstName: string; lastName: string; email: string; password: string }) => {
    const response = await authAPI.signup(data);
    if (response.success && response.data?.token) {
      localStorage.setItem('authToken', response.data.token);
      setToken(response.data.token);
      if (response.data?.user) {
        setUser(response.data.user);
      }
      if ('permissions' in (response.data || {})) {
        if (response.data.permissions) {
          setPermissions(response.data.permissions);
          localStorage.setItem('permissions', JSON.stringify(response.data.permissions));
        } else {
          localStorage.removeItem('permissions');
          setPermissions(null);
        }
      }
      if ('role' in (response.data || {})) {
        if (response.data.role) {
          setRoleData(response.data.role);
          localStorage.setItem('roleData', JSON.stringify(response.data.role));
        } else {
          localStorage.removeItem('roleData');
          setRoleData(null);
        }
      }
    } else {
      throw new Error(response.message || 'Signup failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('rememberMe');
    clearAuthState();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        permissions,
        roleData,
        login,
        signup,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

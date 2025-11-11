import React, { createContext, useContext, useState, useEffect } from "react";

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
  // manage_trips?: boolean; 
}

interface LoginPayload {
  email: string;
  password: string;
  role: "operator" | "superadmin";
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { id: string; name?: string; email: string; role: string } | null;
  permissions: Permissions;
  login: (payload: LoginPayload) => Promise<string>;
  logout: () => void;
}

const defaultPermissions: Permissions = {
  manage_users: true,
  view_devices: true,
  manage_devices: true,
  view_telemetry: true,
  view_analytics: true,
  manage_notifications: true,
  view_dashboard: true,
  manage_roles: true,
  manage_alerts: true,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; name?: string; email: string; role: string } | null>(null);
  const [permissions, setPermissions] = useState<Permissions>(defaultPermissions);

  const API_BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  // 🔐 LOGIN FUNCTION
  const login = async ({ email, password, role }: LoginPayload) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          role, // operator or superadmin
          role_id: role === "superadmin" ? 1 : 2,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.message || "Login failed");
      }

      const token = data.data.token;
      if (!token) throw new Error("No token returned from server");

      // ✅ Store token
      localStorage.setItem("token", token);

      // ✅ Fetch profile based on role
      const profileUrl =
        role === "superadmin"
          ? `${API_BASE_URL}/superadmin/profile`
          : `${API_BASE_URL}/operator/profile`;

      const profileResponse = await fetch(profileUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const profileData = await profileResponse.json();

      if (!profileResponse.ok || profileData.error) {
        throw new Error(profileData.message || "Failed to fetch profile");
      }

      // ✅ Construct user data
      const userData = {
        id: profileData.data.id || profileData.data._id,
        name: profileData.data.name || profileData.data.full_name,
        email: profileData.data.email,
        role: role,
      };

      // ✅ Save user
      localStorage.setItem("user", JSON.stringify(userData));

      setUser(userData);
      setIsAuthenticated(true);
      setPermissions(defaultPermissions);

      // Return role for redirection
      return userData.role;
    } catch (error: any) {
      console.error("Login error:", error);
      throw new Error(error.message || "Unable to connect to server");
    }
  };

  // 🚪 LOGOUT FUNCTION
  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        permissions,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

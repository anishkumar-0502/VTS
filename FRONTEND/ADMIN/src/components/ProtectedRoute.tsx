import { Navigate } from "react-router-dom";
import { useAuth, type Permissions } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: "operator" | "superadmin";
  permission?: keyof Permissions;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  role,
  permission,
  redirectTo = "/",
}) => {
  const { isAuthenticated, isLoading, permissions, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/operatorlogin" replace />;
  }

  if (role && user?.role !== role) {
    // redirect to their own dashboard
    return (
      <Navigate
        to={user?.role === "superadmin" ? "/superadmin/dashboard" : "/operator/dashboard"}
        replace
      />
    );
  }

  if (permission && !permissions?.[permission]) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

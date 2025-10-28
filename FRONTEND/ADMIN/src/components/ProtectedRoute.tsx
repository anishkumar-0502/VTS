import { Navigate } from 'react-router';
import { useAuth, type Permissions } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: keyof Permissions;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, permission, redirectTo = '/' }) => {
  const { isAuthenticated, isLoading, permissions } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (permission && !permissions?.[permission]) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

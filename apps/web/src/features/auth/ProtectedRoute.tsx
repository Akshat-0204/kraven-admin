import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '../../components/ui';
import { useAuth } from './AuthProvider';

export function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <LoadingState label="Loading Kraven..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

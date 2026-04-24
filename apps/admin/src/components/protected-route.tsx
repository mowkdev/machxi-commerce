import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminMe } from '@/features/auth/hooks';

export function ProtectedRoute() {
  const location = useLocation();
  const { data, isPending, isError } = useAdminMe();

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (isError || !data) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

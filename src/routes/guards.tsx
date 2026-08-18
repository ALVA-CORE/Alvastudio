import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth/context";
import { homePathForRole } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/validations/auth";

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={homePathForRole(user?.role)} replace />;
  }

  return <Outlet />;
}

export function RoleRoute({ roles }: { roles: UserRole[] }) {
  const { user } = useAuth();

  // Bounce to the caller's own home rather than always to the contributor
  // dashboard, so an annotator hitting an intern route lands somewhere useful.
  if (!user || !roles.includes(user.role)) {
    return <Navigate to={homePathForRole(user?.role)} replace />;
  }

  return <Outlet />;
}

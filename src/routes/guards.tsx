import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth/context";
import { homePathForRole } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/validations/auth";

/**
 * Held while the session is being verified.
 *
 * Deliberately a bare tinted page rather than a spinner: the wait is a single
 * request and usually imperceptible, so a spinner would flash in and out and
 * read as jank. This just avoids painting the wrong screen.
 */
function SessionGate() {
  return <div className="min-h-screen bg-alva-bg" aria-busy="true" />;
}

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  /* A stored token is verified against /auth/me on boot. Redirecting while that
   * is in flight would bounce a signed-in user to /login on every hard refresh,
   * then bounce them back — a visible flash and a lost deep link. */
  if (isLoading) return <SessionGate />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Same reason: do not flash the login form at someone who is already signed in.
  if (isLoading) return <SessionGate />;

  if (isAuthenticated) {
    return <Navigate to={homePathForRole(user?.role)} replace />;
  }

  return <Outlet />;
}

export function RoleRoute({ roles }: { roles: UserRole[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <SessionGate />;

  // Bounce to the caller's own home rather than always to the contributor
  // dashboard, so an annotator hitting an intern route lands somewhere useful.
  if (!user || !roles.includes(user.role)) {
    return <Navigate to={homePathForRole(user?.role)} replace />;
  }

  return <Outlet />;
}

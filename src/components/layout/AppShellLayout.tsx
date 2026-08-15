import { Outlet, useLocation } from "react-router-dom";
import { AppShell, type AppSurface } from "./AppShell";
import { useAuth } from "@/lib/auth/context";
import { isStaffRole } from "@/lib/auth/roles";

export function AppShellLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  // Path wins over role: admins can reach both staff surfaces, so the route
  // decides which shell renders. Role only picks the default.
  const surface: AppSurface = pathname.startsWith("/annotator")
    ? "annotator"
    : isStaffRole(user?.role)
      ? "intern"
      : "contributor";

  return (
    <AppShell surface={surface}>
      <Outlet />
    </AppShell>
  );
}

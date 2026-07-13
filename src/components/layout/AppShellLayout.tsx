import { Outlet } from "react-router-dom";
import { AppShell } from "./AppShell";
import { useAuth } from "@/lib/auth/context";

import { isStaffRole } from "@/lib/auth/roles";

export function AppShellLayout() {
  const { user } = useAuth();
  const isStaff = isStaffRole(user?.role);

  return (
    <AppShell isStaff={isStaff}>
      <Outlet />
    </AppShell>
  );
}

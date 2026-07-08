import { Outlet } from "react-router-dom";
import { AppShell } from "./AppShell";
import { useAuth } from "@/lib/auth/context";

export function AppShellLayout() {
  const { user } = useAuth();
  const isIntern = user?.role === "intern" || user?.role === "admin";

  return (
    <AppShell isIntern={isIntern}>
      <Outlet />
    </AppShell>
  );
}

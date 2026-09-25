import type { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminMobileGate } from "./AdminMobileGate";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Admin surface wrapper.
 *
 * The mobile block lives here rather than in each page: admin is desktop-only
 * end to end, and one gate at the shell means a new admin page cannot ship
 * without it. The annotator surface gates per page because its workspace route
 * sits outside the shell; admin has no such route.
 */
export function AdminShell({ children }: { children?: ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      {!isMobile && <AdminSidebar />}
      <main className="min-h-screen">{isMobile ? <AdminMobileGate /> : children}</main>
    </div>
  );
}

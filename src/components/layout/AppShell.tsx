import type { ReactNode } from "react";
import { DesktopSidebar } from "./DesktopSidebar";
import { FloatingBottomNav } from "./FloatingBottomNav";

type AppShellProps = {
  isStaff?: boolean;
  children?: ReactNode;
};

export function AppShell({ isStaff = false, children }: AppShellProps) {
  if (isStaff) {
    return (
      <div className="min-h-screen bg-background">
        <DesktopSidebar />
        <main className="min-h-screen pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
        <FloatingBottomNav isStaff />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <FloatingBottomNav />
    </div>
  );
}

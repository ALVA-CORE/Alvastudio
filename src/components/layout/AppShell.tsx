import type { ReactNode } from "react";
import { DesktopSidebar } from "./DesktopSidebar";
import { FloatingBottomNav } from "./FloatingBottomNav";
import { AnnotatorSidebar } from "@/components/annotators/layout/AnnotatorSidebar";

export type AppSurface = "contributor" | "intern" | "annotator";

type AppShellProps = {
  surface?: AppSurface;
  children?: ReactNode;
};

export function AppShell({ surface = "contributor", children }: AppShellProps) {
  if (surface === "annotator") {
    // Desktop-only surface — no bottom nav. Pages gate small screens
    // themselves via <AnnotatorMobileGate />.
    return (
      <div className="min-h-screen bg-background">
        <AnnotatorSidebar />
        <main className="min-h-screen">{children}</main>
      </div>
    );
  }

  if (surface === "intern") {
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

import type { ReactNode } from "react";
import { DesktopSidebar } from "./DesktopSidebar";
import { FloatingBottomNav } from "./FloatingBottomNav";
import { ContributorNudges } from "@/components/contributors/ContributorNudges";
import { AnnotatorSidebar } from "@/components/annotators/layout/AnnotatorSidebar";
import { AdminShell } from "@/components/admin/layout/AdminShell";

export type AppSurface = "contributor" | "intern" | "annotator" | "admin";

type AppShellProps = {
  surface?: AppSurface;
  children?: ReactNode;
};

export function AppShell({ surface = "contributor", children }: AppShellProps) {
  if (surface === "admin") {
    // Desktop-only, and gated inside AdminShell rather than per page.
    return <AdminShell>{children}</AdminShell>;
  }

  if (surface === "annotator") {
    // Desktop-only surface — no bottom nav. Pages gate small screens
    // themselves via <AnnotatorMobileGate />.
    return (
      <div className="min-h-screen bg-background">
        <AnnotatorSidebar />
        {/* `isolate` puts the page in its own stacking context at z-0, so
            nothing inside it can climb over the rail. Chart tooltips are
            `z-50` too and come later in the DOM, which is how the record
            blob ended up painted over. Dialogs and sheets portal to body,
            outside this, so they still cover everything. */}
        <main data-scroll-root className="isolate min-h-screen">{children}</main>
      </div>
    );
  }

  if (surface === "intern") {
    return (
      <div className="min-h-screen bg-background">
        <DesktopSidebar />
        {/* `overflow-x-clip`, not `hidden`: `hidden` on a scroll ancestor
            makes `position: sticky` stop working inside it, and clip does
            not. One page overflowing horizontally used to drag the whole
            document sideways, and the fixed bottom nav stayed anchored to
            the viewport while the content slid out from under it. */}
        <main className="min-h-screen isolate overflow-x-clip pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
        <FloatingBottomNav isStaff />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="isolate flex-1 overflow-x-clip pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <FloatingBottomNav />

      {/* Two prompts, both on a timer, both per account. They live at the
          shell so they follow somebody around the app rather than only
          firing on the one screen that happens to hold the wallet. */}
      <ContributorNudges />
    </div>
  );
}

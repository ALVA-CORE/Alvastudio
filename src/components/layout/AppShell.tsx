import type { ReactNode } from "react";
import { FloatingBottomNav } from "./FloatingBottomNav";

type AppShellProps = {
  isIntern?: boolean;
  children?: ReactNode;
};

export function AppShell({ isIntern = false, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <FloatingBottomNav isIntern={isIntern} />
    </div>
  );
}

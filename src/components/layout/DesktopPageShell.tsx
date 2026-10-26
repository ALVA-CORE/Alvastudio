import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DesktopPageShellProps = {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
};

export function DesktopPageShell({
  children,
  className,
  fullWidth = false,
}: DesktopPageShellProps) {
  return (
    <div
      className={cn(
        /* A phone has no room to give away: 24px of gutter either side takes
           12% of a 390px screen before anything is drawn. Desktop keeps the
           wider one. */
        "mx-auto w-full px-4 py-8 sm:px-6",
        fullWidth ? "max-w-[90rem]" : "max-w-6xl",
        className
      )}
    >
      {children}
    </div>
  );
}

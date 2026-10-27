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
        /* A phone has no room to give away. 24px either side is 12% of a
           390px screen before anything is drawn, and 16px still crowds a
           four-column table. Desktop keeps the wider gutter. */
        "mx-auto w-full px-3 py-5 sm:px-6 sm:py-8",
        fullWidth ? "max-w-[90rem]" : "max-w-6xl",
        className
      )}
    >
      {children}
    </div>
  );
}

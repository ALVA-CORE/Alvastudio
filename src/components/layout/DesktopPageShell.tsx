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
        "mx-auto w-full px-6 py-8",
        fullWidth ? "max-w-[90rem]" : "max-w-6xl",
        className
      )}
    >
      {children}
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FixedBlurHeaderProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function FixedBlurHeader({
  children,
  className,
  contentClassName,
}: FixedBlurHeaderProps) {
  return (
    <header className={cn("sticky top-0 z-40", className)}>
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -bottom-8 bg-background/75 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/55"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
            maskImage:
              "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
          }}
          aria-hidden
        />
        <div
          className={cn(
            "relative px-4 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]",
            contentClassName
          )}
        >
          {children}
        </div>
      </div>

      {/* Clears the fade.
          The blur sheet reaches 2rem past the header so it dissolves into the
          page rather than ending on a line. Without this, the first card
          starts inside that fade and reads as dimmed, which looks like a
          loading state that never finished. */}
      <div aria-hidden className="h-8" />
    </header>
  );
}

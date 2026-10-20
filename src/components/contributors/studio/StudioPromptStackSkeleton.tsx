import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * The prompt stack, before the bank arrives.
 *
 * Shaped like the real stack rather than a plain block: three cards offset by
 * the same 20px, the same height and the same corner radius, so the page does
 * not reflow when the first one lands. The record page is the first thing a
 * contributor sees, and a studio that jumps once it loads reads as unfinished.
 *
 * These numbers mirror `StudioPromptStack`. They are duplicated on purpose —
 * exporting them would couple a loading state to a layout that is allowed to
 * change without it.
 */
export function StudioPromptStackSkeleton({ className }: { className?: string }) {
  const depths = [2, 1, 0];

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative" style={{ paddingBottom: 2 * 20 }}>
        {depths.map((depth) => (
          <div
            key={depth}
            className="absolute inset-x-0"
            style={{
              top: depth * 20,
              transform: `scale(${1 - depth * 0.04})`,
              transformOrigin: "top center",
              zIndex: depths.length - depth,
            }}
          >
            <Skeleton
              className={cn(
                "h-[18.5rem] w-full rounded-[28px]",
                /* The card in front is the accent; the ones behind fade, the
                   same way the real stack does. */
                depth === 0 ? "bg-alva-accent/20" : "bg-alva-accent/10"
              )}
            />
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-center gap-6">
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="size-6 rounded-full" />
      </div>
    </div>
  );
}

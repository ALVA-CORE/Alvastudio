import { cn } from "@/lib/utils";

/**
 * Which slide of how many, for a swipeable row.
 *
 * Shared by the contributor and intern dashboards so the two read as the
 * same control. The active dot stretches rather than changing colour alone:
 * at 6px a colour shift is hard to find, and the width says "you are here"
 * without needing to compare three greys.
 */
export function CarouselDots({
  count,
  active,
  className,
}: {
  count: number;
  active: number;
  className?: string;
}) {
  return (
    <div className={cn("mt-3 flex items-center justify-center gap-1.5", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            index === active ? "w-5 bg-alva-accent" : "w-1.5 bg-alva-card"
          )}
        />
      ))}
    </div>
  );
}

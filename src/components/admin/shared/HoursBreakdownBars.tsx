import { round1 } from "@/data/admin/shared";
import type { CorpusSlice } from "@/data/admin/corpus";
import { cn } from "@/lib/utils";

/**
 * A proportion read as a row, not a pie.
 *
 * Four to nine slices of one total is exactly where a pie stops being readable
 * — the eye cannot rank similar wedges. A bar per row on a shared baseline can
 * be ranked at a glance, and it carries the figure without a legend.
 */
export function HoursBreakdownBars({
  slices,
  className,
  emphasiseFirst = false,
}: {
  slices: CorpusSlice[];
  className?: string;
  /** Tints the largest slice with the accent; the rest stay neutral. */
  emphasiseFirst?: boolean;
}) {
  const max = Math.max(...slices.map((slice) => slice.hours), 1);
  const total = slices.reduce((sum, slice) => sum + slice.hours, 0);

  return (
    <dl className={cn("space-y-2.5", className)}>
      {slices.map((slice, index) => {
        const share = total > 0 ? Math.round((slice.hours / total) * 100) : 0;
        return (
          <div key={slice.label}>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="truncate text-xs text-muted-foreground">{slice.label}</dt>
              <dd className="shrink-0 text-xs tabular-nums text-foreground">
                {round1(slice.hours)}h
                <span className="ml-1.5 text-muted-foreground">{share}%</span>
              </dd>
            </div>
            <div
              aria-hidden
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-alva-surface"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500 ease-out",
                  emphasiseFirst && index === 0
                    ? "bg-alva-accent"
                    : "bg-muted-foreground/40"
                )}
                style={{ width: `${(slice.hours / max) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </dl>
  );
}

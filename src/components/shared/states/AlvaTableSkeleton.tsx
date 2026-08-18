import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type AlvaTableSkeletonProps = {
  rows?: number;
  columns?: number;
  className?: string;
};

export function AlvaTableSkeleton({
  rows = 6,
  columns = 5,
  className,
}: AlvaTableSkeletonProps) {
  const gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="hidden overflow-hidden rounded-2xl border border-alva-border bg-alva-surface md:block">
        <div
          className="grid gap-3 border-b border-alva-border px-4 py-3"
          style={{ gridTemplateColumns }}
        >
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={`head-${index}`} className="h-3 w-16 rounded-full bg-alva-card" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="grid gap-3 border-b border-alva-border/60 px-4 py-3.5 last:border-0"
            style={{ gridTemplateColumns }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                className={cn(
                  "h-3 rounded-full bg-alva-card",
                  colIndex === 0 ? "w-24" : "w-16"
                )}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="space-y-2 md:hidden">
        {Array.from({ length: Math.min(rows, 4) }).map((_, index) => (
          <div
            key={`mobile-${index}`}
            className="rounded-2xl border border-alva-border bg-alva-surface px-3 py-3"
          >
            <Skeleton className="mb-2 h-4 w-32 rounded-full bg-alva-card" />
            <Skeleton className="h-3 w-24 rounded-full bg-alva-card" />
          </div>
        ))}
      </div>
    </div>
  );
}

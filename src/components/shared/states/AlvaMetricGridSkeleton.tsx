import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type AlvaMetricGridSkeletonProps = {
  count?: number;
  className?: string;
};

export function AlvaMetricGridSkeleton({
  count = 4,
  className,
}: AlvaMetricGridSkeletonProps) {
  return (
    <div className={cn("grid gap-2 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex min-h-[9.5rem] flex-col rounded-2xl border border-alva-border bg-alva-card p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-3 w-24 rounded-full bg-alva-surface" />
            <Skeleton className="size-9 shrink-0 rounded-full bg-alva-surface" />
          </div>
          <div className="mt-auto pt-6">
            <Skeleton className="h-8 w-20 rounded-lg bg-alva-surface" />
            <div className="mt-2 flex items-center gap-2">
              <Skeleton className="h-4 w-12 rounded-full bg-alva-surface" />
              <Skeleton className="h-3 w-20 rounded-full bg-alva-surface" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

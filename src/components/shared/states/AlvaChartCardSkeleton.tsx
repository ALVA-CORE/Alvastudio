import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type AlvaChartCardSkeletonProps = {
  className?: string;
  /** Silhouette hinted inside the plot area. */
  shape?: "bars" | "line" | "radar" | "pyramid";
};

const BAR_HEIGHTS = ["45%", "72%", "56%", "88%", "62%", "38%", "78%"];
const PYRAMID_WIDTHS = ["38%", "62%", "84%", "58%", "34%"];

function PlotSilhouette({ shape }: { shape: NonNullable<AlvaChartCardSkeletonProps["shape"]> }) {
  if (shape === "bars") {
    return (
      <div className="flex h-full items-end gap-2">
        {BAR_HEIGHTS.map((height, index) => (
          <Skeleton
            key={index}
            className="flex-1 rounded-t-lg bg-alva-surface"
            style={{ height }}
          />
        ))}
      </div>
    );
  }

  if (shape === "radar") {
    return (
      <div className="flex h-full items-center justify-center">
        <Skeleton className="aspect-square h-full max-h-full rounded-full bg-alva-surface" />
      </div>
    );
  }

  if (shape === "pyramid") {
    return (
      <div className="flex h-full flex-col justify-center gap-3">
        {PYRAMID_WIDTHS.map((width, index) => (
          <div key={index} className="flex items-center justify-center gap-2">
            <div className="flex flex-1 justify-end">
              <Skeleton className="h-4 rounded-l-md bg-alva-surface" style={{ width }} />
            </div>
            <Skeleton className="h-3 w-12 shrink-0 rounded-full bg-alva-surface" />
            <div className="flex flex-1 justify-start">
              <Skeleton className="h-4 rounded-r-md bg-alva-surface" style={{ width }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-end gap-3">
      <Skeleton className="h-px w-full bg-alva-surface" />
      <Skeleton className="h-24 w-full rounded-xl bg-alva-surface" />
      <Skeleton className="h-3 w-full rounded-full bg-alva-surface" />
    </div>
  );
}

export function AlvaChartCardSkeleton({
  className,
  shape = "bars",
}: AlvaChartCardSkeletonProps) {
  return (
    <div
      className={cn(
        "flex min-h-[22rem] flex-col rounded-2xl border border-alva-border bg-alva-card p-4",
        className
      )}
    >
      <div className="mb-4 space-y-2">
        <Skeleton className="h-3.5 w-32 rounded-full bg-alva-surface" />
        <Skeleton className="h-3 w-48 rounded-full bg-alva-surface" />
      </div>
      <div className="min-h-0 flex-1">
        <PlotSilhouette shape={shape} />
      </div>
    </div>
  );
}

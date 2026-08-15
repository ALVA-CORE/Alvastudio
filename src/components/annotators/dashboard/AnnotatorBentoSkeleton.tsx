import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Shape = "flow" | "dial" | "rings" | "calendar" | "pyramid" | "line";

const FLOW_NODES = ["58%", "34%", "26%"];
const CALENDAR_WEEKS = 16;
const PYRAMID_WIDTHS = ["38%", "62%", "84%", "58%", "34%"];
/** Column heights that trace a plausible activity curve rather than noise. */
const LINE_STEPS = [
  "34%", "52%", "41%", "68%", "57%", "78%", "62%", "88%",
  "71%", "94%", "66%", "82%", "58%", "74%", "49%", "63%",
];

/** Silhouette per tile so loading reads as the page arriving, not grey soup. */
function PlotSilhouette({ shape }: { shape: Shape }) {
  if (shape === "flow") {
    return (
      <div className="flex h-full items-center justify-between gap-6">
        <div className="flex h-full flex-col justify-center gap-3">
          {FLOW_NODES.map((height, index) => (
            <Skeleton
              key={index}
              className="w-2.5 rounded-full bg-alva-surface"
              style={{ height }}
            />
          ))}
        </div>
        <Skeleton className="h-[70%] flex-1 rounded-2xl bg-alva-surface" />
        <div className="flex h-full flex-col justify-center gap-3">
          <Skeleton className="h-[38%] w-2.5 rounded-full bg-alva-surface" />
          <Skeleton className="h-[22%] w-2.5 rounded-full bg-alva-surface" />
        </div>
      </div>
    );
  }

  if (shape === "dial") {
    return (
      <div className="flex h-full items-center justify-center">
        <Skeleton className="aspect-square h-full max-h-[9rem] rounded-full bg-alva-surface" />
      </div>
    );
  }

  if (shape === "rings") {
    return (
      <div className="flex h-full items-center justify-center">
        <Skeleton className="aspect-square h-full max-h-[11rem] rounded-full bg-alva-surface" />
      </div>
    );
  }

  if (shape === "line") {
    return (
      <div className="flex h-full flex-col justify-end gap-2">
        <div className="flex flex-1 items-end gap-1.5">
          {LINE_STEPS.map((height, index) => (
            <Skeleton
              key={index}
              className="flex-1 rounded-t-sm bg-alva-surface"
              style={{ height }}
            />
          ))}
        </div>
        <Skeleton className="h-2.5 w-full rounded-full bg-alva-surface" />
      </div>
    );
  }

  if (shape === "calendar") {
    return (
      <div className="flex h-full flex-col justify-center gap-2">
        <div className="flex flex-1 gap-1">
          {Array.from({ length: CALENDAR_WEEKS }).map((_, week) => (
            <div key={week} className="flex flex-1 flex-col gap-1">
              {Array.from({ length: 7 }).map((_, day) => (
                <Skeleton key={day} className="flex-1 rounded-[2px] bg-alva-surface" />
              ))}
            </div>
          ))}
        </div>
        <Skeleton className="h-2.5 w-24 self-end rounded-full bg-alva-surface" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-center gap-3">
      {PYRAMID_WIDTHS.map((width, index) => (
        <div key={index} className="flex items-center justify-center gap-2">
          <div className="flex flex-1 justify-end">
            <Skeleton className="h-4 rounded-l-md bg-alva-surface" style={{ width }} />
          </div>
          <Skeleton className="h-3 w-10 shrink-0 rounded-full bg-alva-surface" />
          <div className="flex flex-1 justify-start">
            <Skeleton className="h-4 rounded-r-md bg-alva-surface" style={{ width }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonTile({
  shape,
  className,
}: {
  shape: Shape;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-alva-border bg-alva-card p-4",
        className
      )}
    >
      <div className="mb-4 space-y-2">
        <Skeleton className="h-3.5 w-28 rounded-full bg-alva-surface" />
        <Skeleton className="h-3 w-40 rounded-full bg-alva-surface" />
      </div>
      <div className="min-h-0 flex-1">
        <PlotSilhouette shape={shape} />
      </div>
    </div>
  );
}

export function AnnotatorBentoSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-2 lg:grid-cols-6", className)}>
      {/* Mirrors AnnotatorBentoGrid exactly — a skeleton that does not match the
          real layout causes a visible jump when the data lands. The flow,
          dial and calendar shapes stay defined for the admin dashboard. */}
      <SkeletonTile shape="line" className="min-h-[17rem] lg:col-span-6" />
      <SkeletonTile shape="rings" className="min-h-[21rem] lg:col-span-3" />
      <SkeletonTile shape="pyramid" className="min-h-[21rem] lg:col-span-3" />
    </div>
  );
}

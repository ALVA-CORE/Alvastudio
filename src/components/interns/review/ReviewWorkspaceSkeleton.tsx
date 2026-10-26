import { Skeleton } from "@/components/ui/skeleton";

/**
 * The review page, in outline, while the clip loads.
 *
 * It used to show `AlvaTableSkeleton`: a stack of rows, on a page that is a
 * player above two cards. A skeleton that stands in for the wrong thing is
 * worse than none, because the page visibly rearranges itself the moment the
 * real content lands, which reads as a glitch rather than a load.
 *
 * The shapes here match what replaces them: the transport bar, the metadata
 * grid on the left and the question form on the right.
 */
export function ReviewWorkspaceSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>

      {/* The transport: play button, waveform, timings. */}
      <div className="flex items-center gap-4 rounded-2xl bg-alva-card p-4">
        <Skeleton className="size-12 shrink-0 rounded-full bg-alva-accent/15" />
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-4 w-16 shrink-0 rounded-full" />
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl bg-alva-card p-4">
          <Skeleton className="h-4 w-32 rounded-full" />

          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-1.5">
                <Skeleton className="h-3 w-16 rounded-full" />
                <Skeleton className="h-4 w-24 rounded-full" />
              </div>
            ))}
          </div>

          {/* The assigned prompt, which is the tallest thing in the card. */}
          <div className="space-y-2 rounded-xl bg-alva-surface p-3">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-4 w-3/5 rounded-full" />
          </div>
        </div>

        <div className="space-y-4 rounded-2xl bg-alva-card p-4">
          <Skeleton className="h-4 w-36 rounded-full" />

          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-2/3 rounded-full" />
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1 rounded-xl" />
                <Skeleton className="h-9 flex-1 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

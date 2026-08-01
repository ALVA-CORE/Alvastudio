import { Skeleton } from "@/components/ui/skeleton";

export function ContributorDashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="mx-4 mt-5 rounded-2xl border border-alva-border bg-alva-card p-5">
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24 rounded-full bg-alva-surface" />
            <Skeleton className="h-8 w-32 rounded-lg bg-alva-surface" />
          </div>
          <Skeleton className="h-8 w-24 shrink-0 rounded-full bg-alva-surface" />
        </div>

        <div className="mt-6 flex items-end justify-center gap-3">
          <div className="flex flex-1 flex-col items-center gap-2">
            <Skeleton className="size-9 rounded-full bg-alva-surface" />
            <Skeleton className="h-14 w-full rounded-t-xl bg-alva-surface" />
          </div>
          <div className="flex flex-1 flex-col items-center gap-2">
            <Skeleton className="size-9 rounded-full bg-alva-surface" />
            <Skeleton className="h-20 w-full rounded-t-xl bg-alva-surface" />
          </div>
          <div className="flex flex-1 flex-col items-center gap-2">
            <Skeleton className="size-9 rounded-full bg-alva-surface" />
            <Skeleton className="h-11 w-full rounded-t-xl bg-alva-surface" />
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="rounded-2xl border border-alva-border bg-alva-surface px-4 py-4">
          <Skeleton className="mb-4 h-3.5 w-28 rounded-full bg-alva-card" />
          <div className="flex h-[200px] items-end gap-2">
            {["48%", "74%", "58%", "90%", "64%", "40%", "80%"].map((height, index) => (
              <Skeleton
                key={index}
                className="flex-1 rounded-t-lg bg-alva-card"
                style={{ height }}
              />
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5">
          <Skeleton className="h-1.5 w-5 rounded-full bg-alva-surface" />
          <Skeleton className="h-1.5 w-1.5 rounded-full bg-alva-surface" />
        </div>
      </div>

      <div className="px-4">
        <div className="mb-3 space-y-2">
          <Skeleton className="h-3.5 w-28 rounded-full bg-alva-surface" />
          <Skeleton className="h-3 w-44 rounded-full bg-alva-surface" />
        </div>
        <Skeleton className="h-10 w-full rounded-md bg-alva-surface" />
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-3 w-24 rounded-full bg-alva-surface" />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-alva-border bg-alva-surface px-3 py-2.5"
            >
              <Skeleton className="h-2.5 w-16 rounded-full bg-alva-card" />
              <Skeleton className="mt-2 h-4 w-12 rounded-full bg-alva-card" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

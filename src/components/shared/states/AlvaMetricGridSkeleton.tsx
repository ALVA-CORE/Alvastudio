import { Skeleton } from "@/components/ui/skeleton";

type AlvaMetricGridSkeletonProps = {
  count?: number;
};

export function AlvaMetricGridSkeleton({ count = 4 }: AlvaMetricGridSkeletonProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="min-h-[9.5rem] rounded-2xl bg-alva-card p-4">
          <Skeleton className="mb-4 h-3 w-20 rounded-full bg-alva-surface" />
          <Skeleton className="mb-2 h-8 w-16 rounded-full bg-alva-surface" />
          <Skeleton className="h-3 w-24 rounded-full bg-alva-surface" />
        </div>
      ))}
    </div>
  );
}

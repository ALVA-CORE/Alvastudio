import { AlvaMetricGridSkeleton } from "@/components/shared/states/AlvaMetricGridSkeleton";
import { AlvaChartCardSkeleton } from "@/components/shared/states/AlvaChartCardSkeleton";
import { AlvaTableSkeleton } from "@/components/shared/states/AlvaTableSkeleton";
import { cn } from "@/lib/utils";

/**
 * Loading shape for an admin page.
 *
 * Built from the same three skeletons the intern and annotator dashboards use,
 * arranged to match whatever the page actually renders — a skeleton whose
 * blocks land somewhere other than the content is worse than a spinner,
 * because the layout visibly jumps when the data arrives.
 */
export function AdminPageSkeleton({
  metrics = true,
  charts = 0,
  chartColumns = 3,
  table = false,
  tableRows = 8,
  className,
}: {
  /** The four-up metric row. Off for pages that do not have one. */
  metrics?: boolean;
  /** Chart cards below the metric row. */
  charts?: number;
  chartColumns?: 1 | 2 | 3 | 4;
  table?: boolean;
  tableRows?: number;
  className?: string;
}) {
  return (
    <div className={cn("mt-3 space-y-2", className)} aria-busy="true">
      {metrics ? <AlvaMetricGridSkeleton /> : null}

      {charts > 0 ? (
        <div
          className={cn(
            "grid gap-2",
            chartColumns === 1 && "lg:grid-cols-1",
            chartColumns === 2 && "lg:grid-cols-2",
            chartColumns === 3 && "lg:grid-cols-3",
            chartColumns === 4 && "lg:grid-cols-4"
          )}
        >
          {Array.from({ length: charts }, (_, index) => (
            <AlvaChartCardSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {table ? <AlvaTableSkeleton rows={tableRows} columns={5} /> : null}
    </div>
  );
}

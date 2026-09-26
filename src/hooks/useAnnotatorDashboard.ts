import { useMemo } from "react";
import { annotatorDashboard, type ApiDailyActivity } from "@/lib/api/dashboard";
import { useApiResource } from "@/hooks/useApiResource";
import type { HeatmapColumn } from "@/components/charts/heatmap";

/**
 * `daily_activity` → the calendar shape the activity chart reads.
 *
 * The API sends a flat list of days; the chart wants weeks as columns and days
 * as bins, because it shares that structure with the heatmap. The series is
 * padded backwards to a Sunday boundary so week columns line up with real
 * weeks rather than with wherever the range happened to start.
 */
export function toHeatmapColumns(daily: ApiDailyActivity[]): HeatmapColumn[] {
  if (daily.length === 0) return [];

  const points = daily
    .map((entry) => ({ date: new Date(`${entry.date}T00:00:00`), count: entry.count }))
    .filter((point) => !Number.isNaN(point.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (points.length === 0) return [];

  // Pad to the Sunday on or before the first day, so column 0 is a full week.
  const lead = points[0].date.getDay();
  const padded = [
    ...Array.from({ length: lead }, (_, index) => {
      const date = new Date(points[0].date);
      date.setDate(date.getDate() - (lead - index));
      return { date, count: 0 };
    }),
    ...points,
  ];

  const columns: HeatmapColumn[] = [];
  for (let start = 0; start < padded.length; start += 7) {
    const week = padded.slice(start, start + 7);
    columns.push({
      bin: columns.length,
      bins: week.map((point, day) => ({
        bin: day,
        count: point.count,
        date: point.date,
      })),
    });
  }

  return columns;
}

/** Whole-number metric, or an em dash when there is genuinely nothing. */
function count(value: number | undefined) {
  return value == null ? "—" : value.toLocaleString();
}

export function useAnnotatorDashboard() {
  const { data, isLoading, error, reload } = useApiResource(annotatorDashboard, []);

  const activity = useMemo(
    () => (data ? toHeatmapColumns(data.daily_activity) : []),
    [data]
  );

  const metrics = useMemo(
    () => ({
      clipsAnnotated: count(data?.segments_created),
      hoursAnnotated: data ? `${data.hours_annotated.toFixed(1)}h` : "—",
      tagsApplied: count(data?.tags_applied),
      sessionsAnnotated: count(data?.sessions_annotated),
      queueAvailable: count(data?.queue_available),
      /* No trends: the endpoint returns current totals, not a
       * period-over-period comparison, so there is no honest arrow to draw. */
      periodLabel: "",
    }),
    [data]
  );

  return { data, metrics, activity, isLoading, error, reload };
}

import { useMemo } from "react";
import { curveBasis } from "@visx/curve";
import { AreaChart, Area } from "@/components/charts/area-chart";
import { Background } from "@/components/charts/background";
import { Grid } from "@/components/charts/grid";
import { XAxis } from "@/components/charts/x-axis";
import { YAxis } from "@/components/charts/y-axis";
import { ChartTooltip } from "@/components/charts/tooltip";
import type { HeatmapColumn } from "@/components/charts/heatmap";
import type { DashboardTimeRange } from "@/data/internDashboard";

type AnnotatorActivityChartProps = {
  /** Calendar-shaped activity, reused from the dataset the heatmap was built on. */
  data: HeatmapColumn[];
  range: DashboardTimeRange;
};

type ActivityPoint = { date: Date; clips: number };

/**
 * Shape of each range: how far back it actually reaches, how many days go into
 * one plotted point, and what to call the result.
 *
 * `days` matters because the shared dataset is built in WEEKS for the heatmap —
 * the "7d" entry holds eight weeks of them. Plotting it whole is what made a
 * "7d" chart span two months on the axis. The series is windowed to `days`
 * first, so the label and the axis agree.
 */
const RANGES: Record<
  DashboardTimeRange,
  { days: number; bucket: number; label: string }
> = {
  "7d": { days: 7, bucket: 1, label: "Clips annotated per day" },
  "30d": { days: 30, bucket: 1, label: "Clips annotated per day" },
  "90d": { days: 90, bucket: 7, label: "Clips annotated per week" },
  "12m": { days: 365, bucket: 30, label: "Clips annotated per month" },
};

/** Window, in points, of the mean applied before plotting. */
const SMOOTHING_WINDOW = 3;

/** Subtitle for the card, so its text always describes what is plotted. */
export function activitySubtitle(range: DashboardTimeRange): string {
  return RANGES[range].label;
}

/**
 * Centred rolling mean.
 *
 * Bucketing alone still leaves weekday/weekend texture in the shorter ranges.
 * A centred window (rather than trailing) keeps peaks where they happened
 * instead of dragging them right, which matters when the reader is comparing
 * the shape against a date.
 */
function smooth(points: ActivityPoint[], window: number): ActivityPoint[] {
  if (points.length < 3) return points;
  const half = Math.floor(window / 2);

  return points.map((point, index) => {
    const from = Math.max(0, index - half);
    const to = Math.min(points.length, index + half + 1);
    const slice = points.slice(from, to);

    return {
      date: point.date,
      clips:
        Math.round(
          (slice.reduce((sum, entry) => sum + entry.clips, 0) / slice.length) * 10
        ) / 10,
    };
  });
}

export function buildActivitySeries(
  columns: HeatmapColumn[],
  range: DashboardTimeRange
): ActivityPoint[] {
  const { days, bucket } = RANGES[range];

  // The heatmap stores weeks as columns and days as bins; flatten back to a
  // plain chronological series and drop the future days a partial week carries.
  const now = Date.now();
  const daily = columns
    .flatMap((column) => column.bins)
    .filter((bin): bin is typeof bin & { date: Date } => bin.date instanceof Date)
    .filter((bin) => bin.date.getTime() <= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(-days);

  if (bucket === 1) {
    return smooth(
      daily.map((bin) => ({ date: bin.date, clips: bin.count })),
      SMOOTHING_WINDOW
    );
  }

  // Bucket from the most recent day backwards, so the newest point is a full
  // bucket rather than whatever remainder the range happened to start on.
  const points: ActivityPoint[] = [];
  for (let end = daily.length; end > 0; end -= bucket) {
    const slice = daily.slice(Math.max(0, end - bucket), end);
    if (slice.length === 0) continue;

    points.unshift({
      date: slice[slice.length - 1].date,
      clips: slice.reduce((sum, bin) => sum + bin.count, 0),
    });
  }

  return smooth(points, SMOOTHING_WINDOW);
}

/**
 * Clips annotated over the selected range — the one chart on this dashboard
 * about the person looking at it rather than the corpus.
 *
 * A single series, drawn with `curveBasis` rather than `curveMonotoneX`. Monotone
 * interpolation passes exactly through every point, so it faithfully reproduces
 * the sawtooth that field annotation actually produces. Basis approximates
 * instead, which is the right trade here: the question this tile answers is
 * "is throughput rising", not "what did I do on the 14th" — and the tooltip
 * still carries the exact figure.
 */
export function AnnotatorActivityChart({ data, range }: AnnotatorActivityChartProps) {
  const series = useMemo(() => buildActivitySeries(data, range), [data, range]);

  return (
    <AreaChart
      data={series}
      xDataKey="date"
      className="h-full w-full"
      margin={{ top: 10, right: 12, bottom: 24, left: 34 }}
    >
      <Background pattern="dots" opacity={0.35} fadeVertical />
      <Grid horizontal vertical={false} numTicksRows={4} />
      <XAxis numTicks={5} />
      <YAxis numTicks={4} formatLargeNumbers />

      <Area
        dataKey="clips"
        curve={curveBasis}
        stroke="hsl(var(--alva-accent))"
        fill="hsl(var(--alva-accent))"
        strokeWidth={2}
        showHighlight
      />

      <ChartTooltip />
    </AreaChart>
  );
}

import { useMemo } from "react";
import { AreaChart, Area } from "@/components/charts/area-chart";
import { Grid } from "@/components/charts/grid";
import { XAxis } from "@/components/charts/x-axis";
import { ChartTooltip } from "@/components/charts/tooltip";
import type { HeatmapColumn } from "@/components/charts/heatmap";

type AnnotatorActivityChartProps = {
  /** Calendar-shaped activity, reused from the dataset the heatmap was built on. */
  data: HeatmapColumn[];
};

/** Days averaged into the smoothed series. */
const ROLLING_WINDOW = 7;

type ActivityPoint = {
  date: Date;
  /** 7-day rolling mean — the filled area. */
  trend: number;
  /** Raw daily count — the hairline over it. */
  daily: number;
};

/**
 * Daily clips annotated.
 *
 * The **filled area is the 7-day rolling mean**, not the raw daily count. Field
 * annotation collapses on Sundays and runs hot midweek, so plotting raw days
 * fills the tile with a sawtooth that says nothing about whether throughput is
 * rising. The smoothing is the signal; the raw series stays as a hairline above
 * it so the actual volume is still legible.
 *
 * A curve alone would not fix this — `<Area>` already interpolates with
 * `curveMonotoneX`. Curving a sawtooth gives you a rounded sawtooth.
 */
function toSeries(columns: HeatmapColumn[]): ActivityPoint[] {
  // The heatmap stores weeks as columns and days as bins; flatten back to a
  // plain chronological series and drop the future days a partial week carries.
  const now = Date.now();
  const daily = columns
    .flatMap((column) => column.bins)
    .filter((bin): bin is typeof bin & { date: Date } => bin.date instanceof Date)
    .filter((bin) => bin.date.getTime() <= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return daily.map((bin, index) => {
    const from = Math.max(0, index - ROLLING_WINDOW + 1);
    const window = daily.slice(from, index + 1);
    const mean = window.reduce((sum, entry) => sum + entry.count, 0) / window.length;

    return {
      date: bin.date,
      trend: Math.round(mean * 10) / 10,
      daily: bin.count,
    };
  });
}

export function AnnotatorActivityChart({ data }: AnnotatorActivityChartProps) {
  const series = useMemo(() => toSeries(data), [data]);

  return (
    <AreaChart
      data={series}
      xDataKey="date"
      className="h-full w-full"
      margin={{ top: 8, right: 12, bottom: 22, left: 8 }}
    >
      <Grid horizontal vertical={false} numTicksRows={4} />
      <XAxis numTicks={5} />

      <Area
        dataKey="trend"
        stroke="hsl(var(--alva-accent))"
        fill="hsl(var(--alva-accent))"
        strokeWidth={2}
        gradientToOpacity={0}
        showHighlight
      />

      {/* Raw days as a hairline — texture and honesty, without the sawtooth
          dominating the tile. No fill, so it cannot compete with the area. */}
      <Area
        dataKey="daily"
        stroke="hsl(0 0% 52%)"
        fill="transparent"
        fillOpacity={0}
        gradientToOpacity={0}
        strokeWidth={1}
        showMarkers={false}
      />

      <ChartTooltip />
    </AreaChart>
  );
}

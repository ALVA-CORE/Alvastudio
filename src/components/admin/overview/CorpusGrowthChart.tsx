import { useMemo } from "react";
import { curveMonotoneX } from "@visx/curve";
import { AreaChart, Area } from "@/components/charts/area-chart";
import { Background } from "@/components/charts/background";
import { Grid } from "@/components/charts/grid";
import { XAxis } from "@/components/charts/x-axis";
import { YAxis } from "@/components/charts/y-axis";
import { ChartTooltip } from "@/components/charts/tooltip";
import type { GrowthPoint } from "@/data/admin/corpus";

const WINDOWS: Record<string, number> = { "30d": 30, "90d": 90, "12m": 365 };

/**
 * Cumulative corpus hours.
 *
 * `curveMonotoneX` rather than the basis curve the annotator chart uses: this
 * series is cumulative, so it can only ever rise, and an approximating curve
 * would put visible dips into a line that never actually goes down.
 */
export function CorpusGrowthChart({
  data,
  window = "12m",
}: {
  data: GrowthPoint[];
  window?: keyof typeof WINDOWS | string;
}) {
  const series = useMemo(
    () => data.slice(-(WINDOWS[window] ?? 365)),
    [data, window]
  );

  return (
    <AreaChart
      data={series}
      xDataKey="date"
      className="h-full w-full"
      margin={{ top: 10, right: 12, bottom: 24, left: 42 }}
    >
      <Background pattern="dots" opacity={0.35} fadeVertical />
      <Grid horizontal vertical={false} numTicksRows={4} />
      <XAxis numTicks={5} />
      <YAxis numTicks={4} formatLargeNumbers />

      <Area
        dataKey="hours"
        curve={curveMonotoneX}
        stroke="hsl(var(--alva-accent))"
        fill="hsl(var(--alva-accent))"
        strokeWidth={2}
        showHighlight
      />

      <ChartTooltip />
    </AreaChart>
  );
}

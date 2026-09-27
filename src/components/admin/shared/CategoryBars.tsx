import { BarChart } from "@/components/charts/bar-chart";
import { Bar } from "@/components/charts/bar";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { BarYAxis } from "@/components/charts/bar-y-axis";
import { Background } from "@/components/charts/background";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip } from "@/components/charts/tooltip";

export type CategoryDatum = { name: string; value: number };

/**
 * Ranked categories on a shared baseline.
 *
 * Used where there are too many entries for a ring and no nesting to make a
 * funnel honest — nine states, five rejection reasons. Horizontal, because the
 * labels are words rather than dates and a vertical axis would set them at an
 * angle.
 */
export function CategoryBars({
  data,
  color = "hsl(var(--alva-accent))",
}: {
  data: CategoryDatum[];
  color?: string;
}) {
  return (
    <BarChart
      data={data}
      xDataKey="name"
      orientation="horizontal"
      className="h-full w-full"
      barGap={0.35}
      margin={{ top: 4, right: 40, bottom: 4, left: 92 }}
    >
      <Background pattern="dots" opacity={0.3} fadeVertical />
      <Grid horizontal={false} vertical numTicksColumns={4} />
      <BarXAxis showAllLabels />
      <BarYAxis />
      <Bar dataKey="value" fill={color} lineCap="round" />
      <ChartTooltip />
    </BarChart>
  );
}

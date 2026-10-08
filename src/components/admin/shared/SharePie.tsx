import { ParentSize } from "@visx/responsive";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { PieCenter } from "@/components/charts/pie-center";
import type { CorpusSlice } from "@/data/admin/corpus";
import { round1 } from "@/data/admin/shared";

/** Room left around the chart for a slice to lift into on hover. */
const HOVER_OFFSET = 8;

const PALETTE = [
  "hsl(146 87% 54%)",
  "hsl(199 89% 58%)",
  "hsl(38 92% 50%)",
  "hsl(280 70% 62%)",
];

/**
 * Two or three shares of one whole, as a donut.
 *
 * A pie is only honest when the slices sum to something meaningful and there
 * are few enough to rank by eye — two or three. It beats rings there because
 * the parts sit against each other rather than each against its own track, so
 * "slightly more than half" is immediate.
 *
 * Past three, go back to `VarietyRings` or `CategoryBars`.
 *
 * The hole is a fraction of the chart, not a pixel count. `PieChart` takes
 * `innerRadius` in absolute pixels, and a value picked to look right in a
 * full-width chart card was larger than the whole outer radius inside a
 * detail panel, which drew the donut inside out. Measuring first means the
 * same ring at every size.
 *
 * The chart is then given a square to draw in. It sizes itself off
 * `min(width, height)` but still anchors at the centre of the full box, so in
 * a wide card it drew a small circle hard against the left edge. A square
 * container makes those two the same point.
 */

export function SharePie({
  slices,
  centerLabel,
  palette = PALETTE,
  valueSuffix = "h",
  innerRatio = 0.72,
}: {
  slices: CorpusSlice[];
  centerLabel: string;
  /** Overrides the default accent-led palette. */
  palette?: readonly string[];
  /** Unit after the centre figure. Empty for plain counts. */
  valueSuffix?: string;
  /** Hole size, as a fraction of the outer radius. */
  innerRatio?: number;
}) {
  const data = slices.map((slice, index) => ({
    label: slice.label,
    value: round1(slice.hours),
    color: palette[index % palette.length],
  }));

  return (
    <ParentSize className="flex h-full w-full items-center justify-center">
      {({ width, height }) => {
        if (width <= 0 || height <= 0) return null;
        const outerRadius = Math.max(
          0,
          Math.min(width, height) / 2 - HOVER_OFFSET
        );

        const side = Math.min(width, height);

        return (
          <PieChart
            data={data}
            innerRadius={outerRadius * innerRatio}
            padAngle={0.03}
            cornerRadius={10}
            hoverOffset={HOVER_OFFSET}
            className="shrink-0"
            size={side}
          >
            {data.map((_, index) => (
              <PieSlice key={index} index={index} />
            ))}
            <PieCenter
              defaultLabel={centerLabel}
              suffix={valueSuffix}
              valueClassName="text-foreground"
              labelClassName="text-[10px] text-muted-foreground"
            />
          </PieChart>
        );
      }}
    </ParentSize>
  );
}

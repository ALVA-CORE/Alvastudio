import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { PieCenter } from "@/components/charts/pie-center";
import type { CorpusSlice } from "@/data/admin/corpus";
import { round1 } from "@/data/admin/shared";

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
 */
export function SharePie({
  slices,
  centerLabel,
  palette = PALETTE,
  valueSuffix = "h",
}: {
  slices: CorpusSlice[];
  centerLabel: string;
  /** Overrides the default accent-led palette. */
  palette?: readonly string[];
  /** Unit after the centre figure. Empty for plain counts. */
  valueSuffix?: string;
}) {
  const data = slices.map((slice, index) => ({
    label: slice.label,
    value: round1(slice.hours),
    color: palette[index % palette.length],
  }));

  return (
    <div className="flex h-full w-full items-center justify-center">
      <PieChart
        data={data}
        innerRadius={82}
        padAngle={0.03}
        cornerRadius={10}
        hoverOffset={8}
        className="h-full w-full"
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
    </div>
  );
}

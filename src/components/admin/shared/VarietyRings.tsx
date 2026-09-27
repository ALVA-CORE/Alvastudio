import { RingChart } from "@/components/charts/ring-chart";
import { Ring } from "@/components/charts/ring";
import { RingCenter } from "@/components/charts/ring-center";
import type { CorpusSlice } from "@/data/admin/corpus";

const PALETTE = [
  "hsl(146 87% 54%)",
  "hsl(199 89% 58%)",
  "hsl(38 92% 50%)",
  "hsl(280 70% 62%)",
];

/**
 * A handful of shares as concentric rings.
 *
 * Works up to about four: each ring can be followed round on its own, unlike
 * the segments of a stacked bar. Past that the inner rings get too short to
 * read and `CategoryBars` is the better mark.
 */
export function VarietyRings({
  slices,
  centerLabel,
}: {
  slices: CorpusSlice[];
  centerLabel: string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.hours, 0) || 1;

  const data = slices.map((slice, index) => ({
    label: slice.label,
    value: Math.round(slice.hours),
    maxValue: Math.round(total),
    color: PALETTE[index % PALETTE.length],
  }));

  /* Fewer rings, fatter rings, and a larger hole to hang them from — two at
     12px in a box sized for six leaves most of the card empty. As more series
     arrive the stroke thins and the inner radius pulls in, so the outermost
     ring stays roughly where it was and the chart grows inward. */
  const strokeWidth = slices.length <= 2 ? 26 : slices.length === 3 ? 20 : 14;
  const baseInnerRadius = slices.length <= 2 ? 56 : slices.length === 3 ? 46 : 36;

  return (
    <div className="flex h-full w-full items-center justify-center">
      <RingChart
        data={data}
        strokeWidth={strokeWidth}
        ringGap={7}
        baseInnerRadius={baseInnerRadius}
      >
        {slices.map((_, index) => (
          <Ring key={index} index={index} showGlow={index === 0} />
        ))}
        <RingCenter
          defaultLabel={centerLabel}
          suffix="h"
          valueClassName="text-foreground"
          labelClassName="text-[10px] text-muted-foreground"
        />
      </RingChart>
    </div>
  );
}

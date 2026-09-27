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

  /* Fewer rings, fatter rings: three at 12px leaves the innermost a thread,
     while two can carry 18px and read as a pair of tracks. */
  const strokeWidth = slices.length <= 2 ? 18 : slices.length === 3 ? 14 : 11;

  return (
    <div className="flex h-full w-full items-center justify-center">
      <RingChart
        data={data}
        strokeWidth={strokeWidth}
        ringGap={6}
        baseInnerRadius={slices.length <= 2 ? 46 : 38}
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

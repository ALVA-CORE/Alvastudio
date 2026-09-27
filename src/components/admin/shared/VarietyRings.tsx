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

  return (
    <div className="flex h-full w-full items-center justify-center">
      <RingChart data={data} strokeWidth={12} ringGap={5} baseInnerRadius={38}>
        {slices.map((_, index) => (
          <Ring key={index} index={index} showGlow={index === 0} />
        ))}
        <RingCenter
          defaultLabel={centerLabel}
          suffix="h"
          valueClassName="text-foreground"
          labelClassName="text-muted-foreground"
        />
      </RingChart>
    </div>
  );
}

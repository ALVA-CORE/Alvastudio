import { RingChart } from "@/components/charts/ring-chart";
import { Ring } from "@/components/charts/ring";
import { RingCenter } from "@/components/charts/ring-center";

export type RingSlice = { label: string; value: number; total: number; color: string };

/**
 * Concentric progress rings — one per status.
 *
 * Each ring is its own share of the whole, so unlike a stacked bar the reader
 * can follow any single one round without unpicking it from its neighbours.
 * That only works for a handful; past four or five the inner rings get too
 * short to read and a bar list is better.
 */
export function StatusRings({
  slices,
  centerLabel,
}: {
  slices: RingSlice[];
  /** Shown under the total until a ring is hovered, which swaps in its own. */
  centerLabel: string;
}) {
  const data = slices.map((slice) => ({
    label: slice.label,
    value: slice.value,
    maxValue: slice.total,
    color: slice.color,
  }));

  return (
    <div className="flex h-full w-full items-center justify-center">
      <RingChart data={data} strokeWidth={11} ringGap={5} baseInnerRadius={40}>
        <Ring index={0} showGlow />
        {slices.slice(1).map((_, index) => (
          <Ring key={index + 1} index={index + 1} />
        ))}
        <RingCenter
          defaultLabel={centerLabel}
          valueClassName="text-foreground"
          labelClassName="text-muted-foreground"
        />
      </RingChart>
    </div>
  );
}

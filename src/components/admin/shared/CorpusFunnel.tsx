import { FunnelChart } from "@/components/charts/funnel-chart";
import type { CorpusSlice } from "@/data/admin/corpus";
import { round1 } from "@/data/admin/shared";

/**
 * Review stages as a funnel.
 *
 * The right mark here because the stages are genuinely nested: everything
 * approved was once in review, and everything in review was once submitted.
 * A bar chart of the same four numbers would invite you to compare them as
 * peers, which they are not — the narrowing *is* the information.
 */
export function CorpusFunnel({ slices }: { slices: CorpusSlice[] }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <FunnelChart
        className="w-full"
        data={slices.map((slice) => ({
          label: slice.label,
          value: slice.hours,
          displayValue: `${round1(slice.hours)}h`,
        }))}
        orientation="horizontal"
        color="hsl(var(--alva-accent))"
        showLabels
        showValues
        showPercentage
        gap={5}
      />
    </div>
  );
}

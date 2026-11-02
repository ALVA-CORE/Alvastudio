import { RadialChart } from "@/components/charts/radial-chart";
import { RadialAxis } from "@/components/charts/radial-axis";
import { RadialBar } from "@/components/charts/radial-bar";
import { RadialCenter } from "@/components/charts/radial-center";
import {
  REFERRAL_SOURCE_OPTIONS,
  REFERRAL_SOURCE_SHORT_LABEL,
} from "@/data/contributors/onboarding";
import type { ReferralSlice } from "@/data/admin/referrals";

/**
 * Drawn under the empty overlay so the card keeps its frame, as the other
 * corpus cards do with theirs. Never shown as data.
 */
const EMPTY_SLICES: ReferralSlice[] = (
  ["instagram", "whatsapp", "friend_colleague", "x", "google", "tiktok"] as const
).map((source, index) => ({
  source,
  label: REFERRAL_SOURCE_SHORT_LABEL[source],
  contributors: 6 - index,
}));

/** The form's own wording, for the hover readout, where there is room for it. */
function longLabel(source: string) {
  return REFERRAL_SOURCE_OPTIONS.find((option) => option.value === source)?.label ?? source;
}

const SERIES = [
  { dataKey: "contributors", label: "Contributors", color: "hsl(var(--alva-accent))" },
];

/**
 * How contributors heard about Alva, one wedge per channel.
 *
 * One series in one hue: the channels are told apart by their labels round
 * the rim, not by colour, so there is no legend to cross-reference. The
 * centre reads the total at rest and the hovered channel's count otherwise.
 */
export function ReferralSourcesChart({ slices }: { slices: ReferralSlice[] }) {
  return (
    <RadialChart
      angleType="band"
      data={slices.length ? slices : EMPTY_SLICES}
      xDataKey="label"
      series={SERIES}
      maxValue="auto"
      maxWidth={340}
      className="mx-auto"
    >
      <RadialBar padAngle={0.02} cornerRadius={4} />
      {/* Channel names in full ink: on a dark card the muted default reads
          as a second, quieter chart rather than the labels of this one. */}
      <RadialAxis showCircle={false} labelColor="hsl(var(--foreground))" />
      <RadialCenter defaultLabel="contributors">
        {({ datum, values, totals }) => {
          const value = datum ? values.contributors : totals.contributors ?? 0;
          return (
            <>
              <span className="text-2xl font-semibold tabular-nums text-foreground">
                {value.toLocaleString()}
              </span>
              <span className="mt-0.5 max-w-[7rem] text-[11px] leading-tight text-muted-foreground">
                {datum ? longLabel(String(datum.source)) : "contributors"}
              </span>
            </>
          );
        }}
      </RadialCenter>
    </RadialChart>
  );
}

import { RadialChart } from "@/components/charts/radial-chart";
import { RadialAxis } from "@/components/charts/radial-axis";
import { RadialBar } from "@/components/charts/radial-bar";
import { RadialCenter } from "@/components/charts/radial-center";
import {
  REFERRAL_SOURCE_OPTIONS,
} from "@/data/contributors/onboarding";
import type { ReferralSlice } from "@/data/admin/referrals";

/** The form's own wording, for the hover readout, where there is room for it. */
function longLabel(source: string) {
  return REFERRAL_SOURCE_OPTIONS.find((option) => option.value === source)?.label ?? source;
}

const SERIES = [
  { dataKey: "contributors", label: "Contributors", color: "hsl(var(--alva-accent))" },
];

/** How many of the "Somewhere else" answers fit on the line under the ring. */
const OTHER_SHOWN = 4;

/**
 * How contributors heard about Alva, one wedge per channel.
 *
 * One series in one hue: the channels are told apart by their labels round
 * the rim, not by colour, so there is no legend to cross-reference. The
 * centre reads the total at rest and the hovered channel's count otherwise.
 */
export function ReferralSourcesChart({
  slices,
  otherDetails,
}: {
  slices: ReferralSlice[];
  /**
   * `referral_other_details`: the "Somewhere else" answers in their own
   * words. Listed under the ring, most common first, because a recurring one
   * ("Radio", "Church") is a channel that deserves its own option.
   */
  otherDetails?: Record<string, number>;
}) {
  const others = Object.entries(otherDetails ?? {})
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  const shown = others.slice(0, OTHER_SHOWN);

  /* Nothing to draw: a bare ring, so the card keeps its shape under the
     empty overlay. It used to draw six channels with made-up counts there,
     and through the overlay that read as real answers. */
  if (slices.length === 0) {
    return (
      <div className="flex h-full items-center justify-center" aria-hidden>
        <div className="aspect-square h-[70%] max-h-60 rounded-full border-[14px] border-alva-surface" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <RadialChart
          angleType="band"
          data={slices}
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
      </div>

      {shown.length > 0 ? (
        <p
          className="mt-2 shrink-0 truncate text-xs text-muted-foreground"
          title={others.map(([answer, count]) => `${answer} (${count})`).join(", ")}
        >
          <span className="text-foreground">Somewhere else:</span>{" "}
          {shown.map(([answer, count], index) => (
            <span key={answer}>
              {index > 0 ? " · " : ""}
              {answer} <span className="tabular-nums">{count}</span>
            </span>
          ))}
          {others.length > OTHER_SHOWN ? ` · ${others.length - OTHER_SHOWN} more` : ""}
        </p>
      ) : null}
    </div>
  );
}

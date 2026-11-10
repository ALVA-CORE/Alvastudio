import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import ArrowRightUp from "@solar-icons/react/arrows/ArrowRightUp";
import CloseCircle from "@solar-icons/react/ui/CloseCircle";
import { RadialChart } from "@/components/charts/radial-chart";
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
 * One series in one hue, with no labels round the rim: hovering a wedge
 * names it in the centre, which reads the total at rest.
 *
 * The "Somewhere else" line opens a sheet over the chart listing every one.
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
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    if (!listOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setListOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listOpen]);

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
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
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
        <div className="mt-2 flex shrink-0 items-center gap-2">
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            <span className="text-foreground">Somewhere else:</span>{" "}
            {shown.map(([answer, count], index) => (
              <span key={answer}>
                {index > 0 ? " · " : ""}
                {answer} <span className="tabular-nums">{count}</span>
              </span>
            ))}
            {others.length > OTHER_SHOWN ? ` · ${others.length - OTHER_SHOWN} more` : ""}
          </p>
          <button
            type="button"
            onClick={() => setListOpen(true)}
            aria-label="Every somewhere else answer"
            title="Every somewhere else answer"
            className="shrink-0 rounded-full text-alva-accent transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            <ArrowRightUp size={16} weight="Linear" />
          </button>
        </div>
      ) : null}

      <AnimatePresence>
        {listOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close"
              tabIndex={-1}
              className="absolute inset-0 z-10 cursor-default bg-alva-card/60"
              onClick={() => setListOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              role="dialog"
              aria-label="Somewhere else"
              className="absolute inset-x-0 bottom-0 z-20 flex max-h-[75%] flex-col rounded-t-2xl border-t border-alva-border bg-alva-surface"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
            >
              <div className="flex items-center justify-between px-4 pb-2 pt-3">
                <span className="text-sm font-medium text-foreground">Somewhere else</span>
                <button
                  type="button"
                  onClick={() => setListOpen(false)}
                  aria-label="Close"
                  className="rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
                >
                  <CloseCircle size={20} weight="Outline" />
                </button>
              </div>
              <ul className="alva-thin-scrollbar min-h-0 overflow-y-auto px-4 pb-3">
                {others.map(([answer, count]) => (
                  <li
                    key={answer}
                    className="flex items-center justify-between gap-3 border-b border-alva-border/50 py-2 text-xs last:border-0"
                  >
                    <span className="min-w-0 truncate text-foreground" title={answer}>
                      {answer}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{count}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

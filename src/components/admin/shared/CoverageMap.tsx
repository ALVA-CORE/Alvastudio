import { useMemo } from "react";
import { NigeriaMap } from "@/components/shadcnmaps/maps/nigeria";
import { nigeriaMapData } from "@/components/shadcnmaps/map-data/nigeria";
import type { CorpusSlice } from "@/data/admin/corpus";
import { round1 } from "@/data/admin/shared";
import { cn } from "@/lib/utils";

/**
 * Hours collected, by state.
 *
 * A map rather than a ranked bar chart because the question underneath this
 * one is geographic: a corpus that is all Lagos and Abuja is not a Nigerian
 * corpus, and the shape of that gap — a whole quiet north — is something a
 * sorted list will never show you. The bar chart answered "who is biggest";
 * this answers "where are we not".
 *
 * Fill is our own grey ramp rather than the accent one: a whole country lit
 * green would make the page's single accent meaningless, and the point here is
 * the *gap*, which greys carry better than a brand colour. Every state keeps a
 * border so the country reads as 37 shapes rather than one blob — without it,
 * neighbours at the same level merge into a single region.
 */
export function CoverageMap({ slices }: { slices: CorpusSlice[] }) {
  const { regions, byName } = useMemo(() => {
    const hoursByName = new Map(slices.map((slice) => [slice.label, slice.hours]));
    const max = Math.max(...slices.map((slice) => slice.hours), 1);

    const regions = nigeriaMapData.regions.map((region) => {
          const hours = hoursByName.get(region.name) ?? 0;
        // Five steps, so the ramp is read rather than interpolated.
          const level = hours <= 0 ? 0 : Math.min(4, Math.ceil((hours / max) * 4));

      return {
        id: region.id,
        className: LEVEL_FILL[level],
        tooltipContent: (
          <span className="whitespace-nowrap">
            <span className="font-medium text-foreground">{region.name}</span>
            <span className="ml-2 tabular-nums text-muted-foreground">
              {hours > 0 ? `${round1(hours)}h` : "No audio yet"}
            </span>
          </span>
        ),
      };
    });

    return { regions, byName: hoursByName };
  }, [slices]);

  const covered = nigeriaMapData.regions.filter(
    (region) => (byName.get(region.name) ?? 0) > 0
  ).length;

  return (
    <div className="flex h-full w-full flex-col">
      <NigeriaMap
        aria-label="Hours collected by state"
        regions={regions}
        showTooltips
        showLabels={false}
        className={cn(
          "min-h-0 flex-1",
          // Borders on every state, and a fill that eases rather than snaps.
          "[&_path]:stroke-alva-border [&_path]:[stroke-width:0.7]",
          "[&_path]:transition-[fill] [&_path]:duration-200"
        )}
      />
      <p className="mt-2 shrink-0 text-xs text-muted-foreground">
        {covered} of 36 states and the FCT have audio
      </p>
    </div>
  );
}

/**
 * Five steps of our own greys, from `--alva-surface` to a light neutral.
 *
 * Written out rather than computed because Tailwind cannot see a class name it
 * did not read in the source. Hover lifts one step, so pointing at a state
 * separates it from its neighbours without changing what the ramp means.
 */
const LEVEL_FILL = [
  "fill-alva-surface hover:fill-alva-card",
  "fill-alva-card hover:fill-alva-border",
  "fill-alva-border hover:fill-neutral-600",
  "fill-neutral-600 hover:fill-neutral-400",
  "fill-neutral-400 hover:fill-neutral-300",
] as const;

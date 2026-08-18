import { useEffect, useMemo, useState } from "react";
import { SunburstChart } from "@/components/charts/sunburst-chart";
import { SunburstCenter } from "@/components/charts/sunburst-center";
import { SunburstHint } from "@/components/charts/sunburst-hint";
import { SunburstLabels } from "@/components/charts/sunburst-labels";
import { SunburstSegment } from "@/components/charts/sunburst-segment";
import { buildArcs } from "@/components/charts/sunburst";
import { defaultSunburstColors } from "@/components/charts/sunburst-context";
import type { SunburstNode } from "@/components/charts/sunburst-data";
import { cn } from "@/lib/utils";

type TagBreakdownChartProps = {
  data: SunburstNode;
};

/**
 * Depth fade for the rings.
 *
 * The chart's own default floors at 0.45, which on a dark ground turns the
 * outer ring — the actual tag names, the most specific information here — into
 * something that reads as disabled rather than nested. This keeps the nesting
 * cue but stops well short of looking greyed out.
 */
function depthOpacity(depth: number): number {
  return Math.max(0.78, 1 - Math.max(0, depth - 1) * 0.11);
}

/**
 * Variety → tag category → tag, three rings deep.
 *
 * Labels are deliberately withheld at the root. Every ring is "related" to the
 * root focus, so <SunburstLabels /> would render ~20 rotated labels at once and
 * the chart becomes a wall of text before the reader has picked a question to
 * ask. The legend carries the top level instead — three items, readable at a
 * glance — and labels only appear on the segments once you drill into one.
 *
 * A flat chart cannot show that a spike in "Background noise" is concentrated
 * in one language variety, which is the whole reason this is a sunburst.
 */
export function TagBreakdownChart({ data }: TagBreakdownChartProps) {
  const { arcs, rootId, total } = useMemo(() => buildArcs(data), [data]);
  const [focusId, setFocusId] = useState(rootId);

  // Time-range changes rebuild the tree; drop back to the root rather than
  // holding a focus id that no longer exists in the new data.
  useEffect(() => setFocusId(rootId), [rootId]);

  const isDrilled = focusId !== rootId;

  /* Top ring only — the legend is a summary, not a table of contents. */
  const legend = useMemo(
    () =>
      arcs
        .filter((arc) => arc.depth === 1)
        .map((arc) => ({
          id: arc.id,
          name: arc.name,
          value: arc.value,
          color:
            arc.color ??
            defaultSunburstColors[arc.categoryIndex % defaultSunburstColors.length],
        })),
    [arcs]
  );

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2">
      <SunburstChart
        data={data}
        size={176}
        padding={2}
        focusId={focusId}
        onFocusChange={setFocusId}
      >
        {arcs.map((arc) => (
          <SunburstSegment
            index={arc.arcIndex}
            key={arc.id}
            fillOpacity={depthOpacity(arc.depth)}
          />
        ))}
        <SunburstCenter />
        {isDrilled ? <SunburstLabels fontSize={10} /> : null}
        <SunburstHint className="mt-1 min-h-4 text-center text-[10px] text-muted-foreground">
          {({ hoveredArc, focus }) => {
            if (hoveredArc) return hoveredArc.trail.join(" › ");
            // At the root the legend already explains itself; only spend a line
            // on the hint once there is a way back that is not obvious.
            return focus.depth === 0 ? "" : "Click the centre to zoom out";
          }}
        </SunburstHint>
      </SunburstChart>

      <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        {legend.map((item) => {
          const selected = focusId === item.id;
          const share = total > 0 ? Math.round((item.value / total) * 100) : 0;

          return (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={selected}
                aria-label={`${item.name}, ${share}% of tags`}
                // Re-clicking the selected variety zooms back out, so the
                // legend is a toggle rather than a one-way trip.
                onClick={() => setFocusId(selected ? rootId : item.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent",
                  selected
                    ? "bg-alva-surface text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.name}
                <span className="tabular-nums opacity-70">{share}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

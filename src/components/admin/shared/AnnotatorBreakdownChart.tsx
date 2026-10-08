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

/**
 * Keeps the outer ring readable on a dark ground.
 *
 * The chart's default fades to 0.45 by the second ring, which turns the
 * statuses — the more specific half of the answer — into something that reads
 * as disabled rather than nested.
 */
function depthOpacity(depth: number): number {
  return Math.max(0.78, 1 - Math.max(0, depth - 1) * 0.11);
}

/**
 * Annotator, then where their sessions landed.
 *
 * The inner ring is how much each person did and the outer ring is whether it
 * stood up, so a big producer whose work all sits in "Needs rework" shows up
 * as a shape rather than as a figure you have to go looking for. Click a name
 * to drill into it, click the centre to come back.
 */
export function AnnotatorBreakdownChart({
  data,
  emptyMessage,
}: {
  data: SunburstNode;
  emptyMessage: string;
}) {
  const { arcs, rootId, total } = useMemo(() => buildArcs(data), [data]);
  const [focusId, setFocusId] = useState(rootId);

  useEffect(() => setFocusId(rootId), [rootId]);

  /* Inner ring only. The legend is a summary, not a table of contents. */
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

  if (legend.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const isDrilled = focusId !== rootId;

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2">
      <SunburstChart
        data={data}
        size={168}
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
                aria-label={`${item.name}, ${share}% of sessions`}
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
                <span className="max-w-[7rem] truncate">{item.name}</span>
                <span className="tabular-nums opacity-70">{share}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

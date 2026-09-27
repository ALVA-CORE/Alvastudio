import {
  HeatmapCells,
  HeatmapChart,
  HeatmapInteractionBoundary,
  HeatmapInteractionProvider,
  HeatmapTooltip,
  HeatmapXAxis,
  type HeatmapColumn,
} from "@/components/charts/heatmap";

/**
 * A year of this user's activity, contribution-graph shaped.
 *
 * No y-axis and no legend: the weekday rows are self-evident from the shape,
 * and a Less→More key explains a convention the reader already knows. The
 * tooltip carries the exact figure, which is the only number anyone actually
 * wants off a calendar.
 *
 * Cells are pinned to 7px rather than left to fill. 53 columns at 7px with a
 * 2px gap is 477px, and the panel's default width is set from that — see
 * `PANEL_WIDTH`. Left to fill, a wider panel would grow the cells until the
 * calendar swamped everything else.
 *
 * Levels read off the `--chart-scale-*` ramp, which index.css cuts on the
 * accent's own hue.
 */
export function UserActivityHeatmap({ data }: { data: HeatmapColumn[] }) {
  return (
    <HeatmapInteractionProvider>
      <HeatmapInteractionBoundary>
        <div className="w-full">
          <HeatmapChart
            className="w-full"
            data={data}
            layout="fluid"
            binSize={8.5}
            gap={2}
            margin={{ top: 10, right: 2, bottom: 2, left: 2 }}
          >
            <HeatmapCells />
            <HeatmapXAxis className="text-[9px] text-muted-foreground" />
            <HeatmapTooltip />
          </HeatmapChart>
        </div>
      </HeatmapInteractionBoundary>
    </HeatmapInteractionProvider>
  );
}

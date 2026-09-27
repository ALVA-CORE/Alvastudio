import {
  HeatmapCells,
  HeatmapChart,
  HeatmapInteractionBoundary,
  HeatmapInteractionProvider,
  HeatmapLegend,
  HeatmapTooltip,
  HeatmapXAxis,
  HeatmapYAxis,
  type HeatmapColumn,
} from "@/components/charts/heatmap";

/**
 * A year of this user's activity, contribution-graph shaped.
 *
 * Cells are pinned to 9px rather than left to fill. 53 week columns at 9px
 * with a 2px gap is 583px, and the panel's default width is set from that
 * number — see `PANEL_WIDTH` — so a year fits without scrolling sideways.
 * Left to fill, a wider panel would grow the cells until the calendar swamped
 * everything else.
 *
 * Levels read off the `--chart-scale-*` ramp, which index.css cuts on the
 * accent's own hue.
 */
export function UserActivityHeatmap({ data }: { data: HeatmapColumn[] }) {
  return (
    <HeatmapInteractionProvider>
      <HeatmapInteractionBoundary>
        <div className="flex w-full flex-col gap-2">
          <HeatmapChart
            className="w-full"
            data={data}
            layout="fluid"
            binSize={9}
            gap={2}
            margin={{ top: 2, right: 2, bottom: 2, left: 20 }}
          >
            <HeatmapCells />
            <HeatmapXAxis className="text-[9px] text-muted-foreground" />
            <HeatmapYAxis className="text-[9px] text-muted-foreground" />
            <HeatmapTooltip />
          </HeatmapChart>
          <HeatmapLegend
            align="end"
            cellSize={9}
            fontSize={9}
            labelClassName="text-muted-foreground"
          />
        </div>
      </HeatmapInteractionBoundary>
    </HeatmapInteractionProvider>
  );
}

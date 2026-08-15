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

type AnnotationActivityChartProps = {
  data: HeatmapColumn[];
};

/**
 * Contribution-graph shaped view of clips annotated per day. Levels read off
 * the `--chart-scale-*` ramp, which index.css points at the accent, so an
 * empty day sits on surface and a heavy day is full accent.
 */
export function AnnotationActivityChart({ data }: AnnotationActivityChartProps) {
  return (
    <HeatmapInteractionProvider>
      <HeatmapInteractionBoundary>
        {/* Centred in the card and held to an explicit cell size — left to
            fill, the cells grow to ~36px and the calendar dominates the tile. */}
        <div className="flex h-full w-full flex-col items-stretch justify-center gap-2">
          <HeatmapChart
            className="w-full"
            data={data}
            layout="fluid"
            binSize={25}
            gap={3}
            margin={{ top: 4, right: 4, bottom: 4, left: 26 }}
          >
            <HeatmapCells />
            <HeatmapXAxis className="text-[10px] text-muted-foreground" />
            <HeatmapYAxis className="text-[10px] text-muted-foreground" />
            <HeatmapTooltip />
          </HeatmapChart>
          <HeatmapLegend
            align="end"
            cellSize={10}
            fontSize={10}
            labelClassName="text-muted-foreground"
          />
        </div>
      </HeatmapInteractionBoundary>
    </HeatmapInteractionProvider>
  );
}

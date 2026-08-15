import { useMemo } from "react";
import {
  SankeyChart,
  SankeyLink,
  SankeyNode,
  SankeyTooltip,
} from "@/components/charts/sankey";
import type { SankeyFlow } from "@/data/annotators/dashboard";

const ACCENT = "hsl(146 87% 54%)";
const BLUE = "hsl(199 89% 58%)";
const GREY = "hsl(0 0% 38%)";
const AMBER = "hsl(38 92% 50%)";
const RED = "hsl(0 72% 51%)";

/**
 * Colours nodes by what they mean rather than by index: intakes are neutral,
 * the pipeline stages are brand blue, and outcomes carry the status palette
 * from docs/alva-design-system.md §4 so "Rejected" reads as loss at a glance.
 */
const NODE_COLORS: Record<string, string> = {
  Lagos: GREY,
  Abuja: GREY,
  "Port Harcourt": GREY,
  Triage: BLUE,
  Annotating: BLUE,
  Accepted: ACCENT,
  Flagged: AMBER,
  Rejected: RED,
};

type ClipFlowChartProps = {
  data: SankeyFlow;
};

export function ClipFlowChart({ data }: ClipFlowChartProps) {
  // Sankey mutates the graph it is handed, so hand it a fresh copy keyed to
  // the dataset rather than the module-level object.
  const graph = useMemo(
    () => ({
      nodes: data.nodes.map((node) => ({ ...node })),
      links: data.links.map((link) => ({ ...link })),
    }),
    [data]
  );

  const getNodeColor = (node: { name?: string }, index: number) =>
    NODE_COLORS[node.name ?? ""] ?? [GREY, BLUE, ACCENT][index % 3];

  return (
    // The chart is `w-full` with a fixed aspect ratio, so in a card taller than
    // that ratio it pins to the top. Centring the wrapper puts the diagram in
    // the middle of its box; the margins are symmetric for the same reason.
    <div className="flex h-full w-full items-center justify-center">
      <SankeyChart
        data={graph}
        // Full-bleed row: at ~1070px of plot width a 16/10 ratio would stand
        // ~670px tall and swamp the page. This keeps it a banner.
        aspectRatio="3.6 / 1"
        nodeWidth={12}
        nodePadding={12}
        className="w-full"
        margin={{ top: 8, right: 82, bottom: 8, left: 82 }}
      >
        <SankeyLink strokeOpacity={0.38} fadedOpacity={0.08} getNodeColor={getNodeColor} />
        <SankeyNode lineCap={3} getNodeColor={getNodeColor} />
        <SankeyTooltip />
      </SankeyChart>
    </div>
  );
}

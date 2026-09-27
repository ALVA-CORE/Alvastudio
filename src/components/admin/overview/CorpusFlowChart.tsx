import { useMemo } from "react";
import {
  SankeyChart,
  SankeyLink,
  SankeyNode,
  SankeyTooltip,
} from "@/components/charts/sankey";
import type { SankeyFlow } from "@/data/admin/corpus";

const ACCENT = "hsl(146 87% 54%)";
const BLUE = "hsl(199 89% 58%)";
const GREY = "hsl(0 0% 38%)";
const AMBER = "hsl(38 92% 50%)";
const RED = "hsl(0 72% 51%)";

/**
 * Nodes coloured by meaning rather than index: intakes are neutral, the
 * pipeline stages are blue, and the three outcomes carry the status palette,
 * so "Rejected" reads as loss without reading the label.
 */
const NODE_COLORS: Record<string, string> = {
  "Prompt read": GREY,
  "Focus group": GREY,
  Stimuli: GREY,
  "In review": BLUE,
  Annotating: BLUE,
  Approved: ACCENT,
  Flagged: AMBER,
  Rejected: RED,
};

export function CorpusFlowChart({ data }: { data: SankeyFlow }) {
  // Sankey mutates the graph it is handed, so it gets a fresh copy keyed to
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
    <div className="flex h-full w-full items-center justify-center">
      <SankeyChart
        data={graph}
        aspectRatio="3.6 / 1"
        nodeWidth={12}
        nodePadding={12}
        className="w-full"
        margin={{ top: 8, right: 86, bottom: 8, left: 86 }}
      >
        <SankeyLink strokeOpacity={0.38} fadedOpacity={0.08} getNodeColor={getNodeColor} />
        <SankeyNode lineCap={3} getNodeColor={getNodeColor} />
        <SankeyTooltip />
      </SankeyChart>
    </div>
  );
}

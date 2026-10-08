import { useMemo } from "react";
import {
  SankeyChart,
  SankeyLink,
  SankeyNode,
  SankeyTooltip,
} from "@/components/charts/sankey";
import type { SankeyFlow } from "@/data/admin/corpus";

const ACCENT = "hsl(146 87% 54%)";
const RED = "hsl(0 72% 51%)";
const GREY = "hsl(0 0% 42%)";

/**
 * Who decided what, as a flow.
 *
 * Reviewers on the left, verdicts on the right. A reviewer's band is as thick
 * as the number of clips they decided and splits by what they decided, so
 * volume and keep rate arrive together rather than as two columns to
 * cross-reference.
 */
export function ReviewerFlowChart({
  flow,
  emptyMessage,
}: {
  flow: SankeyFlow;
  emptyMessage: string;
}) {
  // Sankey mutates the graph it is handed, so it gets a fresh copy.
  const graph = useMemo(
    () => ({
      nodes: flow.nodes.map((node) => ({ ...node })),
      links: flow.links.map((link) => ({ ...link })),
    }),
    [flow]
  );

  if (graph.links.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const getNodeColor = (node: { name?: string }) =>
    node.name === "Approved" ? ACCENT : node.name === "Rejected" ? RED : GREY;

  return (
    <div className="flex h-full w-full items-center justify-center">
      <SankeyChart
        data={graph}
        aspectRatio="4.2 / 1"
        nodeWidth={10}
        nodePadding={10}
        className="w-full"
        margin={{ top: 8, right: 76, bottom: 8, left: 92 }}
      >
        <SankeyLink strokeOpacity={0.36} fadedOpacity={0.07} getNodeColor={getNodeColor} />
        <SankeyNode lineCap={3} getNodeColor={getNodeColor} />
        <SankeyTooltip />
      </SankeyChart>
    </div>
  );
}

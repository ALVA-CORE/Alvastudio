import { AnnotatorChartCard } from "@/components/annotators/dashboard/AnnotatorChartCard";
import { AnnotatorActivityChart } from "@/components/annotators/dashboard/AnnotatorActivityChart";
import { TagBreakdownChart } from "@/components/annotators/dashboard/TagBreakdownChart";
import { DemographicHoursChart } from "@/components/interns/dashboard/DemographicHoursChart";
import type { AnnotatorDataset } from "@/data/annotators/dashboard";
import { cn } from "@/lib/utils";

type AnnotatorBentoGridProps = {
  dataset: AnnotatorDataset;
  isEmpty?: boolean;
  className?: string;
};

/**
 * Annotator bento. On `lg+` it runs on a 6-column grid:
 *
 *   ┌───────────────────────────────────┐
 *   │ Your activity               (6)   │
 *   ├─────────────────┬─────────────────┤
 *   │ Tag mix     (3) │ Reach       (3) │
 *   └─────────────────┴─────────────────┘
 *
 * Scoped deliberately to what an *annotator* can act on. Three charts that were
 * here — the clip-flow sankey and the activity heatmap —
 * are corpus- and team-level views: an annotator cannot change intake volume or
 * another reviewer's scoring, so they were pipeline dashboards wearing a
 * personal dashboard's clothes.
 *
 * ClipFlowChart and AnnotationActivityChart (the heatmap) are intentionally
 * still in the tree, unimported — they are the admin dashboard's charts, and
 * deleting them would mean rebuilding two non-trivial visx integrations.
 * The agreement gauge is gone entirely: annotators never double-review the same
 * audio, so there is no second pass to agree with.
 *
 * Below `lg` this collapses to one column in the same order: what you did → what
 * you tagged → whose voices you covered.
 */
export function AnnotatorBentoGrid({
  dataset,
  isEmpty = false,
  className,
}: AnnotatorBentoGridProps) {
  return (
    <div className={cn("grid gap-2 lg:grid-cols-6", className)}>
      <AnnotatorChartCard
        title="Your activity"
        subtitle="Clips annotated per day, with a 7-day average"
        className="min-h-[17rem] lg:col-span-6"
        emptyMessage={
          isEmpty
            ? {
                title: "No activity yet",
                description: "Your daily throughput appears once you work the queue.",
              }
            : undefined
        }
      >
        <AnnotatorActivityChart data={dataset.activity} />
      </AnnotatorChartCard>

      <AnnotatorChartCard
        title="Tag mix"
        subtitle="Variety → category → tag"
        className="min-h-[21rem] lg:col-span-3"
        emptyMessage={
          isEmpty
            ? {
                title: "No tags applied",
                description: "Tag a session to see how categories break down by variety.",
              }
            : undefined
        }
      >
        <TagBreakdownChart data={dataset.tagBreakdown} />
      </AnnotatorChartCard>

      <AnnotatorChartCard
        title="Demographic reach"
        subtitle="Annotated hours by age bracket and gender"
        className="min-h-[21rem] lg:col-span-3"
        emptyMessage={
          isEmpty
            ? {
                title: "No demographic data",
                description:
                  "Annotate a session to see which age and gender groups you cover.",
              }
            : undefined
        }
      >
        <DemographicHoursChart data={dataset.demographicHours} />
      </AnnotatorChartCard>
    </div>
  );
}

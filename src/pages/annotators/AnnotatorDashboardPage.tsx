import { useState } from "react";
import ClipboardCheck from "@solar-icons/react/notes/ClipboardCheck";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import TagHorizontal from "@solar-icons/react/money/TagHorizontal";
import { AnnotatorBentoGrid } from "@/components/annotators/dashboard/AnnotatorBentoGrid";
import { AnnotatorBentoSkeleton } from "@/components/annotators/dashboard/AnnotatorBentoSkeleton";
import { AnnotatorMobileGate } from "@/components/annotators/layout/AnnotatorMobileGate";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { DashboardTimeFilter } from "@/components/shared/DashboardTimeFilter";
import { NotificationsMenu } from "@/components/shared/NotificationsMenu";
import { MetricCard } from "@/components/shared/MetricCard";
import { AlvaMetricGridSkeleton } from "@/components/shared/states/AlvaMetricGridSkeleton";
import {
  ANNOTATOR_DASHBOARD_DATA,
  getEmptyAnnotatorDataset,
} from "@/data/annotators/dashboard";
import type { DashboardTimeRange } from "@/data/internDashboard";
import { useAnnotatorDashboard } from "@/hooks/useAnnotatorDashboard";
import { useDevUiState } from "@/hooks/use-dev-ui-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/auth/context";

export default function AnnotatorDashboardPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = useState<DashboardTimeRange>("30d");
  const { metrics, activity, tagBreakdown, isLoading, error, reload } =
    useAnnotatorDashboard(timeRange);
  const { forceEmpty, forceDemo } = useDevUiState();

  if (isMobile) {
    return <AnnotatorMobileGate />;
  }

  /* The demographic-reach chart is the last seeded one here: the endpoint
   * carries speaker counts by gender and by age bracket as two marginals, and
   * that chart needs them crossed. Everything else is live. */
  const base = forceEmpty
    ? getEmptyAnnotatorDataset(timeRange)
    : ANNOTATOR_DASHBOARD_DATA[timeRange];

  /* Demo mode leaves the seeded dataset alone, so every card and chart on the
   * screen is populated rather than showing a real account's zeroes. */
  const dataset = forceDemo
    ? base
    : {
        ...base,
        activity: forceEmpty ? base.activity : activity,
        tagBreakdown: forceEmpty ? base.tagBreakdown : tagBreakdown,
      };
  /* The three cards read live totals normally, the seeded ones in demo, and
   * zeroes when the empty state is being inspected. */
  const cards = forceDemo
    ? base.metrics
    : {
        clipsAnnotated: forceEmpty ? "0" : metrics.clipsAnnotated,
        hoursAnnotated: forceEmpty ? "0" : metrics.hoursAnnotated,
        tagsApplied: forceEmpty ? "0" : metrics.tagsApplied,
        periodLabel: metrics.periodLabel,
      };

  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  return (
    <DesktopPageShell>
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            How far, {firstName}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <DashboardTimeFilter value={timeRange} onChange={setTimeRange} />
          {/* Same bell as the intern dashboard, same endpoint behind it.
              Annotators get told when work is sent back, and until now there
              was nowhere for that to arrive. */}
          <NotificationsMenu />
        </div>
      </header>

      {error && !forceDemo ? (
        <div
          role="alert"
          className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400"
        >
          {error}
          <button
            type="button"
            onClick={reload}
            className="shrink-0 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            Retry
          </button>
        </div>
      ) : null}

      {isLoading && !forceDemo ? (
        <div className="mt-2 space-y-2">
          <AlvaMetricGridSkeleton />
          <AnnotatorBentoSkeleton />
        </div>
      ) : (
        <>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              variant="accent"
              title="Clips annotated"
              value={cards.clipsAnnotated}
              period={cards.periodLabel}
              icon={ClipboardCheck}
            />
            <MetricCard
              title="Hours annotated"
              value={cards.hoursAnnotated}
              period={cards.periodLabel}
              icon={ClockCircle}
            />
            <MetricCard
              title="Tags applied"
              value={cards.tagsApplied}
              period={cards.periodLabel}
              icon={TagHorizontal}
            />
          </div>

          <AnnotatorBentoGrid
            className="mt-2"
            dataset={dataset}
            range={timeRange}
            isEmpty={forceEmpty || (!forceDemo && activity.length === 0)}
          />
        </>
      )}
    </DesktopPageShell>
  );
}

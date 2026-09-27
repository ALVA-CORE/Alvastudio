import { useState } from "react";
import ClipboardCheck from "@solar-icons/react/notes/ClipboardCheck";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import TagHorizontal from "@solar-icons/react/money/TagHorizontal";
import { AnnotatorBentoGrid } from "@/components/annotators/dashboard/AnnotatorBentoGrid";
import { AnnotatorBentoSkeleton } from "@/components/annotators/dashboard/AnnotatorBentoSkeleton";
import { AnnotatorMobileGate } from "@/components/annotators/layout/AnnotatorMobileGate";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { DashboardTimeFilter } from "@/components/shared/DashboardTimeFilter";
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
  const { metrics, activity, isLoading, error, reload } = useAnnotatorDashboard();
  const { forceEmpty } = useDevUiState();

  if (isMobile) {
    return <AnnotatorMobileGate />;
  }

  /* Metrics and the activity series are live. The tag-mix sunburst and the
   * demographic-reach chart are not — the API exposes no per-tag or per-speaker
   * breakdown for an annotator, so those two keep their sample shapes. See
   * docs/backend-gaps.md. */
  const base = forceEmpty
    ? getEmptyAnnotatorDataset(timeRange)
    : ANNOTATOR_DASHBOARD_DATA[timeRange];

  const dataset = {
    ...base,
    activity: forceEmpty ? base.activity : activity,
  };
  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  return (
    <DesktopPageShell>
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            How far, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Focus group annotation — segments, speakers and corpus throughput.
          </p>
        </div>
        <DashboardTimeFilter value={timeRange} onChange={setTimeRange} />
      </header>

      {error ? (
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

      {isLoading ? (
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
              value={forceEmpty ? "0" : metrics.clipsAnnotated}
              trend={{ label: "", positive: false, neutral: true }}
              period={metrics.periodLabel}
              icon={ClipboardCheck}
            />
            <MetricCard
              title="Hours annotated"
              value={forceEmpty ? "0" : metrics.hoursAnnotated}
              trend={{ label: "", positive: false, neutral: true }}
              period={metrics.periodLabel}
              icon={ClockCircle}
            />
            <MetricCard
              title="Tags applied"
              value={forceEmpty ? "0" : metrics.tagsApplied}
              trend={{ label: "", positive: false, neutral: true }}
              period={metrics.periodLabel}
              icon={TagHorizontal}
            />
          </div>

          <AnnotatorBentoGrid
            className="mt-2"
            dataset={dataset}
            range={timeRange}
            isEmpty={forceEmpty || activity.length === 0}
          />
        </>
      )}
    </DesktopPageShell>
  );
}

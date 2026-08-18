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
import { useDevUiState, useSimulatedLoading } from "@/hooks/use-dev-ui-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/auth/context";

export default function AnnotatorDashboardPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = useState<DashboardTimeRange>("30d");
  const isLoading = useSimulatedLoading();
  const { forceEmpty } = useDevUiState();

  if (isMobile) {
    return <AnnotatorMobileGate />;
  }

  const dataset = forceEmpty
    ? getEmptyAnnotatorDataset(timeRange)
    : ANNOTATOR_DASHBOARD_DATA[timeRange];
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
              value={dataset.metrics.clipsAnnotated}
              trend={{
                label: dataset.metrics.clipsTrend,
                positive: dataset.metrics.clipsTrend.startsWith("+"),
                neutral: forceEmpty,
              }}
              period={dataset.metrics.periodLabel}
              icon={ClipboardCheck}
            />
            <MetricCard
              title="Hours annotated"
              value={dataset.metrics.hoursAnnotated}
              trend={{
                label: dataset.metrics.hoursTrend,
                positive: dataset.metrics.hoursTrend.startsWith("+"),
                neutral: forceEmpty,
              }}
              period={dataset.metrics.periodLabel}
              icon={ClockCircle}
            />
            <MetricCard
              title="Tags applied"
              value={dataset.metrics.tagsApplied}
              trend={{
                label: dataset.metrics.tagsTrend,
                positive: dataset.metrics.tagsTrend.startsWith("+"),
                neutral: forceEmpty,
              }}
              period={dataset.metrics.periodLabel}
              icon={TagHorizontal}
            />
          </div>

          <AnnotatorBentoGrid className="mt-2" dataset={dataset} isEmpty={forceEmpty} />
        </>
      )}
    </DesktopPageShell>
  );
}

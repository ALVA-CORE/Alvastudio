import { useState } from "react";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import GraphUp from "@solar-icons/react/business/GraphUp";
import { MetricCard } from "@/components/shared/MetricCard";
import { InternDashboardCharts } from "@/components/interns/dashboard/InternDashboardCharts";
import { DashboardTimeFilter } from "@/components/shared/DashboardTimeFilter";
import { InternNotificationsMenu } from "@/components/interns/notifications/InternNotificationsMenu";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { DevUiStateToggle } from "@/components/shared/DevUiStateToggle";
import { AlvaEmptyState } from "@/components/shared/states/AlvaEmptyState";
import { AlvaMetricGridSkeleton } from "@/components/shared/states/AlvaMetricGridSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DASHBOARD_DATA,
  type DashboardTimeRange,
} from "@/data/internDashboard";
import { useAuth } from "@/lib/auth/context";
import { useDevUiState, useSimulatedLoading } from "@/hooks/use-dev-ui-state";

export default function InternDashboard() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<DashboardTimeRange>("30d");
  const dataset = DASHBOARD_DATA[timeRange];
  const isLoading = useSimulatedLoading();
  const { forceEmpty } = useDevUiState();
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
          <InternNotificationsMenu />
          <DashboardTimeFilter value={timeRange} onChange={setTimeRange} />
        </div>
      </header>

      {isLoading ? (
        <div className="mt-2">
          <AlvaMetricGridSkeleton />
          <div className="mt-2 grid gap-2 lg:grid-cols-5">
            <Skeleton className="min-h-[22rem] rounded-2xl bg-alva-card lg:col-span-3" />
            <Skeleton className="min-h-[22rem] rounded-2xl bg-alva-card lg:col-span-2" />
          </div>
        </div>
      ) : forceEmpty ? (
        <div className="mt-4">
          <AlvaEmptyState
            icon={<GraphUp size={20} weight="Outline" />}
            title="No collection activity yet"
            description="Start a focus group session to see hours, participants, and review metrics here."
          />
        </div>
      ) : (
        <>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              variant="accent"
              title="Hours recorded"
              value={dataset.metrics.hours}
              trend={{
                label: dataset.metrics.hoursTrend,
                positive: dataset.metrics.hoursTrend.startsWith("+"),
              }}
              period={dataset.metrics.periodLabel}
              icon={ClockCircle}
            />
            <MetricCard
              title="Participants logged"
              value={dataset.metrics.participants}
              trend={{
                label: dataset.metrics.participantsTrend,
                positive: dataset.metrics.participantsTrend.startsWith("+"),
              }}
              period={dataset.metrics.periodLabel}
              icon={UsersGroupRounded}
            />
            <MetricCard
              title="Clips reviewed"
              value={dataset.metrics.clipsReviewed}
              trend={{
                label: dataset.metrics.clipsTrend,
                positive: dataset.metrics.clipsTrend.startsWith("+"),
              }}
              period={dataset.metrics.periodLabel}
              icon={CheckCircle}
            />
            <MetricCard
              title="Sessions"
              value={dataset.metrics.sessions}
              trend={{
                label: dataset.metrics.sessionsTrend,
                positive: dataset.metrics.sessionsTrend.startsWith("+"),
              }}
              period={dataset.metrics.periodLabel}
              icon={Microphone3}
            />
          </div>

          <InternDashboardCharts
            className="mt-2"
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
        </>
      )}

      <DevUiStateToggle />
    </DesktopPageShell>
  );
}

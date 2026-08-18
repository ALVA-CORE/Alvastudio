import { useState } from "react";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import { MetricCard } from "@/components/shared/MetricCard";
import { InternDashboardCharts } from "@/components/interns/dashboard/InternDashboardCharts";
import { DashboardTimeFilter } from "@/components/shared/DashboardTimeFilter";
import { InternNotificationsMenu } from "@/components/interns/notifications/InternNotificationsMenu";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { AlvaChartCardSkeleton } from "@/components/shared/states/AlvaChartCardSkeleton";
import { AlvaMetricGridSkeleton } from "@/components/shared/states/AlvaMetricGridSkeleton";
import {
  DASHBOARD_DATA,
  getEmptyDashboardDataset,
  type DashboardTimeRange,
} from "@/data/internDashboard";
import { useAuth } from "@/lib/auth/context";
import { useDevUiState, useSimulatedLoading } from "@/hooks/use-dev-ui-state";

export default function InternDashboard() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<DashboardTimeRange>("30d");
  const isLoading = useSimulatedLoading();
  const { forceEmpty } = useDevUiState();
  const dataset = forceEmpty
    ? getEmptyDashboardDataset(timeRange)
    : DASHBOARD_DATA[timeRange];
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
        <div className="mt-2 space-y-2">
          <AlvaMetricGridSkeleton />
          <div className="grid gap-2 lg:grid-cols-5">
            <AlvaChartCardSkeleton shape="bars" className="lg:col-span-3" />
            <AlvaChartCardSkeleton shape="radar" className="lg:col-span-2" />
          </div>
          <div className="grid gap-2 lg:grid-cols-5">
            <AlvaChartCardSkeleton shape="pyramid" className="lg:col-span-2" />
            <AlvaChartCardSkeleton shape="line" className="lg:col-span-3" />
          </div>
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
                neutral: forceEmpty,
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
                neutral: forceEmpty,
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
                neutral: forceEmpty,
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
                neutral: forceEmpty,
              }}
              period={dataset.metrics.periodLabel}
              icon={Microphone3}
            />
          </div>

          <InternDashboardCharts
            className="mt-2"
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            isEmpty={forceEmpty}
          />
        </>
      )}
    </DesktopPageShell>
  );
}

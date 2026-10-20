import { useState } from "react";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import { MetricCard } from "@/components/shared/MetricCard";
import { InternDashboardCharts } from "@/components/interns/dashboard/InternDashboardCharts";
import { DashboardTimeFilter } from "@/components/shared/DashboardTimeFilter";
import { NotificationsMenu } from "@/components/shared/NotificationsMenu";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { AlvaChartCardSkeleton } from "@/components/shared/states/AlvaChartCardSkeleton";
import { AlvaMetricGridSkeleton } from "@/components/shared/states/AlvaMetricGridSkeleton";
import {
  DASHBOARD_DATA,
  getEmptyDashboardDataset,
  toCaptureTrend,
  toWeeklySessions,
  type DashboardTimeRange,
} from "@/data/internDashboard";
import { useAuth } from "@/lib/auth/context";
import { NO_VALUE } from "@/lib/no-value";
import { useApiResource } from "@/hooks/useApiResource";
import { internDashboard } from "@/lib/api/dashboard";
import { useDevUiState, useSimulatedLoading } from "@/hooks/use-dev-ui-state";

/** How many days of `daily_activity` each filter shows. */
const RANGE_DAYS: Record<DashboardTimeRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "12m": 365,
};

const RANGE_LABEL: Record<DashboardTimeRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12m": "Last 12 months",
};

export default function InternDashboard() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<DashboardTimeRange>("30d");
  const isLoading = useSimulatedLoading();
  const { forceEmpty } = useDevUiState();
  const { data: live, isLoading: loadingLive } = useApiResource(internDashboard, []);

  const base = forceEmpty
    ? getEmptyDashboardDataset(timeRange)
    : DASHBOARD_DATA[timeRange];

  /**
   * Live where the endpoint reaches, seeded where it does not.
   *
   * `daily_activity` is the full window in one response, so the time filter
   * is a slice rather than a refetch, and both charts drawn from it move with
   * it. The quality radar and the age-by-gender chart stay seeded: the first
   * has no agreed definition, and the second needs the two demographic
   * marginals crossed, which a focus group's single audio file cannot give.
   */
  const dataset =
    live && !forceEmpty
      ? (() => {
          const window = live.daily_activity.slice(-RANGE_DAYS[timeRange]);
          const sessions = window.reduce((total, day) => total + day.sessions, 0);
          const participants = window.reduce(
            (total, day) => total + day.participants,
            0
          );
          const hours = window.reduce((total, day) => total + day.hours, 0);

          return {
            ...base,
            weeklySessions: toWeeklySessions(window),
            captureTrend: toCaptureTrend(window),
            metrics: {
              ...base.metrics,
              hours: `${hours.toFixed(1)}h`,
              participants: String(participants),
              sessions: String(sessions),
              periodLabel: RANGE_LABEL[timeRange],
              /* No trends: the endpoint gives one window, not this one against
               * the last, so there is no honest arrow to draw. */
              hoursTrend: NO_VALUE,
              participantsTrend: NO_VALUE,
              sessionsTrend: NO_VALUE,
            },
          };
        })()
      : base;
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
          <NotificationsMenu />
          <DashboardTimeFilter value={timeRange} onChange={setTimeRange} />
        </div>
      </header>

      {isLoading || loadingLive ? (
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

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
  getEmptyDashboardDataset,
  toCaptureTrend,
  periodTrend,
  toDemographicSpeakers,
  toQualityRadar,
  toWeeklySessions,
  type DashboardTimeRange,
} from "@/data/internDashboard";
import { useAuth } from "@/lib/auth/context";
import { NO_VALUE } from "@/lib/no-value";
import { useApiResource } from "@/hooks/useApiResource";
import { useInternReviewCount } from "@/hooks/useInternReviewCount";
import { internDashboard } from "@/lib/api/dashboard";

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

/** "New" and a rise read as good; "0%" as neither. */
const trendOf = (label: string) => ({
  label,
  positive: label.startsWith("+") || label === "New",
  neutral: label === "0%",
});

export default function InternDashboard() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<DashboardTimeRange>("30d");
  const { data: live, isLoading } = useApiResource(internDashboard, []);
  /* Reviewing is half an intern's job and the dashboard endpoint does not
     count it, so this card is the only one with its own request. */
  const clipsReviewed = useInternReviewCount(user?.id, RANGE_DAYS[timeRange]);
  /* The window before this one is the double window minus this one. */
  const clipsBothWindows = useInternReviewCount(user?.id, RANGE_DAYS[timeRange] * 2);

  /* Zeroes, never a sample. This is one person's own work, and a screen that
   * fills itself with somebody else's figures when the request fails is the
   * one thing it must never do. */
  const base = getEmptyDashboardDataset(timeRange);

  /**
   * Every chart on this screen is live now.
   *
   * `daily_activity` is the full window in one response, so the time filter is
   * a slice rather than a refetch. The radar and the pyramid are not sliced:
   * both are computed over the API's own 365-day window, so they do not move
   * with the filter, and the cards above them say which window they are over.
   */
  const dataset =
    live
      ? (() => {
          const days = RANGE_DAYS[timeRange];
          const window = live.daily_activity.slice(-days);
          const sessions = window.reduce((total, day) => total + day.sessions, 0);
          const participants = window.reduce(
            (total, day) => total + day.participants,
            0
          );
          const hours = window.reduce((total, day) => total + day.hours, 0);
          /* The API's 365 days hold the window before 7, 30 and 90 days, not 12 months. */
          const before =
            live.daily_activity.length >= days * 2 ? live.daily_activity.slice(-days * 2, -days) : null;
          const sum = (key: "sessions" | "participants" | "hours") =>
            before ? before.reduce((total, day) => total + day[key], 0) : null;

          const radar = toQualityRadar(live.quality_in_window);
          const pyramid = toDemographicSpeakers(live.demographics.by_gender_age);

          return {
            ...base,
            weeklySessions: toWeeklySessions(window),
            captureTrend: toCaptureTrend(window),
            /* Kept as the seeded shape only while there is nothing to draw, so
             * the card keeps its frame and shows its empty state. */
            qualityRadar: radar.length ? radar : [],
            demographicHours: pyramid,
            metrics: {
              ...base.metrics,
              hours: `${hours.toFixed(1)}h`,
              participants: String(participants),
              sessions: String(sessions),
              clipsReviewed: String(clipsReviewed ?? NO_VALUE),
              periodLabel: RANGE_LABEL[timeRange],
              hoursTrend: periodTrend(hours, sum("hours")),
              participantsTrend: periodTrend(participants, sum("participants")),
              sessionsTrend: periodTrend(sessions, sum("sessions")),
              clipsTrend:
                clipsReviewed == null || clipsBothWindows == null
                  ? NO_VALUE
                  : periodTrend(clipsReviewed, clipsBothWindows - clipsReviewed),
            },
          };
        })()
      : base;
  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  return (
    <DesktopPageShell>
      {/* The bell on the right, after the range, as on the annotator's. */}
      <header className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
          How far, {firstName}
        </h1>
        <div className="flex items-center gap-2">
          <DashboardTimeFilter value={timeRange} onChange={setTimeRange} />
          <NotificationsMenu />
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
          {/* Two abreast on a phone. One per row turned four cards into four
              screens of scrolling before the charts. */}
          <div className="mt-2 grid grid-cols-2 gap-2 xl:grid-cols-4">
            <MetricCard
              variant="accent"
              title="Hours recorded"
              value={dataset.metrics.hours}
              trend={trendOf(dataset.metrics.hoursTrend)}
              period={dataset.metrics.periodLabel}
              icon={ClockCircle}
            />
            <MetricCard
              title="Participants logged"
              value={dataset.metrics.participants}
              trend={trendOf(dataset.metrics.participantsTrend)}
              period={dataset.metrics.periodLabel}
              icon={UsersGroupRounded}
            />
            <MetricCard
              title="Clips reviewed"
              value={dataset.metrics.clipsReviewed}
              trend={trendOf(dataset.metrics.clipsTrend)}
              period={dataset.metrics.periodLabel}
              icon={CheckCircle}
            />
            <MetricCard
              title="Sessions"
              value={dataset.metrics.sessions}
              trend={trendOf(dataset.metrics.sessionsTrend)}
              period={dataset.metrics.periodLabel}
              icon={Microphone3}
            />
          </div>

          <InternDashboardCharts
            className="mt-2"
            dataset={dataset}
            isEmpty={!live}
          />
        </>
      )}
    </DesktopPageShell>
  );
}

import { useState } from "react";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import { MetricCard } from "@/components/shared/MetricCard";
import { InternDashboardCharts } from "@/components/interns/dashboard/InternDashboardCharts";
import { DashboardTimeFilter } from "@/components/shared/DashboardTimeFilter";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import {
  DASHBOARD_DATA,
  type DashboardTimeRange,
} from "@/data/internDashboard";
import { useAuth } from "@/lib/auth/context";

export default function InternDashboard() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<DashboardTimeRange>("30d");
  const dataset = DASHBOARD_DATA[timeRange];
  const firstName = user?.fullName?.split(" ")[0] ?? "there";
  const roleLabel = user?.role === "admin" ? "Admin" : "Intern";

  return (
    <DesktopPageShell>
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            How far, {firstName}
          </h1>
        </div>
        <DashboardTimeFilter value={timeRange} onChange={setTimeRange} />
      </header>

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
    </DesktopPageShell>
  );
}

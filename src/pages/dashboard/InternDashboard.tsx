import ClockCircle from "@solar-icons/react/time/ClockCircle";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { InternDashboardCharts } from "@/components/dashboard/InternDashboardCharts";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { useAuth } from "@/lib/auth/context";

export default function InternDashboard() {
  const { user } = useAuth();
  const firstName = user?.fullName?.split(" ")[0] ?? "there";
  const roleLabel = user?.role === "admin" ? "Admin" : "Intern";

  return (
    <DesktopPageShell>
      <header>
        <p className="text-sm text-muted-foreground">{roleLabel} dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">
          How far, {firstName}
        </h1>
      </header>

      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          variant="accent"
          title="Hours recorded"
          value="38.5h"
          trend={{ label: "+12%", positive: true }}
          period="vs last 30 days"
          icon={ClockCircle}
        />
        <MetricCard
          title="Participants logged"
          value="214"
          trend={{ label: "+8%", positive: true }}
          period="this month"
          icon={UsersGroupRounded}
        />
        <MetricCard
          title="Clips reviewed"
          value="1,042"
          trend={{ label: "+18%", positive: true }}
          period="this month"
          icon={CheckCircle}
        />
        <MetricCard
          title="Sessions"
          value="56"
          trend={{ label: "-3%", positive: false }}
          period="this week"
          icon={Microphone3}
        />
      </div>

      <InternDashboardCharts className="mt-2" />
    </DesktopPageShell>
  );
}

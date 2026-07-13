import { WeeklySessionsChart } from "@/components/dashboard/WeeklySessionsChart";
import { DashboardTimeFilter } from "@/components/dashboard/DashboardTimeFilter";
import {
  DASHBOARD_DATA,
  type DashboardTimeRange,
} from "@/data/internDashboard";
import { Area } from "@/components/dither-kit/area";
import { AreaChart } from "@/components/dither-kit/area-chart";
import { Grid } from "@/components/dither-kit/grid";
import { Legend } from "@/components/dither-kit/legend";
import { Radar } from "@/components/dither-kit/radar";
import { RadarChart } from "@/components/dither-kit/radar-chart";
import { Tooltip } from "@/components/dither-kit/tooltip";
import { XAxis } from "@/components/dither-kit/x-axis";
import { YAxis } from "@/components/dither-kit/y-axis";
import { cn } from "@/lib/utils";

const radarConfig = {
  score: { label: "Quality score", color: "green" as const },
};

const areaConfig = {
  prompts: { label: "Prompt reads", color: "green" as const },
  stimuli: { label: "Stimuli", color: "blue" as const },
};

type InternDashboardChartsProps = {
  timeRange: DashboardTimeRange;
  onTimeRangeChange: (value: DashboardTimeRange) => void;
  className?: string;
};

function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col rounded-2xl bg-alva-card p-4", className)}>
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </section>
  );
}

export function InternDashboardCharts({
  timeRange,
  onTimeRangeChange,
  className,
}: InternDashboardChartsProps) {
  const dataset = DASHBOARD_DATA[timeRange];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Chart range</p>
        <DashboardTimeFilter value={timeRange} onChange={onTimeRangeChange} />
      </div>

      <div className="grid gap-2 lg:grid-cols-5">
        <ChartCard
          title="Weekly sessions"
          subtitle="Record activity by day"
          className="min-h-[22rem] lg:col-span-3"
        >
          <WeeklySessionsChart data={dataset.weeklySessions} />
        </ChartCard>

        <ChartCard
          title="Quality mix"
          subtitle="Average scores across review dimensions"
          className="min-h-[22rem] lg:col-span-2"
        >
          <RadarChart
            data={dataset.qualityRadar}
            config={radarConfig}
            nameKey="metric"
            bloom="aura"
            className="h-full min-h-[18rem] w-full"
          >
            <Legend align="right" />
            <Radar dataKey="score" variant="gradient" />
          </RadarChart>
        </ChartCard>
      </div>

      <ChartCard
        title="Capture volume"
        subtitle="Prompt reads and stimuli stacked over time"
      >
        <AreaChart
          data={dataset.captureTrend}
          config={areaConfig}
          stackType="stacked"
          bloom="aura"
          className="h-[17rem] w-full"
        >
          <Grid />
          <XAxis dataKey="month" />
          <YAxis />
          <Legend isClickable />
          <Tooltip labelKey="month" />
          <Area dataKey="prompts" variant="gradient" isClickable />
          <Area dataKey="stimuli" variant="hatched" isClickable />
        </AreaChart>
      </ChartCard>
    </div>
  );
}

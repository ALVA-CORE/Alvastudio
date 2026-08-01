import GraphUp from "@solar-icons/react/business/GraphUp";
import { DemographicHoursChart } from "@/components/interns/dashboard/DemographicHoursChart";
import { WeeklySessionsChart } from "@/components/interns/dashboard/WeeklySessionsChart";
import { DashboardTimeFilter } from "@/components/shared/DashboardTimeFilter";
import { AlvaChartEmptyOverlay } from "@/components/shared/states/AlvaChartEmptyOverlay";
import {
  DASHBOARD_DATA,
  getEmptyDashboardDataset,
  type DashboardTimeRange,
} from "@/data/internDashboard";
import { Line } from "@/components/dither-kit/area";
import { LineChart } from "@/components/dither-kit/area-chart";
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

const focusGroupConfig = {
  hours: { label: "Hours recorded", color: "green" as const },
  participants: { label: "Participants", color: "blue" as const },
};

type InternDashboardChartsProps = {
  timeRange: DashboardTimeRange;
  onTimeRangeChange: (value: DashboardTimeRange) => void;
  className?: string;
  isEmpty?: boolean;
};

function ChartCard({
  title,
  subtitle,
  children,
  className,
  emptyMessage,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  emptyMessage?: { title: string; description?: string };
}) {
  return (
    <section className={cn("flex flex-col rounded-2xl bg-alva-card p-4", className)}>
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="relative min-h-0 flex-1">
        {children}
        {emptyMessage && (
          <AlvaChartEmptyOverlay
            icon={<GraphUp size={18} weight="Outline" />}
            title={emptyMessage.title}
            description={emptyMessage.description}
          />
        )}
      </div>
    </section>
  );
}

export function InternDashboardCharts({
  timeRange,
  onTimeRangeChange,
  className,
  isEmpty = false,
}: InternDashboardChartsProps) {
  const dataset = isEmpty
    ? getEmptyDashboardDataset(timeRange)
    : DASHBOARD_DATA[timeRange];

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
          emptyMessage={
            isEmpty
              ? {
                  title: "No sessions recorded",
                  description: "Daily session counts appear once you record a focus group.",
                }
              : undefined
          }
        >
          <WeeklySessionsChart data={dataset.weeklySessions} />
        </ChartCard>

        <ChartCard
          title="Quality mix"
          subtitle="Average scores across review dimensions"
          className="min-h-[22rem] lg:col-span-2"
          emptyMessage={
            isEmpty
              ? {
                  title: "No review scores",
                  description: "Rubric averages appear after your first completed review.",
                }
              : undefined
          }
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

      <div className="grid gap-2 lg:grid-cols-5">
        <ChartCard
          title="Demographic reach"
          subtitle="Recorded hours by age bracket and gender"
          className="min-h-[22rem] lg:col-span-2"
          emptyMessage={
            isEmpty
              ? {
                  title: "No demographic data",
                  description: "Log participants to see which age and gender groups you cover.",
                }
              : undefined
          }
        >
          <DemographicHoursChart data={dataset.demographicHours} />
        </ChartCard>

        <ChartCard
          title="Capture volume"
          subtitle="Focus group hours and participants over time"
          className="min-h-[22rem] lg:col-span-3"
          emptyMessage={
            isEmpty
              ? {
                  title: "No capture volume yet",
                  description: "Hours and participant counts plot here as sessions come in.",
                }
              : undefined
          }
        >
          <LineChart
            data={dataset.captureTrend}
            config={focusGroupConfig}
            bloom="aura"
            className="h-[17rem] w-full"
          >
            <Grid />
            <XAxis dataKey="month" />
            <YAxis />
            <Legend isClickable />
            <Tooltip labelKey="month" />
            <Line dataKey="hours" variant="gradient" isClickable />
            <Line dataKey="participants" variant="hatched" isClickable />
          </LineChart>
        </ChartCard>
      </div>
    </div>
  );
}

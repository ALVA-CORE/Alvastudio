import { Area } from "@/components/dither-kit/area";
import { AreaChart } from "@/components/dither-kit/area-chart";
import { Bar } from "@/components/dither-kit/bar";
import { BarChart } from "@/components/dither-kit/bar-chart";
import { Grid } from "@/components/dither-kit/grid";
import { Legend } from "@/components/dither-kit/legend";
import { Radar } from "@/components/dither-kit/radar";
import { RadarChart } from "@/components/dither-kit/radar-chart";
import { Tooltip } from "@/components/dither-kit/tooltip";
import { XAxis } from "@/components/dither-kit/x-axis";
import { YAxis } from "@/components/dither-kit/y-axis";
import { cn } from "@/lib/utils";

const weeklySessions = [
  { day: "Mon", sessions: 4 },
  { day: "Tue", sessions: 7 },
  { day: "Wed", sessions: 5 },
  { day: "Thu", sessions: 9 },
  { day: "Fri", sessions: 6 },
  { day: "Sat", sessions: 3 },
  { day: "Sun", sessions: 8 },
];

const qualityRadar = [
  { metric: "Clarity", score: 82 },
  { metric: "Noise", score: 74 },
  { metric: "Pacing", score: 88 },
  { metric: "Accent", score: 91 },
  { metric: "Completeness", score: 79 },
  { metric: "Metadata", score: 85 },
];

const captureTrend = [
  { month: "Jan", prompts: 120, stimuli: 66 },
  { month: "Feb", prompts: 148, stimuli: 92 },
  { month: "Mar", prompts: 132, stimuli: 88 },
  { month: "Apr", prompts: 176, stimuli: 104 },
  { month: "May", prompts: 164, stimuli: 118 },
  { month: "Jun", prompts: 198, stimuli: 126 },
  { month: "Jul", prompts: 210, stimuli: 138 },
  { month: "Aug", prompts: 224, stimuli: 152 },
];

const barConfig = {
  sessions: { label: "Sessions", color: "green" as const },
};

const radarConfig = {
  score: { label: "Quality score", color: "green" as const },
};

const areaConfig = {
  prompts: { label: "Prompt reads", color: "green" as const },
  stimuli: { label: "Stimuli", color: "blue" as const },
};

type InternDashboardChartsProps = {
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
    <section
      className={cn(
        "flex min-h-[17rem] flex-col rounded-2xl border border-alva-border bg-alva-card p-4",
        className
      )}
    >
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

export function InternDashboardCharts({ className }: InternDashboardChartsProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid gap-2 lg:grid-cols-5">
        <ChartCard
          title="Weekly sessions"
          subtitle="Record activity by day"
          className="lg:col-span-3"
        >
          <BarChart
            data={weeklySessions}
            config={barConfig}
            bloom="aura"
            className="h-full min-h-[13rem] w-full"
          >
            <Grid />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip labelKey="day" />
            <Bar dataKey="sessions" variant="gradient" />
          </BarChart>
        </ChartCard>

        <ChartCard
          title="Quality mix"
          subtitle="Average scores across review dimensions"
          className="lg:col-span-2"
        >
          <RadarChart
            data={qualityRadar}
            config={radarConfig}
            nameKey="metric"
            bloom="aura"
            className="h-full min-h-[13rem] w-full"
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
          data={captureTrend}
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

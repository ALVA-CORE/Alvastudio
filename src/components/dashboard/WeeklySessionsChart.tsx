import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const weeklyData = [
  { day: "Mon", sessions: 4 },
  { day: "Tue", sessions: 7 },
  { day: "Wed", sessions: 5 },
  { day: "Thu", sessions: 9 },
  { day: "Fri", sessions: 6 },
  { day: "Sat", sessions: 3 },
  { day: "Sun", sessions: 8 },
];

const barConfig = {
  sessions: { label: "Sessions", color: "hsl(var(--alva-accent))" },
} satisfies ChartConfig;

type WeeklySessionsChartProps = {
  className?: string;
  data?: Array<{ day: string; sessions: number }>;
};

export function WeeklySessionsChart({
  className,
  data = weeklyData,
}: WeeklySessionsChartProps) {
  return (
    <div className={cn("relative h-full min-h-0 w-full", className)}>
      <svg width={0} height={0} aria-hidden className="absolute">
        <defs>
          <pattern
            id="alva-bar-stripes"
            patternUnits="userSpaceOnUse"
            width="8"
            height="8"
            patternTransform="rotate(45)"
          >
            <rect width="8" height="8" fill="hsl(var(--alva-accent))" />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="8"
              stroke="hsl(var(--alva-bg))"
              strokeWidth="2"
              strokeOpacity="0.35"
            />
          </pattern>
        </defs>
      </svg>

      <ChartContainer config={barConfig} className="h-full w-full">
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="hsl(var(--alva-border))"
            strokeOpacity={0.45}
          />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            width={30}
          />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Bar
            dataKey="sessions"
            radius={[8, 8, 0, 0]}
            fill="url(#alva-bar-stripes)"
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

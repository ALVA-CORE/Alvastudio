import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
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

const approvalData = [
  { status: "approved", value: 62, fill: "var(--color-approved)" },
  { status: "pending", value: 24, fill: "var(--color-pending)" },
  { status: "rejected", value: 14, fill: "var(--color-rejected)" },
];

const weeklyData = [
  { day: "Mon", sessions: 4 },
  { day: "Tue", sessions: 7 },
  { day: "Wed", sessions: 5 },
  { day: "Thu", sessions: 9 },
  { day: "Fri", sessions: 6 },
  { day: "Sat", sessions: 3 },
  { day: "Sun", sessions: 8 },
];

const pieConfig = {
  approved: { label: "Approved", color: "hsl(var(--alva-accent))" },
  pending: { label: "Pending", color: "hsl(0 0% 45%)" },
  rejected: { label: "Rejected", color: "hsl(0 0% 28%)" },
} satisfies ChartConfig;

const barConfig = {
  sessions: { label: "Sessions", color: "hsl(var(--alva-accent))" },
} satisfies ChartConfig;

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-alva-border bg-alva-surface p-4",
        className
      )}
    >
      <h3 className="mb-3 text-sm font-medium text-foreground">{title}</h3>
      {children}
    </div>
  );
}

export function DashboardCharts({ className }: { className?: string }) {
  return (
    <section className={cn("mt-6 space-y-4 px-4", className)}>
      <h2 className="text-sm font-medium text-muted-foreground">Activity</h2>

      <ChartCard title="Review breakdown">
        <ChartContainer config={pieConfig} className="mx-auto aspect-square max-h-[220px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={approvalData}
              dataKey="value"
              nameKey="status"
              innerRadius={52}
              outerRadius={78}
              strokeWidth={2}
              stroke="hsl(var(--alva-surface))"
            >
              {approvalData.map((entry) => (
                <Cell key={entry.status} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="Sessions this week">
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

        <ChartContainer config={barConfig} className="aspect-[4/3] max-h-[220px]">
          <BarChart data={weeklyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
              width={28}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar
              dataKey="sessions"
              radius={[6, 6, 0, 0]}
              fill="url(#alva-bar-stripes)"
            />
          </BarChart>
        </ChartContainer>
      </ChartCard>
    </section>
  );
}

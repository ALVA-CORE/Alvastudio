import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const recordingMixData = [
  { type: "prompts", value: 58, fill: "var(--color-prompts)" },
  { type: "stimuli", value: 42, fill: "var(--color-stimuli)" },
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
  prompts: { label: "Prompt reads", color: "hsl(var(--alva-accent))" },
  stimuli: { label: "Stimuli", color: "hsl(0 0% 38%)" },
} satisfies ChartConfig;

const barConfig = {
  sessions: { label: "Sessions", color: "hsl(var(--alva-accent))" },
} satisfies ChartConfig;

const RADIAN = Math.PI / 180;

type PieLabelProps = {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  fill?: string;
  percent?: number;
  status?: string;
};

function PieCalloutLabel({
  cx = 0,
  cy = 0,
  midAngle = 0,
  outerRadius = 0,
  fill = "currentColor",
  percent = 0,
  status = "",
}: PieLabelProps) {
  const label =
    pieConfig[status as keyof typeof pieConfig]?.label ?? status;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 6) * cos;
  const sy = cy + (outerRadius + 6) * sin;
  const mx = cx + (outerRadius + 22) * cos;
  const my = cy + (outerRadius + 22) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 16;
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";

  return (
    <g>
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        strokeWidth={1}
        fill="none"
        opacity={0.7}
      />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 8}
        y={ey}
        textAnchor={textAnchor}
        dominantBaseline="central"
        className="fill-foreground text-[10px] font-medium"
      >
        {label} {`${Math.round(percent * 100)}%`}
      </text>
    </g>
  );
}

function CarouselDots({ count, active }: { count: number; active: number }) {
  return (
    <div className="mt-3 flex items-center justify-center gap-1.5">
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            index === active
              ? "w-5 bg-alva-accent"
              : "w-1.5 bg-alva-card"
          )}
        />
      ))}
    </div>
  );
}

function ChartSlide({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-alva-surface px-4 py-4">
      <h3 className="mb-3 text-sm font-medium text-foreground">{title}</h3>
      {children}
    </div>
  );
}

export function DashboardCharts({ className }: { className?: string }) {
  const [api, setApi] = useState<CarouselApi>();
  const [activeSlide, setActiveSlide] = useState(0);

  const onSelect = useCallback((carouselApi: CarouselApi) => {
    setActiveSlide(carouselApi.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!api) return;

    onSelect(api);
    api.on("select", onSelect);
    api.on("reInit", onSelect);

    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, onSelect]);

  return (
    <section className={cn("mt-6", className)}>
      <Carousel setApi={setApi} opts={{ align: "start", loop: false }}>
        <CarouselContent className="-ml-0">
          <CarouselItem className="basis-full pl-0">
            <ChartSlide title="Recording mix">
              <ChartContainer
                config={pieConfig}
                className="mx-auto aspect-[4/3] w-full max-h-[240px]"
              >
                <PieChart margin={{ top: 10, right: 42, bottom: 10, left: 42 }}>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={recordingMixData}
                    dataKey="value"
                    nameKey="type"
                    innerRadius={42}
                    outerRadius={70}
                    cornerRadius={6}
                    paddingAngle={3}
                    strokeWidth={0}
                    labelLine={false}
                    label={(props) => (
                      <PieCalloutLabel {...props} status={props.name as string} />
                    )}
                  >
                    {recordingMixData.map((entry) => (
                      <Cell key={entry.type} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </ChartSlide>
          </CarouselItem>

          <CarouselItem className="basis-full pl-0">
            <ChartSlide title="Sessions this week">
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

              <ChartContainer
                config={barConfig}
                className="aspect-[4/3] w-full max-h-[240px]"
              >
                <BarChart
                  data={weeklyData}
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
            </ChartSlide>
          </CarouselItem>
        </CarouselContent>
      </Carousel>

      <CarouselDots count={2} active={activeSlide} />
    </section>
  );
}

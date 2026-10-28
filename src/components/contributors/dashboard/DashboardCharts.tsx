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
import { AlvaChartEmptyOverlay } from "@/components/shared/states/AlvaChartEmptyOverlay";
import { ApprovalGauge } from "@/components/admin/shared/ApprovalGauge";
import GraphUp from "@solar-icons/react/business/GraphUp";
import {
  EMPTY_RECORDING_MIX,
  EMPTY_WEEKLY_SESSIONS,
} from "@/data/contributors/dashboard";
import { CarouselDots } from "@/components/shared/CarouselDots";
import { useCarouselAutoplay } from "@/components/shared/useCarouselAutoplay";
import { cn } from "@/lib/utils";

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
};

function PieCalloutLabel({
  cx = 0,
  cy = 0,
  midAngle = 0,
  outerRadius = 0,
  fill = "currentColor",
  percent = 0,
}: PieLabelProps) {
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 6) * cos;
  const sy = cy + (outerRadius + 6) * sin;
  const mx = cx + (outerRadius + 16) * cos;
  const my = cy + (outerRadius + 16) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 10;
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
        className="fill-foreground text-[11px] font-medium tabular-nums"
      >
        {`${Math.round(percent * 100)}%`}
      </text>
    </g>
  );
}

function ChartSlide({
  title,
  children,
  emptyMessage,
}: {
  title: string;
  children: React.ReactNode;
  emptyMessage?: { title: string; description?: string };
}) {
  return (
    <div className="rounded-2xl bg-alva-surface px-4 py-4">
      <h3 className="mb-3 text-sm font-medium text-foreground">{title}</h3>
      <div className="relative">
        {children}
        {emptyMessage && (
          <AlvaChartEmptyOverlay
            icon={<GraphUp size={18} weight="Outline" />}
            title={emptyMessage.title}
            description={emptyMessage.description}
            className="bg-alva-surface/60"
          />
        )}
      </div>
    </div>
  );
}

export function DashboardCharts({
  className,
  isEmpty = false,
  mix,
  weekly,
  milestone,
}: {
  className?: string;
  isEmpty?: boolean;
  /** From `/dashboard/contributor`. Omit and the seeded shape is drawn. */
  mix?: { type: string; value: number; fill: string }[];
  weekly?: { day: string; sessions: number }[];
  /** Adds a third slide. Omitted where there is no milestone to show. */
  milestone?: {
    clips_per_milestone: number;
    clips_to_next: number;
    amount_per_milestone: string;
    currency: string;
  } | null;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [activeSlide, setActiveSlide] = useState(0);

  /* A contributor with no clips has an empty mix, which is the empty state
   * rather than a chart of zeroes. The ghost ring keeps the donut's shape
   * behind the overlay. */
  const mixEmpty = isEmpty || (mix !== undefined && mix.length === 0);
  const mixData = mixEmpty ? EMPTY_RECORDING_MIX : (mix ?? EMPTY_RECORDING_MIX);
  /* Zeroes, never a sample. Before the dashboard lands these cards used to
     draw somebody else's week, which is a figure about this contributor. */
  const weeklyData = isEmpty
    ? EMPTY_WEEKLY_SESSIONS
    : (weekly?.length ? weekly : EMPTY_WEEKLY_SESSIONS);

  const onSelect = useCallback((carouselApi: CarouselApi) => {
    setActiveSlide(carouselApi.selectedScrollSnap());
  }, []);

  useCarouselAutoplay(api);

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
            <ChartSlide
              title="Recording mix"
              emptyMessage={
                mixEmpty
                  ? {
                      title: "No recordings yet",
                      description: "Your prompt and stimuli split appears after your first clip.",
                    }
                  : undefined
              }
            >
              <ChartContainer
                config={pieConfig}
                className="mx-auto aspect-[4/3] w-full max-h-[240px]"
              >
                <PieChart margin={{ top: 8, right: 28, bottom: 8, left: 28 }}>
                  {!mixEmpty && <ChartTooltip content={<ChartTooltipContent hideLabel />} />}
                  <Pie
                    data={mixData}
                    dataKey="value"
                    nameKey="type"
                    innerRadius={42}
                    outerRadius={70}
                    cornerRadius={6}
                    paddingAngle={3}
                    strokeWidth={0}
                    labelLine={false}
                    label={
                      mixEmpty
                        ? false
                        : (props) => <PieCalloutLabel {...props} />
                    }
                  >
                    {mixData.map((entry) => (
                      <Cell key={entry.type} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>

              {/* The names sat on the callouts and ran off both edges of a
                  phone, so "Prompt reads 100%" arrived as "eads 100%". The
                  callout keeps the figure, which is short and always fits,
                  and the names sit in a row that wraps instead of clipping. */}
              {!mixEmpty && (
                <ul className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                  {mixData.map((entry) => (
                    <li key={entry.type} className="flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-full"
                        /* The slice's own `fill` is `var(--color-prompts)`,
                           which only resolves inside `ChartContainer` — it
                           scopes those variables to itself. Out here the chip
                           came out unpainted, so the colour is read from the
                           config the container builds them from. */
                        style={{
                          background:
                            pieConfig[entry.type as keyof typeof pieConfig]?.color ??
                            entry.fill,
                        }}
                      />
                      <span className="text-[11px] text-muted-foreground">
                        {pieConfig[entry.type as keyof typeof pieConfig]?.label ??
                          entry.type}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </ChartSlide>
          </CarouselItem>

          <CarouselItem className="basis-full pl-0">
            <ChartSlide
              title="Sessions this week"
              emptyMessage={
                isEmpty
                  ? {
                      title: "No sessions this week",
                      description: "Record a prompt to start filling this chart.",
                    }
                  : undefined
              }
            >
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
                  {!isEmpty && <ChartTooltip content={<ChartTooltipContent hideLabel />} />}
                  <Bar
                    dataKey="sessions"
                    radius={[8, 8, 0, 0]}
                    fill="url(#alva-bar-stripes)"
                  />
                </BarChart>
              </ChartContainer>
            </ChartSlide>
          </CarouselItem>
          {milestone && milestone.clips_per_milestone > 0 ? (
            <CarouselItem className="basis-full pl-0">
              <ChartSlide title="Next payout">
                <div className="mx-auto aspect-[4/3] w-full max-h-[240px]">
                  <ApprovalGauge
                    value={Math.min(
                      100,
                      Math.round(
                        ((milestone.clips_per_milestone - milestone.clips_to_next) /
                          milestone.clips_per_milestone) *
                          100
                      )
                    )}
                    label={`${milestone.clips_to_next} clips to go`}
                  />
                </div>
                <p className="mt-1 text-center text-[11px] text-muted-foreground">
                  {milestone.currency === "NGN" ? "₦" : `${milestone.currency} `}
                  {Number(milestone.amount_per_milestone).toLocaleString()} every{" "}
                  {milestone.clips_per_milestone} approved clips
                </p>
              </ChartSlide>
            </CarouselItem>
          ) : null}
        </CarouselContent>
      </Carousel>

      <CarouselDots count={milestone ? 3 : 2} active={activeSlide} />
    </section>
  );
}

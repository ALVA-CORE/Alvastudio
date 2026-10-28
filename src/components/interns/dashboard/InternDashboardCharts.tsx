import { useEffect, useState } from "react";
import GraphUp from "@solar-icons/react/business/GraphUp";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { CarouselDots } from "@/components/shared/CarouselDots";
import { useCarouselAutoplay } from "@/components/shared/useCarouselAutoplay";
import { useIsMobile } from "@/hooks/use-mobile";
import { DemographicHoursChart } from "@/components/interns/dashboard/DemographicHoursChart";
import { WeeklySessionsChart } from "@/components/interns/dashboard/WeeklySessionsChart";
import { AlvaChartEmptyOverlay } from "@/components/shared/states/AlvaChartEmptyOverlay";
import type { DashboardDataset } from "@/data/internDashboard";
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
  /**
   * This intern's own figures.
   *
   * Passed in rather than read here. These charts used to draw
   * `DASHBOARD_DATA[timeRange]` — a seeded fixture — on a live page, while
   * the dashboard above them computed the real dataset and never handed it
   * over. So an intern with no sessions saw somebody's invented year.
   */
  dataset: DashboardDataset;
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
  dataset,
  className,
  isEmpty = false,
}: InternDashboardChartsProps) {
  const isMobile = useIsMobile();
  const [api, setApi] = useState<CarouselApi>();
  const [active, setActive] = useState(0);

  useCarouselAutoplay(api);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => setActive(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);

    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  /* Defined once and laid out twice: a carousel on a phone, the grid on a
     desktop. Two copies of this JSX would drift the moment one of them
     gained a chart. */
  const charts = [
    {
      span: 3,
      node: (
    <ChartCard
              title="Weekly sessions"
              subtitle="Record activity by day"
              className="min-h-[22rem] h-full"
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
      ),
    },
    {
      span: 2,
      node: (
    <ChartCard
              title="Quality mix"
              subtitle="How your sessions score, over the last year"
              className="min-h-[22rem] h-full"
              emptyMessage={
                isEmpty || dataset.qualityRadar.length === 0
                  ? {
                      title: "Nothing to score yet",
                      description: "Scores appear once you have run a session.",
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
      ),
    },
    {
      span: 2,
      node: (
    <ChartCard
              title="Demographic reach"
              /* Speakers, not hours: one focus-group file holds several voices,
                 so its hours cannot be split between them. */
              subtitle="Speakers by age bracket and gender"
              className="min-h-[22rem] h-full"
              emptyMessage={
                isEmpty || dataset.demographicHours.length === 0
                  ? {
                      title: "No demographic data",
                      description: "Log participants to see which age and gender groups you cover.",
                    }
                  : undefined
              }
            >
              <DemographicHoursChart data={dataset.demographicHours} unit="speakers" />
            </ChartCard>
      ),
    },
    {
      span: 3,
      node: (
    <ChartCard
              title="Capture volume"
              subtitle="Focus group hours and participants over time"
              className="min-h-[22rem] h-full"
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
      ),
    },
  ];

  return (
    <div className={cn("space-y-2", className)}>
      {/* Chosen in JS, not with `lg:hidden`. Hiding one layout with CSS
          still mounts it, so every chart would be built twice — eight charts
          of work to show four. */}
      {isMobile ? (
        <div>
          <Carousel setApi={setApi} opts={{ align: "start", loop: false }}>
            <CarouselContent className="-ml-0">
              {charts.map((chart, index) => (
                <CarouselItem key={index} className="basis-full pl-0">
                  {chart.node}
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          <CarouselDots count={charts.length} active={active} />
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {charts.map((chart, index) => (
            <div
              key={index}
              className={chart.span === 3 ? "col-span-3" : "col-span-2"}
            >
              {chart.node}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

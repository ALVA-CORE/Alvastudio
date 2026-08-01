import { useMemo, useState } from "react";
import type { DemographicHoursPoint } from "@/data/internDashboard";
import { cn } from "@/lib/utils";

type SeriesColor = { solid: string; soft: string };

const MALE_COLOR: SeriesColor = {
  solid: "hsl(199 89% 58%)",
  soft: "hsl(199 89% 58% / 0.5)",
};

const FEMALE_COLOR: SeriesColor = {
  solid: "hsl(var(--alva-accent))",
  soft: "hsl(var(--alva-accent) / 0.5)",
};

const GUTTER = "w-[3.25rem]";

type DemographicHoursChartProps = {
  data: DemographicHoursPoint[];
  className?: string;
};

function niceCeiling(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / (magnitude / 2)) * (magnitude / 2);
}

function formatHours(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}h`;
}

/**
 * Diverging age/gender pyramid: male hours extend left of the age gutter,
 * female hours extend right, so skew in what has been collected is obvious at
 * a glance rather than buried in a grouped bar chart.
 */
export function DemographicHoursChart({ data, className }: DemographicHoursChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const { axisMax, totals, peakBracket } = useMemo(() => {
    const largestSide = data.reduce(
      (max, point) => Math.max(max, point.male, point.female),
      0
    );

    const sums = data.reduce(
      (acc, point) => ({
        male: acc.male + point.male,
        female: acc.female + point.female,
        undisclosed: acc.undisclosed + point.undisclosed,
      }),
      { male: 0, female: 0, undisclosed: 0 }
    );

    const peak = data.reduce<DemographicHoursPoint | null>((best, point) => {
      if (!best) return point;
      return point.male + point.female > best.male + best.female ? point : best;
    }, null);

    return {
      axisMax: niceCeiling(largestSide),
      totals: sums,
      peakBracket: sums.male + sums.female > 0 ? peak?.ageBracket : undefined,
    };
  }, [data]);

  const hoveredPoint = data.find((point) => point.ageBracket === hovered) ?? null;
  const ticks = [axisMax, axisMax / 2, 0];

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex items-center justify-center gap-4 pb-3">
        <LegendSwatch color={MALE_COLOR} label="Male" hatched />
        <LegendSwatch color={FEMALE_COLOR} label="Female" />
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col justify-center gap-2"
        onMouseLeave={() => setHovered(null)}
      >
        {data.map((point) => {
          const isPeak = point.ageBracket === peakBracket;
          const isHovered = hovered === point.ageBracket;
          const dimmed = hovered !== null && !isHovered;

          return (
            <div
              key={point.ageBracket}
              onMouseEnter={() => setHovered(point.ageBracket)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg py-1 transition-colors",
                isHovered && "bg-alva-surface/60"
              )}
            >
              <PyramidBar
                value={point.male}
                axisMax={axisMax}
                color={MALE_COLOR}
                align="left"
                hatched
                dimmed={dimmed}
              />

              <span
                className={cn(
                  GUTTER,
                  "shrink-0 text-center text-[11px] tabular-nums transition-colors",
                  isPeak || isHovered ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {point.ageBracket}
              </span>

              <PyramidBar
                value={point.female}
                axisMax={axisMax}
                color={FEMALE_COLOR}
                align="right"
                dimmed={dimmed}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center gap-1.5 border-t border-alva-border pt-2">
        <div className="flex flex-1 justify-between text-[10px] tabular-nums text-muted-foreground">
          {ticks.map((tick) => (
            <span key={`left-${tick}`}>{formatHours(tick)}</span>
          ))}
        </div>
        <span className={cn(GUTTER, "shrink-0")} />
        <div className="flex flex-1 justify-between text-[10px] tabular-nums text-muted-foreground">
          {[...ticks].reverse().map((tick) => (
            <span key={`right-${tick}`}>{formatHours(tick)}</span>
          ))}
        </div>
      </div>

      <p className="mt-2 min-h-[1.25rem] text-[11px] text-muted-foreground">
        {hoveredPoint ? (
          <>
            <span className="font-medium text-foreground">{hoveredPoint.ageBracket}</span>
            {" — male "}
            <span className="font-medium text-foreground">
              {formatHours(hoveredPoint.male)}
            </span>
            {", female "}
            <span className="font-medium text-foreground">
              {formatHours(hoveredPoint.female)}
            </span>
            {", undisclosed "}
            <span className="font-medium text-foreground">
              {formatHours(hoveredPoint.undisclosed)}
            </span>
          </>
        ) : (
          <>
            {"Total — male "}
            <span className="font-medium text-foreground">{formatHours(totals.male)}</span>
            {", female "}
            <span className="font-medium text-foreground">{formatHours(totals.female)}</span>
            {", undisclosed "}
            <span className="font-medium text-foreground">
              {formatHours(totals.undisclosed)}
            </span>
          </>
        )}
      </p>
    </div>
  );
}

function PyramidBar({
  value,
  axisMax,
  color,
  align,
  hatched = false,
  dimmed = false,
}: {
  value: number;
  axisMax: number;
  color: SeriesColor;
  align: "left" | "right";
  hatched?: boolean;
  dimmed?: boolean;
}) {
  const width = axisMax > 0 ? Math.min(100, (value / axisMax) * 100) : 0;
  const isLeft = align === "left";

  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-1 items-center",
        isLeft ? "justify-end" : "justify-start"
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-alva-border/60"
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 w-px bg-alva-border",
          isLeft ? "right-0" : "left-0"
        )}
      />
      <div
        className={cn(
          "relative h-5 min-w-[2px] transition-all duration-500 ease-out",
          isLeft ? "rounded-l-md" : "rounded-r-md",
          dimmed ? "opacity-40" : "opacity-100"
        )}
        style={{
          width: `${width}%`,
          backgroundImage: hatched
            ? `repeating-linear-gradient(45deg, ${color.solid} 0 3px, hsl(var(--alva-bg) / 0.4) 3px 6px)`
            : `linear-gradient(${isLeft ? "to left" : "to right"}, ${color.solid}, ${color.soft})`,
        }}
      />
    </div>
  );
}

function LegendSwatch({
  color,
  label,
  hatched = false,
}: {
  color: SeriesColor;
  label: string;
  hatched?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span
        className="h-2.5 w-4 rounded-sm"
        style={{
          backgroundColor: color.solid,
          backgroundImage: hatched
            ? `repeating-linear-gradient(45deg, ${color.solid} 0 3px, hsl(var(--alva-bg) / 0.4) 3px 6px)`
            : undefined,
        }}
      />
      {label}
    </span>
  );
}

import {
  HeatmapCells,
  HeatmapChart,
  HeatmapInteractionBoundary,
  HeatmapInteractionProvider,
  HeatmapTooltip,
  HeatmapXAxis,
  type HeatmapColumn,
} from "@/components/charts/heatmap";
import type { ApiActivityDay } from "@/lib/api/users";

/**
 * `YYYY-MM-DD` as a local calendar day.
 *
 * Not `new Date("2026-10-24")`, which the spec reads as UTC midnight: west of
 * Greenwich that lands on the 23rd, and a calendar whose cells sit a day out
 * is worse than no calendar. The API's days are UTC days; this pins each to
 * the same-numbered local day so the grid reads as the dates it was sent.
 */
function localDay(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function shift(from: Date, days: number) {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * The API's flat run of days, as calendar columns.
 *
 * A window of 365 days starts on whatever weekday it starts on, so the first
 * column is padded back to its Sunday and the last forward to its Saturday.
 * The padding carries a real date and a zero: it is outside the window rather
 * than a quiet day, but it renders identically to one, and the alternative —
 * a ragged first column — reads as missing data.
 */
export function toHeatmapColumns(daily: ApiActivityDay[]): HeatmapColumn[] {
  if (daily.length === 0) return [];

  const days = daily.map((day) => ({ date: localDay(day.date), count: day.count }));
  const lead = days[0].date.getDay();
  const padded = [
    ...Array.from({ length: lead }, (_, index) => ({
      date: shift(days[0].date, index - lead),
      count: 0,
    })),
    ...days,
  ];

  const trail = (7 - (padded.length % 7)) % 7;
  const last = padded[padded.length - 1].date;
  for (let index = 1; index <= trail; index += 1) {
    padded.push({ date: shift(last, index), count: 0 });
  }

  return Array.from({ length: padded.length / 7 }, (_, week) => ({
    bin: week,
    bins: padded.slice(week * 7, week * 7 + 7).map((day, weekday) => ({
      bin: weekday,
      count: day.count,
      date: day.date,
    })),
  }));
}

/**
 * A year of this person's work, contribution-graph shaped.
 *
 * No y-axis and no legend: the weekday rows are self-evident from the shape,
 * and a Less→More key explains a convention the reader already knows. The
 * tooltip carries the exact figure, which is the only number anybody actually
 * wants off a calendar.
 *
 * Cells are pinned rather than left to fill. 53 columns with a 2px gap is
 * what sets the panel's default width — see `PANEL_WIDTH`. Left to fill, a
 * wider panel would grow the cells until the calendar swamped everything else.
 *
 * Levels read off the `--chart-scale-*` ramp, which index.css cuts on the
 * accent's own hue.
 */
export function UserActivityHeatmap({ data }: { data: HeatmapColumn[] }) {
  return (
    <HeatmapInteractionProvider>
      <HeatmapInteractionBoundary>
        <div className="w-full">
          <HeatmapChart
            className="w-full"
            data={data}
            layout="fluid"
            binSize={8.5}
            gap={2}
            margin={{ top: 10, right: 2, bottom: 2, left: 2 }}
          >
            <HeatmapCells />
            <HeatmapXAxis className="text-[9px] text-muted-foreground" />
            <HeatmapTooltip />
          </HeatmapChart>
        </div>
      </HeatmapInteractionBoundary>
    </HeatmapInteractionProvider>
  );
}

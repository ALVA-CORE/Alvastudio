import type { HeatmapColumn } from "@/components/charts/heatmap";
import type { SunburstNode } from "@/components/charts/sunburst-data";
import type {
  DashboardTimeRange,
  DemographicHoursPoint,
} from "@/data/internDashboard";

/**
 * Annotator dashboard datasets. Mirrors the shape of `@/data/internDashboard`
 * — one dataset per time range, plus a zeroed mirror so empty states can still
 * render real chart frames instead of collapsing to a bare icon.
 *
 * Replace with API data once the backend lands.
 */

export type AnnotatorMetrics = {
  clipsAnnotated: string;
  hoursAnnotated: string;
  tagsApplied: string;
  clipsTrend: string;
  hoursTrend: string;
  tagsTrend: string;
  periodLabel: string;
};

export type SankeyFlow = {
  nodes: { name: string; category?: "source" | "landing" | "outcome" }[];
  links: { source: number; target: number; value: number }[];
};

export type AnnotatorDataset = {
  metrics: AnnotatorMetrics;
  /** Where focus-group audio comes from and how it resolves. */
  clipFlow: SankeyFlow;
  /** Daily annotation counts, calendar-shaped (weeks as columns). */
  activity: HeatmapColumn[];
  /** Annotated hours by age bracket and gender — the demographic reach of the
   *  audio this annotator has actually worked, not what was merely captured. */
  demographicHours: DemographicHoursPoint[];
  /** Variety → tag category → tag. */
  tagBreakdown: SunburstNode;
};

/* ------------------------------------------------------------------ *
 * The zeroed dashboard
 *
 * Built from nothing, not from a fabricated dataset with its numbers knocked
 * to zero. The difference matters: every one of these used to read its shape
 * out of `ANNOTATOR_DASHBOARD_DATA` — a seeded year of heatmaps, flows and
 * tag trees — which is what kept that fixture alive in shipping code and one
 * mistake away from being drawn as fact. It is a test fixture now, and
 * nothing here can reach it.
 *
 * Labels and axes are kept, because they are categories rather than data: a
 * labelled empty chart says "nothing yet", a missing one says "broken".
 * ------------------------------------------------------------------ */

/** How many calendar weeks each range covers. */
const ACTIVITY_WEEKS: Record<DashboardTimeRange, number> = {
  "7d": 1,
  "30d": 5,
  "90d": 13,
  "12m": 53,
};

const PERIOD_LABEL: Record<DashboardTimeRange, string> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
  "12m": "last 12 months",
};

/** The calendar grid at zero. Real dates, so the axis is still true. */
const EMPTY_ACTIVITY = (weeks: number): HeatmapColumn[] => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - weeks * 7 + 1);
  // Align to the Sunday on or before the start date.
  start.setDate(start.getDate() - start.getDay());

  return Array.from({ length: weeks }, (_, week) => ({
    bin: week,
    bins: Array.from({ length: 7 }, (_, day) => {
      const date = new Date(start);
      date.setDate(start.getDate() + week * 7 + day);
      return { bin: day, count: 0, date };
    }),
  }));
};

/** Intake through triage to outcome. Indices must stay in sync with `nodes`. */
const EMPTY_CLIP_FLOW: SankeyFlow = {
  nodes: [
    { name: "Lagos", category: "source" },
    { name: "Abuja", category: "source" },
    { name: "Port Harcourt", category: "source" },
    { name: "Triage", category: "landing" },
    { name: "Annotating", category: "landing" },
    { name: "Accepted", category: "outcome" },
    { name: "Flagged", category: "outcome" },
    { name: "Rejected", category: "outcome" },
  ],
  links: [
    { source: 0, target: 3, value: 0 },
    { source: 1, target: 3, value: 0 },
    { source: 2, target: 3, value: 0 },
    { source: 3, target: 4, value: 0 },
    { source: 4, target: 5, value: 0 },
    { source: 4, target: 6, value: 0 },
    { source: 4, target: 7, value: 0 },
  ],
};

const EMPTY_TAG_BREAKDOWN: SunburstNode = {
  name: "Tags",
  children: [
    {
      name: "No tags yet",
      color: "hsl(0 0% 24%)",
      children: [{ name: "No tags yet", value: 1 }],
    },
  ],
};

/** The age brackets the chart plots, at zero. Same shape the intern one uses. */
const EMPTY_DEMOGRAPHIC_HOURS: DemographicHoursPoint[] = [
  "18–24",
  "25–34",
  "35–44",
  "45–54",
  "55+",
].map((ageBracket) => ({ ageBracket, male: 0, female: 0, undisclosed: 0 }));

export function getEmptyAnnotatorDataset(range: DashboardTimeRange): AnnotatorDataset {
  return {
    metrics: {
      clipsAnnotated: "0",
      hoursAnnotated: "0h",
      tagsApplied: "0",
      clipsTrend: "0%",
      hoursTrend: "0%",
      tagsTrend: "0%",
      periodLabel: PERIOD_LABEL[range],
    },
    clipFlow: EMPTY_CLIP_FLOW,
    activity: EMPTY_ACTIVITY(ACTIVITY_WEEKS[range]),
    demographicHours: EMPTY_DEMOGRAPHIC_HOURS.map((point) => ({ ...point })),
    tagBreakdown: EMPTY_TAG_BREAKDOWN,
  };
}


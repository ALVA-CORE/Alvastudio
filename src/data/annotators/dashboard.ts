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
 * Deterministic pseudo-random so the heatmap is stable across renders.
 * A fresh array each render would restart the entrance animation.
 * ------------------------------------------------------------------ */
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Builds calendar columns ending today. `intensity` scales the daily counts,
 * `quietWeekends` mirrors how field annotation actually happens — heavy on
 * weekdays, near-dead on Sunday.
 */
function buildActivity(weeks: number, intensity: number, seed = 42): HeatmapColumn[] {
  const random = seededRandom(seed);
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

      const isSunday = day === 0;
      const isSaturday = day === 6;
      const weekendDamping = isSunday ? 0.08 : isSaturday ? 0.35 : 1;
      // Recent weeks run hotter — the queue has been growing.
      const recency = 0.55 + (week / Math.max(weeks - 1, 1)) * 0.65;
      const raw = random() * 9 * intensity * weekendDamping * recency;

      return {
        bin: day,
        count: date > today ? 0 : Math.round(raw),
        date,
      };
    }),
  }));
}

const EMPTY_ACTIVITY = (weeks: number): HeatmapColumn[] =>
  buildActivity(weeks, 0).map((column) => ({
    ...column,
    bins: column.bins.map((bin) => ({ ...bin, count: 0 })),
  }));

/* ------------------------------------------------------------------ *
 * Clip flow — three regional intakes converge on triage, then split by
 * annotation outcome. Indices must stay in sync with `nodes`.
 * ------------------------------------------------------------------ */
function buildClipFlow(scale: number): SankeyFlow {
  const n = (value: number) => Math.max(1, Math.round(value * scale));

  return {
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
      { source: 0, target: 3, value: n(148) },
      { source: 1, target: 3, value: n(96) },
      { source: 2, target: 3, value: n(74) },
      { source: 3, target: 4, value: n(286) },
      { source: 4, target: 5, value: n(198) },
      { source: 4, target: 6, value: n(58) },
      { source: 4, target: 7, value: n(30) },
    ],
  };
}

const EMPTY_CLIP_FLOW: SankeyFlow = {
  nodes: buildClipFlow(1).nodes,
  links: buildClipFlow(1).links.map((link) => ({ ...link, value: 0 })),
};

/* ------------------------------------------------------------------ *
 * Demographic reach — annotated hours per age bracket, split by gender.
 * Same shape the intern dashboard plots, so <DemographicHoursChart /> is
 * shared rather than reimplemented.
 * ------------------------------------------------------------------ */
const DEMOGRAPHIC_HOURS_30D: DemographicHoursPoint[] = [
  { ageBracket: "18–24", male: 2.4, female: 3.3, undisclosed: 0.3 },
  { ageBracket: "25–34", male: 4.8, female: 5.6, undisclosed: 0.5 },
  { ageBracket: "35–44", male: 3.1, female: 2.7, undisclosed: 0.2 },
  { ageBracket: "45–54", male: 1.4, female: 1.9, undisclosed: 0.2 },
  { ageBracket: "55+", male: 0.7, female: 0.9, undisclosed: 0.1 },
];

function scaleDemographicHours(factor: number): DemographicHoursPoint[] {
  const round = (value: number) => Math.round(value * factor * 10) / 10;

  return DEMOGRAPHIC_HOURS_30D.map((point) => ({
    ageBracket: point.ageBracket,
    male: round(point.male),
    female: round(point.female),
    undisclosed: round(point.undisclosed),
  }));
}

/* ------------------------------------------------------------------ *
 * Tag breakdown — variety → tag category → tag. Top-level colours follow
 * the chart palette in docs/alva-design-system.md §4: accent primary,
 * brand blue secondary, grey tertiary.
 * ------------------------------------------------------------------ */
function buildTagBreakdown(scale: number): SunburstNode {
  const n = (value: number) => Math.max(1, Math.round(value * scale));

  return {
    name: "Tags",
    children: [
      {
        name: "Pidgin",
        color: "hsl(146 87% 54%)",
        children: [
          {
            name: "Speech",
            children: [
              { name: "Code-switch", value: n(86) },
              { name: "Overlap", value: n(54) },
              { name: "Filler", value: n(38) },
            ],
          },
          {
            name: "Audio",
            children: [
              { name: "Background noise", value: n(44) },
              { name: "Clipping", value: n(19) },
            ],
          },
        ],
      },
      {
        name: "Nigerian English",
        color: "hsl(199 89% 58%)",
        children: [
          {
            name: "Speech",
            children: [
              { name: "Code-switch", value: n(72) },
              { name: "Overlap", value: n(41) },
              { name: "Filler", value: n(29) },
            ],
          },
          {
            name: "Audio",
            children: [
              { name: "Background noise", value: n(33) },
              { name: "Clipping", value: n(14) },
            ],
          },
        ],
      },
      {
        name: "Mixed",
        color: "hsl(0 0% 72%)",
        children: [
          {
            name: "Speech",
            children: [
              { name: "Code-switch", value: n(58) },
              { name: "Overlap", value: n(31) },
            ],
          },
          {
            name: "Audio",
            children: [{ name: "Background noise", value: n(22) }],
          },
        ],
      },
    ],
  };
}

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

/* ------------------------------------------------------------------ */

export const ANNOTATOR_DASHBOARD_DATA: Record<DashboardTimeRange, AnnotatorDataset> = {
  "7d": {
    metrics: {
      clipsAnnotated: "68",
      hoursAnnotated: "5.4h",
      tagsApplied: "214",
      clipsTrend: "+9%",
      hoursTrend: "+4%",
      tagsTrend: "+11%",
      periodLabel: "last 7 days",
    },
    clipFlow: buildClipFlow(0.24),
    activity: buildActivity(8, 0.55, 7),
    demographicHours: scaleDemographicHours(0.24),
    tagBreakdown: buildTagBreakdown(0.24),
  },
  "30d": {
    metrics: {
      clipsAnnotated: "286",
      hoursAnnotated: "22.8h",
      tagsApplied: "912",
      clipsTrend: "+16%",
      hoursTrend: "+12%",
      tagsTrend: "+18%",
      periodLabel: "last 30 days",
    },
    clipFlow: buildClipFlow(1),
    activity: buildActivity(18, 1, 30),
    demographicHours: scaleDemographicHours(1),
    tagBreakdown: buildTagBreakdown(1),
  },
  "90d": {
    metrics: {
      clipsAnnotated: "842",
      hoursAnnotated: "67.1h",
      tagsApplied: "2,684",
      clipsTrend: "+21%",
      hoursTrend: "+18%",
      tagsTrend: "+24%",
      periodLabel: "last 90 days",
    },
    clipFlow: buildClipFlow(2.94),
    activity: buildActivity(26, 1.35, 90),
    demographicHours: scaleDemographicHours(2.94),
    tagBreakdown: buildTagBreakdown(2.94),
  },
  "12m": {
    metrics: {
      clipsAnnotated: "3,410",
      hoursAnnotated: "271h",
      tagsApplied: "10,930",
      clipsTrend: "+34%",
      hoursTrend: "+29%",
      tagsTrend: "+37%",
      periodLabel: "last 12 months",
    },
    clipFlow: buildClipFlow(11.9),
    activity: buildActivity(52, 1.6, 365),
    demographicHours: scaleDemographicHours(11.9),
    tagBreakdown: buildTagBreakdown(11.9),
  },
};

/** Zeroed mirror so an empty dashboard still renders real chart frames. */
export function getEmptyAnnotatorDataset(range: DashboardTimeRange): AnnotatorDataset {
  const source = ANNOTATOR_DASHBOARD_DATA[range];

  return {
    metrics: {
      clipsAnnotated: "0",
      hoursAnnotated: "0h",
      tagsApplied: "0",
      clipsTrend: "0%",
      hoursTrend: "0%",
      tagsTrend: "0%",
      periodLabel: source.metrics.periodLabel,
    },
    clipFlow: EMPTY_CLIP_FLOW,
    activity: EMPTY_ACTIVITY(source.activity.length),
    demographicHours: source.demographicHours.map((point) => ({
      ...point,
      male: 0,
      female: 0,
      undisclosed: 0,
    })),
    tagBreakdown: EMPTY_TAG_BREAKDOWN,
  };
}

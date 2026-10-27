import { fromApiAgeBracket } from "@/lib/api/enums";
export type DashboardTimeRange = "7d" | "30d" | "90d" | "12m";

export const DASHBOARD_TIME_RANGES: Array<{
  id: DashboardTimeRange;
  label: string;
}> = [
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
  { id: "12m", label: "12M" },
];

type WeeklyPoint = { day: string; sessions: number };
type TrendPoint = { month: string; hours: number; participants: number; sessions: number };
type RadarPoint = { metric: string; score: number };

export type DemographicHoursPoint = {
  ageBracket: string;
  male: number;
  female: number;
  undisclosed: number;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * A `YYYY-MM-DD` day as a local calendar date.
 *
 * The API sends Africa/Lagos days. Parsing them as instants would shift the
 * label a day backwards for any reader west of Greenwich.
 */
function calendarDay(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/** The last seven days of capture, labelled by weekday. */
export function toWeeklySessions(
  daily: { date: string; sessions: number }[]
): WeeklyPoint[] {
  return daily.slice(-7).map((point) => ({
    day: WEEKDAYS[calendarDay(point.date).getDay()] ?? point.date,
    sessions: point.sessions,
  }));
}

/**
 * The series rolled up by month, for the capture trend.
 *
 * Days would draw 365 points at 12M and seven at 7D, which is two different
 * charts wearing one title. Months keep one shape across every range, and a
 * range shorter than a month is simply one column.
 */
export function toCaptureTrend(
  daily: { date: string; sessions: number; participants: number; hours: number }[]
): TrendPoint[] {
  const buckets = new Map<string, TrendPoint>();

  for (const point of daily) {
    const at = calendarDay(point.date);
    const key = `${at.getFullYear()}-${at.getMonth()}`;
    const bucket = buckets.get(key) ?? {
      month: MONTHS[at.getMonth()] ?? key,
      hours: 0,
      participants: 0,
      sessions: 0,
    };

    bucket.hours += point.hours;
    bucket.participants += point.participants;
    bucket.sessions += point.sessions;
    buckets.set(key, bucket);
  }

  return [...buckets.values()].map((bucket) => ({
    ...bucket,
    hours: Math.round(bucket.hours * 10) / 10,
  }));
}

/** Ordered so the pyramid's axis reads youngest at the top, as it did seeded. */
const AGE_ORDER = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55+"];

/**
 * `by_gender_age` → the pyramid.
 *
 * Speakers, not hours: a focus group is one file with several voices, so its
 * hours cannot be split by speaker. The chart's label says speakers.
 *
 * Anything that is not male or female lands in `undisclosed`, which includes
 * "prefer not to say" and "other". They are different answers, but a pyramid
 * has two sides and a remainder, and splitting the remainder further would
 * make the smallest bars unreadable.
 */
export function toDemographicSpeakers(
  cells: { gender: string; age_bracket: string; speakers: number }[]
): DemographicHoursPoint[] {
  const brackets = new Map<string, DemographicHoursPoint>();

  for (const cell of cells) {
    const ageBracket = fromApiAgeBracket(cell.age_bracket) || cell.age_bracket;
    const row = brackets.get(ageBracket) ?? {
      ageBracket,
      male: 0,
      female: 0,
      undisclosed: 0,
    };

    if (cell.gender === "male") row.male += cell.speakers;
    else if (cell.gender === "female") row.female += cell.speakers;
    else row.undisclosed += cell.speakers;

    brackets.set(ageBracket, row);
  }

  return [...brackets.values()].sort(
    (a, b) => AGE_ORDER.indexOf(a.ageBracket) - AGE_ORDER.indexOf(b.ageBracket)
  );
}

/**
 * `quality_in_window` → the radar's five axes.
 *
 * An axis with no denominator is dropped rather than plotted at zero. A
 * five-sided shape collapsed to a point because an intern has run no sessions
 * reads as a failing intern, which is the opposite of the truth.
 */
export function toQualityRadar(quality: {
  consent: { score: number | null; denominator: number };
  demographics: { score: number | null; denominator: number };
  audio: { score: number | null; denominator: number };
  participants: { score: number | null; denominator: number };
  clip_approval: { score: number | null; denominator: number };
}): RadarPoint[] {
  const axes: { metric: string; axis: { score: number | null; denominator: number } }[] = [
    { metric: "Consent", axis: quality.consent },
    { metric: "Demographics", axis: quality.demographics },
    { metric: "Audio", axis: quality.audio },
    { metric: "Attendance", axis: quality.participants },
    /* Not "Quality": a higher share of approvals is not by itself better
     * reviewing, and a label that implied it would nudge interns towards
     * approving. The API's own description makes the same point. */
    { metric: "Clips approved", axis: quality.clip_approval },
  ];

  return axes
    .filter((entry) => entry.axis.score != null && entry.axis.denominator > 0)
    .map((entry) => ({ metric: entry.metric, score: Math.round(entry.axis.score ?? 0) }));
}

export type DashboardDataset = {
  weeklySessions: WeeklyPoint[];
  captureTrend: TrendPoint[];
  qualityRadar: RadarPoint[];
  demographicHours: DemographicHoursPoint[];
  metrics: {
    hours: string;
    participants: string;
    clipsReviewed: string;
    sessions: string;
    hoursTrend: string;
    participantsTrend: string;
    clipsTrend: string;
    sessionsTrend: string;
    periodLabel: string;
  };
};

/* ------------------------------------------------------------------ *
 * The zeroed dashboard
 *
 * Built from nothing, not from a fabricated dataset with its numbers
 * knocked to zero. Every one of these used to read its shape out of
 * `DASHBOARD_DATA`, a seeded quarter of sessions, hours and quality
 * scores, which is what kept that fixture alive in shipping code and one
 * mistake away from being drawn as fact.
 *
 * Labels and axes are kept, because they are categories rather than data: a
 * labelled empty chart says "nothing yet", a missing one says "broken".
 * ------------------------------------------------------------------ */

const PERIOD_LABEL: Record<DashboardTimeRange, string> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
  "12m": "last 12 months",
};

/** The buckets each range plots along the bottom. */
const TREND_BUCKETS: Record<DashboardTimeRange, string[]> = {
  "7d": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  "30d": ["Wk 1", "Wk 2", "Wk 3", "Wk 4"],
  "90d": ["Month 1", "Month 2", "Month 3"],
  "12m": [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ],
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const RADAR_AXES = [
  "Audio clarity",
  "Consent",
  "Metadata",
  "Coverage",
  "Turnaround",
];

const AGE_BRACKETS = ["18\u201324", "25\u201334", "35\u201344", "45\u201354", "55+"];

/** Zeroed, so an empty dashboard still renders real chart frames. */
export function getEmptyDashboardDataset(
  range: DashboardTimeRange
): DashboardDataset {
  return {
    weeklySessions: DAYS.map((day) => ({ day, sessions: 0 })),
    captureTrend: TREND_BUCKETS[range].map((month) => ({
      month,
      hours: 0,
      participants: 0,
      sessions: 0,
    })),
    qualityRadar: RADAR_AXES.map((metric) => ({ metric, score: 0 })),
    demographicHours: AGE_BRACKETS.map((ageBracket) => ({
      ageBracket,
      male: 0,
      female: 0,
      undisclosed: 0,
    })),
    metrics: {
      hours: "0h",
      participants: "0",
      clipsReviewed: "0",
      sessions: "0",
      hoursTrend: "0%",
      participantsTrend: "0%",
      clipsTrend: "0%",
      sessionsTrend: "0%",
      periodLabel: PERIOD_LABEL[range],
    },
  };
}

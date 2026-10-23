import { NO_VALUE } from "@/lib/no-value";
/**
 * Shapes and fallbacks for the contributor dashboard.
 *
 * Both charts read from `/dashboard/contributor` now — the mix from
 * `prompts_read` against `total_recordings`, the week from the tail of
 * `daily_activity`. The seeded constants below are what a chart falls back to
 * before the first response lands, and what the dev empty-state toggle shows.
 */

export type LeaderboardEntry = {
  id: string;
  name: string;
  points: number;
  seed: string;
  avatarBg?: string;
};

export type QualitySegment = {
  key: string;
  label: string;
  value: number;
  color: string;
};

export type Insight = { label: string; value: string };

/** Avatar backgrounds, so the three faces are not all on the same grey. */
const AVATAR_BG = ["202020", "252525", "1a1a1a"];

/**
 * The live top three, arranged for the podium.
 *
 * Ranks can tie, so position in the array is what decides who stands where
 * rather than the rank number: three people tied at 1st still need a middle,
 * a left and a right.
 */
/**
 * The top three, in rank order.
 *
 * Rank order, not display order: the podium puts second on the left itself,
 * because only it knows how to lay out a board that has one or two people on
 * it rather than three. The endpoint caps `limit` at 3, so the slice is a
 * belt-and-braces measure.
 */
export function toPodium(
  rows: { contributor_id: string; full_name: string; points: number }[]
): LeaderboardEntry[] {
  return rows.slice(0, 3).map((row, index) => ({
    id: row.contributor_id,
    name: row.full_name,
    points: row.points,
    seed: row.contributor_id,
    avatarBg: AVATAR_BG[index],
  }));
}

export const RECORDING_MIX = [
  { type: "prompts", value: 58, fill: "var(--color-prompts)" },
  { type: "stimuli", value: 42, fill: "var(--color-stimuli)" },
];

/** Ghost ring, so the donut keeps its shape behind the empty overlay. */
export const EMPTY_RECORDING_MIX = [
  { type: "prompts", value: 1, fill: "hsl(0 0% 20%)" },
  { type: "stimuli", value: 1, fill: "hsl(0 0% 16%)" },
];

/**
 * Prompt reads against everything else.
 *
 * The endpoint counts `prompts_read` and `total_recordings`, so the second
 * slice is the remainder rather than its own figure. A contributor with no
 * clips gets nothing back here, and the caller draws its empty state.
 */
export function toRecordingMix(promptsRead: number, totalRecordings: number) {
  if (totalRecordings <= 0) return [];

  const stimuli = Math.max(0, totalRecordings - promptsRead);
  return [
    { type: "prompts", value: promptsRead, fill: "var(--color-prompts)" },
    { type: "stimuli", value: stimuli, fill: "var(--color-stimuli)" },
  ];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * The last seven days of `daily_activity`, labelled by weekday.
 *
 * The series is 365 buckets, zero-filled, oldest first, so the week is its
 * tail. Dates are read as plain calendar days rather than instants: the API
 * sends them in Africa/Lagos, and parsing `2026-10-19` as UTC would shift the
 * label a day backwards for anybody west of it.
 */
export function toWeeklySessions(daily: { date: string; count: number }[]) {
  return daily.slice(-7).map((point) => {
    const [year, month, day] = point.date.split("-").map(Number);
    const at = new Date(year, (month ?? 1) - 1, day ?? 1);
    return {
      day: WEEKDAYS[at.getDay()] ?? point.date,
      sessions: point.count,
    };
  });
}

export const WEEKLY_SESSIONS = [
  { day: "Mon", sessions: 4 },
  { day: "Tue", sessions: 7 },
  { day: "Wed", sessions: 5 },
  { day: "Thu", sessions: 9 },
  { day: "Fri", sessions: 6 },
  { day: "Sat", sessions: 3 },
  { day: "Sun", sessions: 8 },
];

export const EMPTY_WEEKLY_SESSIONS = WEEKLY_SESSIONS.map((point) => ({
  ...point,
  sessions: 0,
}));

/** The bar's four tracks at zero, so the frame survives an empty breakdown. */
/**
 * Seconds as something a contributor reads at a glance.
 *
 * Hours below a day, days above it. A review that took 31 hours is "1.3d",
 * which answers "is this slow" faster than "31h" does.
 */
export function formatReviewTime(seconds: number | null): string {
  if (seconds == null) return NO_VALUE;

  const hours = seconds / 3600;
  if (hours < 1) return `${Math.max(1, Math.round(seconds / 60))}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export const EMPTY_QUALITY_SEGMENTS: QualitySegment[] = [
  { key: "approved", label: "Approved", value: 0, color: "hsl(var(--alva-accent))" },
  { key: "pending", label: "In review", value: 0, color: "hsl(0 0% 42%)" },
  { key: "rework", label: "Re-record", value: 0, color: "hsl(38 92% 50%)" },
  { key: "rejected", label: "Rejected", value: 0, color: "hsl(0 72% 51%)" },
];

export const EMPTY_QUALITY_INSIGHTS: Insight[] = [
  { label: "Acceptance rate", value: "0%" },
  { label: "Median review time", value: NO_VALUE },
  { label: "This week", value: "0 clips" },
];

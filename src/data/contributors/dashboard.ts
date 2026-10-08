/**
 * Seeded figures for the contributor dashboard.
 *
 * `/dashboard/contributor` returns totals and a status breakdown, not points,
 * not a time series and not a leaderboard, so the charts on that screen have
 * nowhere live to read from yet. Everything they fall back to lives here
 * rather than inside the components, so there is one place to look when the
 * endpoints land and one place to delete when they do.
 *
 * See docs/backend-gaps.md.
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

/** No points endpoint exists. See docs/backend-gaps.md. */
export const MOCK_POINTS = 1420;

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { id: "2", name: "Adaeze Okafor", points: 1180, seed: "adaeze-okafor", avatarBg: "202020" },
  { id: "1", name: "Okonkwo James", points: 1420, seed: "okonkwo-james", avatarBg: "252525" },
  { id: "3", name: "Chioma Eze", points: 960, seed: "chioma-eze", avatarBg: "1a1a1a" },
];

export const RECORDING_MIX = [
  { type: "prompts", value: 58, fill: "var(--color-prompts)" },
  { type: "stimuli", value: 42, fill: "var(--color-stimuli)" },
];

/** Ghost ring, so the donut keeps its shape behind the empty overlay. */
export const EMPTY_RECORDING_MIX = [
  { type: "prompts", value: 1, fill: "hsl(0 0% 20%)" },
  { type: "stimuli", value: 1, fill: "hsl(0 0% 16%)" },
];

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

export const QUALITY_SEGMENTS: QualitySegment[] = [
  { key: "approved", label: "Approved", value: 62, color: "hsl(var(--alva-accent))" },
  { key: "pending", label: "In review", value: 24, color: "hsl(0 0% 42%)" },
  { key: "rework", label: "Re-record", value: 9, color: "hsl(38 92% 50%)" },
  { key: "rejected", label: "Rejected", value: 5, color: "hsl(0 72% 51%)" },
];

export const QUALITY_INSIGHTS: Insight[] = [
  { label: "Acceptance rate", value: "87%" },
  { label: "Avg review time", value: "1.2d" },
  { label: "This week", value: "+12 clips" },
];

export const EMPTY_QUALITY_INSIGHTS: Insight[] = [
  { label: "Acceptance rate", value: "0%" },
  { label: "Avg review time", value: ", " },
  { label: "This week", value: "0 clips" },
];

import { apiFetch } from "./client";

export type ApiStatusBreakdown = {
  submitted: number;
  in_review: number;
  approved: number;
  not_approved: number;
  rejected: number;
  flagged: number;
  total: number;
};

export type ApiContributorDashboard = {
  contributor_id: string;
  total_recordings: number;
  prompts_read: number;
  hours_contributed: number;
  status_breakdown: ApiStatusBreakdown;
  payment?: { status: string; detail: string } | null;
  points: number;
  /** Null until they have enough recordings to be ranked. */
  rank: number | null;
  /** How many contributors are ranked at all, for "4th of 212". */
  ranked_contributors: number;
  /** 365 zero-filled daily buckets. Counts recordings, not hours. */
  daily_activity: ApiDailyActivity[];
  recordings_in_window: number;
  activity_window_days: number;
};

export type ApiInternDashboard = {
  intern_id: string;
  sessions_run: number;
  participants_captured: number;
  hours_recorded: number;
  demographics: {
    by_age_bracket: Record<string, number>;
    by_gender: Record<string, number>;
  };
};

export const contributorDashboard = () =>
  apiFetch<ApiContributorDashboard>("/dashboard/contributor");

export const internDashboard = () => apiFetch<ApiInternDashboard>("/dashboard/intern");

export type ApiDailyActivity = { date: string; count: number };

export type ApiAnnotationStatusBreakdown = {
  draft: number;
  in_progress: number;
  submitted: number;
  approved: number;
  needs_rework: number;
  rejected: number;
  total: number;
};

export type ApiAnnotatorDashboard = {
  annotator_id: string;
  annotations_total: number;
  sessions_annotated: number;
  status_breakdown: ApiAnnotationStatusBreakdown;
  hours_annotated: number;
  segments_created: number;
  tags_applied: number;
  tokens_annotated: number;
  gold_count: number;
  queue_available: number;
  /** 365 days, zero-filled, oldest first, `YYYY-MM-DD` in Africa/Lagos. */
  daily_activity: ApiDailyActivity[];
};

export const annotatorDashboard = () =>
  apiFetch<ApiAnnotatorDashboard>("/dashboard/annotator");

export type ApiEarnings = {
  contributor_id: string;
  entry_count: number;
  totals: Record<string, string>;
  entries: unknown[];
};

export const earnings = () => apiFetch<ApiEarnings>("/payments/earnings");
export const rates = () => apiFetch<unknown[]>("/payments/rates");

/**
 * The podium.
 *
 * `limit` is capped at 3 server side and anything above returns 422: every
 * contributor can read this, so "nobody below third is shown" is enforced
 * there rather than by us.
 *
 * **Ties share a rank.** Every approval pays the same, so ten people with one
 * clip each are a ten-way tie for first, listed in the order they reached that
 * score. A podium can legitimately read 1st, 1st, 1st.
 */
export type ApiLeaderboardEntry = {
  contributor_id: string;
  full_name: string;
  points: number;
  rank: number;
};

export const leaderboard = () =>
  apiFetch<ApiLeaderboardEntry[]>("/points/leaderboard", { query: { limit: 3 } });

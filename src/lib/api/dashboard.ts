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
  /**
   * Median upload-to-verdict time over the same 365-day window.
   *
   * Null below 10 decided clips, which is the agreed floor: a median over
   * three clips is a number about three clips, not about this contributor.
   * A flag is not a decision, so it is not counted.
   */
  median_review_seconds_in_window: number | null;
  /**
   * Progress toward the next ₦5,000 award.
   *
   * Contributors are paid per block of approved clips now, not per clip, so
   * this is what a progress bar reads. `clips_to_next` is never 0: right
   * after an award it is a full block again.
   *
   * Null wherever `payment` is, for example when an intern looks at a
   * contributor.
   */
  milestone: ApiMilestoneProgress | null;
  /** How many decided clips the median is over. */
  decided_in_window: number;
};

export type ApiMilestoneProgress = {
  approved_clips: number;
  clips_per_milestone: number;
  milestones_reached: number;
  clips_to_next: number;
  amount_per_milestone: string;
  amount_per_milestone_kobo: number;
  currency: string;
};

/** One day of an intern's own capture. Zero-filled over the window. */
export type ApiInternDailyActivity = {
  date: string;
  sessions: number;
  participants: number;
  hours: number;
};

export type ApiInternDashboard = {
  intern_id: string;
  sessions_run: number;
  participants_captured: number;
  hours_recorded: number;
  demographics: ApiDemographicBreakdown;
  /** 365 days, zero-filled, oldest first, `YYYY-MM-DD` in Africa/Lagos. */
  daily_activity: ApiInternDailyActivity[];
  activity_window_days: number;
  sessions_in_window: number;
  quality_in_window: ApiQualityRadar;
  participants_in_window: number;
  hours_in_window: number;
};

export const contributorDashboard = () =>
  apiFetch<ApiContributorDashboard>("/dashboard/contributor");

export const internDashboard = () => apiFetch<ApiInternDashboard>("/dashboard/intern");

export type ApiDailyActivity = { date: string; count: number };

/**
 * One axis of the intern quality radar.
 *
 * `score` is null when there is nothing to score yet, which is "no data"
 * rather than zero: an intern with no decided clips has not scored badly on
 * approvals, they have not been measured.
 */
export type ApiRadarAxis = {
  score: number | null;
  numerator: number;
  denominator: number;
};

export type ApiQualityRadar = {
  consent: ApiRadarAxis;
  demographics: ApiRadarAxis;
  audio: ApiRadarAxis;
  participants: ApiRadarAxis;
  clip_approval: ApiRadarAxis;
};

/** One gender in one age bracket. One row per pair that occurs. */
export type ApiGenderAgeCell = {
  gender: string;
  age_bracket: string;
  speakers: number;
};

/**
 * Participant counts, not hours.
 *
 * A focus group is one file with several speakers, so its hours cannot be
 * split by speaker. `by_gender_age` is the real joint, and the two marginals
 * are summed from it, so all three agree.
 *
 * The unit is a speaker in a session: somebody in two sessions counts twice,
 * because participants have no identity across sessions.
 */
export type ApiDemographicBreakdown = {
  by_gender: Record<string, number>;
  by_age_bracket: Record<string, number>;
  by_gender_age: ApiGenderAgeCell[];
};

export type ApiAnnotationStatusBreakdown = {
  draft: number;
  in_progress: number;
  submitted: number;
  approved: number;
  needs_rework: number;
  rejected: number;
  total: number;
};

/** Counts per tag value, one map per family. Empty where nothing is tagged. */
export type ApiTagBreakdown = {
  by_language: Record<string, number>;
  by_disfluency: Record<string, number>;
  by_untranscribable_reason: Record<string, number>;
  by_non_speech_event: Record<string, number>;
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
  /**
   * How many sessions this annotator is holding, and how many they may.
   *
   * `claim_limit` is null for admins, who are not capped. Claiming past the
   * limit is a 409; these two are what let a screen say so beforehand.
   */
  open_claims: number;
  claim_limit: number | null;
  tag_breakdown: ApiTagBreakdown;
  speaker_demographics: ApiDemographicBreakdown;
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

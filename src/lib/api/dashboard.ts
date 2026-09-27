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

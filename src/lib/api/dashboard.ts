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

/* NOTE: there is no /dashboard/annotator. See docs/backend-gaps.md §1. */

export type ApiEarnings = {
  contributor_id: string;
  entry_count: number;
  totals: Record<string, string>;
  entries: unknown[];
};

export const earnings = () => apiFetch<ApiEarnings>("/payments/earnings");
export const rates = () => apiFetch<unknown[]>("/payments/rates");

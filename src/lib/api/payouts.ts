import { apiFetch } from "./client";

/**
 * Pay runs.
 *
 * Money moves in runs, not per contributor: one call pays everybody who is
 * eligible, matured and above the minimum. There is deliberately no
 * per-person advance — a withdrawal a contributor starts themselves goes
 * through this same machinery, so it cannot become a weaker second route to
 * the same money.
 */

export type ApiPayRunRecipient = {
  user_id: string;
  email: string;
  amount: string;
};

/** What the next run would do, before anybody commits to it. */
export type ApiPayRunPreview = {
  currency: string;
  recipient_count: number;
  total_amount: string;
  /** Below this, a contributor is carried to the next run rather than paid. */
  minimum_amount: string;
  recipients: ApiPayRunRecipient[];
};

export type ApiPayoutRunItem = {
  id: string;
  user_id: string | null;
  amount: string;
  currency: string;
  status: "pending" | "sending" | "transferred" | "failed" | "skipped" | "unknown";
  attempts: number;
  failure_reason: string | null;
  settled_at: string | null;
};

export type ApiPayoutRun = {
  id: string;
  reference: string;
  currency: string;
  status: "in_progress" | "completed" | "partial" | "failed";
  total_amount: string;
  recipient_count: number;
  succeeded_count: number;
  failed_count: number;
  created_at: string;
  completed_at: string | null;
  items: ApiPayoutRunItem[];
};

export const payoutPreview = () => apiFetch<ApiPayRunPreview>("/payouts/preview");

export const listPayoutRuns = (limit = 20) =>
  apiFetch<ApiPayoutRun[]>("/payouts/runs", { query: { limit } });

/**
 * Starts a run.
 *
 * An item that comes back `unknown` is not a failure and the money is not
 * lost: it settles by webhook or reconciliation later.
 */
export const startPayoutRun = (notes?: string) =>
  apiFetch<ApiPayoutRun>("/payouts/runs", {
    method: "POST",
    body: notes ? { notes } : {},
  });

/**
 * Back-pays milestones reached before milestone pay shipped.
 *
 * A preview by default: who would be credited what, and the total. `apply`
 * credits it. Safe to run twice — a second run finds nothing due — which is
 * why the confirm step can be a plain confirm rather than a guarded one.
 */
export const syncMilestones = (apply = false) =>
  apiFetch<{
    contributors: number;
    total_award: string;
    currency: string;
    /** False on a preview: nothing was credited. */
    applied: boolean;
  }>("/payments/milestones/sync", {
    method: "POST",
    query: apply ? { apply: true } : undefined,
  });

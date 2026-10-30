import { apiFetch } from "./client";
import type { ApiLedgerEntry } from "./wallet";

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

/**
 * Two accounts the API thinks are one person, usually the same NIN.
 *
 * Payouts on both are held until an admin decides, so an unresolved flag is
 * somebody not being paid rather than a note for later.
 */
export type ApiDuplicateFlag = {
  id: string;
  /** `identity_reuse` or `destination_reuse`. */
  kind: string;
  status: string;
  user_id: string;
  matched_user_id: string | null;
  detail: string | null;
  created_at: string;
  resolved_at?: string | null;
  resolved_by_id?: string | null;
  resolution_notes?: string | null;

  /**
   * What upholding this flag did, filled in only once it has been.
   *
   * Upholding closes **every** account the flag names, the first one
   * included: deactivated, token dead, wallet blocked, unsent earnings
   * voided. So an admin pressing it ends more than one person's access and
   * more than one person's unpaid work.
   *
   * `in_flight_entries` is the part that cannot be undone — payments
   * already on their way, which voiding cannot call back.
   *
   * All three are **null in the flag list**, meaning "not computed here"
   * rather than "none". A zero would be a claim the list has not made.
   */
  closed_user_ids?: string[] | null;
  voided_amount_kobo?: number | null;
  in_flight_kobo?: number | null;
  in_flight_entries?: number | null;

  /**
   * What upholding would do, worked out without doing it.
   *
   * Only on `GET /payouts/duplicate-flags/{id}`, and only while the flag is
   * open. Null in the list, and null once resolved.
   *
   * Read it when the confirm opens, not earlier: these are the figures as
   * they stand at that moment, and money moves.
   */
  if_upheld?: ApiUpholdPreview | null;
};

export type ApiUpholdAccount = {
  user_id: string;
  full_name: string;
  email: string;
  /** Earned, not sent. Upholding voids this. */
  unpaid_kobo: number;
  /** Already on its way. Upholding cannot call it back. */
  in_flight_kobo: number;
  in_flight_entries: number;
};

/**
 * Two separate totals, not one.
 *
 * `voided_amount_kobo` is money the uphold destroys. `in_flight_kobo` is
 * money it cannot reach. Adding them would overstate what the admin is
 * deciding and understate what is already lost.
 */
export type ApiUpholdPreview = {
  accounts: ApiUpholdAccount[];
  voided_amount_kobo: number;
  in_flight_kobo: number;
  in_flight_entries: number;
};

export const getDuplicateFlag = (flagId: string) =>
  apiFetch<ApiDuplicateFlag>(`/payouts/duplicate-flags/${flagId}`);

/**
 * Decides a flag.
 *
 * `uphold: false` dismisses it — the hold comes off and both accounts carry
 * on, which is the safe direction and the one most flags take.
 *
 * `uphold: true` is the other kind of action entirely: **every account the
 * flag names is closed**, the first one included. Deactivated, tokens dead,
 * wallets blocked, every unsent earning voided. The answer carries
 * `closed_user_ids`, `voided_amount_kobo` and `in_flight_entries` — what it
 * did, after it has done it.
 *
 * `notes` is recorded on the flag either way, and is what the next admin
 * reads instead of guessing why.
 */
export const resolveDuplicateFlag = (
  flagId: string,
  body: { uphold: boolean; notes?: string }
) =>
  apiFetch<ApiDuplicateFlag>(`/payouts/duplicate-flags/${flagId}/resolve`, {
    method: "POST",
    body,
  });

export const listDuplicateFlags = (status = "open", limit = 50) =>
  apiFetch<ApiDuplicateFlag[]>("/payouts/duplicate-flags", {
    query: { status, limit },
  });

/**
 * Emails the contributors whose identity check the 27 Oct migration reset.
 *
 * They verified a NIN, saw "Verified", and kept recording. The check behind
 * that no longer counts, and the wallet can only tell somebody who opens the
 * wallet — the people most affected are the ones who stopped looking because
 * it was done. Their next withdrawal would be the first they heard of it.
 *
 * A preview by default. `apply` queues the mail, one per person, and is safe
 * to repeat: `notified` says who already has one, and the list is checked
 * again at send time so anybody who submits a document in the meantime drops
 * off it.
 *
 * `503` means email is not configured, and is a refusal rather than a quiet
 * success — the one failure mode that would otherwise look like it worked.
 */
export type ApiIdentityRecheckRow = {
  user_id: string;
  full_name: string;
  email: string;
  /** Already emailed by an earlier run. */
  notified: boolean;
};

export const identityRecheck = (apply = false) =>
  apiFetch<{
    /** False on a preview: nothing was sent. */
    applied: boolean;
    count: number;
    queued: number;
    contributors: ApiIdentityRecheckRow[];
  }>("/payouts/identity-recheck", {
    method: "POST",
    query: apply ? { apply: true } : undefined,
  });

/**
 * The pay terms, as the API applies them.
 *
 * Read rather than hardcoded. Every number here has already changed once —
 * ₦5,000 per 500 clips, a 1,000-clip week, a 24-hour hold and a ₦1,000
 * minimum all went on 29 Oct — and a rate typed into a component is a
 * sentence that keeps being true on screen after it stops being true in the
 * ledger.
 */
export type ApiPaymentTerms = {
  currency: string;
  sentence_rate_kobo: number;
  narration_rate_per_hour_kobo: number;
  payout_minimum_kobo: number;
  /** `sunday`, as the API words it. */
  pay_day: string;
  next_pay_day: string;
  /** Work approved before this goes in the coming run. */
  next_run_cutoff: string;
  prompt_read_daily_limit: number;
  narration_daily_seconds: number;
  /** The longest single take, in recorded seconds. */
  narration_max_seconds: number;
  /** A pause longer than this is trimmed out of speaking time. */
  long_pause_seconds: number;
};

export const paymentTerms = () => apiFetch<ApiPaymentTerms>("/payments/terms");

/**
 * Re-prices work approved before the new terms, and credits the difference.
 *
 * A preview by default. It pays each active contributor's approved work at
 * the new rates **less everything ever credited to them** — old per-clip pay,
 * milestones and voids included — so anybody already paid more keeps it and
 * nobody is paid twice. Safe to run again.
 *
 * `unmeasured_narrations` is the honest part: old narrations are measured
 * from their files, and any that cannot be read are paid on their recorded
 * length instead of their speaking time. That is generous rather than
 * accurate, and an admin should be able to see how much of the award it is.
 */
export type ApiBackPayRow = {
  contributor_id: string;
  full_name: string;
  approved_sentences: number;
  approved_narration_seconds: number;
  /** Paid on recorded length because the audio could not be measured. */
  unmeasured_narrations: number;
  owed: string;
  already_credited: string;
  award: string;
  award_kobo: number;
};

export const backPay = (apply = false) =>
  apiFetch<{
    applied: boolean;
    /** A **count**, not the rows. The rows are `awards`. */
    contributors: number;
    awards: ApiBackPayRow[];
    total_award: string;
    total_award_kobo: number;
    currency: string;
  }>("/payments/back-pay", {
    method: "POST",
    query: apply ? { apply: true } : undefined,
  });

/**
 * One contributor's ledger, read by an admin.
 *
 * `GET /payments/earnings` is the caller's own. This is the same list for
 * somebody else, and it is what makes a void possible at all: the payments
 * table is aggregated per contributor, and a void needs the id of a single
 * entry.
 */
export const contributorLedger = (
  contributorId: string,
  query: { limit?: number; offset?: number } = {}
) =>
  apiFetch<{
    contributor_id: string;
    entry_count: number;
    totals: Record<string, string>;
    entries: ApiLedgerEntry[];
  }>(`/payments/earnings/${contributorId}`, { query });

/**
 * Cancels one earning.
 *
 * **The entry stays in the ledger**, voided, with the reason on its notes —
 * it is an audit record, not a deletion, which is why a reason is required
 * rather than optional. Three characters minimum, five hundred maximum.
 *
 * Only an entry that has not gone anywhere can be voided. One already paid
 * or in flight is money that has left, and voiding it would make the ledger
 * disagree with the bank.
 */
export const voidLedgerEntry = (entryId: string, reason: string) =>
  apiFetch<ApiLedgerEntry>(`/payouts/ledger/${entryId}/void`, {
    method: "POST",
    body: { reason },
  });

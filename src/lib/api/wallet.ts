import { apiFetch } from "./client";

/**
 * The contributor's wallet.
 *
 * Two things shape every screen that reads this. **A verified NIN is the only
 * route to being paid** — without one there is no payout destination to
 * collect and no eligibility for a run — and **earnings are not immediately
 * payable**: a ledger entry matures through a hold window first, which is the
 * only period in which a mis-credit can still be voided.
 *
 * Hence four buckets rather than a balance. `payable` is what a run would send
 * now; showing one number a contributor cannot withdraw reads as a broken
 * button.
 */

export type ApiIdentityStatus =
  | "not_started"
  | "link_created"
  | "submitted"
  | "passed"
  | "failed"
  | "unavailable";

export type ApiWalletStatus =
  | "not_created"
  | "onboarding"
  | "active"
  | "restricted"
  | "blocked";

export type ApiEarnings = {
  currency: string;
  held: string;
  payable: string;
  in_flight: string;
  paid: string;
  /** Integers. The decimals above are JSON strings so JS never floats money. */
  held_kobo: number;
  payable_kobo: number;
  in_flight_kobo: number;
  paid_kobo: number;
  lifetime_kobo: number;
};

export type ApiWalletStatusOut = {
  wallet: {
    id: string;
    status: ApiWalletStatus;
    identity_status: ApiIdentityStatus;
    identity_failure_reason: string | null;
    transfers_capability: string | null;
    payouts_capability: string | null;
  } | null;
  earnings: ApiEarnings;
  /** What the contributor has to do next. Drives the verification gate. */
  next_action: string | null;
  next_action_detail: string | null;
};

export const getWallet = () => apiFetch<ApiWalletStatusOut>("/wallet");

export type ApiBank = { code: string; name: string };

export const listBanks = () => apiFetch<ApiBank[]>("/banks");

export type ApiPayoutDestination = {
  bank_code: string;
  bank_name: string | null;
  account_number: string;
  account_name: string | null;
};

export const getPayoutDestination = () =>
  apiFetch<ApiPayoutDestination | null>("/wallet/payout-destination");

/** Performs name enquiry server side and returns the resolved account name. */
export const setPayoutDestination = (body: {
  bank_code: string;
  account_number: string;
}) =>
  apiFetch<ApiPayoutDestination>("/wallet/payout-destination", {
    method: "POST",
    body,
  });

export const submitNin = (nin: string) =>
  apiFetch<{ identity_status: ApiIdentityStatus }>("/wallet/identity/nin", {
    method: "POST",
    body: { nin },
  });

/**
 * A withdrawal is a pay run with a single recipient.
 *
 * It runs the same eligibility, minimum, balance and transfer machinery an
 * admin run uses, deliberately, so it cannot become a weaker second route to
 * the same money.
 *
 * Expect **409** twice over: nothing matured above the minimum, or a payment
 * to this person already in flight. The second is "already on its way" rather
 * than an error to retry, which is what stops a double tap sending twice.
 */
export const withdraw = () =>
  apiFetch<{ id: string; status: string }>("/wallet/withdrawals", {
    method: "POST",
  });

export type ApiLedgerEntry = {
  id: string;
  recording_id: string;
  unit_type: string;
  amount: string;
  currency: string;
  payout_status: "pending" | "in_flight" | "paid" | "voided";
  notes: string | null;
  created_at: string;
};

export const listEarnings = (query: { limit?: number; offset?: number } = {}) =>
  apiFetch<{
    contributor_id: string;
    entry_count: number;
    totals: Record<string, string>;
    entries: ApiLedgerEntry[];
  }>("/payments/earnings", { query });

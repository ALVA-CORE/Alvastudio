import { apiFetch } from "./client";

/**
 * The contributor's wallet.
 *
 * Two things shape every screen that reads this. **Identity has to clear
 * before money can move** — without it there is no payout destination to
 * collect and no eligibility for a run — and **earnings are not immediately
 * payable**: a ledger entry matures through a hold window first, which is the
 * only period in which a mis-credit can still be voided.
 *
 * Hence four buckets rather than a balance. `payable` is what a run would send
 * now; showing one number a contributor cannot withdraw reads as a broken
 * button.
 *
 * Identity is checked by **document review** since 27 Oct 2026. The old
 * NIN-and-selfie call answers 410 and is gone from this module.
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
  /**
   * What the contributor has to do next, and the thing to follow.
   *
   * Not `wallet.status: active`, and not `identity_status` alone: a passed
   * identity clears the identity gate only, while payout capability, a bank
   * destination, account blocks and the hold window all still apply. The API
   * has already weighed those, so this is the one field that knows.
   *
   * Typed as a union with a `string` escape so a value we have not met yet
   * arrives intact rather than being narrowed away.
   */
  next_action: ApiNextAction | null;
  next_action_detail: string | null;
};

export type ApiNextAction =
  | "create_account"
  | "verify_identity"
  | "await_verification"
  | "await_review"
  | "add_payout_destination"
  | "complete_onboarding"
  | "none"
  | (string & {});

export const getWallet = () => apiFetch<ApiWalletStatusOut>("/wallet");

export type ApiBank = { code: string; name: string };

export const listBanks = () => apiFetch<ApiBank[]>("/banks");

/**
 * `PayoutDestinationOut`.
 *
 * The account number never comes back — only its last four digits, which is
 * the right call and the reason this type cannot be round-tripped into the
 * form that created it. There is no bank name either, only the code, so a
 * display name is resolved against `GET /banks`.
 */
export type ApiPayoutDestination = {
  id: string;
  destination_type: string;
  bank_code: string;
  account_name: string | null;
  account_last4: string;
  /** False while the destination is still being set up at the payment rail. */
  is_usable: boolean;
  bachs_destination_id: string | null;
  created_at: string;
};

/** A LIST, not one destination. An account can have several on file. */
export const listPayoutDestinations = () =>
  apiFetch<ApiPayoutDestination[]>("/wallet/payout-destination");

/** Performs name enquiry server side and returns the resolved account name. */
export const setPayoutDestination = (body: {
  bank_code: string;
  account_number: string;
}) =>
  apiFetch<ApiPayoutDestination>("/wallet/payout-destination", {
    method: "POST",
    body,
  });

/**
 * How identity can be verified on this deployment.
 *
 * Read before offering the form, because the answer changed under us once
 * already: `POST /wallet/identity/nin` now answers **410**, `nin_available`
 * is false, and document review is the only route left. A capability probe
 * means the next switch shows as "not available right now" rather than as a
 * filled-in form that is refused on submit.
 *
 * Failing to read it is not a reason to block anybody — see the sheet, which
 * assumes available when this call does not answer.
 */
export type ApiIdentityMethods = {
  document_available: boolean;
  nin_available: boolean;
  hosted_available: boolean;
};

export const getIdentityMethods = () =>
  apiFetch<ApiIdentityMethods>("/wallet/identity/methods");

/**
 * Creates the wallet itself.
 *
 * `next_action: "create_account"` is the API saying there is nothing yet to
 * attach an identity to. It takes no body and is the first step of the gate,
 * not a setting anybody chooses.
 */
export const createWalletAccount = () =>
  apiFetch<unknown>("/wallet/account", { method: "POST" });

/**
 * A provider-hosted page to finish setting up.
 *
 * Requested **only when somebody clicks**, then redirected to immediately:
 * these links are short-lived, and one minted on page load is usually dead by
 * the time it is used.
 */
export const createOnboardingLink = () =>
  apiFetch<{ url: string }>("/wallet/onboarding-link", { method: "POST" });

/**
 * An identity document, for review.
 *
 * This replaces the NIN-and-selfie call, which is now **410**. The difference
 * is not cosmetic: that was a face match against a government record and came
 * back in minutes, this is a person reading a document, so the honest thing to
 * say afterwards is "submitted", never "verified".
 *
 * `consent` is required and must be true. It is a parameter rather than a
 * constant because hardcoding `true` would mean attesting on somebody's
 * behalf, which is the one thing a consent flag must not do.
 *
 * Both images are bare base64, no `data:` prefix, and both sides must be the
 * type declared in `document_content_type` — see `lib/identity/document.ts`,
 * which is the only thing that should be building this body.
 *
 * Nothing in here is ever stored, logged or put in a draft. The NIN is
 * fingerprinted server-side and never comes back.
 */
export type ApiIdentityDocumentBody = {
  nin: string;
  consent: boolean;
  first_name: string;
  last_name: string;
  /** `YYYY-MM-DD`. */
  dob: string;
  document_content_type: string;
  document_base64: string;
  /** Omitted entirely for a one-sided document, rather than sent as null. */
  document_back_base64?: string;
};

export type ApiIdentitySubmission = {
  status: string;
  detail: string;
  verification_url: string | null;
};

export const submitIdentityDocument = (body: ApiIdentityDocumentBody) =>
  apiFetch<ApiIdentitySubmission>("/wallet/identity/documents", {
    method: "POST",
    body,
  });

/**
 * A withdrawal is a pay run with a single recipient.
 *
 * It runs the same eligibility, minimum, balance and transfer machinery an
 * admin run uses, deliberately, so it cannot become a weaker second route to
 * the same money.
 *
 * **Sundays only since 29 Oct.** Any other day answers `409` naming the next
 * one. The minimum is ₦5,000, and a balance under it carries over rather
 * than being lost — which the refusal says, so it is shown as sent.
 *
 * Expect `409` three ways now: the wrong day, under the minimum, or a
 * payment to this person already in flight. The last is "already on its way"
 * rather than an error to retry, which is what stops a double tap sending
 * twice.
 */
export const withdraw = () =>
  apiFetch<{ id: string; status: string }>("/wallet/withdrawals", {
    method: "POST",
  });

export type ApiLedgerEntry = {
  id: string;
  /**
   * `milestone` is an award for a block of 500 approved clips; `clip` is the
   * old per-clip pay, which still exists on older rows and still pays out.
   */
  /**
   * `recording` is the pay-per-approval earning introduced on 29 Oct, and
   * `top_up` is back-pay for work approved before those rates. `clip` and
   * `milestone` are history: they still exist on older rows and still pay
   * out, so neither can be dropped from this union.
   */
  kind?: "recording" | "top_up" | "milestone" | "clip";
  /** @deprecated 1 = 500 clips, 2 = 1,000. Only on historical rows. */
  milestone_number?: number | null;
  /** Null on a milestone award: it is not about one recording. */
  recording_id: string | null;
  /** Null on a milestone award: it is not priced per unit. */
  unit_type: string | null;
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

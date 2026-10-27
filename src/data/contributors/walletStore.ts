import { useCallback, useEffect, useState } from "react";
import {
  createOnboardingLink,
  createWalletAccount,
  listBanks,
  listPayoutDestinations,
  getWallet,
  listEarnings,
  setPayoutDestination,
  submitIdentityDocument as postIdentityDocument,
  withdraw,
  type ApiIdentityStatus,
  type ApiLedgerEntry,
} from "@/lib/api/wallet";
import type { IdentitySubmission } from "@/components/contributors/wallet/VerifyIdentitySheet";
import { reportApiError } from "@/lib/api/reportApiError";
import {
  EMPTY_WALLET,
  type IdentityState,
  type Wallet,
  type WalletEntry,
  type WalletEntryKind,
} from "@/data/contributors/wallet";

/**
 * The contributor's wallet, read from the API.
 *
 * Three calls: the wallet itself, where money would land, and the ledger.
 * They are separate endpoints because they are separately authorised — the
 * destination is only collectable once identity passes — and joining them here
 * keeps the screens reading one object.
 */

/**
 * Six identity states collapse to four on screen.
 *
 * `link_created` and `submitted` are both "we are checking", because from the
 * contributor's side they are the same wait. `failed` is kept apart from
 * `not_started` on purpose: telling somebody whose document was rejected to
 * "verify your identity" sends them round the same loop with no idea it
 * already went wrong once.
 */
const IDENTITY: Record<ApiIdentityStatus, IdentityState> = {
  not_started: "unverified",
  link_created: "pending",
  submitted: "pending",
  passed: "verified",
  failed: "failed",
  unavailable: "unverified",
};

/**
 * `next_action` overrides the status where the two can disagree.
 *
 * The status describes the last check; the action describes the present. A
 * submission held for a person to look at reads `await_review` while the
 * status is still whatever the automated pass concluded, and the review is
 * the thing the contributor is actually waiting on.
 */
function identityFrom(
  status: ApiIdentityStatus | undefined,
  action: string | null
): IdentityState {
  if (action === "await_review") return "blocked";
  if (action === "await_verification") return "pending";
  return IDENTITY[status ?? "not_started"];
}

/** How often a pending review is re-read while the tab is in front. */
const POLL_MS = 20_000;

const KIND: Record<string, WalletEntryKind> = {
  prompt_read: "earned",
  stimuli_narration: "earned",
  focus_group_minute: "earned",
  annotation_minute: "earned",
  review: "earned",
};

/**
 * One line of the ledger.
 *
 * A milestone award has no `recording_id` and no `unit_type`: it is paid for
 * reaching 500 approved clips, not for one clip. Reading `unit_type` blindly
 * threw on the first award.
 */
function toEntry(api: ApiLedgerEntry): WalletEntry {
  const naira = Number(api.amount);
  const milestone = api.kind === "milestone";

  return {
    id: api.id,
    kind:
      api.payout_status === "paid"
        ? "withdrawal"
        : milestone
          ? "bonus"
          : (KIND[api.unit_type ?? ""] ?? "earned"),
    label:
      api.notes ??
      (milestone
        ? `Milestone ${api.milestone_number ?? ""}`.trim()
        : (api.unit_type ?? "Earned").replace(/_/g, " ")),
    /* Money is kobo everywhere in this client. The decimals are JSON strings
     * precisely so nobody floats them, so they are parsed once, here. */
    amountKobo: Math.round((Number.isFinite(naira) ? naira : 0) * 100),
    at: new Date(api.created_at).getTime(),
  };
}

export function useWallet({ watch = false }: { watch?: boolean } = {}) {
  const [wallet, setWallet] = useState<Wallet>(EMPTY_WALLET);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getWallet(),
      /* Both are expected to fail before identity passes: there is no
       * destination to collect and no ledger to read. Neither is an error the
       * contributor should see. */
      listPayoutDestinations().catch(() => []),
      listEarnings({ limit: 50 }).catch(() => null),
      /* Only for turning a bank code into a name: the destination carries the
       * code and nothing else readable. Failing is fine, the code shows. */
      listBanks().catch(() => []),
    ])
      .then(([status, destinations, earnings, banks]) => {
        if (cancelled) return;

        /* A usable one first. An account can have several on file, and one
         * still being set up at the payment rail cannot be paid into. */
        const destination =
          destinations.find((entry) => entry.is_usable) ?? destinations[0];
        const bankName = destination
          ? (banks.find((bank) => bank.code === destination.bank_code)?.name ??
            destination.bank_code)
          : "";

        setWallet({
          balanceKobo: status.earnings.payable_kobo,
          pendingKobo: status.earnings.held_kobo,
          inFlightKobo: status.earnings.in_flight_kobo,
          paidKobo: status.earnings.paid_kobo,
          lifetimeKobo: status.earnings.lifetime_kobo,
          identity: identityFrom(
            status.wallet?.identity_status,
            status.next_action
          ),
          identityDetail:
            status.wallet?.identity_failure_reason ?? status.next_action_detail,
          nextAction: status.next_action,
          /* The number itself never comes back, only its last four digits,
           * so what is shown is a mask rather than the account. */
          payoutAccount: destination
            ? {
                bank: bankName,
                accountNumber: `••••${destination.account_last4}`,
                accountName: destination.account_name ?? "",
              }
            : null,
          entries: (earnings?.entries ?? []).map(toEntry),
        });
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load your wallet."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  /**
   * Watches a review that is still running.
   *
   * Document review has no webhook to us and no "it is done" moment the page
   * would otherwise notice, so a contributor who submitted and stayed on the
   * dashboard would sit in front of a stale "we are checking" until they
   * reloaded by hand.
   *
   * Three things keep it modest. It only runs while something is actually
   * pending, it only runs while the tab is in front — a backgrounded phone
   * polling every twenty seconds is somebody's data allowance — and it
   * re-reads once on return, which is when the answer has usually arrived.
   *
   * Opt-in, because `useWallet` is called from several components on one
   * screen and they should not each run their own timer. The wallet card
   * asks for it; the nudges and the profile row do not.
   */
  const pending = wallet.identity === "pending" || wallet.identity === "blocked";

  useEffect(() => {
    if (!watch || !pending) return;

    const timer = window.setInterval(() => {
      if (!document.hidden) reload();
    }, POLL_MS);

    const onVisible = () => {
      if (!document.hidden) reload();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [watch, pending, reload]);

  return { wallet, isLoading, error, reload };
}

/**
 * Submits an identity document for review.
 *
 * Creates the wallet first when the API says there is none — `create_account`
 * is the step before `verify_identity`, and a document posted without
 * somewhere to attach it is refused. One tap on the contributor's side
 * either way.
 *
 * The back image is **omitted** rather than sent as null when there is no
 * second side, because the field is optional and a null is not the same
 * thing as an absence to a validator.
 */
export async function submitIdentityDocument(
  submission: IdentitySubmission,
  { needsAccount = false }: { needsAccount?: boolean } = {}
) {
  if (needsAccount) await createWalletAccount();

  return postIdentityDocument({
    nin: submission.nin,
    consent: submission.consent,
    first_name: submission.firstName,
    last_name: submission.lastName,
    dob: submission.dob,
    document_content_type: submission.front.contentType,
    document_base64: submission.front.base64,
    ...(submission.back ? { document_back_base64: submission.back.base64 } : {}),
  });
}

export async function linkPayoutAccount(bankCode: string, accountNumber: string) {
  return setPayoutDestination({ bank_code: bankCode, account_number: accountNumber });
}

export { createOnboardingLink, withdraw };

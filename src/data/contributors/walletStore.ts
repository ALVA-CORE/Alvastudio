import { useCallback, useEffect, useState } from "react";
import {
  listBanks,
  listPayoutDestinations,
  getWallet,
  listEarnings,
  setPayoutDestination,
  submitNin,
  withdraw,
  type ApiIdentityStatus,
  type ApiLedgerEntry,
} from "@/lib/api/wallet";
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
 * Six identity states collapse to three on screen.
 *
 * `link_created` and `submitted` are both "we are checking", because from the
 * contributor's side they are the same wait. `failed` is kept apart from
 * `not_started` on purpose: telling somebody whose NIN was rejected to "verify
 * your identity" sends them round the same loop with no idea it already went
 * wrong once.
 */
const IDENTITY: Record<ApiIdentityStatus, IdentityState> = {
  not_started: "unverified",
  link_created: "pending",
  submitted: "pending",
  passed: "verified",
  failed: "failed",
  unavailable: "unverified",
};

const KIND: Record<string, WalletEntryKind> = {
  prompt_read: "earned",
  stimuli_narration: "earned",
  focus_group_minute: "earned",
  annotation_minute: "earned",
  review: "earned",
};

function toEntry(api: ApiLedgerEntry): WalletEntry {
  const naira = Number(api.amount);
  return {
    id: api.id,
    kind: api.payout_status === "paid" ? "withdrawal" : (KIND[api.unit_type] ?? "earned"),
    label: api.notes ?? api.unit_type.replace(/_/g, " "),
    /* Money is kobo everywhere in this client. The decimals are JSON strings
     * precisely so nobody floats them, so they are parsed once, here. */
    amountKobo: Math.round((Number.isFinite(naira) ? naira : 0) * 100),
    at: new Date(api.created_at).getTime(),
  };
}

export function useWallet() {
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
          identity: IDENTITY[status.wallet?.identity_status ?? "not_started"],
          identityDetail:
            status.wallet?.identity_failure_reason ?? status.next_action_detail,
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

  return { wallet, isLoading, error, reload };
}

export async function linkPayoutAccount(bankCode: string, accountNumber: string) {
  return setPayoutDestination({ bank_code: bankCode, account_number: accountNumber });
}

export { submitNin, withdraw };

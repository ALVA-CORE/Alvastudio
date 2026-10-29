import { useCallback, useEffect, useState } from "react";
import { contributorLedger } from "@/lib/api/payouts";
import { reportApiError } from "@/lib/api/reportApiError";
import type { ApiLedgerEntry } from "@/lib/api/wallet";

/**
 * One contributor's individual earnings, for an admin.
 *
 * The payments table is aggregated per person, which is the right shape for
 * deciding who to pay and the wrong one for fixing a mistake: a void needs
 * the id of a single entry, and the aggregate row's id is the contributor's.
 *
 * Only fetched when a panel is open on somebody. An admin scrolling a table
 * of four hundred contributors does not need four hundred ledgers.
 */
export function useContributorLedger(contributorId: string | undefined, enabled: boolean) {
  const [entries, setEntries] = useState<ApiLedgerEntry[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || !contributorId) return;
    let cancelled = false;
    setLoading(true);

    contributorLedger(contributorId, { limit: 100 })
      .then((page) => {
        if (cancelled) return;
        setEntries(page.entries);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load their earnings."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [contributorId, enabled, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return { entries, isLoading, error, reload };
}

/**
 * Whether this entry can still be cancelled.
 *
 * Paid and in-flight money has left. Voiding it would make the ledger
 * disagree with the bank rather than correct it, and the API refuses — so
 * the action is not offered rather than offered and refused.
 */
export function canVoid(entry: ApiLedgerEntry) {
  return entry.payout_status === "pending";
}

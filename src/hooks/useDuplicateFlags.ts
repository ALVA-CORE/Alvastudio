import { useCallback, useEffect, useState } from "react";
import {
  listDuplicateFlags,
  resolveDuplicateFlag,
  type ApiDuplicateFlag,
} from "@/lib/api/payouts";
import { reportApiError } from "@/lib/api/reportApiError";

/**
 * Two accounts the API believes are one person.
 *
 * An open flag is not a note for later: payouts are held on the newer
 * account until somebody decides, so every day a flag sits here is a day a
 * contributor is not paid. That is why it is a worklist rather than a
 * History tab.
 *
 * Only the newer account is held, deliberately — somebody typing a
 * stranger's NIN cannot freeze the stranger's pay.
 */
export function useDuplicateFlags(enabled: boolean) {
  const [flags, setFlags] = useState<ApiDuplicateFlag[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [isWorking, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);

    listDuplicateFlags("open", 100)
      .then((rows) => {
        if (cancelled) return;
        setFlags(rows);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load the flags."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  /**
   * Decides one, and returns what it did.
   *
   * Null on failure. The caller needs the answer rather than just success:
   * upholding reports how many accounts it closed and how much it voided,
   * and that is the only moment those numbers exist.
   */
  const resolve = useCallback(
    async (flagId: string, uphold: boolean, notes: string) => {
      setWorking(true);
      setError(null);

      try {
        const result = await resolveDuplicateFlag(flagId, { uphold, notes });
        /* Gone from the list either way: this reads open flags, and a
           decided one is no longer open. */
        setFlags((rows) => rows.filter((row) => row.id !== flagId));
        return result;
      } catch (cause) {
        setError(reportApiError(cause, "Could not decide that flag."));
        return null;
      } finally {
        setWorking(false);
      }
    },
    []
  );

  return { flags, isLoading, isWorking, error, resolve, reload };
}

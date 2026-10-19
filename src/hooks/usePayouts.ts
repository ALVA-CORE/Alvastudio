import { useCallback, useEffect, useState } from "react";
import {
  listPayoutRuns,
  payoutPreview,
  startPayoutRun,
  type ApiPayRunPreview,
  type ApiPayoutRun,
} from "@/lib/api/payouts";
import { reportApiError } from "@/lib/api/reportApiError";

/**
 * The next run, and the ones already made.
 *
 * Both read on mount, because the question an admin opens this page with is
 * "is there money to send", and the answer only means anything next to what
 * was sent last time.
 */
export function usePayouts() {
  const [preview, setPreview] = useState<ApiPayRunPreview | null>(null);
  const [runs, setRuns] = useState<ApiPayoutRun[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isRunning, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([payoutPreview(), listPayoutRuns()])
      .then(([next, history]) => {
        if (cancelled) return;
        setPreview(next);
        setRuns(history);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load payouts."));
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
   * Sends the money.
   *
   * Reloads rather than patching state from the response: a run changes every
   * contributor's buckets as well as its own row, and guessing at that would
   * put two versions of the same money on one screen.
   */
  const run = useCallback(async () => {
    setRunning(true);
    try {
      const started = await startPayoutRun();
      reload();
      return started;
    } finally {
      setRunning(false);
    }
  }, [reload]);

  return { preview, runs, isLoading, isRunning, error, reload, run };
}

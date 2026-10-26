import { useCallback, useEffect, useState } from "react";
import { DEMO_FEEDBACK } from "@/data/admin/demo";
import { useDevUiState } from "@/hooks/use-dev-ui-state";
import {
  isMissingRoute,
  listFeedback,
  setFeedbackStatus,
  type ApiFeedback,
  type FeedbackStatus,
} from "@/lib/api/feedback";
import { reportApiError } from "@/lib/api/reportApiError";

/**
 * Everything people have told us, for the admin table.
 *
 * `POST /feedback` and `GET /feedback` are not in the API yet, so a missing
 * route is treated as an empty list rather than an error. That distinction
 * matters on screen: "nobody has written in" is a true empty state, while a
 * red banner about a 404 would be an engineering detail in front of an admin
 * who can do nothing about it.
 */
export function useFeedback() {
  const { forceDemo: demo } = useDevUiState();
  const [rows, setRows] = useState<ApiFeedback[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    /* Demo mode short-circuits the request, as every other admin hook does.
     * The route does not exist yet, so without this the table is empty in a
     * recording and there is nothing to show of it. */
    if (demo) {
      setRows(DEMO_FEEDBACK);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    listFeedback({ limit: 200 })
      .then((page) => {
        if (cancelled) return;
        setRows(page.items);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setRows([]);
        setError(isMissingRoute(cause) ? null : reportApiError(cause, "Could not load feedback."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, demo]);

  const setStatus = useCallback(
    async (id: string, status: FeedbackStatus) => {
      /* Moved on screen first. Marking three as read should not feel like
         three round trips, and a failure puts the old value back. */
      const previous = rows;
      setRows((current) =>
        current.map((row) => (row.id === id ? { ...row, status } : row))
      );

      /* Nothing to send in demo mode: the move on screen is the whole point,
         and a 404 would snap the row back mid-recording. */
      if (demo) return;

      try {
        await setFeedbackStatus(id, status);
      } catch (cause) {
        setRows(previous);
        throw cause;
      }
    },
    [rows, demo]
  );

  return {
    rows,
    isLoading,
    error,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
    setStatus,
  };
}

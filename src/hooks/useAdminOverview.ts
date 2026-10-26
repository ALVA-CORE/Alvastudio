import { useCallback, useEffect, useState } from "react";
import {
  adminDashboard,
  type ApiAdminDashboard,
} from "@/lib/api/adminDashboard";
import { reportApiError } from "@/lib/api/reportApiError";
import type { GrowthPoint } from "@/data/admin/corpus";

/**
 * The admin overview.
 *
 * One request. Everything the page shows is on `/dashboard/admin`, including
 * the three stuck-work counts that are the reason to open it daily.
 *
 * `daily_activity` is recordings per day, zero-filled across the window, so
 * the curve is built by running it cumulatively. It counts clips, not hours —
 * the chart says so rather than letting a reader assume otherwise.
 */
export function useAdminOverview() {
  const [data, setData] = useState<ApiAdminDashboard | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    adminDashboard()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load the overview."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return {
    data,
    isLoading,
    error,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
  };
}

/** Daily counts, run cumulatively, in the shape the growth chart takes. */
export function cumulative(daily: { date: string; count: number }[]): GrowthPoint[] {
  let running = 0;
  return daily.map((day) => {
    running += day.count;
    return { date: new Date(day.date), hours: running };
  });
}

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { fetchAllPages } from "@/lib/api/fetchAll";
import type { ApiPage } from "@/lib/api/recordings";
import { reportApiError } from "@/lib/api/reportApiError";
import { relativeDays } from "@/data/admin/shared";
import { payoutStatus, type Earning } from "@/data/admin/payments";

type ApiEarningsRow = {
  contributor_id: string;
  full_name: string;
  role: string;
  recordings: number;
  minutes: number;
  currency: string;
  held_kobo: number;
  payable_kobo: number;
  in_flight_kobo: number;
  paid_kobo: number;
  earned_kobo: number;
  last_activity_at: string | null;
};

/* Every page: the route serves at most 200 rows a request, and the totals
   on the page are summed from these rows. */
const listEarningsSummary = (stop: () => boolean) =>
  fetchAllPages(
    ({ limit, offset }) =>
      apiFetch<ApiPage<ApiEarningsRow>>("/payments/earnings/summary", {
        query: { limit, offset, envelope: true },
      }),
    { pageSize: 200, cap: Infinity, stop }
  );

function toEarning(api: ApiEarningsRow): Earning {
  const last = api.last_activity_at ? new Date(api.last_activity_at) : null;
  const buckets = {
    heldKobo: api.held_kobo,
    payableKobo: api.payable_kobo,
    inFlightKobo: api.in_flight_kobo,
    paidKobo: api.paid_kobo,
  };

  return {
    id: api.contributor_id,
    contributor: api.full_name,
    recordings: api.recordings,
    minutes: Math.round(api.minutes),
    earnedKobo: api.earned_kobo,
    ...buckets,
    status: payoutStatus(buckets),
    lastActivityAt: last?.getTime() ?? 0,
    lastActivityLabel: last ? relativeDays(last) : "Never",
  };
}

/**
 * What every contributor has earned, and how much of it has gone out.
 *
 * Everybody is listed, including people who have not earned yet and anyone the
 * next pay run would skip — and people who earned as contributors and have
 * since changed role, because money owed does not stop being owed. The figures
 * are the same ones each contributor's own wallet shows, so the two screens
 * cannot disagree.
 */
export function useEarnings() {
  const [rows, setRows] = useState<Earning[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;


    setLoading(true);

    listEarningsSummary(() => cancelled)
      .then((page) => {
        if (cancelled) return;
        setRows(page.items.map(toEarning));
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load earnings."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return {
    rows,
    isLoading,
    error,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
  };
}

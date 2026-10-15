import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { reportApiError } from "@/lib/api/reportApiError";
import type { Rate, RateUnit } from "@/data/admin/payments";

type ApiRate = {
  id: string;
  unit_type: string;
  amount: string;
  currency: string;
  updated_by: string | null;
  updated_at: string;
};

const listRates = () => apiFetch<ApiRate[]>("/payments/rates");

/** One rate per call. There is no bulk update. */
const putRate = (unit: string, amount: number) =>
  apiFetch<ApiRate>(`/payments/rates/${unit}`, {
    method: "PUT",
    body: { amount },
  });

function relative(iso: string) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function toRate(api: ApiRate): Rate {
  const naira = Number(api.amount);
  return {
    unit: api.unit_type as RateUnit,
    /* Kobo, like every other figure in this client. The API sends a decimal
     * string precisely so nobody floats it, so it is parsed once, here. */
    amountKobo: Math.round((Number.isFinite(naira) ? naira : 0) * 100),
    updatedAt: new Date(api.updated_at).getTime(),
    updatedLabel: relative(api.updated_at),
    updatedBy: api.updated_by ?? "an admin",
  };
}

/**
 * What each unit of work pays.
 *
 * Separate from the earnings table below it, which has no all-contributors
 * endpoint and is still seeded. The two are not calculated from each other —
 * a rate change applies to work done after it, not retroactively to figures
 * already in the ledger — so wiring one without the other shows nothing
 * inconsistent.
 */
export function useRates() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    listRates()
      .then((rows) => {
        if (cancelled) return;
        setRates(rows.map(toRate));
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load rates."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const save = useCallback(async (unit: RateUnit, naira: number) => {
    const next = toRate(await putRate(unit, naira));
    setRates((prev) => prev.map((row) => (row.unit === unit ? next : row)));
  }, []);

  return {
    rates,
    isLoading,
    error,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
    save,
  };
}

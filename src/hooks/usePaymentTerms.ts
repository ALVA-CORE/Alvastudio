import { useEffect, useState } from "react";
import { paymentTerms, type ApiPaymentTerms } from "@/lib/api/payouts";

/**
 * The pay terms, fetched once per session.
 *
 * Module-level rather than per component: three screens want the minimum
 * payout and the next pay day, none of them wants three requests for it, and
 * the numbers do not change while somebody is looking at a wallet.
 *
 * Shared in flight too, so two components mounting together make one call.
 */
let cached: ApiPaymentTerms | null = null;
let inFlight: Promise<ApiPaymentTerms> | null = null;

export function usePaymentTerms(): ApiPaymentTerms | null {
  const [terms, setTerms] = useState<ApiPaymentTerms | null>(cached);

  useEffect(() => {
    if (cached) return;
    let active = true;

    inFlight ??= paymentTerms();
    inFlight
      .then((result) => {
        cached = result;
        if (active) setTerms(result);
      })
      .catch(() => {
        /* Null stays null, and every caller already has to render without
           it — the API refuses anything the terms would have prevented, and
           says why. A wallet that will not load because a rates endpoint is
           down would be the worse failure. */
        inFlight = null;
      });

    return () => {
      active = false;
    };
  }, []);

  return terms;
}


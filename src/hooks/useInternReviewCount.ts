import { useEffect, useState } from "react";
import { listReviews } from "@/lib/api/reviews";

/**
 * Clips this intern has decided in the last `days` days.
 *
 * One request: `GET /reviews` with `created_after` and `limit=1`, whose
 * `total` is the count. It used to read the intern's verdicts 200 at a time
 * and count the recent ones here.
 *
 * Counted here rather than from the dashboard's
 * `quality_in_window.clip_approval.denominator`, which is measured over the
 * API's own 365-day window, not the one the card is labelled with.
 *
 * Null while unknown, so the card can show a dash rather than a false zero.
 */
export function useInternReviewCount(reviewerId: string | undefined, days: number) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    setCount(null);
    if (!reviewerId) return;

    let cancelled = false;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    listReviews({ reviewer_id: reviewerId, created_after: since, limit: 1 })
      .then((page) => {
        if (!cancelled) setCount(page.total);
      })
      .catch(() => {
        if (!cancelled) setCount(null);
      });

    return () => {
      cancelled = true;
    };
  }, [reviewerId, days]);

  return count;
}

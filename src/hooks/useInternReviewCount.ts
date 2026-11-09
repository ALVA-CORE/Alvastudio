import { useEffect, useState } from "react";
import { listReviews } from "@/lib/api/reviews";

const PAGE = 200;

/**
 * Clips this intern has decided in the last `days` days.
 *
 * `GET /dashboard/intern` does not carry it, and `GET /reviews` has no date
 * filter, so it is counted from `GET /reviews?reviewer_id=…`, which lists
 * verdicts newest first. Pages are read only until one reaches a verdict
 * older than the window: a week's count is usually one request. It used to
 * read every verdict the intern had ever given, about 35 requests of 200,
 * on every visit, to count the few inside the window.
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
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    (async () => {
      let inWindow = 0;
      for (let offset = 0; !cancelled; offset += PAGE) {
        const page = await listReviews({ reviewer_id: reviewerId, limit: PAGE, offset });
        const times = page.items.map((review) => new Date(review.created_at).getTime());
        inWindow += times.filter((time) => time >= since).length;
        /* Newest first: once a page reaches past the window, nothing after
           it can be inside. */
        const reachedPast = times.some((time) => time < since);
        if (reachedPast || page.items.length < PAGE || offset + PAGE >= page.total) break;
      }
      return inWindow;
    })()
      .then((value) => {
        if (!cancelled) setCount(value);
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

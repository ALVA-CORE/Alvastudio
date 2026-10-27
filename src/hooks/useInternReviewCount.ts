import { useEffect, useState } from "react";
import { fetchAllPages } from "@/lib/api/fetchAll";
import { listReviews, type ApiReviewRow } from "@/lib/api/reviews";

/**
 * Clips this intern has decided, inside a window.
 *
 * `GET /dashboard/intern` does not carry one. The card read `0` for everybody
 * because it fell through to the empty dataset, and an intern who had just
 * reviewed a clip was told they had reviewed nothing.
 *
 * Counted from `GET /reviews?reviewer_id=…` rather than from the dashboard's
 * `quality_in_window.clip_approval.denominator`, which is close but is
 * measured over the API's own 365-day window. The card says "Last 30 days",
 * and a figure under a label it does not match is how the admin screens came
 * to disagree with each other.
 */
export function useInternReviewCount(reviewerId: string | undefined) {
  const [reviews, setReviews] = useState<ApiReviewRow[] | null>(null);

  useEffect(() => {
    if (!reviewerId) {
      setReviews(null);
      return;
    }

    let cancelled = false;

    fetchAllPages<ApiReviewRow>((query) =>
      listReviews({ ...query, reviewer_id: reviewerId })
    )
      .then((page) => {
        if (!cancelled) setReviews(page.items);
      })
      .catch(() => {
        if (!cancelled) setReviews(null);
      });

    return () => {
      cancelled = true;
    };
  }, [reviewerId]);

  /** Null while unknown, so a card can show a dash rather than a false zero. */
  return (days: number): number | null => {
    if (reviews === null) return null;

    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    return reviews.filter((review) => new Date(review.created_at).getTime() >= since)
      .length;
  };
}

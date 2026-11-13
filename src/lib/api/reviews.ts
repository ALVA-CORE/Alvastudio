import { apiFetch } from "./client";
import type { ApiQualityAnswer, ApiVerdict } from "./enums";
import type { ApiPage, ApiRecording } from "./recordings";

export type ApiReview = {
  id: string;
  recording_id: string;
  reviewer_id: string;
  q_noise_free: ApiQualityAnswer;
  q_clear_audible: ApiQualityAnswer;
  q_matches_prompt: ApiQualityAnswer;
  q_natural_intelligible: ApiQualityAnswer;
  verdict: ApiVerdict;
  notes: string | null;
  created_at: string;
};

export type ApiContributorCounts = {
  contributor_id: string;
  approved: number;
  rejected: number;
  flagged: number;
  in_review: number;
  submitted: number;
  total: number;
};

/** Everything a successful review changes, in one response. */
export type ApiReviewResult = {
  review: ApiReview;
  recording: ApiRecording;
  contributor_counts: ApiContributorCounts;
  /**
   * The clip to open next (12 Nov): the oldest still on your desk, or with
   * your desk empty, the oldest in the bank, claimed for you in this answer.
   * Null when nothing is left, and always for an admin.
   */
  next_recording?: ApiRecording | null;
};

/**
 * This intern's desk, `/reviews/queue?mine=true`: clips placed with them and
 * still awaiting their verdict, oldest first, every page of it. There is no
 * desk limit, so a desk can hold more than one page (200).
 *
 * A clip on somebody's desk is theirs — a verdict from anyone else is a 409,
 * admins included — so the desk is the one an intern actually works from.
 */
export async function reviewDesk(signal?: AbortSignal) {
  const desk: ApiRecording[] = [];
  let total = Infinity;
  while (desk.length < total) {
    const page = await apiFetch<ApiPage<ApiRecording>>("/reviews/queue", {
      query: { mine: true, envelope: true, limit: 200, offset: desk.length },
      signal,
    });
    desk.push(...page.items);
    total = page.total;
    if (page.items.length === 0) break;
  }
  return desk;
}

/**
 * Records a verdict. The response carries the updated recording AND the
 * contributor's new counts, so a successful review needs no follow-up refetch —
 * write all three into the cache.
 */
export const submitReview = (payload: {
  recording_id: string;
  q_noise_free: ApiQualityAnswer;
  q_clear_audible: ApiQualityAnswer;
  q_matches_prompt: ApiQualityAnswer;
  q_natural_intelligible: ApiQualityAnswer;
  verdict: ApiVerdict;
  notes?: string | null;
}) => apiFetch<ApiReviewResult>("/reviews", { method: "POST", body: payload });

export const reviewsForRecording = (recordingId: string) =>
  apiFetch<ApiReview[]>(`/reviews/recording/${recordingId}`);

/**
 * Every verdict on the platform, for the admin oversight screen.
 *
 * Richer than `ApiReview`: the list resolves the two names and the prompt text
 * server side, which is the difference between one request and one request per
 * row.
 */
export type ApiReviewRow = ApiReview & {
  reviewer_name: string | null;
  contributor_name: string | null;
  prompt_text: string | null;
};

export const listReviews = (
  query: {
    verdict?: ApiVerdict;
    reviewer_id?: string;
    /** ISO 8601, inclusive. With `limit: 1`, `total` is the count in the window. */
    created_after?: string;
    limit?: number;
    offset?: number;
  } = {}
) =>
  apiFetch<{ items: ApiReviewRow[]; total: number; limit: number; offset: number }>(
    "/reviews",
    { query: { ...query, envelope: true } }
  );

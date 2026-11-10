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
};

/**
 * This intern's desk, `/reviews/queue?mine=true`: clips dealt to them and
 * still awaiting their verdict, oldest first, every page of it.
 *
 * There is no desk limit since 10 Nov, so one 7pm deal from a long bank can
 * put more on a desk than one page (200) holds.
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
 * How many clips wait in the review bank. Interns see the bank as a number,
 * not a list: it is dealt to desks at 7pm WAT, and it can be thousands long.
 */
export const reviewBankCount = (signal?: AbortSignal) =>
  apiFetch<{ total: number }>("/reviews/queue", {
    query: { envelope: true, limit: 1 },
    signal,
  }).then((page) => page.total);

/**
 * Claims from the unassigned pool, never from a colleague.
 *
 * The API cannot tell a clip somebody is listening to from one they have not
 * opened, so taking one could throw away their work. For an intern who
 * clears their desk before the 7pm deal; 404 when the bank is empty.
 */
export const assignNext = () =>
  apiFetch<ApiRecording>("/reviews/assign-next", { method: "POST" });

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

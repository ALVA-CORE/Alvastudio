import { apiFetch } from "./client";
import type { ApiQualityAnswer, ApiVerdict } from "./enums";
import type { ApiRecording } from "./recordings";

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
 * The review queue.
 *
 * Two queues, one route. Without `mine` it is the unassigned pool, which is
 * usually empty now that clips are allocated on submission. With `mine=true`
 * it is this intern's own desk: clips assigned to them and still awaiting a
 * verdict, oldest first.
 *
 * A clip on somebody's desk is theirs — a verdict from anyone else is a 409,
 * admins included — so the desk is the one an intern actually works from.
 */
export const reviewQueue = (limit = 50, mine = false) =>
  apiFetch<ApiRecording[]>("/reviews/queue", {
    query: mine ? { limit, mine: true } : { limit },
  });

/**
 * Claims from the unassigned pool, never from a colleague.
 *
 * The API cannot tell a clip somebody is listening to from one they have not
 * opened, so taking one could throw away their work. Under allocation the
 * pool is usually empty, which makes a 404 here normal rather than a fault —
 * an intern who clears their desk becomes the least loaded and receives new
 * arrivals anyway.
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
  query: { verdict?: ApiVerdict; reviewer_id?: string; limit?: number; offset?: number } = {}
) =>
  apiFetch<{ items: ApiReviewRow[]; total: number; limit: number; offset: number }>(
    "/reviews",
    { query: { ...query, envelope: true } }
  );

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

/** FIFO, unassigned, excluding the reviewer's own submissions. */
export const reviewQueue = (limit = 50) =>
  apiFetch<ApiRecording[]>("/reviews/queue", { query: { limit } });

/** Claims the next queued recording: submitted → in_review, locked to caller. */
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

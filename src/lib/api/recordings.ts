import { apiFetch, apiFetchBlobUrl } from "./client";
import type { ApiRecordingStatus, ApiSessionType } from "./enums";

export type ApiRecording = {
  id: string;
  contributor_id: string;
  session_type: ApiSessionType;
  prompt_id: string | null;
  stimulus_id: string | null;
  prompt_text: string | null;
  stimulus_text: string | null;
  audio_content_type: string;
  audio_size_bytes: number;
  original_filename: string | null;
  duration_seconds: number | null;
  device_mic: string | null;
  status: ApiRecordingStatus;
  assigned_reviewer_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  /**
   * The variety of the prompt this was read from, not the contributor's own.
   *
   * A profile holds a *preference*, which can be "both", so it cannot label a
   * single clip. The prompt's variety is exactly what was spoken.
   */
  language_variety?: string | null;
  contributor_name?: string | null;
  /** Null while nobody is assigned. */
  reviewer_name?: string | null;
};

/** Six hours, which is the API's ceiling on any duration it stores. */
export const MAX_DURATION_SECONDS = 21_600;

export function isSendableDuration(value: number | undefined): value is number {
  return (
    value != null && Number.isFinite(value) && value > 0 && value <= MAX_DURATION_SECONDS
  );
}

/**
 * Submits a recording.
 *
 * Multipart, so the blob goes up as-is. `apiFetch` deliberately does not set a
 * Content-Type here — the browser must generate the boundary.
 */
function submit(
  path: string,
  idField: "prompt_id" | "stimulus_id",
  idValue: string,
  audio: Blob,
  meta: { durationSeconds?: number; deviceMic?: string; filename?: string } = {}
) {
  const form = new FormData();
  form.append(idField, idValue);
  form.append("file", audio, meta.filename ?? "recording.webm");

  /* The API refuses a duration that is negative, infinite, NaN or over six
   * hours, and it is right to: an infinite one was stored once and broke
   * every screen that read it. A recorder left running in a background tab
   * can produce one, so it is dropped here rather than sent and refused,
   * which would lose a take somebody actually recorded. */
  if (isSendableDuration(meta.durationSeconds)) {
    form.append("duration_seconds", String(meta.durationSeconds));
  }

  /* 255 is the column. A browser mic label is usually short, but a virtual
   * device can carry a long one. */
  if (meta.deviceMic) form.append("device_mic", meta.deviceMic.slice(0, 255));

  return apiFetch<ApiRecording>(path, { method: "POST", form });
}

export const submitPromptRead = (
  promptId: string,
  audio: Blob,
  meta?: Parameters<typeof submit>[4]
) => submit("/recordings/prompt-read", "prompt_id", promptId, audio, meta);

export const submitStimulus = (
  stimulusId: string,
  audio: Blob,
  meta?: Parameters<typeof submit>[4]
) => submit("/recordings/stimuli", "stimulus_id", stimulusId, audio, meta);

/** Contributors see their own; reviewers and admins see all. */
export const listRecordings = (
  query: {
    status?: ApiRecordingStatus;
    session_type?: ApiSessionType;
    limit?: number;
    offset?: number;
  } = {}
) => apiFetch<ApiRecording[]>("/recordings", { query });

export type ApiPage<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

/**
 * The same list, with the row count in the body.
 *
 * The bare call returns an array and puts the total in `X-Total-Count`, which
 * `apiFetch` does not surface. Screens that show "12 of 340" need the number,
 * so they ask for the envelope.
 */
export const listRecordingsPage = (
  query: {
    status?: ApiRecordingStatus;
    session_type?: ApiSessionType;
    limit?: number;
    offset?: number;
  } = {}
) =>
  apiFetch<ApiPage<ApiRecording>>("/recordings", {
    query: { ...query, envelope: true },
  });

/** Moves a recording to another reviewer, or back to the queue with `null`. */
export const assignReviewer = (recordingId: string, reviewerId: string | null) =>
  apiFetch<ApiRecording>(`/recordings/${recordingId}/assignee`, {
    method: "PATCH",
    body: { reviewer_id: reviewerId },
  });

export const getRecording = (id: string) => apiFetch<ApiRecording>(`/recordings/${id}`);

/**
 * The audio route needs the bearer token, so an `<audio src>` pointed straight
 * at it would send nothing and 401. Fetch with the header and hand back a blob
 * URL — the caller must `URL.revokeObjectURL` when the player unmounts.
 */
export const recordingAudioUrl = (id: string) =>
  apiFetchBlobUrl(`/recordings/${id}/audio`);

/**
 * How much a contributor may still upload.
 *
 * 200 a day and 1,000 a week, on Nigerian calendar periods: the day resets at
 * midnight WAT and the week on Monday. Worth checking **before** recording —
 * a refusal at upload would throw away a clip somebody has just spoken.
 *
 * Every upload counts, whatever the review says afterwards.
 */
export type ApiRecordingQuota = {
  daily_limit: number;
  daily_used: number;
  daily_remaining: number;
  daily_resets_at: string;
  weekly_limit: number;
  weekly_used: number;
  weekly_remaining: number;
  weekly_resets_at: string;
  /** The smaller of the two allowances. This is the number that matters. */
  remaining: number;
  available_again_at: string | null;
};

export const recordingQuota = () =>
  apiFetch<ApiRecordingQuota>("/recordings/quota");

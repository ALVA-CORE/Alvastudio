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
};

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
  if (meta.durationSeconds != null) {
    form.append("duration_seconds", String(meta.durationSeconds));
  }
  if (meta.deviceMic) form.append("device_mic", meta.deviceMic);

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

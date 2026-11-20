import { apiFetch } from "./client";
import type { ApiPage, ApiRecording } from "./recordings";

/**
 * A recording flagged for cheating (ask #25). Quality stays a rejection.
 *
 * A flagged recording is never paid. The third open flag on one contributor
 * reports them to the admins, who decide; nothing is suspended on its own.
 */
export type ApiFlagReason =
  | "not_their_voice"
  | "recycled_audio"
  | "machine_voice"
  | "deliberately_empty"
  | "offensive"
  | "other";

export const FLAG_REASON_LABEL: Record<ApiFlagReason, string> = {
  not_their_voice: "Not their voice",
  recycled_audio: "Recycled audio",
  machine_voice: "Machine voice",
  deliberately_empty: "Deliberately empty",
  offensive: "Offensive",
  other: "Other",
};

/** At this many open flags the contributor is reported. */
export const REPORT_AT = 3;

export type ApiRecordingFlag = {
  id: string;
  recording_id: string;
  contributor_id: string;
  contributor_name: string;
  prompt_text: string | null;
  reason: ApiFlagReason;
  note: string | null;
  flagged_by_name: string;
  status: "open" | "dismissed";
  created_at: string;
  /** This contributor's open flags, this one included. */
  contributor_open_flags: number;
};

/** `other` needs a note. Answers the clip to open next, as a verdict does. */
export const flagRecording = (recordingId: string, body: { reason: ApiFlagReason; note?: string }) =>
  apiFetch<{ flag: ApiRecordingFlag; next_recording: ApiRecording | null }>(
    `/recordings/${recordingId}/flags`,
    { method: "POST", body }
  );

export const listRecordingFlags = (params: { status?: "open" | "dismissed"; limit?: number } = {}) =>
  apiFetch<ApiPage<ApiRecordingFlag>>("/recording-flags", {
    query: { ...params, envelope: true },
  });

/** Admins only. Pay comes back if the clip was approved. */
export const dismissRecordingFlag = (flagId: string) =>
  apiFetch<ApiRecordingFlag>(`/recording-flags/${flagId}/dismiss`, { method: "POST" });

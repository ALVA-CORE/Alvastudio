import { apiFetch, apiFetchBlobUrl } from "./client";
import type { ApiAgeBracket, ApiGender, ApiLanguageVariety } from "./enums";

export type ApiParticipant = {
  id: string;
  session_id: string;
  label: string;
  age_bracket: ApiAgeBracket | null;
  gender: ApiGender | null;
  role: string | null;
  language_variety: ApiLanguageVariety | null;
  created_at: string;
};

export type ApiParticipantIn = {
  label: string;
  age_bracket?: ApiAgeBracket | null;
  gender?: ApiGender | null;
  role?: string | null;
  language_variety?: ApiLanguageVariety | null;
};

export type ApiSpeakerTurn = {
  id: string;
  session_id: string;
  participant_id: string;
  start_time: number;
  end_time: number;
  created_at: string;
};

/** List row — counts only. */
export type ApiSessionSummary = {
  id: string;
  intern_id: string;
  topic: string;
  language_variety: ApiLanguageVariety | null;
  duration_seconds: number | null;
  has_audio: boolean;
  participant_count: number;
  turn_count: number;
  created_at: string;
};

/** Detail — nested participants and turns. */
export type ApiSession = Omit<
  ApiSessionSummary,
  "participant_count" | "turn_count"
> & {
  original_filename: string | null;
  audio_content_type: string | null;
  audio_size_bytes: number | null;
  participants: ApiParticipant[];
  turns: ApiSpeakerTurn[];
};

/** Interns see their own sessions; admins see all. */
export const listSessions = (query: { limit?: number; offset?: number } = {}) =>
  apiFetch<ApiSessionSummary[]>("/focus-groups", { query });

export const getSession = (id: string) => apiFetch<ApiSession>(`/focus-groups/${id}`);

export const createSession = (payload: {
  topic: string;
  language_variety?: ApiLanguageVariety;
  duration_seconds?: number;
  participants?: ApiParticipantIn[];
}) => apiFetch<ApiSession>("/focus-groups", { method: "POST", body: payload });

export const addParticipant = (sessionId: string, participant: ApiParticipantIn) =>
  apiFetch<ApiParticipant>(`/focus-groups/${sessionId}/participants`, {
    method: "POST",
    body: participant,
  });

/**
 * Attaching audio is what makes a session claimable: it does not appear in
 * `/annotations/queue` until a file is uploaded. Verified against the live API.
 */
export function uploadSessionAudio(
  sessionId: string,
  audio: Blob,
  meta: { durationSeconds?: number; filename?: string } = {}
) {
  const form = new FormData();
  form.append("file", audio, meta.filename ?? "session.wav");
  if (meta.durationSeconds != null) {
    form.append("duration_seconds", String(meta.durationSeconds));
  }
  return apiFetch<ApiSession>(`/focus-groups/${sessionId}/audio`, {
    method: "POST",
    form,
  });
}

/** Authenticated, so it needs the header — returns a revocable blob URL. */
export const sessionAudioUrl = (sessionId: string) =>
  apiFetchBlobUrl(`/focus-groups/${sessionId}/audio`);

export const addTurn = (
  sessionId: string,
  turn: { participant_id: string; start_time: number; end_time: number }
) =>
  apiFetch<ApiSpeakerTurn>(`/focus-groups/${sessionId}/turns`, {
    method: "POST",
    body: turn,
  });

export const listTurns = (sessionId: string, participantId?: string) =>
  apiFetch<ApiSpeakerTurn[]>(`/focus-groups/${sessionId}/turns`, {
    query: { participant_id: participantId },
  });

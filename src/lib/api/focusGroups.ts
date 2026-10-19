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
  state: string | null;
  native_language: string | null;
  phone: string | null;
  consent_given: boolean | null;
  /** Server-set when consent is recorded. */
  consent_at: string | null;
  consent_version: string | null;
  created_at: string;
};

export type ApiParticipantIn = {
  label: string;
  age_bracket?: ApiAgeBracket | null;
  gender?: ApiGender | null;
  role?: string | null;
  language_variety?: ApiLanguageVariety | null;
  state?: string | null;
  native_language?: string | null;
  phone?: string | null;
  /** Required. There is no logging a participant without recording consent. */
  consent_given: boolean;
  consent_version?: string;
};

export type ApiSpeakerTurn = {
  id: string;
  session_id: string;
  participant_id: string;
  start_time: number;
  end_time: number;
  created_at: string;
};

/** List row. Carries nested participants when asked for with `expand`. */
export type ApiSessionSummary = {
  id: string;
  intern_id: string;
  /** Who is annotating it, and their name. Null while nobody holds it. */
  assigned_annotator_id?: string | null;
  annotator_name?: string | null;
  topic: string;
  language_variety: ApiLanguageVariety | null;
  duration_seconds: number | null;
  has_audio: boolean;
  participant_count: number;
  turn_count: number;
  created_at: string;
  participants?: ApiParticipant[];
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

/**
 * Interns see their own sessions; admins see all.
 *
 * `expand=participants` nests them on each row, which is the difference
 * between one request and one-per-session for the participants table.
 */
export const listSessions = (
  query: { limit?: number; offset?: number; expand?: "participants" } = {}
) => apiFetch<ApiSessionSummary[]>("/focus-groups", { query });

export const getSession = (id: string) => apiFetch<ApiSession>(`/focus-groups/${id}`);

/**
 * Hands a session to a named annotator, or back to the queue with `null`.
 *
 * The thing being handed out is a session, not an annotation — the annotation
 * does not exist until somebody takes it. This opens it as a side effect,
 * through the same code `claim-next` uses, so the draft is identical either
 * way including the speaker segments seeded from the intern's turns.
 *
 * 400 if the session has no audio or the user is not an annotator, 409 if the
 * annotation is already approved.
 *
 * Assigning creates work, and a session with work cannot be deleted — so an
 * admin who assigns by mistake has to unassign before deleting.
 */
export const assignSessionAnnotator = (
  sessionId: string,
  annotatorId: string | null
) =>
  apiFetch<ApiSession>(`/focus-groups/${sessionId}/assignee`, {
    method: "PATCH",
    body: { annotator_id: annotatorId },
  });

/** 409 when the session is already claimed for annotation. */
export const deleteSession = (id: string) =>
  apiFetch<void>(`/focus-groups/${id}`, { method: "DELETE" });

/**
 * `topic` and `topic_id` together, not one or the other.
 *
 * Sending both keeps the wording the intern saw on the session and the link to
 * the bank item it came from, so editing a topic later cannot rewrite sessions
 * already run from it. A retired topic is a 409, an unknown one a 404.
 */
export const createSession = (payload: {
  topic: string;
  topic_id?: string;
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

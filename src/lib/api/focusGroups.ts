import { apiFetch, apiFetchBlobUrl } from "./client";
import { isSendableDuration } from "./recordings";
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
  /** Empty for nearly every session. One entry per person removed. */
  redactions?: ApiParticipantRedaction[];
  /**
   * Where the session was RECORDED, as typed.
   *
   * Not where the speakers are from — that is each participant's own `state`.
   * Null when it was not recorded; never derived from the participants.
   */
  state?: string | null;
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
/**
 * What is left of a participant who withdrew and was removed.
 *
 * No name: they withdrew. The consent history is kept so the record of what
 * they agreed to, and then did not, survives them.
 */
export type ApiParticipantRedaction = {
  id: string;
  removed_at: string;
  removed_by_id: string | null;
  consent_history: {
    accepted: boolean;
    policy_version: string;
    accepted_at: string;
    recorded_by_id: string | null;
  }[];
  turns_silenced: number;
  seconds_silenced: number;
  padding_seconds: number;
};

/**
 * Silences a withdrawn participant's turns and removes them.
 *
 * Only tagged speech is silenced, which is why `confirm_turns_complete` has
 * to be ticked by a person rather than sent on their behalf: anything they
 * said that was never tagged as their turn stays in the file. Each turn is
 * padded half a second either side because live tagging is approximate, and
 * anyone talking over them in those moments goes quiet too.
 *
 * Refused with 409 once annotation work has begun: the transcript already
 * holds their words, and the session is spent.
 */
export const redactParticipant = (
  sessionId: string,
  participantId: string,
  confirmTurnsComplete: boolean
) =>
  apiFetch<ApiSession>(
    `/focus-groups/${sessionId}/participants/${participantId}/redact`,
    { method: "POST", body: { confirm_turns_complete: confirmTurnsComplete } }
  );

/** Corrects a session's recorded state. The session's intern, or an admin. */
export const updateSession = (
  sessionId: string,
  /* `target_participants` is admin-only: interns are scored against it, so
   * lowering their own would raise their own score. A refused request changes
   * nothing, including any `state` sent alongside it, so the two are sent
   * separately. */
  patch: { state?: string | null; target_participants?: number }
) =>
  apiFetch<ApiSession>(`/focus-groups/${sessionId}`, {
    method: "PATCH",
    body: patch,
  });

export const createSession = (payload: {
  topic: string;
  topic_id?: string;
  /** Where it is being recorded. Omitted rather than guessed. */
  state?: string;
  language_variety?: ApiLanguageVariety;
  duration_seconds?: number;
  participants?: ApiParticipantIn[];
}) => apiFetch<ApiSession>("/focus-groups", { method: "POST", body: payload });

/**
 * Records a participant's consent decision, after the fact.
 *
 * Adds a record and leaves the old one in place, so the history is kept and
 * the API knows who recorded each decision. Works after the audio is uploaded
 * too, because somebody can withdraw at any time: a session with anyone who
 * has not agreed leaves the annotation queue and the corpus until they do.
 */
export const setParticipantConsent = (
  sessionId: string,
  participantId: string,
  body: { consent_given: boolean; consent_version?: string }
) =>
  apiFetch<ApiParticipant>(
    `/focus-groups/${sessionId}/participants/${participantId}`,
    { method: "PATCH", body }
  );

/**
 * Removes a participant logged by mistake.
 *
 * Refused with 409 once the session has audio: their voice is in the
 * recording by then, and deleting them would delete the record of whether
 * they agreed with it. Record a decision instead.
 */
export const removeParticipant = (sessionId: string, participantId: string) =>
  apiFetch<void>(`/focus-groups/${sessionId}/participants/${participantId}`, {
    method: "DELETE",
  });

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
  /* Same ceiling as a recording: negative, infinite, NaN or over six hours is
   * refused, so it is dropped rather than losing the session with it. */
  if (isSendableDuration(meta.durationSeconds)) {
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

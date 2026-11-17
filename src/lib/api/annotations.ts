import { apiAudioLink, apiFetch } from "./client";
import type { ApiLanguageVariety } from "./enums";
import type { ApiPage } from "./recordings";

/**
 * Annotations API — `/api/v1/annotations`.
 *
 * The workflow is claim-based, not assignment-based: `/queue` lists focus-group
 * sessions nobody has taken, `claim-next` takes one and returns a full document,
 * and `GET /annotations` lists what this annotator already holds. That is why
 * the Sessions page merges two calls rather than reading one list.
 *
 * Writes carry `expected_version` for optimistic concurrency. The server rejects
 * a stale write instead of silently overwriting a concurrent edit.
 */

export type AnnotationTask = "asr" | "tts" | "nlu";

/**
 * `session` is a focus group (`session_id` set); `narration` is one
 * contributor's stimulus clip (`recording_id` set, `session_id` null).
 */
export type ApiAnnotationKind = "session" | "narration";

export type ApiAnnotationStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "needs_rework"
  | "rejected";

/** ISO 639-3, unlike the two-letter codes used elsewhere in the product. */
export type ApiAnnotationLanguage = "yor" | "hau" | "ibo" | "pcm" | "eng" | "und";

export type ApiSpanSource = "lexicon_derived" | "annotator_added" | "annotator_removed";

export type ApiLanguageSpan = {
  start_token: number;
  end_token: number;
  language: ApiAnnotationLanguage;
  span_source?: ApiSpanSource;
};

export type ApiSegment = {
  id: string;
  annotation_id: string;
  participant_id: string | null;
  /**
   * Which voice Scribe heard, on a pre-filled draft.
   *
   * `speaker_0`, `speaker_1`, … A label is one voice in **one session**, not
   * a person: `speaker_0` in two sessions are two different people. So it
   * arrives with `participant_id` null, and stays that way until an
   * annotator says who it is.
   *
   * Null on a segment the annotator made themselves.
   */
  speaker_label?: string | null;
  start_token: number;
  end_token: number;
  language_spans: ApiLanguageSpan[];
  disfluencies: unknown[];
  untranscribable_spans: unknown[];
  non_speech_events: unknown[];
  version: number;
  created_at: string;
  updated_at: string;
};

export type ApiToken = {
  idx: number;
  text: string;
  start_sec: number | null;
  end_sec: number | null;
};

/** `pending` and `processing` both mean "on its way"; nothing to show yet. */
export type ApiTranscriptStatus = "pending" | "processing" | "done" | "failed";

export type ApiTranscriptSpeaker = {
  speaker_label: string;
  /** Set once an annotator has linked this voice to somebody. */
  participant_id: string | null;
  /**
   * Who the API thinks it is, from the intern's live speaker tagging.
   *
   * A suggestion and nothing more: live tagging is approximate and two
   * labels can suggest the same person. It is pre-selected in the picker and
   * never applied on anybody's behalf.
   */
  suggested_participant_id: string | null;
  segment_count: number;
  seconds: number;
};

/**
 * The session's draft transcript, from ElevenLabs Scribe.
 *
 * Null when the session has none. The four statuses are not four shades of
 * the same thing:
 *
 * - `pending`/`processing` — on its way, minutes for a long session.
 *   Nothing is pushed, so the document has to be re-read to see it land.
 * - `done` with `prefilled_at` set — this draft was filled from it.
 * - `done` with `prefilled_at` null — a transcript exists but the annotator
 *   had already started, so it was not applied. **A started draft is never
 *   overwritten**, and there is no route that would apply it later.
 * - `failed` — gave up. An admin can queue the session again.
 */
export type ApiDraftTranscript = {
  status: ApiTranscriptStatus | null;
  /** What Scribe detected, NOT the session's `language_variety`. */
  language_code: string | null;
  language_probability: number | null;
  prefilled_at: string | null;
  speakers: ApiTranscriptSpeaker[];
};

export type ApiAnnotationDocument = {
  /** The session's draft transcript. Null when there is none. */
  transcript?: ApiDraftTranscript | null;
  /**
   * Somebody in the session has withdrawn their consent.
   *
   * The document still opens, and the activity log still accepts events, but
   * every write is a 409 — audio, tokens, segments, submit and review. The
   * workspace reads this so it can say so on open rather than failing on the
   * annotator's first save.
   *
   * Their work is kept. If the intern records a new decision it all works
   * again; if not, the session is spent.
   */
  consent_blocked?: boolean;
  /** When the annotator first opened it, submitted it, and got a verdict. */
  started_at?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  id: string;
  kind: ApiAnnotationKind;
  /** Null on a narration. */
  session_id: string | null;
  /** Null on a session. */
  recording_id?: string | null;
  task: AnnotationTask;
  status: ApiAnnotationStatus;
  revision: number;
  is_gold: boolean;
  annotator_id: string;
  reviewer_id: string | null;
  tokenization_convention_id: "whitespace_v1" | "whitespace_punct_split_v1";
  tokenization_span_target: string;
  transcript_verbatim: string;
  transcript_normalized: string | null;
  difficulty_flags: string[];
  speech_present: boolean;
  tokens: ApiToken[];
  segments: ApiSegment[];
  version: number;
  created_at: string;
  updated_at: string;
};

/** A session available to claim. Deliberately thin — it is a list row. */
export type ApiQueueRow = {
  session_id: string;
  topic: string;
  duration_seconds: number | null;
  /** Read from the file at upload (10 Nov). Null before measurement or with no audio. */
  measured_duration_seconds?: number | null;
  participant_count: number;
  created_at: string;
  language_variety: ApiLanguageVariety | null;
  intern_name: string | null;
  state: string | null;
};

/** One of this annotator's own annotations. */
export type ApiAnnotationSummary = {
  id: string;
  kind: ApiAnnotationKind;
  /** Null on a narration. */
  session_id: string | null;
  /** Null on a session. */
  recording_id?: string | null;
  /** The session's topic, or the stimulus a narration answers. */
  topic?: string | null;
  duration_seconds?: number | null;
  /** Read from the file at upload (10 Nov). Null before measurement or with no audio. */
  measured_duration_seconds?: number | null;
  segment_count?: number;
  /**
   * Only with `?expand=tags`, null otherwise.
   *
   * Opt-in because counting tags reads every span on the page. Same definition
   * as the annotator dashboard's `tags_applied`, so the two always agree.
   */
  tag_count?: number | null;
  task: AnnotationTask;
  status: ApiAnnotationStatus;
  annotator_id: string;
  /** The author's name, also on a draft abandoned when its session went back. */
  annotator_name?: string | null;
  revision: number;
  is_gold: boolean;
  version: number;
  created_at: string;
  updated_at: string;
};

/** What `GET /annotations` sorts by. No tag count: it lives in JSON. */
export type ApiAnnotationSort =
  | "created_at"
  | "topic"
  | "annotator"
  | "segment_count"
  | "duration"
  | "status";

/** Counts over every annotation, whatever the table shows (admin). */
export type ApiAnnotationCounts = {
  total: number;
  /** Every status, 0 included. */
  by_status: Record<ApiAnnotationStatus, number>;
  /** Sessions waiting to be claimed: the depth of `GET /annotations/queue`. */
  claimable_sessions: number;
  /** Narrations waiting in the pool: the depth of `GET /annotations/narrations/queue`. */
  claimable_narrations: number;
  /** Narrations an annotator holds, still draft or sent back. */
  narrations_in_progress: number;
  /** Each author's annotations by status, most first. */
  by_annotator: {
    annotator_id: string;
    annotator_name: string | null;
    total: number;
    by_status: Record<ApiAnnotationStatus, number>;
  }[];
};

/* ------------------------------------------------------------------ *
 * Reads
 * ------------------------------------------------------------------ */

/**
 * Sessions waiting to be claimed, oldest first: audio uploaded, nobody holding
 * it, and every speaker has agreed. Admins may read it too.
 */
export function listQueue(params: { limit?: number; offset?: number } = {}, signal?: AbortSignal) {
  return apiFetch<ApiQueueRow[]>("/annotations/queue", { query: params, signal });
}

export function listMine(
  params: {
    kind?: ApiAnnotationKind;
    status?: ApiAnnotationStatus;
    limit?: number;
    offset?: number;
    /** `tag_count` is null without it: counting tags reads every span on the page. */
    expand?: "tags";
  } = {}
) {
  return apiFetch<ApiAnnotationSummary[]>("/annotations", { query: params });
}

export function getAnnotation(id: string) {
  return apiFetch<ApiAnnotationDocument>(`/annotations/${id}`);
}

/**
 * One page of every annotation on the platform, for the admin screen: the
 * same path as `listMine` (reviewers and admins see all), with the envelope
 * so the table has a total. `q` matches the id, topic and annotator's name.
 */
export function listAnnotationsPage(
  query: {
    kind?: ApiAnnotationKind;
    status?: ApiAnnotationStatus;
    q?: string;
    sort?: ApiAnnotationSort;
    order?: "asc" | "desc";
    expand?: "tags";
    limit?: number;
    offset?: number;
  },
  signal?: AbortSignal
) {
  return apiFetch<ApiPage<ApiAnnotationSummary>>("/annotations", {
    query: { ...query, envelope: true },
    signal,
  });
}

export function annotationCounts(signal?: AbortSignal) {
  return apiFetch<ApiAnnotationCounts>("/annotations/summary", { signal });
}

/**
 * Moves an annotation to another annotator, or back to the queue with `null`.
 *
 * Two rows change: the annotation's annotator and the session's assigned
 * annotator. The endpoint does both in one transaction, so reassignment is not
 * the single-field edit it looks like from here.
 */
/**
 * Moves one annotation to another annotator.
 *
 * **409 when somebody holds the session on a different annotation**, which is
 * usually an old abandoned draft. Reassign the session instead
 * (`PATCH /focus-groups/{id}/assignee`); before the API checked this, calling
 * it on a stale draft took the session off whoever was actually working it.
 */
export function assignAnnotator(annotationId: string, annotatorId: string | null) {
  return apiFetch<ApiAnnotationDocument>(`/annotations/${annotationId}/assignee`, {
    method: "PATCH",
    body: { annotator_id: annotatorId },
  });
}

/**
 * An admin's verdict on a finished annotation.
 *
 * Separate from `updateAnnotation`, which edits content. This changes who the
 * work belongs to next: approved and it is done, `needs_rework` and it goes
 * back to the annotator.
 */
export function reviewAnnotation(
  id: string,
  body: {
    status: ApiAnnotationStatus;
    review_notes?: string | null;
    is_gold?: boolean;
  }
) {
  return apiFetch<ApiAnnotationDocument>(`/annotations/${id}/review`, {
    method: "POST",
    body,
  });
}

/* ------------------------------------------------------------------ *
 * Writes
 * ------------------------------------------------------------------ */

/** Takes the next unclaimed session and returns its full document. */
export function claimNext() {
  return apiFetch<ApiAnnotationDocument>("/annotations/claim-next", { method: "POST" });
}

/* ------------------------------------------------------------------ *
 * Narrations
 * ------------------------------------------------------------------ */

/** A narration in the pool, waiting to be claimed. */
export type ApiNarrationQueueRow = {
  recording_id: string;
  stimulus_text: string;
  language_variety?: ApiLanguageVariety | null;
  /** The stimulus's category. */
  category?: string | null;
  duration_seconds: number | null;
  measured_duration_seconds?: number | null;
  /** When an admin sent it. The pool is oldest first by this. */
  sent_at: string;
};

export function listNarrationQueue(params: { limit?: number; offset?: number } = {}) {
  return apiFetch<ApiPage<ApiNarrationQueueRow>>("/annotations/narrations/queue", {
    query: { ...params, envelope: true },
  });
}

/**
 * Takes the oldest narration in the pool and returns its draft.
 *
 * 404 when the pool is empty, 409 at the open-narration limit; both carry a
 * sentence to show as it is.
 */
export function claimNextNarration() {
  return apiFetch<ApiAnnotationDocument>("/annotations/narrations/claim-next", {
    method: "POST",
  });
}

export type ApiNarrationSend = {
  /** False: a preview, and nothing changed. */
  applied: boolean;
  /** How many went, or would go. Sent back as `expected` to apply. */
  sent: number;
  recording_ids: string[];
  /** Not sent: no such clip, not a narration, not approved, or already sent. */
  skipped: string[];
};

/**
 * Sends approved narrations to the annotators' pool (admin).
 *
 * Previews without `expected`; applies with it. Up to 100 ids. A 409 means
 * the choice no longer holds that many, and nothing was sent.
 */
export function sendNarrations(ids: string[], expected?: number) {
  return apiFetch<ApiNarrationSend>("/annotations/narrations/send", {
    method: "POST",
    body: { ids },
    query: expected === undefined ? undefined : { apply: true, expected },
  });
}

export type ApiNarrationWithdraw = {
  withdrawn: string[];
  /** Not withdrawn: no such clip, never sent, or an annotator holds it. */
  skipped: string[];
};

/** Takes narrations back out of the pool, all but those already claimed (admin). */
export function withdrawNarrations(ids: string[]) {
  return apiFetch<ApiNarrationWithdraw>("/annotations/narrations/withdraw", {
    method: "POST",
    body: { ids },
  });
}

export function updateAnnotation(
  id: string,
  patch: {
    difficulty_flags?: string[];
    speech_present?: boolean;
    transcript_normalized?: string | null;
    expected_version?: number;
  }
) {
  return apiFetch<ApiAnnotationDocument>(`/annotations/${id}`, {
    method: "PUT",
    body: patch,
  });
}

/**
 * Edits the transcript as a SPLICE, not a whole-document replace.
 *
 * `replace_count: 0` inserts before `start_token`; an empty `tokens` array
 * deletes. Verified against the live API — a body without `start_token` and
 * `replace_count` is rejected 422.
 */
export function spliceTokens(
  id: string,
  splice: {
    start_token: number;
    replace_count: number;
    tokens: { text: string; start_sec?: number | null; end_sec?: number | null }[];
    expected_version?: number;
  }
) {
  return apiFetch<ApiAnnotationDocument>(`/annotations/${id}/tokens`, {
    method: "PUT",
    body: splice,
  });
}

export function createSegment(
  id: string,
  segment: {
    participant_id?: string | null;
    start_token: number;
    end_token: number;
    language_spans?: ApiLanguageSpan[];
  }
) {
  return apiFetch<ApiSegment>(`/annotations/${id}/segments`, {
    method: "POST",
    body: segment,
  });
}

export function updateSegment(
  annotationId: string,
  segmentId: string,
  patch: {
    participant_id?: string | null;
    start_token: number;
    end_token: number;
    language_spans?: ApiLanguageSpan[];
    expected_version?: number;
  }
) {
  return apiFetch<ApiSegment>(`/annotations/${annotationId}/segments/${segmentId}`, {
    method: "PUT",
    body: patch,
  });
}

export function deleteSegment(annotationId: string, segmentId: string) {
  return apiFetch<void>(`/annotations/${annotationId}/segments/${segmentId}`, {
    method: "DELETE",
  });
}

/**
 * What the annotation was made from.
 *
 * Carries `waveform_peaks`: the real amplitude envelope of the session
 * audio, measured server-side. The timeline used to draw a *synthesised*
 * one from a hash of each segment id — a speech-shaped curve that looked
 * right and matched nothing, on a screen where people read the waveform to
 * find speech boundaries.
 *
 * Null when the audio has not been measured. Then the timeline draws flat
 * bars rather than inventing a shape, because a wrong waveform is worse
 * than no waveform here.
 */
export type ApiAnnotationSource = {
  kind: ApiAnnotationKind;
  /** Null on a narration. */
  session_id: string | null;
  /** Null on a session. */
  recording_id?: string | null;
  /** The session's topic, or the stimulus a narration answers. */
  topic: string | null;
  language_variety: string | null;
  duration_seconds: number | null;
  /** Empty on a narration: one speaker, never named to the annotator. */
  participants: unknown[];
  /** One value per bucket, 0..1, across the whole recording. */
  waveform_peaks: number[] | null;
};

export function getAnnotationSource(id: string) {
  return apiFetch<ApiAnnotationSource>(`/annotations/${id}/source`);
}

/**
 * Says who each Scribe voice is.
 *
 * Sets `participant_id` on **every** segment carrying that label, in one
 * call, which is the whole point: a voice is identified once rather than
 * segment by segment. `null` unlinks. Labels left out are untouched.
 *
 * `participant_id` is required on each entry, so an unlink sends `null`
 * rather than omitting the field.
 *
 * Refusals: 400 a participant not in this session, 403 not the annotator
 * holding the draft, 409 submitted/approved or consent withdrawn, 422 a
 * label no segment carries or one sent twice.
 */
export function linkSpeakers(
  id: string,
  links: { speaker_label: string; participant_id: string | null }[]
) {
  return apiFetch<ApiAnnotationDocument>(`/annotations/${id}/speakers`, {
    method: "PUT",
    body: { links },
  });
}

/** Hands the annotation back for review. */
export function submitAnnotation(id: string) {
  return apiFetch<ApiAnnotationDocument>(`/annotations/${id}/submit`, { method: "POST" });
}



/** A playable link to the session's audio; see `apiAudioLink`. */
export const annotationAudioUrl = (id: string) =>
  apiAudioLink(`/annotations/${id}/audio-url`);

import { apiFetch, apiFetchBlobUrl } from "./client";
import type { ApiLanguageVariety } from "./enums";

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

export type ApiAnnotationDocument = {
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
  session_id: string;
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
  participant_count: number;
  created_at: string;
  language_variety: ApiLanguageVariety | null;
  intern_name: string | null;
  state: string | null;
};

/** One of this annotator's own annotations. */
export type ApiAnnotationSummary = {
  id: string;
  session_id: string;
  /** From the session, so one session reads as one number everywhere. */
  topic?: string | null;
  duration_seconds?: number | null;
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
  revision: number;
  is_gold: boolean;
  version: number;
  created_at: string;
  updated_at: string;
};

/* ------------------------------------------------------------------ *
 * Reads
 * ------------------------------------------------------------------ */

export function listQueue(params: { limit?: number; offset?: number } = {}) {
  return apiFetch<ApiQueueRow[]>("/annotations/queue", { query: params });
}

export function listMine(
  params: {
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
 * Every annotation on the platform, for the admin oversight screen.
 *
 * Same path as `listMine` — annotators see their own, reviewers and admins see
 * all — with the envelope on so the screen can show a total.
 */
export function listAllAnnotations(
  params: {
    status?: ApiAnnotationStatus;
    limit?: number;
    offset?: number;
    expand?: "tags";
  } = {}
) {
  return apiFetch<{
    items: ApiAnnotationSummary[];
    total: number;
    limit: number;
    offset: number;
  }>("/annotations", { query: { ...params, envelope: true } });
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

/** Hands the annotation back for review. */
export function submitAnnotation(id: string) {
  return apiFetch<ApiAnnotationDocument>(`/annotations/${id}/submit`, { method: "POST" });
}



/**
 * The clip, as a blob URL.
 *
 * The audio route is authenticated, so an `<audio src>` pointed straight at it
 * would send no token and 401. Callers must `URL.revokeObjectURL` when the
 * player unmounts.
 */
export const annotationAudioUrl = (id: string) =>
  apiFetchBlobUrl(`/annotations/${id}/audio`);

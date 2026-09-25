import { apiFetch } from "./client";

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
};

/** One of this annotator's own annotations. */
export type ApiAnnotationSummary = {
  id: string;
  session_id: string;
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
  params: { status?: ApiAnnotationStatus; limit?: number; offset?: number } = {}
) {
  return apiFetch<ApiAnnotationSummary[]>("/annotations", { query: params });
}

export function getAnnotation(id: string) {
  return apiFetch<ApiAnnotationDocument>(`/annotations/${id}`);
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

/** Convenience: replace the whole transcript in one call. */
export function setTranscript(
  id: string,
  words: string[],
  currentTokenCount: number,
  expectedVersion?: number
) {
  return spliceTokens(id, {
    start_token: 0,
    replace_count: currentTokenCount,
    tokens: words.map((text) => ({ text })),
    expected_version: expectedVersion,
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

/* ------------------------------------------------------------------ *
 * Language codes
 *
 * The annotations API uses ISO 639-3 (`yor`, `eng`) where the rest of the
 * product uses 639-1 (`yo`, `en`). Mapped here rather than at call sites.
 * ------------------------------------------------------------------ */

const TO_API_LANGUAGE: Record<string, ApiAnnotationLanguage> = {
  yo: "yor",
  ha: "hau",
  ig: "ibo",
  pcm: "pcm",
  en: "eng",
  und: "und",
};

const FROM_API_LANGUAGE: Record<string, string> = {
  yor: "yo",
  hau: "ha",
  ibo: "ig",
  pcm: "pcm",
  eng: "en",
  und: "und",
};

export function toApiLanguage(code: string): ApiAnnotationLanguage {
  return TO_API_LANGUAGE[code] ?? "und";
}

export function fromApiLanguage(code: string): string {
  return FROM_API_LANGUAGE[code] ?? "und";
}

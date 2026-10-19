import { apiFetch } from "./client";

/**
 * The annotation activity log.
 *
 * An append-only record of how an annotation was built, so an admin can replay
 * it. Three rules the API enforces and the UI has to respect:
 *
 * **Nothing is recorded until the annotator agrees to it.** They record
 * `POST /onboarding/consent` with `annotation_activity_log` once; until then,
 * and after any withdrawal, batches return 403 and nothing is stored. Their
 * annotation work is never blocked by this, only the log.
 *
 * **Events are kept 90 days**, then deleted.
 *
 * **Only admins and the annotator it describes can read it** — not reviewers.
 */

export type AnnotationEventOp =
  | "session.claim"
  | "segment.create"
  | "segment.resize"
  | "segment.delete"
  | "speaker.create"
  | "speaker.assign"
  | "tag.add"
  | "tag.remove"
  | "text.edit"
  | "session.submit";

export type ApiAnnotationEvent = {
  id: string;
  seq: number;
  at: string;
  received_at: string;
  media_time: number | null;
  op: AnnotationEventOp;
  actor_id: string;
  payload: Record<string, unknown>;
};

/**
 * Sends a batch, up to 500.
 *
 * All or nothing, and idempotent: a retried event with the same `id` and `seq`
 * is counted under `duplicates` rather than stored twice, so re-sending a
 * whole buffer after a lost response is safe. A stale buffer gets a 409 whose
 * message says what to resend.
 */
export const sendEvents = (
  annotationId: string,
  events: {
    id: string;
    seq: number;
    at: string;
    media_time?: number | null;
    op: AnnotationEventOp;
    payload?: Record<string, unknown>;
  }[]
) =>
  apiFetch<{ accepted: number; duplicates: number; last_seq: number }>(
    `/annotations/${annotationId}/events`,
    { method: "POST", body: { events } }
  );

/**
 * Reads the log in replay order.
 *
 * Paged with `after_seq`, not an offset: the log can grow while it is being
 * read, and an offset would skip or repeat rows when it does.
 */
export const listEvents = (
  annotationId: string,
  params: { after_seq?: number; limit?: number } = {}
) =>
  apiFetch<{ items: ApiAnnotationEvent[]; total: number }>(
    `/annotations/${annotationId}/events`,
    { query: { ...params, envelope: true } }
  );

export type ApiEventSummary = {
  by_op: Record<string, number>;
  by_actor: { actor_id: string; name: string | null; count: number }[];
  /**
   * Distinct minutes in which anything was recorded.
   *
   * Listening without clicking records nothing, so this is a rough measure of
   * activity rather than of hours worked.
   */
  active_minutes: number;
  first_at: string | null;
  last_at: string | null;
  last_seq: number;
};

export const eventSummary = (annotationId: string) =>
  apiFetch<ApiEventSummary>(`/annotations/${annotationId}/events/summary`);

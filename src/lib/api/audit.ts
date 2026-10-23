import { apiFetch } from "./client";
import type { ApiUserRole } from "./enums";

/**
 * The audit log.
 *
 * One route for every History tab. Before this, each tab reconstructed a
 * plausible sequence from the row it was looking at — a verdict placed two
 * hours after submission, admin actions drawn from a seeded random — which
 * looked like a record and was invented.
 *
 * Admin only; every other role gets a 403.
 */

/** What an event is about. The four panels with a History tab, plus the banks. */
export type AuditSubject =
  | "user"
  | "recording"
  | "annotation"
  | "focus_group"
  | "prompt"
  | "stimulus"
  | "focus_group_topic";

export type ApiAuditEvent = {
  id: string;
  at: string;
  actor_id: string | null;
  /** Null for an automatic event, and for a deleted account. */
  actor_name: string | null;
  /** The role they held AT THE TIME, so an intern later made admin stays an intern here. */
  actor_role: ApiUserRole | null;
  /** The system decided, not a person. */
  automatic: boolean;
  /** Treat an unfamiliar one as plain text: more will be added. */
  action: string;
  subject_type: AuditSubject;
  subject_id: string;
  /** The sentence to show. Already names everybody involved. */
  detail: string;
};

/**
 * One subject's history, newest first.
 *
 * `subject_type` and `subject_id` travel together: one without the other is a
 * 422. With neither, it returns the newest events across the platform.
 *
 * A focus group's history includes its annotations' events, because who an
 * annotation went to is recorded on the annotation. Each row says which it is
 * about.
 */
export const auditLog = (params: {
  subject_type?: AuditSubject;
  subject_id?: string;
  limit?: number;
  offset?: number;
}) =>
  apiFetch<{ items: ApiAuditEvent[]; total: number }>("/audit", {
    query: { ...params, envelope: true },
  });

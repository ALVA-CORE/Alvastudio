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
/**
 * Whether sign-ins come back with everything else.
 *
 * They are high volume — one person signing in every morning is 250 rows a
 * year against a handful of verdicts — so the API leaves them out by default
 * and a screen that wants them asks. `only` is how the Sign-ins tab gets a
 * session history without the rest of the account's life in the way.
 *
 * `user.sessions_ended` is NOT one of these. It stays in the default history,
 * directly above the password change or role change that caused it, because
 * it is the consequence of an admin action rather than a session event.
 */
export type AuditSignIns = "exclude" | "include" | "only";

export const auditLog = (params: {
  subject_type?: AuditSubject;
  subject_id?: string;
  sign_ins?: AuditSignIns;
  limit?: number;
  offset?: number;
}) =>
  apiFetch<{ items: ApiAuditEvent[]; total: number }>("/audit", {
    query: { ...params, envelope: true },
  });

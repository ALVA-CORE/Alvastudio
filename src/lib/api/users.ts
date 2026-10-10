import { apiFetch } from "./client";

/**
 * Account administration.
 *
 * Everything here is admin-only at the API. The one thing it deliberately does
 * not do is set anyone's password: see `issuePasswordReset`.
 */

export type ApiUserRole = "contributor" | "intern" | "annotator" | "admin";

export type ApiUser = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: ApiUserRole;
  is_active: boolean;
  /** Only meaningful for `intern`. False until an admin approves the signup. */
  intern_approved: boolean;
  created_at: string;
};

export type ApiUserPage = {
  items: ApiUser[];
  total: number;
  limit: number;
  offset: number;
};

/**
 * `envelope=true` so the row count comes back in the body.
 *
 * Without it the total is only in an `X-Total-Count` header, which `apiFetch`
 * does not surface. A count nobody can reach is not a count.
 */
export function listUsers(
  params: { role?: ApiUserRole; email?: string; limit?: number; offset?: number } = {}
) {
  return apiFetch<ApiUserPage>("/users", {
    query: { ...params, envelope: true },
  });
}

/**
 * Creates an account.
 *
 * The API requires a password, and an admin must never choose one: a password
 * an admin knows is a password an admin can sign in with, and nothing in the
 * record would show it happened. So the caller passes a generated throwaway
 * that is never shown to anyone, and the real credential is set by the person
 * themselves from the reset token issued straight after.
 */
export function createUser(body: {
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
  role: ApiUserRole;
}) {
  return apiFetch<ApiUser>("/users", { method: "POST", body });
}

/** Partial. Omitted fields are left alone, which is how deactivate works. */
export function updateUser(
  id: string,
  body: Partial<{
    full_name: string;
    phone: string | null;
    role: ApiUserRole;
    is_active: boolean;
  }>
) {
  return apiFetch<ApiUser>(`/users/${id}`, { method: "PATCH", body });
}

export function deleteUser(id: string) {
  return apiFetch<ApiUserDeletionSummary>(`/users/${id}`, { method: "DELETE" });
}

/**
 * What deleting this account would take with it.
 *
 * Worth asking before the confirm dialog rather than after: "delete Ada" and
 * "delete Ada and 118 recordings" are different decisions.
 */
export type ApiUserDeletionSummary = {
  user_id: string;
  email: string;
  role: ApiUserRole;
  recordings: number;
  reviews: number;
  reviews_on_other_users_recordings: number;
  ledger_entries: number;
  focus_group_sessions: number;
  participants: number;
  turns: number;
  annotations: number;
  annotation_segments: number;
  annotation_tokens: number;
  consent_records: number;
  payout_records_kept?: number;
};

export function previewUserDeletion(id: string) {
  return apiFetch<ApiUserDeletionSummary>(`/users/${id}/deletion-preview`);
}

/** Lets an intern who registered themselves actually sign in. */
export function approveIntern(id: string) {
  return apiFetch<ApiUser>(`/users/${id}/approve-intern`, { method: "POST" });
}

export type ApiPasswordResetIssued = {
  token: string;
  expires_at: string;
  user_id: string;
  email: string;
};

/**
 * Issues a single-use token, and sends nothing.
 *
 * The admin passes it to the person out of band and they redeem it at
 * `POST /auth/password-reset/redeem` with a password of their own choosing.
 * Who issued it and when it was used are both recorded, which is the point:
 * an admin who could set a password could sign in as anyone.
 */
export function issuePasswordReset(id: string) {
  return apiFetch<ApiPasswordResetIssued>(`/users/${id}/password-reset`, {
    method: "POST",
  });
}

/**
 * A throwaway for the create call, never shown to anyone.
 *
 * It exists only to satisfy the required field between creating the account
 * and issuing the reset token the person actually uses.
 */
export function throwawayPassword() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `Tmp!${Array.from(bytes, (b) => b.toString(36)).join("").slice(0, 28)}`;
}

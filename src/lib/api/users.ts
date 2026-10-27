import { apiFetch } from "./client";
import type { ApiPage } from "./recordings";

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
  /** Interns and annotators both. False until an admin approves. */
  approved: boolean;
  /** @deprecated Alias of `approved`, kept by the API for older clients. */
  intern_approved: boolean;
  /**
   * A contributor who signed up while the platform was full.
   *
   * True only for them — a pending intern reads `approved: false,
   * waitlisted: false`. The two need different words on screen: one is
   * waiting on a judgement, the other on a vacancy, and telling somebody
   * "we are reviewing you" when nobody is reading anything is a lie.
   */
  waitlisted?: boolean;
  created_at: string;
  /**
   * Annotations still on this person's desk: `draft` plus `needs_rework`.
   *
   * Null on responses that return a user without counting it, such as
   * `/auth/me` — that means "not counted here" rather than zero.
   */
  open_count?: number | null;
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

/** Just an id and a name. Nothing else about the account is even selected. */
export type ApiContributorRef = { id: string; full_name: string };

/**
 * Active contributors, for a reviewer's pickers and filters.
 *
 * `GET /users?role=contributor` is admin-only, because it carries email,
 * phone and account state — so an intern's review screen was getting a 403
 * on it and silently falling back to showing the first eight characters of a
 * UUID in place of every contributor's name.
 *
 * `q` is a plain substring match, so a picker can search on the server
 * instead of downloading everybody to filter in the browser.
 */
export function listContributors(
  params: { q?: string; limit?: number; offset?: number } = {}
) {
  return apiFetch<ApiPage<ApiContributorRef>>("/users/contributors", {
    query: { ...params, envelope: true },
  });
}

/**
 * Creates an account, and the token the person uses to get into it.
 *
 * No password. An admin must never choose one — a password an admin knows is
 * a password an admin can sign in with, and nothing in the record would show
 * it happened. Leaving it out makes the server generate one nobody ever sees
 * and return a single-use reset token in `password_reset`, which replaces the
 * throwaway-then-reset round trip we used to do.
 */
export type ApiUserCreated = ApiUser & {
  /** Single-use, shown once, for the person to set their own password. */
  password_reset?: { token: string; expires_at: string } | null;
};

export function createUser(body: {
  email: string;
  full_name: string;
  phone?: string | null;
  role: ApiUserRole;
}) {
  return apiFetch<ApiUserCreated>("/users", { method: "POST", body });
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
/**
 * What a person submitted, for an admin deciding whether to approve them.
 *
 * Each branch is null when it was never filled in. An applicant can write
 * their profile before approval, which is the point: it is the claim being
 * approved.
 */
export type ApiUserProfiles = {
  user_id: string;
  role: ApiUserRole;
  approved: boolean;
  profile: {
    age_bracket?: string | null;
    gender?: string | null;
    state_of_origin?: string | null;
    state_of_residence?: string | null;
    ethnicity?: string | null;
    occupation?: string | null;
    native_languages?: string[] | null;
    pidgin_fluency?: string | null;
    english_fluency?: string | null;
    preferred_language_variety?: string | null;
    device_mic?: string | null;
    home_languages?: string[] | null;
  } | null;
  intern_profile: {
    primary_state?: string | null;
    coverage_areas?: string[] | null;
  } | null;
  /**
   * Where a contributor stands on being paid.
   *
   * Null when they have no wallet yet, which means not started rather than
   * failed. Shows no part of the NIN, not even the last digits.
   */
  identity: {
    identity_status: string;
    /** The condition for being paid: a NIN that passed and that nobody else holds. */
    identity_verified: boolean;
    identity_failure_reason: string | null;
    wallet_status: string | null;
    next_action: string | null;
    next_action_detail: string | null;
  } | null;
  annotator_profile: {
    language_varieties?: string[] | null;
    sessions_covered?: string[] | null;
  } | null;
};

export function getUserProfiles(id: string) {
  return apiFetch<ApiUserProfiles>(`/users/${id}/profiles`);
}

/** Somebody who has asked an admin for help getting back into their account. */
export type ApiPasswordResetRequest = {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  requested_at: string;
};

export function listPasswordResetRequests() {
  return apiFetch<ApiPasswordResetRequest[]>("/users/password-reset-requests");
}

/** Approving issues the reset link and emails it to them. */
export function approvePasswordResetRequest(id: string) {
  return apiFetch<ApiPasswordResetIssued>(
    `/users/password-reset-requests/${id}/approve`,
    { method: "POST" }
  );
}

export function denyPasswordResetRequest(id: string) {
  return apiFetch<void>(`/users/password-reset-requests/${id}/deny`, {
    method: "POST",
  });
}

/** Interns and annotators. Replaces the deprecated `approve-intern`. */
export function approveUser(id: string) {
  return apiFetch<ApiUser>(`/users/${id}/approve`, { method: "POST" });
}

/** @deprecated Use {@link approveUser}. */
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

/* ------------------------------------------------------------------ *
 * Per-person activity
 * ------------------------------------------------------------------ */

/** One day in the window. Quiet days are present, as `0`. */
export type ApiActivityDay = { date: string; count: number };

/** What became of the clips uploaded in the window, by their status now. */
export type ApiContributorOutcomes = {
  submitted: number;
  approved: number;
  rejected: number;
  flagged: number;
  pending: number;
};

export type ApiInternOutcomes = {
  clips_reviewed: number;
  approved: number;
  rejected: number;
  flagged: number;
  sessions_run: number;
  participants: number;
};

export type ApiAnnotatorOutcomes = {
  annotations_started: number;
  submitted: number;
  approved: number;
  sent_back: number;
  rejected: number;
  segments_created: number;
};

/**
 * One person's work over a trailing window, for the admin reading them.
 *
 * What a count means depends on the role, and `unit` says it: a clip for a
 * contributor, a verdict or a session for an intern, a segment for an
 * annotator, an action for an admin. That is why nothing here hardcodes a
 * noun — the panel prints `unit` rather than deciding for itself.
 *
 * Exactly one outcome block is filled, for the person's role. An admin has
 * none: there is nothing to approve or reject about an admin action.
 */
export type ApiUserActivity = {
  user_id: string;
  role: string;
  window_days: number;
  start_date: string;
  end_date: string;
  unit: string;
  daily: ApiActivityDay[];
  total: number;
  active_days: number;
  best_streak: number;
  contributor: ApiContributorOutcomes | null;
  intern: ApiInternOutcomes | null;
  annotator: ApiAnnotatorOutcomes | null;
};

export function getUserActivity(id: string, windowDays = 365) {
  return apiFetch<ApiUserActivity>(`/users/${id}/activity`, {
    query: { window_days: windowDays },
  });
}

/* ------------------------------------------------------------------ *
 * Email delivery
 * ------------------------------------------------------------------ */

/**
 * One email the API tried to send this person.
 *
 * `sent` means the mail service accepted it, which is not the same as it
 * reaching an inbox, and nothing on screen should claim otherwise.
 */
export type ApiEmailDelivery = {
  id: string;
  kind: string;
  queued_at: string;
  sent_at: string | null;
  status: "sent" | "pending" | "failed" | "skipped";
  attempts: number;
  error: string | null;
};

export function listUserEmails(
  id: string,
  params: { limit?: number; offset?: number } = {}
) {
  return apiFetch<{ items: ApiEmailDelivery[]; total: number }>(
    `/users/${id}/emails`,
    { query: { ...params, envelope: true } }
  );
}

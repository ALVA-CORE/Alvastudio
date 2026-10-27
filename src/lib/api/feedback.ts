import { apiFetch, ApiError } from "./client";
import { SUPPORT_EMAIL } from "@/lib/links";

/**
 * Feedback from the person using the app.
 *
 * **Not in the API yet.** The contract below is what we asked for in
 * `docs/backend/endpoints-needed.md`; until it is deployed every submit comes
 * back 404 and the sheet falls back to an email. That fallback is the reason
 * this is worth shipping before the route exists: a form that cannot send is
 * worse than no form, and a person with a bug to report should not have to
 * wait for a deploy to tell anybody about it.
 */

/** Where support picks it up until the route exists. */
/* Re-exported so existing callers keep working. Defined in `lib/links`,
   with the terms, privacy and payments URLs it belongs beside. */
export { SUPPORT_EMAIL };

export type FeedbackKind = "bug" | "idea" | "confusing" | "praise" | "other";

export type FeedbackStatus = "new" | "reading" | "done" | "wont_fix";

export const FEEDBACK_KIND_LABEL: Record<FeedbackKind, string> = {
  bug: "Something is broken",
  idea: "An idea",
  confusing: "Something is confusing",
  praise: "Something good",
  other: "Something else",
};

export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  new: "New",
  reading: "In progress",
  done: "Done",
  wont_fix: "Dismissed",
};

export type ApiFeedback = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  role: string | null;
  kind: FeedbackKind;
  /** 1 to 5. The form will not send without one. */
  rating: number;
  message: string;
  /** Which screen they were on. Sent by us, never typed. */
  page: string | null;
  status: FeedbackStatus;
  /** When an admin last moved it. Null while it is still `new`. */
  status_changed_at: string | null;
  created_at: string;
};

export type FeedbackDraft = {
  kind: FeedbackKind;
  rating: number;
  message: string;
  page: string;
};

export function submitFeedback(draft: FeedbackDraft) {
  return apiFetch<ApiFeedback>("/feedback", { method: "POST", body: draft });
}

export function listFeedback(
  params: { status?: FeedbackStatus; limit?: number; offset?: number } = {}
) {
  return apiFetch<{ items: ApiFeedback[]; total: number }>("/feedback", {
    query: { ...params, envelope: true },
  });
}

export function setFeedbackStatus(id: string, status: FeedbackStatus) {
  return apiFetch<ApiFeedback>(`/feedback/${id}`, {
    method: "PATCH",
    body: { status },
  });
}

/**
 * Whether this failure means the route is simply not deployed.
 *
 * A 404 or a 405 on a path we know the shape of is a missing route rather
 * than a missing record, and it is the one failure worth handling differently:
 * everything else is a real error the person should see.
 */
export function isMissingRoute(cause: unknown) {
  return cause instanceof ApiError && (cause.status === 404 || cause.status === 405);
}

/** The same feedback, as an email, for while the route does not exist. */
export function feedbackMailto(draft: FeedbackDraft, from: string | null) {
  const subject = `Alva Studio feedback: ${FEEDBACK_KIND_LABEL[draft.kind]}`;
  const body = [
    draft.message,
    "",
    "---",
    `Rating: ${draft.rating} of 5`,
    `Page: ${draft.page}`,
    from ? `From: ${from}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

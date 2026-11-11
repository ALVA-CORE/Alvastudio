import { apiFetch, apiUpload } from "./client";

/**
 * Admin email to contributors (4 Nov handoff, `/communications`).
 *
 * The subject is the email subject and the heading inside the layout. The
 * body is plain text, or since 5 Nov a fixed Markdown subset
 * (`body_format: "markdown"`, see `lib/admin/emailMarkdown.ts`); HTML in it is
 * shown as text, never run. A hero image is uploaded first and attached by
 * id.
 *
 * Saving never sends. Sending is a separate, explicit call against the
 * revision the admin previewed, and a 200 from it is "queued", not
 * "delivered".
 */

export type ApiCommunicationAudience = "all_contributors" | "selected_contributors";
export type ApiCommunicationStatus = "draft" | "queued" | "sending" | "completed";
export type ApiCommunicationDeliveryStatus =
  | "pending"
  | "sent"
  | "failed"
  | "skipped"
  | "removed";

/** The API's own limits, mirrored so the editor can count against them. */
export const COMMUNICATION_LIMITS = {
  subject: 200,
  body: 20_000,
  actionLabel: 80,
  actionUrl: 2048,
  recipients: 1000,
} as const;

export type ApiDeliveryCounts = {
  /** The fixed audience size once queued. Removed recipients still count. */
  total: number;
  pending: number;
  sent: number;
  failed: number;
  skipped: number;
  removed: number;
};

export type ApiCommunication = {
  id: string;
  subject: string;
  audience: ApiCommunicationAudience;
  revision: number;
  status: ApiCommunicationStatus;
  created_by_id: string | null;
  queued_by_id: string | null;
  created_at: string;
  updated_at: string;
  queued_at: string | null;
  /** An estimate while drafting; the fixed audience size after queueing. */
  recipient_count: number;
  unavailable_recipient_count: number;
  /** Mail is configured on the server. Not proof that anything is delivered. */
  email_available: boolean;
  delivery: ApiDeliveryCounts;
};

export type ApiBodyFormat = "plain" | "markdown";

export type ApiCommunicationDetail = ApiCommunication & {
  body: string;
  body_format: ApiBodyFormat;
  recipient_ids: string[];
  action_label: string | null;
  action_url: string | null;
  hero_image_id: string | null;
  /** Null for the brand image. */
  hero_image_url: string | null;
};

export type ApiCommunicationPreview = {
  revision: number;
  recipient_count: number;
  unavailable_recipient_count: number;
  email_available: boolean;
  subject: string;
  /** The exact email, with a sample greeting. Render sandboxed, never inline. */
  html: string;
  text: string;
};

export type ApiCommunicationRecipient = {
  id: string;
  /** Null once the account is deleted; the row stays, anonymous. */
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  status: ApiCommunicationDeliveryStatus;
  attempts: number;
  sent_at: string | null;
  /** A sanitized code, not prose. */
  error: string | null;
};

export type ApiCommunicationDraft = {
  subject: string;
  body: string;
  audience: ApiCommunicationAudience;
  /** Selected contributors only, 1 to 1,000. Never sent for all contributors. */
  recipient_ids?: string[];
  /** Both or neither. Neither means the standard "Open Alva Studio" button. */
  action_label?: string | null;
  action_url?: string | null;
  /** `plain` by default. On a PATCH it may be left out; `null` is a 422. */
  body_format?: ApiBodyFormat;
  /** From `uploadCommunicationImage`. `null` on a PATCH puts back the brand image. */
  hero_image_id?: string | null;
};

export type ApiCommunicationImage = { id: string; url: string; width: number; height: number };

/**
 * Upload a hero image. PNG, JPEG or WebP up to 5 MB; kept as a re-encoded
 * JPEG at most 1200px wide, with no metadata, served publicly and never
 * deleted. 413 over 5 MB, 415 for another type, 422 unreadable or over 40
 * megapixels, 400 empty.
 */
export const uploadCommunicationImage = (file: File, onProgress?: (fraction: number) => void) => {
  const form = new FormData();
  form.append("file", file);
  return apiUpload<ApiCommunicationImage>("/communications/images", form, onProgress);
};

type Page<T> = { items: T[]; total: number; limit: number; offset: number };

export const listCommunications = (query: { limit?: number; offset?: number } = {}) =>
  apiFetch<Page<ApiCommunication>>("/communications", {
    query: { ...query, envelope: true },
  });

export const getCommunication = (id: string) =>
  apiFetch<ApiCommunicationDetail>(`/communications/${id}`);

export const createCommunication = (draft: ApiCommunicationDraft) =>
  apiFetch<ApiCommunicationDetail>("/communications", { method: "POST", body: draft });

/** Every change carries the revision it was made against. A stale one is a 409. */
export const updateCommunication = (
  id: string,
  revision: number,
  patch: Partial<ApiCommunicationDraft>
) =>
  apiFetch<ApiCommunicationDetail>(`/communications/${id}`, {
    method: "PATCH",
    body: { revision, ...patch },
  });

export const deleteCommunication = (id: string, revision: number) =>
  apiFetch<void>(`/communications/${id}`, { method: "DELETE", query: { revision } });

export const previewCommunication = (id: string) =>
  apiFetch<ApiCommunicationPreview>(`/communications/${id}/preview`);

/**
 * Sends a saved communication, draft or queued, to the signed-in admin's own
 * address and nowhere else (10 Nov). Nothing is queued or logged, and a draft
 * stays a draft. 429 past ten in an hour, with `Retry-After`.
 */
export const sendTestEmail = (communicationId: string) =>
  apiFetch<{ sent_to: string; kind: string; subject: string }>("/communications/test-email", {
    method: "POST",
    body: { communication_id: communicationId },
  });

/**
 * Queue it. Safe to repeat with the same id and revision: the server makes
 * no new jobs. Never retry an uncertain send by creating a new draft.
 */
export const sendCommunication = (id: string, revision: number) =>
  apiFetch<ApiCommunicationDetail>(`/communications/${id}/send`, {
    method: "POST",
    body: { revision },
  });

export const listCommunicationRecipients = (
  id: string,
  query: { limit?: number; offset?: number } = {}
) =>
  apiFetch<Page<ApiCommunicationRecipient>>(`/communications/${id}/recipients`, {
    query: { ...query, envelope: true },
  });

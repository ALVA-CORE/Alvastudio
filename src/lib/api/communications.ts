import { apiFetch } from "./client";

/**
 * Admin email to contributors (4 Nov handoff, `/communications`).
 *
 * Plain text in, the branded email layout out. The subject is the email
 * subject and the heading inside the layout. The body is split into
 * paragraphs on blank lines, single newlines become line breaks, and HTML is
 * shown as text, never run. There is no rich text and no per-message hero
 * image on the API yet (endpoints-needed #6 and #7), so nothing here sends
 * either.
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

export type ApiCommunicationDetail = ApiCommunication & {
  body: string;
  recipient_ids: string[];
  action_label: string | null;
  action_url: string | null;
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

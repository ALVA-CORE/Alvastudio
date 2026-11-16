import { apiFetch } from "./client";
import type { ApiUserRole } from "./enums";
import type { ApiIdentityStatus } from "./wallet";

/**
 * In-app announcements (15 Nov handoff, `/announcements`, admin only).
 *
 * A draft until it is sent; sending fixes the recipients at that moment.
 * Recipients read them in `GET /notifications` as kind `announcement`.
 */

export type ApiAnnouncementStatus = "draft" | "sent" | "expired" | "withdrawn";

/**
 * Who gets it. Every field given must hold. An empty list is a 422, so a
 * field with nothing in it is left out, never sent as `[]`.
 */
export type ApiAnnouncementAudience = {
  roles?: ApiUserRole[] | null;
  /** `false` is the people waiting for approval. */
  approved?: boolean | null;
  identity_status?: ApiIdentityStatus[] | null;
  emails?: string[] | null;
  user_ids?: string[] | null;
};

/** The API's own limits, mirrored so the form can stop at them. */
export const ANNOUNCEMENT_LIMITS = {
  title: 200,
  body: 2000,
  actionLabel: 80,
  actionUrl: 2048,
} as const;

export type ApiAnnouncement = {
  id: string;
  title: string;
  body: string;
  audience: ApiAnnouncementAudience;
  action_label: string | null;
  action_url: string | null;
  status: ApiAnnouncementStatus;
  created_by_id: string | null;
  sent_by_id: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  withdrawn_at: string | null;
  expires_at: string | null;
  /** Draft: who matches right now. Sent: the fixed number it went to. */
  recipient_count: number;
  read_count: number;
};

export type ApiAnnouncementIn = {
  title: string;
  body: string;
  /** Left out means everybody. */
  audience?: ApiAnnouncementAudience;
  /** Both or neither. */
  action_label?: string | null;
  action_url?: string | null;
  expires_at?: string | null;
};

/** Only what changed. `null` clears the action pair or the expiry. */
export type ApiAnnouncementPatch = {
  title?: string;
  body?: string;
  /** Replaces the whole audience. */
  audience?: ApiAnnouncementAudience;
  action_label?: string | null;
  action_url?: string | null;
  expires_at?: string | null;
};

type Page<T> = { items: T[]; total: number; limit: number; offset: number };

/** `sent` lists everything ever sent, withdrawn and expired included. */
export const listAnnouncements = (
  query: { status?: "draft" | "sent"; limit?: number; offset?: number } = {}
) =>
  apiFetch<Page<ApiAnnouncement>>("/announcements", {
    query: { ...query, envelope: true },
  });

export const createAnnouncement = (draft: ApiAnnouncementIn) =>
  apiFetch<ApiAnnouncement>("/announcements", { method: "POST", body: draft });

export const updateAnnouncement = (id: string, patch: ApiAnnouncementPatch) =>
  apiFetch<ApiAnnouncement>(`/announcements/${id}`, { method: "PATCH", body: patch });

/** Safe to repeat: a second call reaches nobody new. 409 when nobody matches. */
export const sendAnnouncement = (id: string) =>
  apiFetch<ApiAnnouncement>(`/announcements/${id}/send`, { method: "POST" });

export const withdrawAnnouncement = (id: string) =>
  apiFetch<ApiAnnouncement>(`/announcements/${id}/withdraw`, { method: "POST" });

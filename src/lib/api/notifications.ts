import { apiFetch } from "./client";

/**
 * What has happened to a person's work.
 *
 * Marking read is a bulk call, not one per item, and that is deliberate on the
 * API's side: `{all: true}` clears everything the user can see, including
 * items this client has never loaded. Sending back only the keys on screen
 * would leave a badge showing a number nobody could clear.
 */

export type ApiNotification = {
  /**
   * Opaque, and sent back verbatim. It encodes which table the notification
   * came from and may change shape. Annotation keys deliberately carry the
   * status (`annotation:<id>:needs_rework`), so work that is returned and
   * later approved is two notifications rather than one that quietly changes
   * meaning.
   */
  key: string;
  kind: string;
  title: string;
  body: string;
  created_at: string;
  read?: boolean;
  recording_id?: string | null;
  annotation_id?: string | null;
  session_id?: string | null;
};

export type ApiNotificationPage = {
  items: ApiNotification[];
  total: number;
  limit: number;
  offset: number;
};

export function listNotifications(
  params: { unreadOnly?: boolean; limit?: number; offset?: number } = {}
) {
  return apiFetch<ApiNotificationPage>("/notifications", {
    query: {
      unread_only: params.unreadOnly,
      limit: params.limit,
      offset: params.offset,
      envelope: true,
    },
  });
}

export function unreadCount() {
  return apiFetch<{ unread: number }>("/notifications/unread-count");
}

/** Idempotent: marking twice returns `marked: 0` rather than an error. */
export function markRead(body: { keys: string[] } | { all: true }) {
  return apiFetch<{ marked: number; unread: number }>("/notifications/read", {
    method: "POST",
    body,
  });
}

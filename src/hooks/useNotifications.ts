import { useCallback, useEffect, useState } from "react";
import {
  listNotifications,
  markRead,
  type ApiNotification,
} from "@/lib/api/notifications";
import { reportApiError } from "@/lib/api/reportApiError";

/**
 * Everything on one person's notification list.
 *
 * The unread count is derived from the rows rather than fetched from
 * `/notifications/unread-count`, because the two would be one request apart
 * and a badge that disagrees with the list under it is worse than a badge that
 * is occasionally a beat behind. The dedicated count endpoint is for places
 * that want the number without the list, which so far is nowhere.
 *
 * Marking read is optimistic. It is idempotent at the API and the worst case
 * is a dot that comes back on the next load, which is a smaller lie than a
 * list that will not respond to being read.
 */
export function useNotifications({ limit = 50 }: { limit?: number } = {}) {
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    listNotifications({ limit })
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(reportApiError(cause, "Could not load notifications."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [limit, attempt]);

  const unread = items.filter((item) => !item.read).length;

  const markOneRead = useCallback(async (key: string) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, read: true } : item))
    );
    try {
      await markRead({ keys: [key] });
    } catch {
      /* Idempotent at the API, so a failure here costs a dot on next load. */
    }
  }, []);

  /**
   * `{all: true}` rather than the keys on screen.
   *
   * It clears everything the person can see, including rows this client has
   * never loaded. Sending only what is rendered would leave a badge showing a
   * number nobody could ever clear.
   */
  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    try {
      await markRead({ all: true });
    } catch {
      /* Same bargain as above. */
    }
  }, []);

  return {
    items,
    unread,
    isLoading,
    error,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
    markOneRead,
    markAllRead,
  };
}

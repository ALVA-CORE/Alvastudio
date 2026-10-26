import { useEffect, useState } from "react";
import { getUserActivity, type ApiUserActivity } from "@/lib/api/users";

/**
 * One person's year, for the admin panel's Activity tab.
 *
 * Fetched when the panel opens rather than with the user list: it is 365 days
 * of counts for one person, and nobody opens twenty panels at once.
 *
 * Three states, not two. `undefined` is in flight and `null` is a request
 * that failed, because an empty tab and a tab that could not load are
 * different things to say — the first is a quiet account, the second is a
 * problem. A tab that shows "no activity" when the call 500'd is how the old
 * invented heatmap got away with being wrong for so long.
 */
export function useUserActivity(userId: string | undefined, enabled = true) {
  const [activity, setActivity] = useState<ApiUserActivity | null | undefined>(
    undefined
  );

  useEffect(() => {
    if (!enabled || !userId) {
      setActivity(undefined);
      return;
    }

    let cancelled = false;
    setActivity(undefined);

    getUserActivity(userId)
      .then((result) => {
        if (!cancelled) setActivity(result);
      })
      .catch(() => {
        if (!cancelled) setActivity(null);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, enabled]);

  return activity;
}

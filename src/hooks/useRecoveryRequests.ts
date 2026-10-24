import { useCallback, useEffect, useState } from "react";
import {
  approvePasswordResetRequest,
  denyPasswordResetRequest,
  listPasswordResetRequests,
  type ApiPasswordResetRequest,
} from "@/lib/api/users";
import { reportApiError } from "@/lib/api/reportApiError";

export type RecoveryRequest = {
  id: string;
  userId: string;
  name: string;
  email: string;
  requestedAt: number;
  requestedLabel: string;
};

function label(iso: string) {
  const at = new Date(iso);
  const hours = Math.floor((Date.now() - at.getTime()) / 36e5);

  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

/**
 * People waiting to be let back into their account.
 *
 * Recovery is not self-serve: somebody asks, an admin decides, and the API
 * emails the link on approval. A queue that nobody can see is a queue nobody
 * works, which is what this was before the screen existed.
 *
 * Hours rather than days in the label, because this is a queue somebody is
 * sitting in: "6h ago" is a different kind of wait from "2d ago" and the
 * difference matters to whoever is deciding.
 */
export function useRecoveryRequests() {
  const [rows, setRows] = useState<RecoveryRequest[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    listPasswordResetRequests()
      .then((items: ApiPasswordResetRequest[]) => {
        if (cancelled) return;
        setRows(
          items
            .map((item) => ({
              id: item.id,
              userId: item.user_id,
              name: item.full_name,
              email: item.email,
              requestedAt: new Date(item.requested_at).getTime(),
              requestedLabel: label(item.requested_at),
            }))
            .sort((a, b) => a.requestedAt - b.requestedAt)
        );
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load the requests."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const drop = useCallback((id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const approve = useCallback(
    async (id: string) => {
      await approvePasswordResetRequest(id);
      drop(id);
    },
    [drop]
  );

  const deny = useCallback(
    async (id: string) => {
      await denyPasswordResetRequest(id);
      drop(id);
    },
    [drop]
  );

  return {
    rows,
    isLoading,
    error,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
    approve,
    deny,
  };
}

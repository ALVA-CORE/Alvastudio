import { useCallback, useEffect, useState } from "react";
import {
  approvePasswordResetRequest,
  denyPasswordResetRequest,
  listPasswordResetRequests,
  listUserEmails,
  type ApiEmailDelivery,
  type ApiPasswordResetRequest,
} from "@/lib/api/users";
import { reportApiError } from "@/lib/api/reportApiError";

/** What became of the link, once an approval has gone through. */
export type ResetLinkOutcome = ApiEmailDelivery["status"] | "unknown";

/** About ten seconds of asking, which covers the outbox worker's usual lag. */
const RESET_EMAIL_CHECKS = 5;
const RESET_EMAIL_INTERVAL_MS = 2500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

  /**
   * Whether the link actually went out.
   *
   * A 200 from the approve call means a token was minted, not that anybody
   * received anything. For three weeks every reset email was being refused by
   * the mail provider while the API answered 200, and this screen said "Reset
   * link emailed" each time. `GET /users/{id}/emails` is how it can tell.
   *
   * `unknown` when the lookup itself fails, which is not the same as `failed`:
   * one means the mail was refused, the other that we did not get to ask.
   */
  const approve = useCallback(
    async (id: string): Promise<void> => {
      await approvePasswordResetRequest(id);
      drop(id);
    },
    [drop]
  );

  /**
   * What became of the reset email, after giving it a moment.
   *
   * Approving puts the email in the API's outbox, and a worker sends it a
   * moment later. Asking once, straight after the approve call, nearly
   * always caught it before the worker had: "still queued" every time, which
   * read like a fault. So this asks a few times over about ten seconds and
   * answers as soon as the email has left the outbox, one way or the other.
   * `pending` after that means it really is waiting.
   */
  const resetEmailOutcome = useCallback(
    async (userId: string): Promise<ResetLinkOutcome> => {
      let outcome: ResetLinkOutcome = "unknown";
      for (let attempt = 0; attempt < RESET_EMAIL_CHECKS; attempt += 1) {
        if (attempt > 0) await sleep(RESET_EMAIL_INTERVAL_MS);
        try {
          const page = await listUserEmails(userId, { limit: 5 });
          const link = page.items.find((email) => email.kind === "reset_link");
          outcome = link?.status ?? "unknown";
        } catch {
          outcome = "unknown";
        }
        if (outcome !== "pending") return outcome;
      }
      return outcome;
    },
    []
  );

  const deny = useCallback(
    async (id: string) => {
      await denyPasswordResetRequest(id);
      drop(id);
    },
    [drop]
  );

  return {
    resetEmailOutcome,
    rows,
    isLoading,
    error,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
    approve,
    deny,
  };
}

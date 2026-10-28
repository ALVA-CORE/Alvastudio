import { useCallback, useEffect, useState } from "react";
import { identityRecheck, type ApiIdentityRecheckRow } from "@/lib/api/payouts";
import { listUserEmails } from "@/lib/api/users";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";

/**
 * The contributors whose identity check the 27 Oct change reset.
 *
 * Read as a preview, which is what the route is unless `apply` is set. The
 * list is the point: an admin deciding whether to mail a group of people
 * should be looking at who they are, not at a number.
 *
 * `send` applies it. Safe to repeat — nobody is emailed twice and the list
 * is rechecked at send time, so anybody who submitted a document in the
 * meantime drops off it — which is why it reloads afterwards rather than
 * patching rows optimistically.
 */
export function useIdentityRecheck(enabled: boolean) {
  const [rows, setRows] = useState<ApiIdentityRecheckRow[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [isSending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);

    identityRecheck()
      .then((result) => {
        if (cancelled) return;
        setRows(result.contributors);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not read the list."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  /**
   * Emails everybody on the list who has not been told.
   *
   * Returns how many went, or null if it failed. A `503` means email is not
   * configured, and the route refuses rather than reporting a success
   * nobody received — an admin who believes the mail went is the worst
   * outcome this feature has.
   */
  const send = useCallback(async (): Promise<number | null> => {
    setSending(true);
    setError(null);

    try {
      const result = await identityRecheck(true);
      setRows(result.contributors);
      return result.queued;
    } catch (cause) {
      setError(reportApiError(cause, "Could not send those emails."));
      return null;
    } finally {
      setSending(false);
    }
  }, []);

  /**
   * Sends, closes the confirm, and says what happened.
   *
   * Closed either way. It used to stay open on failure, which put the
   * inline error behind a modal — and Radix marks everything outside an
   * open dialog `aria-hidden`, so the one message explaining why nothing
   * was sent was both covered and gone from the accessibility tree.
   */
  const apply = useCallback(async () => {
    const queued = await send();
    setConfirming(false);

    if (queued === null) {
      alvaToast.error("Those emails did not go. See the reason above the table.");
      return;
    }

    alvaToast.success(
      queued === 0
        ? "Everybody on the list had already been told"
        : `${queued} ${queued === 1 ? "email" : "emails"} queued`
    );
  }, [send]);

  /**
   * What the mail service actually did with this person's email.
   *
   * `notified` only says the API queued one. That is not the same claim as
   * "it arrived", and this product has already shipped a screen that said
   * "sent" for three weeks while every message was being refused. The
   * delivery row is the only thing that knows which.
   */
  const checkDelivery = useCallback(async (userId: string) => {
    try {
      const page = await listUserEmails(userId, { limit: 5 });
      const row = page.items.find((entry) => entry.kind === "identity_recheck")
        ?? page.items[0];

      if (!row) {
        alvaToast.error("No email was ever queued for them");
        return;
      }
      if (row.status === "sent") {
        alvaToast.success("The mail service accepted it");
        return;
      }
      if (row.status === "pending") {
        alvaToast.show("Still queued, nothing has tried to send it yet");
        return;
      }
      alvaToast.error(row.error ? `Refused: ${row.error}` : "The send was refused");
    } catch (cause) {
      const message = reportApiError(cause, "Could not read the delivery record.");
      if (message) alvaToast.error(message);
    }
  }, []);

  /** Nobody has told these people yet. The only ones a send would write to. */
  const untold = rows.filter((row) => !row.notified);

  return {
    rows,
    untold,
    isLoading,
    isSending,
    error,
    apply,
    checkDelivery,
    reload,
    confirming,
    setConfirming,
  };
}

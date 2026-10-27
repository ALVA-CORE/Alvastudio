import { useEffect, useState } from "react";
import { listUserEmails, type ApiEmailDelivery } from "@/lib/api/users";
import type { AuditEntry } from "@/components/admin/shared/detail/AuditTimeline";

/** The API's own names, as something an admin can read. */
const KIND_LABEL: Record<string, string> = {
  reset_link: "Password reset link",
  set_password: "Set your password",
  password_changed: "Password was changed",
  recovery_requested: "We received your reset request",
  recovery_declined: "An update on your reset request",
  approved: "Your account is approved",
  welcome: "Welcome to Alva Studio",
  awaiting_approval: "Your application is waiting",
  admin_approval_needed: "An account is waiting for approval",
  work_waiting: "You have work waiting",
};

/**
 * `sent` is the mail service accepting it, not an inbox receiving it. The
 * wording says accepted rather than delivered, because claiming more than
 * the record supports is how this surface spent three weeks telling admins
 * links had gone out while every one was being refused.
 */
const OUTCOME: Record<
  ApiEmailDelivery["status"],
  { verb: string; tone: AuditEntry["tone"] }
> = {
  sent: { verb: "accepted by the mail service", tone: "good" },
  pending: { verb: "queued", tone: "warn" },
  failed: { verb: "refused", tone: "bad" },
  skipped: { verb: "no longer needed", tone: undefined },
};

/**
 * Emails the API tried to send, as timeline rows.
 *
 * In the audit log rather than a tab of its own. They belong there: an email
 * is something that happened to the account, and the question people
 * actually have is "a reset was issued, did anything reach them" — which is
 * two rows next to each other, not two screens.
 *
 * It is also the better diagnostic. A "reset link issued" row with no email
 * row beneath it says the API never tried, which reads as a gap rather than
 * as a failure, and a failure is what everybody assumes.
 *
 * A failure is left as an empty list. The audit log is the point of the tab,
 * and losing the email rows should not cost the history as well.
 */
export function useUserEmailEntries(userId: string | undefined, enabled = true) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    if (!enabled || !userId) {
      setEntries([]);
      return;
    }

    let cancelled = false;

    listUserEmails(userId, { limit: 50 })
      .then((page) => {
        if (cancelled) return;
        setEntries(
          page.items.map((row) => {
            const outcome = OUTCOME[row.status];
            const name = KIND_LABEL[row.kind] ?? row.kind.replace(/_/g, " ");

            return {
              id: `email-${row.id}`,
              label: `Email "${name}" ${outcome.verb}${
                row.attempts > 1 ? `, after ${row.attempts} attempts` : ""
              }.`,
              at: new Date(row.sent_at ?? row.queued_at),
              tone: outcome.tone,
              /* The provider's own words: the string worth pasting to
                 whoever runs the mail account. */
              detail: row.error ?? undefined,
            } satisfies AuditEntry;
          })
        );
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, enabled]);

  return entries;
}

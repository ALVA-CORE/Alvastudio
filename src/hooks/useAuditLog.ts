import { useEffect, useState } from "react";
import { auditLog, type ApiAuditEvent, type AuditSubject } from "@/lib/api/audit";
import type { AuditEntry } from "@/components/admin/shared/detail/AuditTimeline";

/** How many events a History tab shows. Past this nobody is reading, they are searching. */
const LIMIT = 100;

/**
 * One row's history, as the timeline takes it.
 *
 * `detail` is the sentence to show: it already names everybody involved and
 * uses their current names, so there is nothing to assemble here.
 *
 * "By an admin" is the role the actor held AT THE TIME, not now. An intern
 * later promoted does not have their old reviews start reading as an admin's.
 */
export function toAuditEntries(events: ApiAuditEvent[]): AuditEntry[] {
  return events.map((event) => ({
    id: event.id,
    label: event.detail,
    at: new Date(event.at),
    byAdmin: event.actor_role === "admin",
  }));
}

/**
 * Reads a subject's history when a panel opens.
 *
 * Fetched on open rather than with the list: it is up to a hundred events for
 * one row, and nobody opens twenty panels at once.
 *
 * Admin only at the API. A 403 is left as an empty list rather than an error
 * banner, because the panels that use this are already behind an admin route
 * and anything else is a problem worth seeing in the network tab, not over
 * the detail somebody came to read.
 */
export function useAuditLog(
  subjectType: AuditSubject,
  subjectId: string | undefined,
  enabled = true
) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !subjectId) {
      setEntries([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setEntries([]);

    auditLog({ subject_type: subjectType, subject_id: subjectId, limit: LIMIT })
      .then((page) => {
        if (!cancelled) setEntries(toAuditEntries(page.items));
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [subjectType, subjectId, enabled]);

  return { entries, isLoading };
}

import { useCallback, useEffect, useRef, useState } from "react";
import {
  auditLog,
  type ApiAuditEvent,
  type AuditSignIns,
  type AuditSubject,
} from "@/lib/api/audit";
import type { AuditEntry } from "@/components/admin/shared/detail/AuditTimeline";
import { alvaToast } from "@/lib/alva-toast";
import { reportApiError } from "@/lib/api/reportApiError";

/**
 * One page of history.
 *
 * Smaller than the 100 it used to fetch in one go, because the list now pages
 * instead of stopping. A hundred rows in a side panel is a long scroll before
 * anybody finds out whether there is more.
 */
const PAGE = 50;

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
 * Reads a subject's history when a panel opens, a page at a time.
 *
 * Fetched on open rather than with the list: it is a long history for one
 * row, and nobody opens twenty panels at once.
 *
 * **Paging is what lets sign-ins live in the same list as everything else.**
 * Somebody who signs in most days produces several hundred rows a year
 * against a few dozen real account events, so a single fixed fetch would show
 * six or seven weeks and quietly drop the password change from three months
 * ago. An admin reading to the bottom of that would conclude nothing had
 * happened. Now the list says how much is left and fetches the rest on
 * demand, so the two kinds of event can be interleaved, which is the point:
 * "signed in on a new device" followed by "password changed" is a story only
 * one timeline can tell.
 *
 * Admin only at the API. A 403 is left as an empty list rather than an error
 * banner, because the panels that use this are already behind an admin route
 * and anything else is a problem worth seeing in the network tab, not over
 * the detail somebody came to read.
 */
export function useAuditLog(
  subjectType: AuditSubject,
  subjectId: string | undefined,
  enabled = true,
  /** `include` puts sign-ins in the same list. The API leaves them out by default. */
  signIns: AuditSignIns = "exclude"
) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setLoading] = useState(false);
  const [isLoadingMore, setLoadingMore] = useState(false);

  /* Guards a late first page from landing on top of an appended one, and a
     second Load more from firing while the first is in flight. */
  const request = useRef(0);

  useEffect(() => {
    if (!enabled || !subjectId) {
      setEntries([]);
      setTotal(0);
      return;
    }

    const ticket = ++request.current;
    setLoading(true);
    setEntries([]);
    setTotal(0);

    auditLog({
      subject_type: subjectType,
      subject_id: subjectId,
      sign_ins: signIns,
      limit: PAGE,
    })
      .then((page) => {
        if (request.current !== ticket) return;
        setEntries(toAuditEntries(page.items));
        setTotal(page.total);
      })
      .catch(() => {
        if (request.current === ticket) setEntries([]);
      })
      .finally(() => {
        if (request.current === ticket) setLoading(false);
      });
  }, [subjectType, subjectId, enabled, signIns]);

  const loadMore = useCallback(async () => {
    if (!subjectId || isLoadingMore) return;

    const ticket = request.current;
    setLoadingMore(true);

    try {
      const page = await auditLog({
        subject_type: subjectType,
        subject_id: subjectId,
        sign_ins: signIns,
        limit: PAGE,
        offset: entries.length,
      });

      /* The panel moved to another subject while this was in flight. Appending
         now would mix two accounts' histories into one list. */
      if (request.current !== ticket) return;

      setEntries((current) => [...current, ...toAuditEntries(page.items)]);
      setTotal(page.total);
    } catch (cause) {
      /* The rows already on screen stay. They are still true, and replacing a
         history somebody is reading with a banner helps nobody — but the page
         they asked for did not arrive, and silence would read as the end of
         the list. */
      const message = reportApiError(cause, "Could not load any more.");
      if (message) alvaToast.error(message);
    } finally {
      if (request.current === ticket) setLoadingMore(false);
    }
  }, [subjectType, subjectId, signIns, entries.length, isLoadingMore]);

  return {
    entries,
    total,
    isLoading,
    isLoadingMore,
    hasMore: entries.length < total,
    loadMore,
  };
}

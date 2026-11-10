import { useCallback, useEffect, useRef, useState } from "react";
import {
  listSessionsPage,
  sessionCounts,
  type ApiSessionCounts,
  type ApiSessionSort,
  type ApiSessionSummary,
} from "@/lib/api/focusGroups";
import { reportApiError } from "@/lib/api/reportApiError";
import { formatDuration, relativeDays, type Variety } from "@/data/admin/shared";
import type { AdminSession } from "@/data/admin/oversight";
import { NO_VALUE } from "@/lib/no-value";

const VARIETY: Record<string, Variety> = {
  nigerian_english: "Nigerian English",
  nigerian_pidgin: "Nigerian Pidgin",
};

export type SessionsView = {
  /** `false` for only the sessions with no audio yet; omitted for all. */
  hasAudio?: false;
  /** Omitted for every state. */
  state?: string;
  /** Blank for no search. */
  q: string;
  /** Omitted for the server's default, newest first. */
  sort?: { key: ApiSessionSort; order: "asc" | "desc" };
  /** 1-based. */
  page: number;
  pageSize: number;
};

/**
 * The admin focus-groups screen: one page of sessions, and the counts over
 * all of them.
 *
 * The table is a page of `GET /focus-groups`, searched, sorted and filtered
 * on the server, each row carrying the intern's name. The cards are
 * `GET /focus-groups/summary`. It used to download every session with its
 * participants, and every intern, on each visit.
 */
export function useAdminSessions(view: SessionsView) {
  const { hasAudio, state, q, sort, page, pageSize } = view;
  const [rows, setRows] = useState<AdminSession[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<ApiSessionCounts | null>(null);
  /* The page skeleton until the first answers are in; after that only the
     table waits. */
  const [isLoading, setLoading] = useState(true);
  const [isFetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const loadedOnce = useRef(false);

  const sortKey = sort?.key;
  const sortOrder = sort?.order;

  useEffect(() => {
    /* A page, search or sort that is replaced is aborted, so a slow old
       answer cannot land on top of the new one. */
    const controller = new AbortController();
    const cancelled = () => controller.signal.aborted;
    setFetching(true);

    Promise.all([
      listSessionsPage(
        {
          limit: pageSize,
          offset: (page - 1) * pageSize,
          ...(hasAudio === false ? { has_audio: false } : {}),
          ...(state ? { state } : {}),
          ...(q ? { q } : {}),
          ...(sortKey ? { sort: sortKey, order: sortOrder } : {}),
        },
        controller.signal
      ),
      /* Counts move with recordings, not with the table's filters, so they
         are read with the first page and on reload. */
      loadedOnce.current ? Promise.resolve(null) : sessionCounts(controller.signal),
    ])
      .then(([pageResult, nextSummary]) => {
        if (cancelled()) return;
        setRows(pageResult.items.map(toAdminSession));
        setTotal(pageResult.total);
        if (nextSummary) setSummary(nextSummary);
        loadedOnce.current = true;
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled()) setError(reportApiError(cause, "Could not load sessions."));
      })
      .finally(() => {
        if (cancelled()) return;
        setLoading(false);
        setFetching(false);
      });

    return () => controller.abort();
  }, [hasAudio, state, q, sortKey, sortOrder, page, pageSize, attempt]);

  /** The page and the counts again. */
  const reload = useCallback(() => {
    loadedOnce.current = false;
    setAttempt((value) => value + 1);
  }, []);

  return { rows, total, summary, isLoading, isFetching, error, reload };
}

function toAdminSession(api: ApiSessionSummary): AdminSession {
  const created = new Date(api.created_at);
  const durationSec = Math.round(api.duration_seconds ?? 0);

  return {
    id: api.id,
    /* The first eight characters of the id: stable, unlike a position in a
       list that every new session renumbered, and what `q` matches. */
    code: api.id.slice(0, 8),
    topic: api.topic,
    intern: api.intern_name ?? "Unknown",
    /* The session's own field now. It used to be the commonest state among
     * the participants, which was a derivation printed as a fact — somebody
     * recording in Lagos with a room of people from Ogun read as Ogun. Blank
     * where it was never recorded, because that is the truth about it. */
    state: api.state ?? "",
    variety: VARIETY[api.language_variety ?? ""] ?? "Nigerian English",
    participants: api.participant_count,
    turns: api.turn_count,
    durationSec,
    duration: api.has_audio ? formatDuration(durationSec) : NO_VALUE,
    hasAudio: api.has_audio,
    createdAt: created.getTime(),
    createdLabel: relativeDays(created),
  };
}

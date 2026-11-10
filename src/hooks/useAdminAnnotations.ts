import { useCallback, useEffect, useRef, useState } from "react";
import {
  annotationCounts,
  assignAnnotator,
  listAnnotationsPage,
  listQueue,
  reviewAnnotation,
  type ApiAnnotationCounts,
  type ApiAnnotationSort,
  type ApiAnnotationStatus,
  type ApiAnnotationSummary,
  type ApiQueueRow,
} from "@/lib/api/annotations";
import { assignSessionAnnotator } from "@/lib/api/focusGroups";
import { reportApiError } from "@/lib/api/reportApiError";
import { formatDuration, relativeDays } from "@/data/admin/shared";
import type { AdminAnnotation } from "@/data/admin/oversight";
import { NO_VALUE } from "@/lib/no-value";

/** The most the queue gives in one request. */
const QUEUE_LIMIT = 200;

export type AnnotationsView = {
  /** Omitted for every status. */
  status?: ApiAnnotationStatus;
  /** Blank for no search. */
  q: string;
  /** Omitted for the server's default, newest first. */
  sort?: { key: ApiAnnotationSort; order: "asc" | "desc" };
  /** 1-based. */
  page: number;
  pageSize: number;
};

/**
 * The admin annotations screen: one page of annotations, the counts over all
 * of them, and the sessions waiting to be claimed.
 *
 * The table is a page of `GET /annotations`, searched, sorted and filtered on
 * the server, each row carrying its topic, length and author's name. The
 * cards and chart are `GET /annotations/summary`. The waiting list is
 * `GET /annotations/queue`, the one annotators claim from. It used to
 * download every annotation, session and user, and work out "waiting" itself,
 * which offered sessions whose speakers had not all agreed and missed ones
 * sent back to the queue.
 */
export function useAdminAnnotations(view: AnnotationsView) {
  const { status, q, sort, page, pageSize } = view;
  const [rows, setRows] = useState<AdminAnnotation[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<ApiAnnotationCounts | null>(null);
  const [queue, setQueue] = useState<ApiQueueRow[]>([]);
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
    const first = !loadedOnce.current;
    setFetching(true);

    Promise.all([
      listAnnotationsPage(
        {
          limit: pageSize,
          offset: (page - 1) * pageSize,
          /* The Tags column. Opt-in at the API: it reads every span on the page. */
          expand: "tags",
          ...(status ? { status } : {}),
          ...(q ? { q } : {}),
          ...(sortKey ? { sort: sortKey, order: sortOrder } : {}),
        },
        controller.signal
      ),
      /* Counts and the queue move with work, not with the table's filters,
         so they are read with the first page and on reload. */
      first ? annotationCounts(controller.signal) : Promise.resolve(null),
      first ? listQueue({ limit: QUEUE_LIMIT }, controller.signal) : Promise.resolve(null),
    ])
      .then(([pageResult, nextSummary, nextQueue]) => {
        if (cancelled()) return;
        setRows(pageResult.items.map(toAdminAnnotation));
        setTotal(pageResult.total);
        if (nextSummary) setSummary(nextSummary);
        if (nextQueue) setQueue(nextQueue);
        loadedOnce.current = true;
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled()) setError(reportApiError(cause, "Could not load annotations."));
      })
      .finally(() => {
        if (cancelled()) return;
        setLoading(false);
        setFetching(false);
      });

    return () => controller.abort();
  }, [status, q, sortKey, sortOrder, page, pageSize, attempt]);

  /** The page, the counts and the queue again, as after an assignment. */
  const reload = useCallback(() => {
    loadedOnce.current = false;
    setAttempt((value) => value + 1);
  }, []);

  /** Moves an existing annotation to another annotator. */
  const assign = useCallback(
    async (annotationId: string, annotatorId: string) => {
      await assignAnnotator(annotationId, annotatorId);
      reload();
    },
    [reload]
  );

  const setVerdict = useCallback(
    async (annotationId: string, next: "approved" | "needs_rework") => {
      await reviewAnnotation(annotationId, { status: next });
      reload();
    },
    [reload]
  );

  /**
   * Hands out a session nobody has started.
   *
   * Different call from `assign`: that one moves an existing annotation
   * between annotators, this one creates the annotation by giving the session
   * to somebody. The waiting list is work with no annotation yet, so it has to
   * be this one.
   */
  const assignSession = useCallback(
    async (sessionId: string, annotatorId: string) => {
      await assignSessionAnnotator(sessionId, annotatorId);
      reload();
    },
    [reload]
  );

  return {
    rows,
    total,
    summary,
    queue,
    isLoading,
    isFetching,
    error,
    reload,
    assign,
    assignSession,
    setVerdict,
  };
}

function toAdminAnnotation(api: ApiAnnotationSummary): AdminAnnotation {
  const claimed = new Date(api.created_at);
  const durationSec = Math.round(api.duration_seconds ?? 0);

  return {
    id: api.id,
    /* The first eight characters of the id: stable, unlike a position in a
       list that every new annotation renumbered, and what `q` matches. */
    code: api.id.slice(0, 8),
    topic: api.topic ?? "Session unavailable",
    annotator: api.annotator_name ?? "Unassigned",
    status: api.status,
    segments: api.segment_count ?? 0,
    tags: api.tag_count ?? 0,
    durationSec,
    duration: durationSec > 0 ? formatDuration(durationSec) : NO_VALUE,
    claimedAt: claimed.getTime(),
    updatedAt: api.updated_at ? new Date(api.updated_at).getTime() : 0,
    claimedLabel: relativeDays(claimed),
  };
}

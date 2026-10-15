import { useCallback, useEffect, useState } from "react";
import {
  assignAnnotator,
  listAllAnnotations,
  reviewAnnotation,
  type ApiAnnotationSummary,
} from "@/lib/api/annotations";
import { listSessions, type ApiSessionSummary } from "@/lib/api/focusGroups";
import { listUsers } from "@/lib/api/users";
import { reportApiError } from "@/lib/api/reportApiError";
import { formatDuration, relativeDays } from "@/data/admin/shared";
import type { AdminAnnotation, AnnotationStatus } from "@/data/admin/oversight";
import { NO_VALUE } from "@/lib/no-value";

/**
 * The admin annotations screen, and the sessions nobody has claimed.
 *
 * Three requests. `GET /annotations` returns ids and status and nothing a
 * person would recognise — no topic, no annotator name, no duration — so the
 * sessions supply the topic and the users supply the name. Joining here keeps
 * it at three requests instead of two per row.
 *
 * Segment and tag counts are not in the summary either. They are on the full
 * document, which is one request per annotation, so the table no longer claims
 * to know them and the detail panel reads the real figures when it opens.
 */
export function useAdminAnnotations() {
  const [rows, setRows] = useState<AdminAnnotation[]>([]);
  const [unclaimed, setUnclaimed] = useState<ApiSessionSummary[]>([]);
  const [annotators, setAnnotators] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      listAllAnnotations({ limit: 200 }),
      listSessions({ limit: 200 }),
      listUsers({ limit: 200 }),
    ])
      .then(([annotations, sessions, users]) => {
        if (cancelled) return;

        const names = new Map(users.items.map((user) => [user.id, user.full_name]));
        const sessionById = new Map(sessions.map((session) => [session.id, session]));
        const annotated = new Set(annotations.items.map((row) => row.session_id));

        setRows(
          annotations.items.map((row, index) =>
            toAdminAnnotation(row, index, names, sessionById)
          )
        );

        /* Uploaded, and nobody has started on it. Sessions without audio are
         * the focus-group page's problem, not this one's. */
        setUnclaimed(
          sessions.filter((session) => session.has_audio && !annotated.has(session.id))
        );

        setAnnotators(
          users.items
            .filter((user) => user.role === "annotator" && user.is_active)
            .map((user) => ({ id: user.id, name: user.full_name }))
        );
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load annotations."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const assign = useCallback(
    async (annotationId: string, annotator: { id: string; name: string }) => {
      await assignAnnotator(annotationId, annotator.id);
      setRows((prev) =>
        prev.map((row) =>
          row.id === annotationId ? { ...row, annotator: annotator.name } : row
        )
      );
    },
    []
  );

  const setVerdict = useCallback(
    async (annotationId: string, status: "approved" | "needs_rework") => {
      const next = await reviewAnnotation(annotationId, { status });
      setRows((prev) =>
        prev.map((row) =>
          row.id === annotationId
            ? { ...row, status: next.status as AnnotationStatus }
            : row
        )
      );
    },
    []
  );

  return {
    rows,
    unclaimed,
    annotators,
    isLoading,
    error,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
    assign,
    setVerdict,
  };
}

function toAdminAnnotation(
  api: ApiAnnotationSummary,
  index: number,
  names: Map<string, string>,
  sessions: Map<string, ApiSessionSummary>
): AdminAnnotation {
  const session = sessions.get(api.session_id);
  const claimed = new Date(api.created_at);
  const durationSec = Math.round(session?.duration_seconds ?? 0);

  return {
    id: api.id,
    /* A short handle. The API's id is a UUID, which nobody reads aloud. */
    code: `ANN-${String(index + 1).padStart(4, "0")}`,
    topic: session?.topic ?? "Session unavailable",
    annotator: names.get(api.annotator_id) ?? "Unassigned",
    status: api.status as AnnotationStatus,
    /* Counts live on the full document, one request per row. The panel reads
     * them; the table does not pretend to know. */
    segments: 0,
    tags: 0,
    durationSec,
    duration: durationSec > 0 ? formatDuration(durationSec) : NO_VALUE,
    claimedAt: claimed.getTime(),
    claimedLabel: relativeDays(claimed),
  };
}

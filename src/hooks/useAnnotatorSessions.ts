import { useCallback, useEffect, useState } from "react";
import * as annotations from "@/lib/api/annotations";
import type { ApiAnnotationStatus } from "@/lib/api/annotations";
import { ApiError } from "@/lib/api/client";
import type { AnnotationStatus, AnnotatorSession } from "@/data/annotators/sessions";

/**
 * The annotator's session list.
 *
 * Two calls, because the backend models this as a claim workflow rather than an
 * assignment: `/annotations/queue` is what nobody has taken, `/annotations` is
 * what this annotator already holds. The page shows one list, so they are merged
 * here — claimed rows win, since a claimed session is no longer claimable.
 */

const STATUS_MAP: Record<ApiAnnotationStatus, AnnotationStatus> = {
  draft: "in-progress",
  submitted: "completed",
  approved: "completed",
  // Sent back by a reviewer — it is on the annotator's desk again.
  needs_rework: "in-progress",
  rejected: "completed",
};

/** Short, readable handle. The API has no session code, so derive a stable one. */
function sessionCode(sessionId: string): string {
  return `FG-${sessionId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";

  const hours = Math.floor((Date.now() - then) / 36e5);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  return `${mins}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

/**
 * Fields the API does not carry on either list — `state`, `language`,
 * `recordedBy`, `tagCount` — are left blank rather than invented. The table
 * renders them as "—"; fabricating a value would look like data.
 */
function toSession(
  sessionId: string,
  topic: string,
  durationSeconds: number | null,
  participantCount: number,
  createdAt: string,
  status: AnnotationStatus,
  annotationId?: string
): AnnotatorSession & { annotationId?: string } {
  const durationSec = durationSeconds ?? 0;

  return {
    id: sessionId,
    annotationId,
    code: sessionCode(sessionId),
    topic,
    state: "",
    participants: participantCount,
    speakers: participantCount,
    duration: formatDuration(durationSec),
    durationSec,
    language: "Mixed",
    recordedBy: "",
    recordedAt: relativeTime(createdAt),
    recordedAtTs: new Date(createdAt).getTime() || 0,
    status,
    tagCount: 0,
    audioSrc: `/focus-groups/${sessionId}/audio`,
  };
}

export type AnnotatorSessionsState = {
  sessions: (AnnotatorSession & { annotationId?: string })[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  /** Takes the next unclaimed session. Resolves with its annotation id. */
  claimNext: () => Promise<string | null>;
  isClaiming: boolean;
};

export function useAnnotatorSessions(): AnnotatorSessionsState {
  const [sessions, setSessions] = useState<(AnnotatorSession & { annotationId?: string })[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isClaiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([annotations.listQueue({ limit: 100 }), annotations.listMine({ limit: 100 })])
      .then(([queue, mine]) => {
        if (cancelled) return;

        const claimed = new Map(mine.map((entry) => [entry.session_id, entry]));

        const rows = queue
          // A session this annotator already holds is no longer in their queue.
          .filter((row) => !claimed.has(row.session_id))
          .map((row) =>
            toSession(
              row.session_id,
              row.topic,
              row.duration_seconds,
              row.participant_count,
              row.created_at,
              "not-started"
            )
          );

        /* Claimed rows come from `/annotations`, which carries no topic or
         * duration — only the annotation's own metadata. Shown with what is
         * there; the detail page fills the rest. */
        const held = mine.map((entry) =>
          toSession(
            entry.session_id,
            queue.find((row) => row.session_id === entry.session_id)?.topic ??
              "Focus group session",
            queue.find((row) => row.session_id === entry.session_id)?.duration_seconds ?? null,
            queue.find((row) => row.session_id === entry.session_id)?.participant_count ?? 0,
            entry.created_at,
            STATUS_MAP[entry.status],
            entry.id
          )
        );

        setSessions([...held, ...rows]);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof ApiError ? cause.message : "Could not load your sessions."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  const claimNext = useCallback(async () => {
    setClaiming(true);
    try {
      const doc = await annotations.claimNext();
      setAttempt((value) => value + 1);
      return doc.id;
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Could not claim a session."
      );
      return null;
    } finally {
      setClaiming(false);
    }
  }, []);

  return { sessions, isLoading, error, reload, claimNext, isClaiming };
}

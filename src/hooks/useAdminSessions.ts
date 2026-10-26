import { fetchAllPages, fetchAllRows } from "@/lib/api/fetchAll";
import { useCallback, useEffect, useState } from "react";
import { listSessions, type ApiSessionSummary } from "@/lib/api/focusGroups";
import { listUsers, type ApiUser } from "@/lib/api/users";
import { reportApiError } from "@/lib/api/reportApiError";
import { formatDuration, relativeDays, type Variety } from "@/data/admin/shared";
import type { AdminSession } from "@/data/admin/oversight";
import { NO_VALUE } from "@/lib/no-value";

const VARIETY: Record<string, Variety> = {
  nigerian_english: "Nigerian English",
  nigerian_pidgin: "Nigerian Pidgin",
};

/**
 * Every focus group session, across all interns.
 *
 * `expand=participants` nests them on each row, which is what makes the State
 * column possible without one request per session. Admins see every session on
 * this endpoint with no flag needed.
 */
export function useAdminSessions() {
  const [rows, setRows] = useState<AdminSession[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;


    setLoading(true);

    Promise.all([
      fetchAllRows<ApiSessionSummary>((query) =>
        listSessions({ ...query, expand: "participants" })
      ),
      fetchAllPages<ApiUser>((query) => listUsers({ ...query, role: "intern" })),
    ])
      .then(([sessions, interns]) => {
        if (cancelled) return;
        const names = new Map(interns.items.map((user) => [user.id, user.full_name]));
        setRows(sessions.map((session, index) => toAdminSession(session, index, names)));
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load sessions."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return {
    rows,
    isLoading,
    error,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
  };
}

function toAdminSession(
  api: ApiSessionSummary,
  index: number,
  interns: Map<string, string>
): AdminSession {
  const created = new Date(api.created_at);
  const durationSec = Math.round(api.duration_seconds ?? 0);

  return {
    id: api.id,
    /* A short handle. The API's id is a UUID, which nobody reads aloud. */
    code: `FG-${String(index + 1).padStart(4, "0")}`,
    topic: api.topic,
    intern: interns.get(api.intern_id) ?? "Unknown",
    /* The session's own field now. It used to be the commonest state among
     * the participants, which was a derivation printed as a fact — somebody
     * recording in Lagos with a room of people from Ogun read as Ogun. Blank
     * where it was never recorded, because that is the truth about it. */
    state: api.state ?? "",
    redactedCount: api.redactions?.length ?? 0,
    variety: VARIETY[api.language_variety ?? ""] ?? "Nigerian English",
    participants: api.participant_count,
    turns: api.turn_count,
    durationSec,
    duration: api.has_audio ? formatDuration(durationSec) : NO_VALUE,
    hasAudio: api.has_audio,
    /* Who is annotating it lives on the annotation, not the session. The
     * annotations screen reads that; this one does not show it. */
    claimedBy: null,
    createdAt: created.getTime(),
    createdLabel: relativeDays(created),
  };
}

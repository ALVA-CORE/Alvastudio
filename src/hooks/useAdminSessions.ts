import { useCallback, useEffect, useState } from "react";
import { listSessions, type ApiSessionSummary } from "@/lib/api/focusGroups";
import { listUsers } from "@/lib/api/users";
import { reportApiError } from "@/lib/api/reportApiError";
import { formatDuration, relativeDays, type Variety } from "@/data/admin/shared";
import type { AdminSession } from "@/data/admin/oversight";
import { NO_VALUE } from "@/lib/no-value";

const VARIETY: Record<string, Variety> = {
  nigerian_english: "Nigerian English",
  nigerian_pidgin: "Nigerian Pidgin",
};

/**
 * Where a session was recorded.
 *
 * A session has no state of its own — state is a property of the people in
 * the room — so it is the commonest state among its participants. Sessions run
 * in one place, so "commonest" and "the state" are the same thing in practice,
 * and a split room is worth seeing as whichever side it leans to rather than
 * as blank.
 */
function sessionState(session: ApiSessionSummary): string {
  const counts = new Map<string, number>();
  for (const participant of session.participants ?? []) {
    if (!participant.state) continue;
    counts.set(participant.state, (counts.get(participant.state) ?? 0) + 1);
  }

  let best = "";
  let top = 0;
  for (const [state, count] of counts) {
    if (count > top) {
      best = state;
      top = count;
    }
  }
  return best || "Unknown";
}

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
      listSessions({ limit: 200, expand: "participants" }),
      listUsers({ role: "intern", limit: 200 }),
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
    state: sessionState(api),
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

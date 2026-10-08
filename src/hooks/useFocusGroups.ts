import { useCallback, useEffect, useState } from "react";
import {
  createSession,
  deleteSession,
  listSessions,
  uploadSessionAudio,
  type ApiSession,
  type ApiSessionSummary,
} from "@/lib/api/focusGroups";
import { reportApiError } from "@/lib/api/reportApiError";
import {
  apiToParticipantRecord,
  draftToApiParticipant,
  toApiSessionVariety,
} from "@/lib/interns/participantMapping";
import type {
  ParticipantDraft,
  ParticipantRecord,
  SessionLanguage,
} from "@/data/interns/participants";

/**
 * Creates a focus group session and its participants in one request.
 *
 * `POST /focus-groups` takes nested participants, so the intake flow does not
 * need a round trip per person — eight participants is one call, and a partial
 * failure cannot leave a session holding half a room.
 */
export async function createSessionWithParticipants(
  topic: string,
  drafts: ParticipantDraft[]
): Promise<ApiSession> {
  /* Session-level variety: the first participant who stated one. The API has
   * one field for the whole session, so a mixed room cannot be described. */
  const stated = drafts.find((draft) => draft.sessionLanguage)?.sessionLanguage;

  const session = await createSession({
    topic,
    language_variety: toApiSessionVariety((stated ?? "") as SessionLanguage | ""),
    participants: drafts.map(draftToApiParticipant),
  });

  return session;
}

/** Removes a session. 409 when an annotator has already claimed it. */
export async function removeSession(sessionId: string) {
  return deleteSession(sessionId);
}

/** Attaches the take. A session is not claimable for annotation until this runs. */
export async function attachSessionAudio(
  sessionId: string,
  audio: Blob,
  durationSeconds: number
) {
  return uploadSessionAudio(sessionId, audio, {
    durationSeconds,
    filename: `focus-group-${sessionId}.webm`,
  });
}

/**
 * Every participant this intern has logged, flattened out of their sessions.
 *
 * One request: `expand=participants` nests them on each list row. This used to
 * be a fetch per session, which was a request per row on a page that shows
 * every participant at once.
 */
export function useInternParticipants() {
  const [rows, setRows] = useState<ParticipantRecord[]>([]);
  const [sessions, setSessions] = useState<ApiSessionSummary[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const summaries = await listSessions({ limit: 100, expand: "participants" });
        if (cancelled) return;
        setSessions(summaries);

        const flattened = summaries.flatMap((session) =>
          (session.participants ?? []).map((participant) =>
            apiToParticipantRecord(participant, { focusGroupSession: session.topic })
          )
        );

        setRows(flattened.sort((a, b) => b.loggedAt - a.loggedAt));
        setError(null);
      } catch (cause) {
        if (cancelled) return;
        setError(reportApiError(cause, "Could not load participants."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return { rows, sessions, isLoading, error, reload };
}

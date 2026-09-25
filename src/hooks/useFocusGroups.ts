import { useCallback, useEffect, useState } from "react";
import {
  createSession,
  getSession,
  listSessions,
  uploadSessionAudio,
  type ApiSession,
  type ApiSessionSummary,
} from "@/lib/api/focusGroups";
import { ApiError } from "@/lib/api/client";
import {
  apiToParticipantRecord,
  draftToApiParticipant,
  draftToExtras,
  toApiSessionVariety,
} from "@/lib/interns/participantMapping";
import {
  loadParticipantExtras,
  saveParticipantExtras,
} from "@/lib/intern-participants";
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
 *
 * The four fields the API has no column for are written to the local sidecar
 * against the ids the server hands back. See `participantMapping.ts`.
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

  /* Match returned participants to the drafts that made them. The API preserves
   * order, but label is the safer key — fall back to position only if it does
   * not match, so a duplicate label cannot silently pair the wrong extras. */
  const extras: Record<string, ReturnType<typeof draftToExtras>> = {};
  session.participants.forEach((participant, index) => {
    const byLabel = drafts.filter((draft) => draft.nameOrId === participant.label);
    const draft = byLabel.length === 1 ? byLabel[0] : drafts[index];
    if (draft) extras[participant.id] = draftToExtras(draft);
  });
  saveParticipantExtras(extras);

  return session;
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
 * The list endpoint returns counts only, so each session is fetched for its
 * nested participants. That is one request per session — acceptable while an
 * intern has tens of sessions, and the reason `docs/backend-gaps.md` asks for
 * participants to be expandable on the list.
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
        const summaries = await listSessions({ limit: 100 });
        if (cancelled) return;
        setSessions(summaries);

        const details = await Promise.all(
          summaries.map((summary) => getSession(summary.id).catch(() => null))
        );
        if (cancelled) return;

        const extras = loadParticipantExtras();
        const flattened = details.flatMap((session) =>
          session
            ? session.participants.map((participant) =>
                apiToParticipantRecord(
                  participant,
                  { focusGroupSession: session.topic },
                  extras[participant.id]
                )
              )
            : []
        );

        setRows(flattened.sort((a, b) => b.loggedAt - a.loggedAt));
        setError(null);
      } catch (cause) {
        if (cancelled) return;
        setError(
          cause instanceof ApiError ? cause.message : "Could not load participants."
        );
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

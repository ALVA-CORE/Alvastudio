import { useCallback, useEffect, useState } from "react";
import { getTranscript } from "@/data/annotators/transcripts";
import { getAnnotatorSessions, type AnnotatorSession } from "@/data/annotators/sessions";
import type { TranscriptDoc } from "@/lib/annotation/types";

/**
 * Loads the session record and its transcript for the workspace route.
 *
 * Modelled as a discriminated union rather than a bag of booleans, so the page
 * cannot render an impossible combination — there is no way to be simultaneously
 * loading and errored, and `doc` is only reachable in the `ready` branch.
 */

export type TranscriptResource =
  | { status: "loading"; session: AnnotatorSession | null; doc: null; error: null }
  | { status: "not-found"; session: null; doc: null; error: null }
  | { status: "error"; session: AnnotatorSession; doc: null; error: Error }
  | { status: "ready"; session: AnnotatorSession; doc: TranscriptDoc; error: null };

export function useSessionTranscript(sessionId: string | undefined) {
  const [resource, setResource] = useState<TranscriptResource>({
    status: "loading",
    session: null,
    doc: null,
    error: null,
  });
  /** Bumped by `reload` to re-run the effect without changing the route. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const session = sessionId
      ? getAnnotatorSessions().find((entry) => entry.id === sessionId)
      : undefined;

    if (!session) {
      setResource({ status: "not-found", session: null, doc: null, error: null });
      return;
    }

    setResource({ status: "loading", session, doc: null, error: null });

    const controller = new AbortController();

    getTranscript(session, { signal: controller.signal })
      .then((doc) => {
        if (controller.signal.aborted) return;
        setResource({ status: "ready", session, doc, error: null });
      })
      .catch((error: unknown) => {
        // An abort is a navigation, not a failure — leave state alone so we do
        // not flash an error on the way out.
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") return;

        setResource({
          status: "error",
          session,
          doc: null,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });

    return () => controller.abort();
  }, [sessionId, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return { resource, reload };
}

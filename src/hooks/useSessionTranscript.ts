import { useCallback, useEffect, useRef, useState } from "react";
import * as annotations from "@/lib/api/annotations";
import { annotationAudioUrl } from "@/lib/api/annotations";
import { getSession } from "@/lib/api/focusGroups";
import { sendEvents } from "@/lib/api/annotationEvents";
import { useDevUiState } from "@/hooks/use-dev-ui-state";
import { ANNOTATOR_SESSIONS } from "@/data/annotators/sessions";
import { buildTranscript } from "@/data/annotators/demoTranscript";
import { toTranscriptDoc } from "@/data/annotators/fromApi";
import { baselineFrom, saveAnnotation, type Baseline } from "@/data/annotators/toApi";
import type { AnnotatorSession } from "@/data/annotators/sessions";
import type { TranscriptDoc } from "@/lib/annotation/types";

/**
 * Loads the session record and its annotation for the workspace route.
 *
 * Modelled as a discriminated union rather than a bag of booleans, so the page
 * cannot render an impossible combination — there is no way to be
 * simultaneously loading and errored, and `doc` is only reachable in the
 * `ready` branch.
 *
 * Three reads, because the workspace needs three things the API keeps apart:
 * which annotation belongs to this session, the annotation itself, and the
 * session's participants — who become the speakers, and who live on the
 * session rather than the annotation.
 */

export type TranscriptResource =
  | { status: "loading"; session: AnnotatorSession | null; doc: null; error: null }
  /** The session exists, this annotator has simply not claimed it. */
  | { status: "unclaimed"; session: null; doc: null; error: null; topic?: string }
  | { status: "not-found"; session: null; doc: null; error: null }
  | { status: "error"; session: AnnotatorSession; doc: null; error: Error }
  | {
      status: "ready";
      session: AnnotatorSession;
      doc: TranscriptDoc;
      error: null;
      /** The annotation the workspace writes to, as opposed to the session. */
      annotationId: string;
      /**
       * Somebody in the room withdrew, so every write is refused.
       *
       * The document still opens and their work is kept: this is a banner,
       * not a dead end. If the intern records a new decision it all works
       * again.
       */
      consentBlocked: boolean;
    };

/** Short, readable handle. The API has no session code, so derive a stable one. */
function sessionCode(sessionId: string): string {
  return `FG-${sessionId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  return `${mins}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

const LANGUAGE: Record<string, AnnotatorSession["language"]> = {
  nigerian_english: "Nigerian English",
  nigerian_pidgin: "Nigerian Pidgin",
};

export function useSessionTranscript(sessionId: string | undefined) {
  const { forceDemo: demo } = useDevUiState();
  const [resource, setResource] = useState<TranscriptResource>({
    status: "loading",
    session: null,
    doc: null,
    error: null,
  });
  /** Bumped by `reload` to re-run the effect without changing the route. */
  const [attempt, setAttempt] = useState(0);

  /* The diff base for every save, and the annotation the writes address.
   * Refs rather than state: changing them must not re-render the editor. */
  const baseline = useRef<Baseline | null>(null);
  const annotationId = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setResource({ status: "not-found", session: null, doc: null, error: null });
      return;
    }

    /* Demo mode builds the document from the fixture generator instead of
     * reading one. Deterministic from the session id, so the same session
     * opens on the same transcript across takes of a recording. */
    if (demo) {
      const session = ANNOTATOR_SESSIONS.find((entry) => entry.id === sessionId);
      if (!session) {
        setResource({ status: "not-found", session: null, doc: null, error: null });
        return;
      }

      setResource({
        status: "ready",
        session,
        doc: buildTranscript(session, { tags: true }),
        error: null,
        annotationId: session.id,
        consentBlocked: false,
      });
      return;
    }

    let cancelled = false;
    setResource({ status: "loading", session: null, doc: null, error: null });

    (async () => {
      const mine = await annotations.listMine({ limit: 200 });
      const match = mine.find((entry) => entry.session_id === sessionId);

      /* No annotation means this annotator has not claimed the session yet.
       * The session is real and one button away, so the workspace offers the
       * claim rather than calling it "not found". */
      if (!match) {
        const queue = await annotations.listQueue({ limit: 100 });
        const waiting = queue.find((row) => row.session_id === sessionId);
        return { unclaimed: true as const, topic: waiting?.topic };
      }

      /* The audio route is authenticated, so the player gets a blob URL
       * rather than the path: an `<audio src>` pointed at the API would send
       * no token and 401. */
      const [document, focusGroup, audioSrc] = await Promise.all([
        annotations.getAnnotation(match.id),
        getSession(sessionId),
        annotationAudioUrl(match.id).catch(() => ""),
      ]);

      const doc = toTranscriptDoc(document, focusGroup.participants ?? []);
      const durationSec = Math.round(focusGroup.duration_seconds ?? 0);

      const session: AnnotatorSession = {
        id: sessionId,
        code: sessionCode(sessionId),
        topic: focusGroup.topic,
        state: "",
        participants: focusGroup.participants?.length ?? 0,
        speakers: doc.speakers.length,
        duration: formatDuration(durationSec),
        durationSec,
        language: LANGUAGE[focusGroup.language_variety ?? ""] ?? "Mixed",
        recordedBy: "",
        recordedAt: "",
        recordedAtTs: new Date(focusGroup.created_at).getTime() || 0,
        status: document.status === "draft" ? "in-progress" : "completed",
        tagCount: doc.spans.length + doc.nonSpeech.length,
        audioSrc,
      };

      annotationId.current = match.id;
      baseline.current = baselineFrom(document, doc);

      return {
        session,
        doc,
        annotationId: match.id,
        consentBlocked: document.consent_blocked === true,
      };
    })()
      .then((result) => {
        if (cancelled) return;
        if ("unclaimed" in result) {
          setResource({
            status: result.topic ? "unclaimed" : "not-found",
            session: null,
            doc: null,
            error: null,
            topic: result.topic,
          });
          return;
        }
        setResource({ status: "ready", ...result, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setResource((current) => ({
          status: "error",
          session:
            current.session ??
            ({ id: sessionId, code: sessionCode(sessionId) } as AnnotatorSession),
          doc: null,
          error: error instanceof Error ? error : new Error(String(error)),
        }));
      });

    return () => {
      cancelled = true;
      /* One blob per session. Leaving them attached means every session an
       * annotator opens stays in memory until the tab is closed. */
      setResource((current) => {
        if (current.status === "ready" && current.session.audioSrc) {
          URL.revokeObjectURL(current.session.audioSrc);
        }
        return current;
      });
    };
  }, [sessionId, attempt, demo]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  /**
   * Writes the document back, one annotation at a time.
   *
   * Saves are serialised through the baseline: each one diffs against what the
   * last successful write left on the server, so two autosaves racing cannot
   * send overlapping token splices.
   */
  const save = useCallback(async (doc: TranscriptDoc) => {
    /* Nothing to save against: the document was never read from a server. The
     * autosave indicator still runs, which is what a recording wants to show. */
    if (demo) return;

    const id = annotationId.current;
    const base = baseline.current;
    if (!id || !base) return;
    baseline.current = await saveAnnotation(id, doc, base);
  }, [demo]);

  /** Takes the next session in the queue. Resolves with its session id. */
  const claim = useCallback(async () => {
    const claimed = await annotations.claimNext();

    /* The first entry in the activity log, sent here rather than from the
     * workspace: claiming happens on the way to a session that is not open
     * yet, so there is no recorder mounted to catch it. A fresh annotation has
     * an empty log, which is what makes `seq: 1` safe. Failures are silent —
     * a 403 is simply an annotator who has not agreed to the log, and it must
     * never stop them claiming work. */
    void sendEvents(claimed.id, [
      {
        id: `${claimed.id}-claim`,
        seq: 1,
        at: new Date().toISOString(),
        op: "session.claim",
        payload: {},
      },
    ]).catch(() => {});

    return claimed.session_id;
  }, []);

  const submit = useCallback(async () => {
    if (demo) return;

    const id = annotationId.current;
    if (!id) return;
    await annotations.submitAnnotation(id);
  }, [demo]);

  return { resource, reload, save, submit, claim };
}

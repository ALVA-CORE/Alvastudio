import { useCallback, useEffect, useRef, useState } from "react";
import * as annotations from "@/lib/api/annotations";
import type { ApiDraftTranscript } from "@/lib/api/annotations";
import { annotationAudioUrl } from "@/lib/api/annotations";
import { getSession } from "@/lib/api/focusGroups";
import { sendEvents } from "@/lib/api/annotationEvents";
import { reportApiError } from "@/lib/api/reportApiError";
import { toTranscriptDoc } from "@/data/annotators/fromApi";
import { baselineFrom, saveAnnotation, type Baseline } from "@/data/annotators/toApi";
import type { AnnotatorSession } from "@/data/annotators/sessions";
import type { TranscriptDoc } from "@/lib/annotation/types";
import { formatDuration, lengthOf } from "@/lib/duration";

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
       * The session's Scribe draft transcript, or null when it has none.
       *
       * Carried so the workspace can say a transcript is on its way, or
       * that one arrived too late to be applied, and so the speaker banner
       * knows which voices still need naming and who the API suggests.
       */
      transcript: ApiDraftTranscript | null;
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

const LANGUAGE: Record<string, AnnotatorSession["language"]> = {
  nigerian_english: "Nigerian English",
  nigerian_pidgin: "Nigerian Pidgin",
};

export function useSessionTranscript(sessionId: string | undefined) {
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

      /* A playable link, which streams. */
      const [document, focusGroup, audioSrc] = await Promise.all([
        annotations.getAnnotation(match.id),
        getSession(sessionId),
        annotationAudioUrl(match.id).catch(() => ""),
      ]);

      const doc = toTranscriptDoc(document, focusGroup.participants ?? []);
      const durationSec = Math.round(lengthOf(focusGroup) ?? 0);

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
        transcript: document.transcript ?? null,
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
    };
  }, [sessionId, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  /**
   * Says who a Scribe voice is, for every segment carrying its label.
   *
   * One call per voice rather than per segment, which is both what the API
   * takes and what the annotator means: they are identifying a voice, not
   * editing three hundred rows.
   *
   * Reloads afterwards rather than patching: the answer is the whole
   * document with new segment versions, and the local baseline has to move
   * with it or the next save sends a stale `expected_version`.
   */
  const linkSpeakers = useCallback(
    async (links: { speaker_label: string; participant_id: string | null }[]) => {
      const id = annotationId.current;
      if (!id || links.length === 0) return null;

      try {
        await annotations.linkSpeakers(id, links);
        setAttempt((value) => value + 1);
        return null;
      } catch (cause) {
        return reportApiError(cause, "Could not save who that was.");
      }
    },
    []
  );

  /**
   * Writes the document back, one annotation at a time.
   *
   * Saves are serialised through the baseline: each one diffs against what the
   * last successful write left on the server, so two autosaves racing cannot
   * send overlapping token splices.
   */
  const save = useCallback(async (doc: TranscriptDoc) => {
    const id = annotationId.current;
    const base = baseline.current;
    if (!id || !base) return;
    baseline.current = await saveAnnotation(id, doc, base);
  }, []);

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
    const id = annotationId.current;
    if (!id) return;
    await annotations.submitAnnotation(id);
  }, []);

  return { resource, reload, save, submit, claim, linkSpeakers };
}

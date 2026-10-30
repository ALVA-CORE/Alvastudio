import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnnotatorMobileGate } from "@/components/annotators/layout/AnnotatorMobileGate";
import { AnnotationWorkspace } from "@/components/annotators/workspace/AnnotationWorkspace";
import { ClaimSessionDialog } from "@/components/annotators/workspace/ClaimSessionDialog";
import {
  WorkspaceError,
  WorkspaceNotFound,
  WorkspaceSkeleton,
} from "@/components/annotators/workspace/WorkspaceStates";
import {
  AnnotationProvider,
  useActivityLog,
  useAutosaveControls,
} from "@/lib/annotation/context";
import type { AnnotatorSession } from "@/data/annotators/sessions";
import type { TranscriptDoc } from "@/lib/annotation/types";
import { useSessionTranscript } from "@/hooks/useSessionTranscript";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAnnotationWaveform } from "@/hooks/useAnnotationSource";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";

/**
 * `/annotator/sessions/:sessionId` — the annotation workspace.
 *
 * Renders outside the app shell (see `src/routes/index.tsx`): a full-bleed
 * editor with its own header and back link.
 */

/**
 * Sits inside the provider purely to reach `useAutosaveControls`, which does not
 * exist above it. Keeping it separate means the provider is mounted exactly
 * once per session rather than being remounted to pass a callback down.
 */
function WorkspaceBody({
  session,
  consentBlocked,
  peaks,
  onSubmit,
}: {
  session: AnnotatorSession;
  consentBlocked: boolean;
  /** The recording's measured waveform, or null when it has not been. */
  peaks: number[] | null;
  onSubmit: () => Promise<void>;
}) {
  const { flush } = useAutosaveControls();
  const log = useActivityLog();
  const handleFlush = useCallback(() => void flush(), [flush]);

  /* Submitting is not a change to the document, so the diff cannot see it.
   * Marked before the request rather than after: a submit that fails still
   * happened as far as a replay of the annotator's actions is concerned. */
  const handleSubmit = useCallback(async () => {
    log.mark("session.submit");
    await log.flush();
    await onSubmit();
  }, [log, onSubmit]);

  return (
    <AnnotationWorkspace
      session={session}
      consentBlocked={consentBlocked}
      peaks={peaks}
      onFlushSave={handleFlush}
      onSubmit={handleSubmit}
    />
  );
}

export default function AnnotatorWorkspacePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { resource, reload, save, submit, claim } = useSessionTranscript(sessionId);
  const [isClaiming, setClaiming] = useState(false);

  /* The measured waveform, read once per annotation. The timeline used to
     synthesise one per clip from a hash of the segment id — a speech-shaped
     curve that matched nothing, on the screen where people read a waveform
     to find where speech starts. */
  const peaks = useAnnotationWaveform(
    resource.status === "ready" ? resource.annotationId : undefined
  );

  const handleSave = useCallback((doc: TranscriptDoc) => save(doc), [save]);

  // Annotation is desktop work — the gate explains why rather than shipping a
  // waveform editor that cannot be used with a thumb.
  if (isMobile) {
    return <AnnotatorMobileGate />;
  }

  /* The session is real and unclaimed, so the workspace sits behind a modal
     offering the claim rather than a dead end saying it does not exist. */
  if (resource.status === "unclaimed") {
    return (
      <div className="flex h-dvh flex-col bg-alva-bg">
        <WorkspaceSkeleton />
        <ClaimSessionDialog
          open
          topic={resource.topic}
          isClaiming={isClaiming}
          onCancel={() => navigate("/annotator/sessions")}
          onClaim={async () => {
            setClaiming(true);
            try {
              const claimedId = await claim();
              /* `claim-next` hands out the top of the queue, which may not be
                 the session that was opened. Going to whatever came back is
                 the honest move; pretending otherwise would show one session
                 and load another. */
              navigate(`/annotator/sessions/${claimedId}`, { replace: true });
            } catch (cause) {
              const message = reportApiError(cause, "Could not claim a session.");
              if (message) alvaToast.error(message);
            } finally {
              setClaiming(false);
            }
          }}
        />
      </div>
    );
  }

  if (resource.status === "not-found") {
    return (
      <div className="flex h-dvh flex-col bg-alva-bg">
        <WorkspaceNotFound sessionId={sessionId} />
      </div>
    );
  }

  if (resource.status === "loading") {
    return (
      <div className="flex h-dvh flex-col bg-alva-bg">
        <WorkspaceSkeleton />
      </div>
    );
  }

  if (resource.status === "error") {
    return (
      <div className="flex h-dvh flex-col bg-alva-bg">
        <WorkspaceError error={resource.error} onRetry={reload} />
      </div>
    );
  }

  return (
    <AnnotationProvider
      // Re-keying on the session id disposes the previous store and history
      // outright. Without it, navigating between sessions would carry one
      // session's undo stack into the next.
      key={resource.session.id}
      doc={resource.doc}
      duration={resource.session.durationSec}
      annotationId={resource.annotationId}
      /* Omitted while consent is missing, which makes autosave inert. Every
         write is a 409 until it is resolved, and a save indicator cycling
         through "saving" and "failed" every few seconds says nothing the
         banner has not already said better. */
      onSave={resource.consentBlocked ? undefined : handleSave}
    >
      <WorkspaceBody
        session={resource.session}
        consentBlocked={resource.consentBlocked}
        peaks={peaks}
        onSubmit={submit}
      />
    </AnnotationProvider>
  );
}

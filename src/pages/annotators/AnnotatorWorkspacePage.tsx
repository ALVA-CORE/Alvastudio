import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { AnnotatorMobileGate } from "@/components/annotators/layout/AnnotatorMobileGate";
import { AnnotationWorkspace } from "@/components/annotators/workspace/AnnotationWorkspace";
import {
  WorkspaceError,
  WorkspaceNotFound,
  WorkspaceSkeleton,
} from "@/components/annotators/workspace/WorkspaceStates";
import {
  AnnotationProvider,
  useAutosaveControls,
} from "@/lib/annotation/context";
import { saveTranscript } from "@/data/annotators/transcripts";
import type { AnnotatorSession } from "@/data/annotators/sessions";
import type { TranscriptDoc } from "@/lib/annotation/types";
import { useSessionTranscript } from "@/hooks/useSessionTranscript";
import { useIsMobile } from "@/hooks/use-mobile";

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
function WorkspaceBody({ session }: { session: AnnotatorSession }) {
  const { flush } = useAutosaveControls();
  const handleFlush = useCallback(() => void flush(), [flush]);

  return <AnnotationWorkspace session={session} onFlushSave={handleFlush} />;
}

export default function AnnotatorWorkspacePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const isMobile = useIsMobile();
  const { resource, reload } = useSessionTranscript(sessionId);

  const handleSave = useCallback((doc: TranscriptDoc) => saveTranscript(doc), []);

  // Annotation is desktop work — the gate explains why rather than shipping a
  // waveform editor that cannot be used with a thumb.
  if (isMobile) {
    return <AnnotatorMobileGate />;
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
      onSave={handleSave}
    >
      <WorkspaceBody session={resource.session} />
    </AnnotationProvider>
  );
}

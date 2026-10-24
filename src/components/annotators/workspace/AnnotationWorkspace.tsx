import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WorkspaceFloatingControls } from "./WorkspaceFloatingControls";
import { TranscriptEditor } from "./TranscriptEditor";
import { TimelineDock } from "./timeline/TimelineDock";
import { SessionMetaSidebar, type WorkspacePassStats } from "./SessionMetaSidebar";
import DangerTriangle from "@solar-icons/react/ui/DangerTriangle";
import { useWorkspaceHotkeys } from "./useWorkspaceHotkeys";
import { CompleteSessionDialog } from "./CompleteSessionDialog";
import {
  useAnnotation,
  useAnnotationActions,
  useAnnotationStore,
} from "@/lib/annotation/context";
import { selectSegments } from "@/lib/annotation/store";
import { segmentDuration, documentIssueCount } from "@/lib/annotation/segments";
import type { AnnotatorSession } from "@/data/annotators/sessions";

/**
 * Assembles the workspace.
 *
 * Layout is a fixed three-band shell rather than a scrolling page: the header
 * and the bottom dock are pinned, and only the transcript scrolls. An editor
 * where the transport can scroll out of reach is unusable — the annotator needs
 * play/pause and the waveform in the same place at all times.
 *
 * Must be rendered inside <AnnotationProvider>.
 */

type AnnotationWorkspaceProps = {
  session: AnnotatorSession;
  /**
   * Somebody in the room withdrew their consent.
   *
   * Every write is refused while it holds, so the editor says so on open
   * rather than letting somebody transcribe for twenty minutes and meet a
   * 409 on their first save. Their work is kept either way.
   */
  consentBlocked?: boolean;
  /** Flushes the pending autosave. Wired to ⌘S and the header's Retry. */
  onFlushSave?: () => void;
  /** Hands the finished annotation to a reviewer. */
  onSubmit?: () => Promise<void>;
};

export function AnnotationWorkspace({
  session,
  consentBlocked = false,
  onFlushSave,
  onSubmit,
}: AnnotationWorkspaceProps) {
  const navigate = useNavigate();
  const store = useAnnotationStore();
  const { setCurrentTime, setPlaying } = useAnnotationActions();

  const segments = useAnnotation(selectSegments);
  /** What the confirm step reports as being handed over. */
  const tagCount = useAnnotation(
    (state) =>
      state.history.present.spans.length + state.history.present.nonSpeech.length
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isComplete, setComplete] = useState(session.status === "completed");

  /* Recomputed only when the document changes — not on playback. */
  const stats = useMemo<WorkspacePassStats>(() => {
    const { errors, warnings } = documentIssueCount(segments);
    return {
      segmentCount: segments.length,
      speakingSeconds: segments.reduce((total, segment) => total + segmentDuration(segment), 0),
      errors,
      warnings,
    };
  }, [segments]);

  const handleBack = useCallback(() => navigate("/annotator/sessions"), [navigate]);

  /**
   * Flush before marking done, not after.
   *
   * Autosave is debounced, so the last edit before someone reaches for the
   * button is very often still pending. Submitting first and saving second
   * would hand over a session whose most recent change had not landed.
   */
  const handleConfirmComplete = useCallback(async () => {
    setSubmitting(true);
    try {
      await onFlushSave?.();
      await onSubmit?.();
      setComplete(true);
      setConfirmOpen(false);
      navigate("/annotator/sessions");
    } finally {
      setSubmitting(false);
    }
  }, [navigate, onFlushSave, onSubmit]);

  /* Read imperatively: subscribing to isPlaying here would re-render the whole
   * workspace shell every time playback toggles. */
  const handleTogglePlay = useCallback(() => {
    setPlaying(!store.getState().isPlaying);
  }, [setPlaying, store]);

  useWorkspaceHotkeys({
    onTogglePlay: handleTogglePlay,
    onSeek: setCurrentTime,
    onSave: onFlushSave,
  });

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-alva-bg">
      <WorkspaceFloatingControls onBack={handleBack} />

      {consentBlocked ? (
        <div
          role="alert"
          className="mx-3 mt-1 flex items-start gap-2.5 rounded-xl bg-amber-500/10 px-4 py-2.5"
        >
          <DangerTriangle
            size={16}
            weight="BoldDuotone"
            className="mt-0.5 shrink-0 text-amber-300"
          />
          <p className="text-xs leading-relaxed text-amber-200">
            Someone in this session withdrew their consent, so nothing can be
            saved or submitted until that is resolved. Everything you have done
            is kept. Ask the intern who recorded it to sort the consent out.
          </p>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* Transcript sits on its own raised panel rather than on the page
              floor, so the editing surface reads as a document. */}
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-alva-border bg-alva-card">
            <TranscriptEditor className="h-full" />
          </div>

          <TimelineDock src={session.audioSrc} className="shrink-0" />
        </div>

        <SessionMetaSidebar
          session={session}
          stats={stats}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={setSidebarCollapsed}
          /* Submitting is a 409 while consent is missing, so the button is
             not offered rather than offered and refused. */
          onComplete={consentBlocked ? undefined : () => setConfirmOpen(true)}
          isComplete={isComplete}
        />

        <CompleteSessionDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          onConfirm={handleConfirmComplete}
          isSubmitting={isSubmitting}
          segmentCount={stats.segmentCount}
          tagCount={tagCount}
          errors={stats.errors}
        />
      </div>
    </div>
  );
}

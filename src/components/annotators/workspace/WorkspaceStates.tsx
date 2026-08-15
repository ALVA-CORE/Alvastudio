import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import AltArrowLeft from "@solar-icons/react/arrows/AltArrowLeft";
import Refresh from "@solar-icons/react/arrows/Refresh";
import MinimalisticMagnifer from "@solar-icons/react/search/MinimalisticMagnifer";
import AddCircle from "@solar-icons/react/ui/AddCircle";
import DangerTriangle from "@solar-icons/react/ui/DangerTriangle";
import Subtitles from "@solar-icons/react/ui/Subtitles";
import { TextureButton } from "@/components/ui/texture-button";
import { cn } from "@/lib/utils";

/**
 * Every non-happy path of the annotation workspace.
 *
 * Four states, one grammar: icon chip -> heading -> one line of copy -> action.
 * They are full-bleed on purpose — each one replaces the workspace rather than
 * sitting inside it, so the annotator is never looking at a half-built editor
 * wondering which half is real.
 */

const SESSIONS_QUEUE_PATH = "/annotator/sessions";

/**
 * Neutral pill. The workspace's single accent-filled element is the play
 * button, so any action rendered *alongside* a live workspace (i.e. the empty
 * state, where the audio dock is still mounted) has to stay grey.
 */
const pillButtonClass =
  "inline-flex items-center gap-2 rounded-full border border-alva-border bg-alva-surface px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-alva-card focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent";

/** Secondary, text-weight action. */
const linkButtonClass =
  "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent";

function WorkspaceStateShell({
  icon,
  title,
  description,
  actions,
  className,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-16 text-center",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-alva-surface text-muted-foreground">
        {icon}
      </div>
      <h2 className="mt-4 text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {actions ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 1. Loading
 * ------------------------------------------------------------------ */

/**
 * Line widths for the skeleton segment rows.
 *
 * Hard-coded rather than randomised so the silhouette is identical on every
 * render (and between server and client, if this ever gets prerendered) — a
 * skeleton that reshuffles its own bars on re-render reads as a glitch. The
 * ragged right edge is what makes the block read as prose instead of a table.
 */
const SKELETON_ROWS: { first: string; second?: string }[] = [
  { first: "92%", second: "48%" },
  { first: "74%" },
  { first: "88%", second: "63%" },
  { first: "56%" },
  { first: "95%", second: "37%" },
  { first: "68%" },
  { first: "83%", second: "52%" },
  { first: "45%" },
];

/**
 * The loading state renders the workspace's own silhouette — header, segment rows,
 * transport dock — rather than a spinner, so the layout does not jump when the
 * transcript lands and the annotator's eyes are already parked where the first
 * segment will appear.
 */
export function WorkspaceSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading transcript"
      className={cn("flex min-h-0 flex-1 flex-col gap-4 p-4", className)}
    >
      {/* Header bar */}
      <div className="flex shrink-0 items-center justify-between gap-4 rounded-2xl border border-alva-border bg-alva-card p-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="alva-shimmer h-4 w-40 rounded-full bg-alva-surface" />
          <div className="alva-shimmer h-3 w-64 max-w-full rounded-full bg-alva-surface" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="alva-shimmer size-8 rounded-full bg-alva-surface" />
          <div className="alva-shimmer size-8 rounded-full bg-alva-surface" />
          <div className="alva-shimmer h-8 w-24 rounded-full bg-alva-surface" />
        </div>
      </div>

      {/* Segment list */}
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden rounded-2xl border border-alva-border bg-alva-card p-4">
        {SKELETON_ROWS.map((row, index) => (
          <div key={index} className="flex items-start gap-3 rounded-xl px-2 py-3">
            {/* Speaker rail */}
            <div className="alva-shimmer h-9 w-1 shrink-0 rounded-full bg-alva-surface" />
            {/* Timecode */}
            <div className="alva-shimmer mt-0.5 h-3 w-12 shrink-0 rounded-full bg-alva-surface" />
            {/* Segment text */}
            <div className="min-w-0 flex-1 space-y-2">
              <div
                className="alva-shimmer h-3 rounded-full bg-alva-surface"
                style={{ width: row.first }}
              />
              {row.second ? (
                <div
                  className="alva-shimmer h-3 rounded-full bg-alva-surface"
                  style={{ width: row.second }}
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Transport dock */}
      <div className="shrink-0 space-y-3 rounded-2xl border border-alva-border bg-alva-card p-4">
        <div className="alva-shimmer h-16 w-full rounded-xl bg-alva-surface" />
        <div className="flex items-center justify-between gap-4">
          <div className="alva-shimmer h-8 w-28 rounded-full bg-alva-surface" />
          <div className="flex items-center gap-3">
            <div className="alva-shimmer size-8 rounded-full bg-alva-surface" />
            <div className="alva-shimmer size-11 rounded-full bg-alva-surface" />
            <div className="alva-shimmer size-8 rounded-full bg-alva-surface" />
          </div>
          <div className="alva-shimmer h-8 w-28 rounded-full bg-alva-surface" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 2. Empty
 * ------------------------------------------------------------------ */

export type WorkspaceEmptyProps = {
  /** Inserts the first segment at the current playhead and opens it for editing. */
  onAddSegment: () => void;
  className?: string;
};

/** Transcript fetched successfully, but the ASR pass produced no segments. */
export function WorkspaceEmpty({ onAddSegment, className }: WorkspaceEmptyProps) {
  return (
    <WorkspaceStateShell
      className={className}
      icon={<Subtitles size={22} weight="Linear" />}
      title="No segments on this tape yet"
      description="The automatic pass came back empty for this recording — add the first segment and type the transcript yourself."
      actions={
        <button type="button" onClick={onAddSegment} className={pillButtonClass}>
          <AddCircle size={16} weight="Linear" />
          Add first segment
        </button>
      }
    />
  );
}

/* ------------------------------------------------------------------ *
 * 3. Error
 * ------------------------------------------------------------------ */

export type WorkspaceErrorProps = {
  /**
   * Whatever the fetch rejected with. Typed `unknown` so a `catch` binding can
   * be handed over without a cast; the message is normalised below.
   */
  error: unknown;
  onRetry: () => void;
  className?: string;
};

const GENERIC_ERROR_MESSAGE = "The transcript could not be loaded.";

function toErrorMessage(error: unknown): string {
  if (typeof error === "string" && error.trim() !== "") return error;
  if (error instanceof Error && error.message.trim() !== "") return error.message;
  return GENERIC_ERROR_MESSAGE;
}

/**
 * The fetch failed. The retry is the only accent-filled control on screen —
 * legitimate here because the workspace (and therefore the play button that
 * normally owns the accent budget) never mounted.
 */
export function WorkspaceError({ error, onRetry, className }: WorkspaceErrorProps) {
  return (
    <WorkspaceStateShell
      className={className}
      icon={<DangerTriangle size={22} weight="Linear" />}
      title="Could not load this transcript"
      description={toErrorMessage(error)}
      actions={
        <>
          <TextureButton variant="alva" size="lg" onClick={onRetry} className="w-auto">
            <Refresh size={16} weight="Linear" />
            Retry
          </TextureButton>
          <Link to={SESSIONS_QUEUE_PATH} className={linkButtonClass}>
            <AltArrowLeft size={16} weight="Linear" />
            Back to sessions
          </Link>
        </>
      }
    />
  );
}

/* ------------------------------------------------------------------ *
 * 4. Not found
 * ------------------------------------------------------------------ */

export type WorkspaceNotFoundProps = {
  /** The unresolved route param, echoed back so a bad link is diagnosable. */
  sessionId?: string;
  className?: string;
};

/** No session in the queue matches the `:id` in the URL. */
export function WorkspaceNotFound({ sessionId, className }: WorkspaceNotFoundProps) {
  return (
    <WorkspaceStateShell
      className={className}
      icon={<MinimalisticMagnifer size={22} weight="Linear" />}
      title="Session not found"
      description={
        sessionId
          ? `No session matches "${sessionId}". It may have been reassigned or the link is out of date.`
          : "That session is not in your queue. It may have been reassigned or the link is out of date."
      }
      actions={
        <Link to={SESSIONS_QUEUE_PATH} className={pillButtonClass}>
          <AltArrowLeft size={16} weight="Linear" />
          Back to sessions
        </Link>
      }
    />
  );
}

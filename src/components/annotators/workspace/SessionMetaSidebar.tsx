import { memo, useState, type ReactNode } from "react";
import Sidebar from "@solar-icons/react/it/Sidebar";
import SidebarMinimalistic from "@solar-icons/react/it/SidebarMinimalistic";
import ListCheck from "@solar-icons/react/list/ListCheck";
import DocumentText from "@solar-icons/react/notes/DocumentText";
import Bolt from "@solar-icons/react/ui/Bolt";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import Microphone2 from "@solar-icons/react/video/Microphone2";
import { SessionStatusBadge } from "@/components/annotators/sessions/SessionStatusBadge";
import { AutosaveIndicator } from "@/components/annotators/workspace/AutosaveIndicator";
import type { AnnotatorSession } from "@/data/annotators/sessions";
import { formatDurationLong } from "@/lib/annotation/segments";
import { TagInspector } from "@/components/annotators/workspace/tagging/TagInspector";
import { useAnnotation } from "@/lib/annotation/context";
import {
  PANEL_SECTION_LABEL,
  PanelDivider,
  PanelRow,
} from "@/components/shared/PanelPrimitives";
import { useResizableSize } from "@/components/annotators/workspace/timeline/useResizableSize";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TextureButton } from "@/components/ui/texture-button";
import { cn } from "@/lib/utils";

/**
 * Permanent right-hand metadata rail for the annotation workspace.
 *
 * This is the ported content of `SessionDetailSheet` — same Session / Audio /
 * Annotation groupings, same ProfileInfoBlock vocabulary — but always mounted
 * instead of living behind a Radix Sheet. An annotator checks "who recorded
 * this / what language is it" mid-edit constantly; a modal that steals focus
 * and closes on Escape (the same Escape that cancels an inline segment edit) is the
 * wrong container for reference data.
 *
 * It deliberately takes the live "This pass" numbers as PROPS rather than
 * subscribing to the annotation store itself. The store's `currentTime` ticks
 * ~60x/second during playback, and a component that subscribes to the doc would
 * be one careless selector away from re-rendering the whole rail on every
 * frame. Props keep the re-render budget in the page's hands.
 */

/** Live counters for the annotator's current editing pass. */
export type WorkspacePassStats = {
  /** Segments currently in the document. */
  segmentCount: number;
  /** Total seconds covered by segments (summed segment durations, not wall-clock). */
  speakingSeconds: number;
  /** Conformance errors across the document. */
  errors: number;
  /** Conformance warnings across the document. */
  warnings: number;
};

export type SessionMetaSidebarProps = {
  session: AnnotatorSession;
  stats: WorkspacePassStats;
  /** Controlled: `true` renders the 3rem rail instead of the full panel. */
  collapsed: boolean;
  /** Called with the NEXT collapsed value, so `setCollapsed` can be passed directly. */
  onToggleCollapsed: (collapsed: boolean) => void;
  /** Opens the confirm step. The page owns what "done" actually does. */
  onComplete: () => void;
  /** True once the session has been handed over. */
  isComplete?: boolean;
  className?: string;
};

/**
 * A titled group of label/value rows.
 *
 * Every value used to sit in its own `bg-alva-surface` box, which stacked nine
 * boxes down the panel — each one drawing a border around a single word, so the
 * eye had to parse nine containers to read four facts. Rows on hairlines carry
 * the same information with one alignment to follow and no boxes at all.
 */
function InfoGroup({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-1">
      <h3 className={PANEL_SECTION_LABEL}>
        {icon}
        {title}
      </h3>
      <dl>{children}</dl>
    </section>
  );
}

type StatTone = "neutral" | "warning" | "negative";

const STAT_TONE_CLASS: Record<StatTone, string> = {
  neutral: "text-foreground",
  warning: "text-amber-300",
  negative: "text-red-400",
};

/** Hairline between metrics, inset from both so it divides without crowding. */
function StatDivider() {
  return <span aria-hidden className="mx-3 w-px shrink-0 bg-alva-border" />;
}

/** Number over label, unboxed — the number is the subject, not the container. */
function Stat({
  label,
  value,
  title,
  tone = "neutral",
}: {
  label: string;
  value: string;
  /** Full text for the tooltip — both lines truncate in a narrow panel. */
  title: string;
  tone?: StatTone;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="min-w-0 flex-1 cursor-default">
          <p
            className={cn(
              "truncate text-sm font-semibold tabular-nums",
              STAT_TONE_CLASS[tone],
            )}
          >
            {value}
          </p>
          <p className="truncate text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            {label}
          </p>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {title}
      </TooltipContent>
    </Tooltip>
  );
}

/** Worst-first summary of the document's conformance state. */
function ConformanceBadge({
  errors,
  warnings,
}: {
  errors: number;
  warnings: number;
}) {
  const badgeClass =
    "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide";

  if (errors > 0) {
    return (
      <span className={cn(badgeClass, "bg-red-500/15 text-red-400")}>
        {errors} {errors === 1 ? "error" : "errors"}
      </span>
    );
  }

  if (warnings > 0) {
    return (
      <span className={cn(badgeClass, "bg-amber-500/15 text-amber-300")}>
        {warnings} {warnings === 1 ? "warning" : "warnings"}
      </span>
    );
  }

  return (
    <span className={cn(badgeClass, "bg-alva-accent/15 text-alva-accent")}>
      Conformant
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Panel width bounds — the drag limits live here and nowhere else.
 *
 * MIN is how far the panel can be SHRUNK before the handle stops. Below roughly
 * 240px a label and its value no longer share a row without the value
 * truncating away, which is the point at which the panel stops being readable
 * rather than just narrow. Raise it to keep more of the value visible; lower it
 * to let the panel tuck further out of the way.
 * ------------------------------------------------------------------ */
const MIN_PANEL_WIDTH = 300;
const DEFAULT_PANEL_WIDTH = 304;
const MAX_PANEL_WIDTH = 520;
/** Width of the collapsed rail. Not draggable — the toggle owns this one. */
const COLLAPSED_PANEL_WIDTH = 48;

/** Bare icon — the panel edge already frames it, so a chip around it is noise. */
const iconButtonClass =
  "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent";

function SessionMetaSidebarImpl({
  session,
  stats,
  collapsed,
  onToggleCollapsed,
  onComplete,
  isComplete = false,
  className,
}: SessionMetaSidebarProps) {
  const [tab, setTab] = useState<"details" | "tags">("details");

  /* Handle is on the panel's RIGHT edge, so dragging right grows it. The floor
   * is the narrowest width at which a label and its value still fit on one row
   * without the value truncating to nothing. */
  const resize = useResizableSize({
    axis: "x",
    // The panel sits to the RIGHT of the editor, so its inner edge is the left
    // one — and dragging left has to grow it.
    invert: true,
    preferred: DEFAULT_PANEL_WIDTH,
    min: MIN_PANEL_WIDTH,
    max: MAX_PANEL_WIDTH,
  });
  const tagCount = useAnnotation(
    (state) =>
      state.history.present.spans.length +
      state.history.present.nonSpeech.length,
  );

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        aria-label="Session details"
        className={cn(
          // Hidden below xl: on a 1280-and-under desktop the transcript column is
          // the work surface and 19rem of reference data is not worth its width.
          // A rounded panel on the page floor rather than a flush-edged rail:
          // it sits to the left of the editor now, so it reads as a sibling card
          // to the transcript and the timeline, not as a wall.
          "relative hidden shrink-0 flex-col overflow-hidden rounded-2xl border border-alva-border bg-alva-card xl:flex",
          // Only animate the collapse toggle; a transition during a drag fights
          // the pointer and makes the panel lag behind the cursor.
          collapsed &&
            "transition-[width] duration-200 ease-out motion-reduce:transition-none",
          className,
        )}
        style={{ width: collapsed ? COLLAPSED_PANEL_WIDTH : resize.size }}
      >
        {!collapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panel"
            aria-valuenow={Math.round(resize.size)}
            aria-valuemin={resize.min}
            aria-valuemax={resize.max}
            tabIndex={0}
            {...resize.handleProps}
            className={cn(
              "group/resize absolute inset-y-0 left-0 z-[2] flex w-2 cursor-ew-resize touch-none items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent",
              resize.isResizing && "bg-alva-surface",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "h-8 w-0.5 rounded-full bg-transparent transition-colors group-hover/resize:bg-muted-foreground",
                resize.isResizing && "bg-muted-foreground",
              )}
            />
          </div>
        )}

        {collapsed ? (
          <div className="flex h-full flex-col items-center gap-3 py-4">
            <button
              type="button"
              onClick={() => onToggleCollapsed(false)}
              aria-expanded={false}
              aria-label="Expand session details"
              className={iconButtonClass}
            >
              <Sidebar size={17} weight="Linear" />
            </button>
            {/* Rotated so the label reads bottom-to-top, the convention for a
              vertical rail label in a left-to-right layout. */}
            <span className="rotate-180 select-none text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground [writing-mode:vertical-rl]">
              Details
            </span>

            {/* The action survives the collapse as an icon. Hiding it would mean
                the only way to finish a session is to re-expand the panel. */}
            <button
              type="button"
              onClick={onComplete}
              disabled={isComplete}
              aria-label={isComplete ? "Session submitted" : "Mark session as done"}
              title={isComplete ? "Session submitted" : "Mark session as done"}
              className={cn(
                "mt-auto flex size-8 shrink-0 items-center justify-center rounded-full transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent",
                isComplete
                  ? "bg-alva-accent/15 text-alva-accent"
                  : "bg-alva-accent text-alva-bg hover:opacity-90"
              )}
            >
              <CheckCircle size={17} weight="BoldDuotone" />
            </button>
          </div>
        ) : (
          <>
            {/* Header carries the tabs, so the underline of the active tab and the
              panel's own separator are the same line. Two questions live behind
              them — "what is this clip" and "what has been marked on it" — and
              splitting them stops either scrolling past the other. */}
            <header className="shrink-0 border-b border-alva-border">
              <div className="space-y-2 px-4 pb-3 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="truncate text-sm font-semibold text-foreground">
                      {session.code}
                    </h2>
                    <SessionStatusBadge status={session.status} />
                    {/* Beside the pill, not inside it: the pill is the session's
                      state and the dot is the document's. Sharing one fill made
                      them read as a single claim. */}
                    <AutosaveIndicator compact />
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleCollapsed(true)}
                    aria-expanded
                    aria-label="Collapse session details"
                    className={iconButtonClass}
                  >
                    <SidebarMinimalistic size={17} weight="Linear" />
                  </button>
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {session.topic}
                </p>
              </div>

              <div role="tablist" aria-label="Session panel" className="flex">
                {(["details", "tags"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={tab === value}
                    onClick={() => setTab(value)}
                    className={cn(
                      // -mb-px pulls the underline onto the header's border, so the
                      // active tab sits ON the separator rather than above it.
                      // flex-1 splits the panel evenly; -mb-px pulls the underline onto
                      // the header's border so the active tab sits ON the separator.
                      "-mb-px flex-1 border-b-2 pb-2 text-[11px] font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent",
                      tab === value
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {value}
                    {value === "tags" && tagCount > 0 ? (
                      <span className="ml-1 text-muted-foreground/70">
                        {tagCount}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </header>

            <div className="alva-thin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4">
              {tab === "details" ? (
                <>
                  {/* Live counters. Bare numbers on the panel ground — four boxed
                    tiles read as four separate cards rather than one reading. */}
                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={PANEL_SECTION_LABEL}>
                        <Bolt size={13} weight="Linear" />
                        This pass
                      </h3>
                      <ConformanceBadge
                        errors={stats.errors}
                        warnings={stats.warnings}
                      />
                    </div>

                    {/* Rules between the metrics rather than gaps alone: four
                      unboxed numbers in a row read as one long number until
                      something divides them. */}
                    <div className="flex items-stretch">
                      <Stat
                        label="Segs"
                        value={String(stats.segmentCount)}
                        title={`${stats.segmentCount} segments in this transcript`}
                      />
                      <StatDivider />
                      <Stat
                        label="Spoken"
                        value={formatDurationLong(stats.speakingSeconds)}
                        title={`${formatDurationLong(stats.speakingSeconds)} of speech across all segments`}
                      />
                      <StatDivider />
                      <Stat
                        label="Errors"
                        value={String(stats.errors)}
                        title={`${stats.errors} conformance ${stats.errors === 1 ? "error" : "errors"} — line length, line count or duration`}
                        tone={stats.errors > 0 ? "negative" : "neutral"}
                      />
                      <StatDivider />
                      <Stat
                        label="Warns"
                        value={String(stats.warnings)}
                        title={`${stats.warnings} conformance ${stats.warnings === 1 ? "warning" : "warnings"} — reading speed or empty text`}
                        tone={stats.warnings > 0 ? "warning" : "neutral"}
                      />
                    </div>
                  </section>

                  <PanelDivider />

                  <InfoGroup
                    title="Session"
                    icon={<DocumentText size={13} weight="Linear" />}
                  >
                    <PanelRow label="Code" value={session.code} />
                    <PanelRow label="State" value={session.state} />
                    <PanelRow label="Recorded by" value={session.recordedBy} />
                    <PanelRow label="Recorded" value={session.recordedAt} />
                  </InfoGroup>

                  <PanelDivider />

                  <InfoGroup
                    title="Audio"
                    icon={<Microphone2 size={13} weight="Linear" />}
                  >
                    <PanelRow label="Duration" value={session.duration} />
                    <PanelRow label="Language" value={session.language} />
                    <PanelRow
                      label="Speakers"
                      value={String(session.speakers)}
                    />
                    <PanelRow
                      label="Participants"
                      value={String(session.participants)}
                    />
                  </InfoGroup>

                  <PanelDivider />

                  <InfoGroup
                    title="Annotation"
                    icon={<ListCheck size={13} weight="Linear" />}
                  >
                    <PanelRow
                      label="Tags applied"
                      value={String(session.tagCount)}
                    />
                  </InfoGroup>
                </>
              ) : (
                <TagInspector />
              )}
            </div>

            {/* Footer. Outside the scroll area on purpose: finishing is the last
                thing you do, and an action you have to scroll to find is one you
                will not find. The divider is the panel's own, so the button
                reads as the panel's conclusion rather than another row in it. */}
            <footer className="shrink-0 border-t border-alva-border px-4 py-3">
              {isComplete ? (
                <p className="flex items-center justify-center gap-1.5 rounded-full bg-alva-accent/15 py-2 text-xs font-medium text-alva-accent">
                  <CheckCircle size={14} weight="BoldDuotone" />
                  Submitted for review
                </p>
              ) : (
                <TextureButton
                  variant="alva"
                  size="sm"
                  onClick={onComplete}
                  className="w-full"
                >
                  Mark as done
                </TextureButton>
              )}
            </footer>
          </>
        )}
      </aside>
    </TooltipProvider>
  );
}

/**
 * Memoised because the page above it re-renders on transcript edits. The
 * shallow compare only bites if the caller keeps `stats` referentially stable —
 * derive it with `useMemo` keyed on the doc revision, not inline in JSX.
 */
export const SessionMetaSidebar = memo(SessionMetaSidebarImpl);

import { memo, type ReactNode } from "react";
import AltArrowLeft from "@solar-icons/react/arrows/AltArrowLeft";
import AltArrowRight from "@solar-icons/react/arrows/AltArrowRight";
import ListCheck from "@solar-icons/react/list/ListCheck";
import DocumentText from "@solar-icons/react/notes/DocumentText";
import Bolt from "@solar-icons/react/ui/Bolt";
import Microphone2 from "@solar-icons/react/video/Microphone2";
import { SessionStatusBadge } from "@/components/annotators/sessions/SessionStatusBadge";
import { ProfileInfoBlock } from "@/components/profile/ProfileInfoBlock";
import type { AnnotatorSession } from "@/data/annotators/sessions";
import { formatDurationLong } from "@/lib/annotation/segments";
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
  className?: string;
};

/**
 * Titled grouping.
 *
 * The sheet original wrapped its blocks in a second `bg-alva-surface` box,
 * which put surface on surface and flattened the group. The panel is already
 * `bg-alva-card`, so the wrapper here is transparent and only the individual
 * tiles carry surface — card -> surface, one elevation step, as specified.
 */
function DetailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

type StatTone = "neutral" | "warning" | "negative";

const STAT_TONE_CLASS: Record<StatTone, string> = {
  neutral: "text-foreground",
  warning: "text-amber-300",
  negative: "text-red-400",
};

function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: StatTone;
}) {
  return (
    <div className="rounded-xl bg-alva-surface px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 text-sm font-semibold tabular-nums", STAT_TONE_CLASS[tone])}>
        {value}
      </p>
    </div>
  );
}

/** Worst-first summary of the document's conformance state. */
function ConformanceBadge({ errors, warnings }: { errors: number; warnings: number }) {
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

const iconButtonClass =
  "inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-alva-border bg-alva-surface text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent";

function SessionMetaSidebarImpl({
  session,
  stats,
  collapsed,
  onToggleCollapsed,
  className,
}: SessionMetaSidebarProps) {
  return (
    <aside
      aria-label="Session details"
      className={cn(
        // Hidden below xl: on a 1280-and-under desktop the transcript column is
        // the work surface and 19rem of reference data is not worth its width.
        // A rounded panel on the page floor rather than a flush-edged rail:
        // it sits to the left of the editor now, so it reads as a sibling card
        // to the transcript and the timeline, not as a wall.
        "hidden shrink-0 flex-col overflow-hidden rounded-2xl border border-alva-border bg-alva-card transition-[width] duration-200 ease-out motion-reduce:transition-none xl:flex",
        collapsed ? "w-12" : "w-[19rem]",
        className
      )}
    >
      {collapsed ? (
        <div className="flex h-full flex-col items-center gap-3 py-4">
          <button
            type="button"
            onClick={() => onToggleCollapsed(false)}
            aria-expanded={false}
            aria-label="Expand session details"
            className={iconButtonClass}
          >
            <AltArrowLeft size={16} weight="Linear" />
          </button>
          {/* Rotated so the label reads bottom-to-top, the convention for a
              vertical rail label in a left-to-right layout. */}
          <span className="rotate-180 select-none text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground [writing-mode:vertical-rl]">
            Details
          </span>
        </div>
      ) : (
        <>
          <header className="shrink-0 space-y-2 border-b border-alva-border px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2 className="truncate text-sm font-semibold text-foreground">
                  {session.code}
                </h2>
                <SessionStatusBadge status={session.status} />
              </div>
              <button
                type="button"
                onClick={() => onToggleCollapsed(true)}
                aria-expanded
                aria-label="Collapse session details"
                className={iconButtonClass}
              >
                <AltArrowRight size={16} weight="Linear" />
              </button>
            </div>
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {session.topic}
            </p>
          </header>

          <div className="alva-thin-scrollbar flex-1 space-y-5 overflow-y-auto px-4 py-4">
            <DetailSection
              title="This pass"
              icon={<Bolt size={14} weight="Linear" />}
            >
              <div className="grid grid-cols-2 gap-2">
                <StatTile label="Segments" value={String(stats.segmentCount)} />
                <StatTile
                  label="Speaking"
                  value={formatDurationLong(stats.speakingSeconds)}
                />
                <StatTile
                  label="Errors"
                  value={String(stats.errors)}
                  tone={stats.errors > 0 ? "negative" : "neutral"}
                />
                <StatTile
                  label="Warnings"
                  value={String(stats.warnings)}
                  tone={stats.warnings > 0 ? "warning" : "neutral"}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-alva-surface px-3 py-2.5">
                <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Conformance
                </span>
                <ConformanceBadge errors={stats.errors} warnings={stats.warnings} />
              </div>
            </DetailSection>

            <DetailSection
              title="Session"
              icon={<DocumentText size={14} weight="Linear" />}
            >
              <ProfileInfoBlock
                label="Session code"
                value={session.code}
                className="rounded-xl"
              />
              <ProfileInfoBlock
                label="State"
                value={session.state}
                className="rounded-xl"
              />
              <ProfileInfoBlock
                label="Recorded by"
                value={session.recordedBy}
                className="rounded-xl"
              />
              <ProfileInfoBlock
                label="Recorded"
                value={session.recordedAt}
                className="rounded-xl"
              />
            </DetailSection>

            <DetailSection
              title="Audio"
              icon={<Microphone2 size={14} weight="Linear" />}
            >
              <ProfileInfoBlock
                label="Duration"
                value={session.duration}
                className="rounded-xl"
              />
              <ProfileInfoBlock
                label="Language"
                value={session.language}
                className="rounded-xl"
              />
              <ProfileInfoBlock
                label="Speakers on tape"
                value={`${session.speakers} (${session.participants} participants + moderator)`}
                className="rounded-xl"
              />
            </DetailSection>

            <DetailSection
              title="Annotation"
              icon={<ListCheck size={14} weight="Linear" />}
            >
              <ProfileInfoBlock
                label="Tags applied"
                value={String(session.tagCount)}
                className="rounded-xl"
              />
            </DetailSection>
          </div>
        </>
      )}
    </aside>
  );
}

/**
 * Memoised because the page above it re-renders on transcript edits. The
 * shallow compare only bites if the caller keeps `stats` referentially stable —
 * derive it with `useMemo` keyed on the doc revision, not inline in JSX.
 */
export const SessionMetaSidebar = memo(SessionMetaSidebarImpl);

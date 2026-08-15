import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import MenuDots from "@solar-icons/react/ui/MenuDots";
import HamburgerMenu from "@solar-icons/react/ui/HamburgerMenu";
import AddCircle from "@solar-icons/react/ui/AddCircle";
import TrashBinMinimalistic from "@solar-icons/react/ui/TrashBinMinimalistic";
import { TimelineClip } from "./TimelineClip";
import { useTransport } from "./useTransport";
import { useResizableHeight } from "./useResizableHeight";
import { SpeakerAvatar } from "@/components/annotators/workspace/SpeakerAvatar";
import { TimelineTransport } from "./TimelineTransport";
import {
  useAnnotation,
  useAnnotationActions,
  useAnnotationStore,
} from "@/lib/annotation/context";
import { MAX_SPEAKERS, selectSegments, selectSpeakers } from "@/lib/annotation/store";
import { formatClock, formatTimecode } from "@/lib/annotation/segments";
import { speakerDisplayName, type Speaker, type SpeakerId } from "@/lib/annotation/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Multitrack timeline: one lane per speaker, segments as clips.
 *
 * The shape is a video editor's, because the job is a video editor's — the
 * annotator reads who spoke when across parallel voices, which a single merged
 * waveform cannot express.
 *
 * Four things hold this together:
 *
 *  1. The playhead is moved by writing `style.transform` from a store
 *     subscription. It never re-renders React at 60fps.
 *  2. Clips are windowed to the visible time range. A 40-minute session has
 *     ~430 segments; rendering them all made zooming feel like mud.
 *  3. The header column is `position: sticky` inside the same scroller as the
 *     lanes, so names stay put on horizontal scroll with no sync code — and it
 *     stacks ABOVE the playhead, so the scrubber slides underneath it.
 *  4. Zoom writes are rAF-coalesced; the slider fires faster than a frame.
 */

const TRACK_HEIGHT = 44;
const HEADER_WIDTH = 200;
const RULER_HEIGHT = 38;
/** Room for the horizontal scrollbar so it never sits on top of a track. */
const SCROLLBAR_GUTTER = 12;
/** Floor: the ruler stays visible, so the timeline always shows time. */
const MIN_TRACKS_HEIGHT = RULER_HEIGHT + SCROLLBAR_GUTTER;
/** Extra seconds rendered beyond the viewport so scrolling never shows a gap. */
const WINDOW_PAD_SECONDS = 8;

/* ------------------------------------------------------------------ *
 * Ruler
 * ------------------------------------------------------------------ */

/** Tick interval that keeps labels ~80px apart at the current zoom. */
function tickInterval(pps: number): number {
  const candidates = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900];
  return candidates.find((step) => step * pps >= 80) ?? 1800;
}

const TimelineRuler = memo(function TimelineRuler({
  duration,
  pps,
  onScrubStart,
  onScrubMove,
  onScrubEnd,
}: {
  duration: number;
  pps: number;
  onScrubStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onScrubMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onScrubEnd: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const step = tickInterval(pps);
  const ticks = useMemo(() => {
    const result: number[] = [];
    for (let t = 0; t <= duration; t += step) result.push(t);
    return result;
  }, [duration, step]);

  return (
    <div
      role="slider"
      aria-label="Scrub timeline"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={0}
      tabIndex={0}
      onPointerDown={onScrubStart}
      onPointerMove={onScrubMove}
      onPointerUp={onScrubEnd}
      onPointerCancel={onScrubEnd}
      className="relative h-full cursor-ew-resize touch-none select-none"
      style={{ width: duration * pps }}
    >
      {ticks.map((tick) => (
        <div
          key={tick}
          className="absolute bottom-0 flex flex-col items-start"
          style={{ left: tick * pps }}
        >
          <span className="pointer-events-none mb-0.5 whitespace-nowrap pl-1 text-[10px] tabular-nums text-muted-foreground">
            {formatClock(tick)}
          </span>
          <span className="h-2 w-px bg-alva-border" />
        </div>
      ))}
    </div>
  );
});

/* ------------------------------------------------------------------ *
 * Speaker row header
 * ------------------------------------------------------------------ */

type SpeakerHeaderProps = {
  speaker: Speaker;
  isActive: boolean;
  isDimmed: boolean;
  canDelete: boolean;
  onToggleFocus: (id: SpeakerId) => void;
  onRename: (id: SpeakerId, name: string) => void;
  onAddSegment: (id: SpeakerId) => void;
  onDeleteSpeaker: (id: SpeakerId) => void;
  onDragStart: (id: SpeakerId) => void;
  onDragOver: (id: SpeakerId) => void;
  onDragEnd: () => void;
  isDragging: boolean;
};

const SpeakerHeader = memo(function SpeakerHeader({
  speaker,
  isActive,
  isDimmed,
  canDelete,
  onToggleFocus,
  onRename,
  onAddSegment,
  onDeleteSpeaker,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
}: SpeakerHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(speakerDisplayName(speaker));

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== speakerDisplayName(speaker)) onRename(speaker.id, next);
  };

  return (
    <div
      // Native HTML5 drag for row reordering: it gives keyboard-accessible drop
      // targets and a drag image for free. Clips need pixel precision and use
      // pointer events instead.
      draggable={!editing}
      onDragStart={() => onDragStart(speaker.id)}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver(speaker.id);
      }}
      onDragEnd={onDragEnd}
      onDrop={onDragEnd}
      className={cn(
        // z-[6] puts the header above the playhead (z-[4]) so the scrubber
        // passes underneath the speaker column rather than over it.
        // z-[6] keeps the whole speaker column above the playhead (z-[5]) so the
        // scrubber slides underneath it instead of across the names.
        "sticky left-0 z-[6] flex shrink-0 items-center gap-1.5 border-r border-alva-border bg-alva-card px-2 transition-opacity",
        isDragging && "opacity-40",
        isDimmed && "opacity-45"
      )}
      style={{ width: HEADER_WIDTH, height: TRACK_HEIGHT }}
    >
      <span
        aria-hidden
        className="cursor-grab text-muted-foreground/50 active:cursor-grabbing"
      >
        <HamburgerMenu size={13} weight="Outline" />
      </span>

      <SpeakerAvatar speaker={speaker} size="sm" />

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Enter") commit();
            if (event.key === "Escape") {
              setDraft(speakerDisplayName(speaker));
              setEditing(false);
            }
          }}
          aria-label="Speaker name"
          className="min-w-0 flex-1 rounded-md bg-alva-surface px-1.5 py-0.5 text-xs text-foreground outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
        />
      ) : (
        <button
          type="button"
          aria-pressed={isActive}
          aria-label={`Focus ${speakerDisplayName(speaker)}`}
          onClick={() => onToggleFocus(speaker.id)}
          // Rename is a hover-and-click affordance rather than a menu item —
          // renaming speakers is the single most frequent action on this rail.
          onDoubleClick={() => {
            setDraft(speakerDisplayName(speaker));
            setEditing(true);
          }}
          title="Click to focus · double-click to rename"
          className={cn(
            "min-w-0 flex-1 truncate rounded-md px-1 py-1 text-left text-xs transition-colors hover:bg-alva-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent",
            isActive ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {speakerDisplayName(speaker)}
        </button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Actions for ${speakerDisplayName(speaker)}`}
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-alva-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            <MenuDots size={14} weight="Bold" className="rotate-90" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onSelect={() => onAddSegment(speaker.id)}>
            <AddCircle size={14} weight="Outline" className="mr-2" />
            Add segment here
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canDelete}
            onSelect={() => onDeleteSpeaker(speaker.id)}
            className="text-red-400 focus:text-red-400"
          >
            <TrashBinMinimalistic size={14} weight="Outline" className="mr-2" />
            Delete speaker
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

/* ------------------------------------------------------------------ *
 * Dock
 * ------------------------------------------------------------------ */

export type TimelineDockProps = {
  src: string;
  className?: string;
};

export function TimelineDock({ src, className }: TimelineDockProps) {
  const store = useAnnotationStore();
  const actions = useAnnotationActions();
  const { error, retry } = useTransport({ src });

  const segments = useAnnotation(selectSegments);
  const speakers = useAnnotation(selectSpeakers);
  const duration = useAnnotation((state) => state.duration);
  const zoom = useAnnotation((state) => state.zoom);
  const selectedSegmentId = useAnnotation((state) => state.selectedSegmentId);
  const activeSpeakerId = useAnnotation((state) => state.activeSpeakerId);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const playheadRef = useRef<HTMLDivElement | null>(null);
  const playheadBadgeRef = useRef<HTMLDivElement | null>(null);
  const playheadLabelRef = useRef<HTMLSpanElement | null>(null);
  const scrubbingRef = useRef(false);

  const [order, setOrder] = useState<SpeakerId[]>(() => speakers.map((s) => s.id));
  const [draggingId, setDraggingId] = useState<SpeakerId | null>(null);
  /** Visible horizontal window, in pixels. Drives clip windowing. */
  const [viewport, setViewport] = useState({ left: 0, width: 1200 });

  const fullHeight = RULER_HEIGHT + TRACK_HEIGHT * MAX_SPEAKERS + SCROLLBAR_GUTTER;
  const resize = useResizableHeight({
    initial: RULER_HEIGHT + TRACK_HEIGHT * 4 + SCROLLBAR_GUTTER,
    min: MIN_TRACKS_HEIGHT,
    max: fullHeight,
  });

  const pps = zoom;
  const laneWidth = Math.max(duration * pps, 1);

  useEffect(() => {
    setOrder((previous) => {
      const ids = speakers.map((speaker) => speaker.id);
      const kept = previous.filter((id) => ids.includes(id));
      const added = ids.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
  }, [speakers]);

  const orderedSpeakers = useMemo(
    () =>
      order
        .map((id) => speakers.find((speaker) => speaker.id === id))
        .filter((speaker): speaker is Speaker => Boolean(speaker)),
    [order, speakers]
  );

  /* Windowing — only clips intersecting the viewport are rendered. */
  const visibleRange = useMemo(() => {
    const from = viewport.left / pps - WINDOW_PAD_SECONDS;
    const to = (viewport.left + viewport.width) / pps + WINDOW_PAD_SECONDS;
    return { from, to };
  }, [pps, viewport]);

  const segmentsBySpeaker = useMemo(() => {
    const map = new Map<SpeakerId, typeof segments>();
    for (const speaker of speakers) map.set(speaker.id, []);

    for (const segment of segments) {
      if (segment.end < visibleRange.from || segment.start > visibleRange.to) continue;
      map.get(segment.speakerId)?.push(segment);
    }
    return map;
  }, [segments, speakers, visibleRange]);

  /** Every segment edge, so clips snap to neighbours across all tracks. */
  const snapPoints = useMemo(() => {
    const points = [0, duration];
    for (const segment of segments) points.push(segment.start, segment.end);
    return points;
  }, [duration, segments]);

  /* Viewport tracking, rAF-coalesced so a scroll burst is one state write. */
  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      setViewport({ left: node.scrollLeft, width: node.clientWidth });
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    node.addEventListener("scroll", schedule, { passive: true });

    const observer = new ResizeObserver(schedule);
    observer.observe(node);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      node.removeEventListener("scroll", schedule);
      observer.disconnect();
    };
  }, []);

  /* Playhead — moved imperatively, never through React state. */
  useEffect(() => {
    const apply = (time: number, { reveal = false } = {}) => {
      const x = time * pps;

      const node = playheadRef.current;
      if (node) node.style.transform = `translate3d(${x}px, 0, 0)`;

      const badge = playheadBadgeRef.current;
      if (badge) badge.style.transform = `translate3d(${x}px, 0, 0)`;

      const label = playheadLabelRef.current;
      if (label) label.textContent = formatTimecode(time);

      // A seek can land far outside the visible window — at 40px/s, 22s in is
      // 880px off. Without this the store updates, the playhead moves, and the
      // annotator sees nothing happen.
      const scroller = scrollerRef.current;
      if (!scroller || !reveal) return;

      const laneWidthPx = scroller.clientWidth - HEADER_WIDTH;
      const left = scroller.scrollLeft;

      if (x < left || x > left + laneWidthPx) {
        scroller.scrollTo({
          left: Math.max(0, x - laneWidthPx / 2),
          behavior: "smooth",
        });
      }
    };

    apply(store.getState().currentTime);

    let previous = store.getState().currentTime;
    return store.subscribe((state) => {
      if (state.currentTime === previous) return;
      const jumped = Math.abs(state.currentTime - previous) > 0.5;
      previous = state.currentTime;
      // Only a jump reveals; frame-by-frame playback would fight the user's own
      // horizontal scrolling.
      apply(state.currentTime, { reveal: jumped || state.followPlayhead });
    });
  }, [pps, store]);

  /* ---------------------------------------------------------------- *
   * Scrubbing — pointer down anywhere on the ruler starts a drag.
   * ---------------------------------------------------------------- */

  const timeFromClientX = useCallback(
    (clientX: number, element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return Math.max(0, Math.min((clientX - rect.left) / pps, duration));
    },
    [duration, pps]
  );

  const handleScrubStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      scrubbingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      actions.setCurrentTime(timeFromClientX(event.clientX, event.currentTarget));
    },
    [actions, timeFromClientX]
  );

  const handleScrubMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!scrubbingRef.current) return;
      actions.setCurrentTime(timeFromClientX(event.clientX, event.currentTarget));
    },
    [actions, timeFromClientX]
  );

  /* Dragging the playhead itself. Its own transform makes the element a moving
   * target, so position is measured from the scroller's lane origin rather than
   * from the handle's own rect. */
  const handlePlayheadGrab = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      scrubbingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    []
  );

  const handlePlayheadDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!scrubbingRef.current) return;
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const laneOrigin =
        scroller.getBoundingClientRect().left + HEADER_WIDTH - scroller.scrollLeft;
      actions.setCurrentTime(
        Math.max(0, Math.min((event.clientX - laneOrigin) / pps, duration))
      );
    },
    [actions, duration, pps]
  );

  const handlePlayheadRelease = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      scrubbingRef.current = false;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    []
  );

  const handleScrubEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    scrubbingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  /* ---------------------------------------------------------------- *
   * Clip + speaker handlers
   * ---------------------------------------------------------------- */

  const handleRetime = useCallback(
    (id: string, next: { start: number; end: number }) => {
      actions.retime(id, next, { live: true });
    },
    [actions]
  );

  const handleGestureEnd = useCallback(() => actions.endInteraction(), [actions]);

  const handleSelect = useCallback(
    (id: string) => {
      actions.selectSegment(id);
      const segment = store.getState().history.present.segments.find((s) => s.id === id);
      if (segment) actions.setCurrentTime(segment.start);
    },
    [actions, store]
  );

  const handleDragOver = useCallback(
    (overId: SpeakerId) => {
      setOrder((previous) => {
        if (!draggingId || draggingId === overId) return previous;
        const next = [...previous];
        const from = next.indexOf(draggingId);
        const to = next.indexOf(overId);
        if (from === -1 || to === -1) return previous;
        next.splice(to, 0, ...next.splice(from, 1));
        return next;
      });
    },
    [draggingId]
  );

  const handleAddSegment = useCallback(
    (speakerId: SpeakerId) => {
      actions.insertSegmentAt(store.getState().currentTime, speakerId);
    },
    [actions, store]
  );

  const canAddSpeaker = speakers.length < MAX_SPEAKERS;
  const canDeleteSpeaker = speakers.length > 1;

  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-alva-border bg-alva-card",
        className
      )}
      aria-label="Session timeline"
    >
      {error ? (
        <div className="flex items-center justify-between gap-3 border-b border-alva-border px-3 py-1.5">
          <p className="text-xs text-amber-300">{error} The timeline still works.</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-full px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Resize handle. Sits on the dock's top edge, so dragging up grows it. */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize timeline"
        aria-valuenow={Math.round(resize.height)}
        aria-valuemin={resize.min}
        aria-valuemax={resize.max}
        tabIndex={0}
        {...resize.handleProps}
        className={cn(
          "group/resize flex h-2 shrink-0 cursor-ns-resize touch-none items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent",
          resize.isResizing && "bg-alva-surface"
        )}
      >
        <span
          aria-hidden
          className={cn(
            "h-0.5 w-8 rounded-full bg-alva-border transition-colors group-hover/resize:bg-muted-foreground",
            resize.isResizing && "bg-muted-foreground"
          )}
        />
      </div>

      <div
        ref={scrollerRef}
        // The tracks scroll INSIDE the dock, between the ruler and the transport,
        // so shrinking the panel never hides the controls.
        className="alva-timeline-scrollbar relative shrink-0 overflow-auto"
        style={{ height: resize.height }}
      >
        <div
          className="relative"
          style={{
            width: HEADER_WIDTH + laneWidth,
            minWidth: "100%",
            paddingBottom: SCROLLBAR_GUTTER,
          }}
        >
          {/* Ruler row */}
          <div
            className="sticky top-0 z-[7] flex bg-alva-card"
            style={{ height: RULER_HEIGHT }}
          >
            <div
              className="sticky left-0 z-[8] flex shrink-0 items-end justify-between gap-1 border-r border-alva-border bg-alva-card px-2 pb-1 pt-3"
              style={{ width: HEADER_WIDTH }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Speakers
              </span>

              {canAddSpeaker ? (
                <button
                  type="button"
                  onClick={actions.addSpeaker}
                  aria-label="Add speaker"
                  title="Add speaker"
                  className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-alva-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
                >
                  <AddCircle size={15} weight="Outline" />
                </button>
              ) : null}
            </div>

            <div className="relative">
              <TimelineRuler
                duration={duration}
                pps={pps}
                onScrubStart={handleScrubStart}
                onScrubMove={handleScrubMove}
                onScrubEnd={handleScrubEnd}
              />

              {/* Rides the ruler, centred on the playhead line. */}
              {/* z-[1] keeps the badge above the ruler's ticks but BELOW the
                  sticky speaker header (z-[8]) in the same row, so a playhead
                  near t=0 slides under the speaker column instead of over it. */}
              <div
                ref={playheadBadgeRef}
                className="pointer-events-none absolute top-0 left-0 z-[1] will-change-transform"
              >
                <span
                  ref={playheadLabelRef}
                  className="absolute top-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-alva-accent px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-alva-bg"
                />
              </div>
            </div>
          </div>

          {/* Tracks */}
          {orderedSpeakers.map((speaker) => {
            const isActive = activeSpeakerId === speaker.id;
            const isDimmed = activeSpeakerId !== null && !isActive;
            const owned = segmentsBySpeaker.get(speaker.id) ?? [];

            return (
              <div
                key={speaker.id}
                className="flex border-t border-alva-border/60"
                style={{ height: TRACK_HEIGHT }}
              >
                <SpeakerHeader
                  speaker={speaker}
                  isActive={isActive}
                  isDimmed={isDimmed}
                  canDelete={canDeleteSpeaker}
                  onToggleFocus={actions.toggleActiveSpeaker}
                  onRename={actions.renameSpeaker}
                  onAddSegment={handleAddSegment}
                  onDeleteSpeaker={actions.removeSpeaker}
                  onDragStart={setDraggingId}
                  onDragOver={handleDragOver}
                  onDragEnd={() => setDraggingId(null)}
                  isDragging={draggingId === speaker.id}
                />

                <div className="relative shrink-0" style={{ width: laneWidth }}>
                  {owned.map((segment) => (
                    <TimelineClip
                      key={segment.id}
                      segment={segment}
                      color={speaker.color}
                      pps={pps}
                      isSelected={selectedSegmentId === segment.id}
                      isDimmed={isDimmed}
                      onSelect={handleSelect}
                      onRetime={handleRetime}
                      onGestureEnd={handleGestureEnd}
                      snapPoints={snapPoints}
                      duration={duration}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Playhead line — z-[5]: above the lanes, below both the sticky
              speaker column (z-[6]) and the ruler (z-[7]). The badge cannot live
              here for that same reason: the ruler's own background would paint
              straight over it. It is rendered inside the ruler row instead, and
              driven by the same imperative transform. */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-[5]"
            style={{ left: HEADER_WIDTH }}
          >
            <div ref={playheadRef} className="absolute top-0 bottom-0 will-change-transform">
              {/* The grab target is a wider transparent strip than the visible
                  1px line — a hairline is not a hit target anyone can find. */}
              <div
                role="presentation"
                onPointerDown={handlePlayheadGrab}
                onPointerMove={handlePlayheadDrag}
                onPointerUp={handlePlayheadRelease}
                onPointerCancel={handlePlayheadRelease}
                className="pointer-events-auto absolute top-0 bottom-0 -left-2 w-4 cursor-ew-resize touch-none"
              />
              <span className="absolute top-0 bottom-0 -left-px w-0.5 bg-alva-accent" />
            </div>
          </div>
        </div>
      </div>

      <TimelineTransport />
    </section>
  );
}

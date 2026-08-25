import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import AddCircle from "@solar-icons/react/ui/AddCircle";
import ParagraphSpacing from "@solar-icons/react/text-formatting/ParagraphSpacing";
import TextSquare from "@solar-icons/react/text-formatting/TextSquare";
import { TextureButton } from "@/components/ui/texture-button";
import { useAnnotation, useAnnotationActions, useAnnotationStore } from "@/lib/annotation/context";
import {
  isSegmentDimmed,
  selectNonSpeech,
  selectPrimarySegmentId,
  selectSegments,
  selectSpans,
  selectSpeakers,
  type AnnotationState,
} from "@/lib/annotation/store";
import { buildTokenIndex, tokensForSegment } from "@/lib/annotation/tokens";
import type { SpanKind } from "@/lib/annotation/tags";
import { findActiveSegmentIndex, formatTimecode } from "@/lib/annotation/segments";
import { MIN_SEGMENT_DURATION, type SegmentId, type Speaker } from "@/lib/annotation/types";
import { cn } from "@/lib/utils";
import { TranscriptSegmentRow } from "./TranscriptSegmentRow";

/**
 * Starting row height. Rows measure themselves once mounted, so this only has to
 * be close enough to keep the initial scrollbar honest — a two-line segment with
 * timecodes above and below lands around 140px.
 */
const ESTIMATED_ROW_HEIGHT = 140;

/** Past this distance (px) a scroll jumps instead of animating. */
const SMOOTH_SCROLL_LIMIT = 1200;

export type TranscriptEditorProps = {
  /**
   * Moves the audio element. Provided by whoever owns the media, because the
   * store's `currentTime` is a mirror of playback, not the source of it — writing
   * it directly here would be overwritten by the next timeupdate. Falls back to
   * `setCurrentTime` so the editor stays usable standalone (tests, storybook).
   */
  onSeek?: (time: number) => void;
  className?: string;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handle = () => setReduced(query.matches);
    query.addEventListener("change", handle);
    return () => query.removeEventListener("change", handle);
  }, []);

  return reduced;
}

/**
 * Index of the segment under the playhead.
 *
 * This is the *only* subscription to `currentTime` in the transcript, and it is
 * safe because the selector reduces 60 updates a second down to an integer:
 * zustand compares the result with Object.is, so the component re-renders once
 * per utterance rather than once per frame. Reading segments off the state (instead
 * of a closure) keeps the selector identity stable and never stale.
 */
const selectActiveSegmentIndex = (state: AnnotationState): number =>
  findActiveSegmentIndex(state.history.present.segments, state.currentTime);

export function TranscriptEditor({ onSeek, className }: TranscriptEditorProps) {
  const store = useAnnotationStore();
  const actions = useAnnotationActions();

  const segments = useAnnotation(selectSegments);
  const speakers = useAnnotation(selectSpeakers);
  const spans = useAnnotation(selectSpans);
  const nonSpeech = useAnnotation(selectNonSpeech);
  const selectedSegmentId = useAnnotation(selectPrimarySegmentId);
  const activeSpeakerId = useAnnotation((state) => state.activeSpeakerId);
  const followPlayhead = useAnnotation((state) => state.followPlayhead);
  const duration = useAnnotation((state) => state.duration);
  const activeIndex = useAnnotation(selectActiveSegmentIndex);

  const prefersReducedMotion = usePrefersReducedMotion();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  /**
   * Document-global token map.
   *
   * Rebuilt whenever any segment's text changes, which sounds expensive but is
   * a single pass over the transcript and only runs on edits — not on playback.
   * Every stored span is indexed against this, so it has to be derived from the
   * live segments rather than cached alongside them.
   */
  const tokenIndex = useMemo(() => buildTokenIndex(segments), [segments]);

  const handleApplyTag = useCallback(
    (kind: SpanKind, value: string, range: { start: number; end: number }) => {
      actions.addSpan({
        kind,
        value,
        startToken: range.start,
        endToken: range.end,
        // The schema's `span_source`: this came from a person, not the lexicon
        // difference. Only language spans carry it.
        ...(kind === "language" ? { spanSource: "annotator_added" as const } : {}),
      });
    },
    [actions]
  );

  const handleAddNonSpeech = useCallback(
    (type: string, atToken: number) => actions.addNonSpeechMark({ type, atToken }),
    [actions]
  );

  const speakerById = useMemo(
    () => new Map<string, Speaker>(speakers.map((speaker) => [speaker.id, speaker])),
    [speakers]
  );

  const virtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: segments.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 8,
    // Keyed by segment id so a measured height follows its segment through inserts and
    // deletes instead of sticking to a positional slot.
    getItemKey: (index) => segments[index]?.id ?? index,
  });

  /* ---------------------------------------------------------------- *
   * Handlers. Every one is referentially stable so the memoised rows
   * only re-render when their own segment or flags change.
   * ---------------------------------------------------------------- */

  const onSeekRef = useRef(onSeek);
  onSeekRef.current = onSeek;

  const handleSeek = useCallback(
    (time: number) => {
      const external = onSeekRef.current;
      if (external) external(time);
      else actions.setCurrentTime(time);
    },
    [actions]
  );

  const handleMergeWithPrevious = useCallback(
    (id: SegmentId) => {
      // The store only exposes merge-forward, so "merge with previous" is the
      // predecessor merging this segment into itself. Reading from the store rather
      // than a captured array keeps this callback stable forever.
      const list = store.getState().history.present.segments;
      const index = list.findIndex((segment) => segment.id === id);
      if (index <= 0) return;

      const previous = list[index - 1];
      actions.mergeWithNext(previous.id);
      // Selection follows the surviving segment so the caret has somewhere to go.
      actions.selectSegment(previous.id);
    },
    [actions, store]
  );

  const handleInsertAfter = useCallback(
    (id: SegmentId) => {
      const list = store.getState().history.present.segments;
      const index = list.findIndex((segment) => segment.id === id);
      if (index === -1) return;

      const segment = list[index];
      const next = list[index + 1];
      // Drop it into the middle of the following silence so it does not have to
      // fight either neighbour for room.
      const time = next ? (segment.end + next.start) / 2 : segment.end;
      actions.insertSegmentAt(time, segment.speakerId);
    },
    [actions, store]
  );

  const handleInsertFirst = useCallback(() => {
    actions.insertSegmentAt(store.getState().currentTime);
  }, [actions, store]);

  /* ---------------------------------------------------------------- *
   * Scrolling
   * ---------------------------------------------------------------- */

  /**
   * One effect owns the scroll position, not two.
   *
   * Selection and playback both want to bring a row into view, and when they
   * disagree — a click seeks *and* selects, firing both — two competing
   * `scrollToIndex` calls land in the same frame and the list visibly stutters.
   * Resolving to a single target index first means one smooth scroll per move.
   *
   * Guarded on the index changing, so typing inside the current row never yanks
   * the scroll position out from under the caret.
   */
  const scrolledIndexRef = useRef(-1);

  const targetIndex = selectedSegmentId
    ? segments.findIndex((segment) => segment.id === selectedSegmentId)
    : followPlayhead
      ? activeIndex
      : -1;

  useEffect(() => {
    if (targetIndex < 0) {
      scrolledIndexRef.current = -1;
      return;
    }
    if (scrolledIndexRef.current === targetIndex) return;

    scrolledIndexRef.current = targetIndex;

    const scroller = scrollRef.current;
    if (!scroller) return;

    /* `virtualizer.scrollToIndex(..., { behavior: "smooth" })` is documented as
     * unsupported alongside dynamic measurement, and this list measures every
     * row. The animation and the re-measure fight each other, which is the
     * stutter. Resolving the offset ourselves and handing it to the scroller's
     * own native smooth scroll sidesteps the virtualizer's animation entirely. */
    const offset = virtualizer.getOffsetForIndex(targetIndex, "center")?.[0];
    if (offset == null) return;

    const top = Math.max(0, offset);
    const distance = Math.abs(top - scroller.scrollTop);

    /* Animating across thousands of pixels is not "smooth" — every row entering
     * the viewport measures itself mid-flight, which is what makes a long jump
     * stutter. Past a screenful or so, land instantly; short hops animate. */
    scroller.scrollTo({
      top,
      behavior:
        prefersReducedMotion || distance > SMOOTH_SCROLL_LIMIT ? "auto" : "smooth",
    });
  }, [prefersReducedMotion, targetIndex, virtualizer]);

  const isEmpty = segments.length === 0;

  // Manual scrolling hands control back to the annotator. Programmatic
  // `scrollToIndex` never fires these events, so there is no feedback loop.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const release = () => {
      if (store.getState().followPlayhead) actions.setFollowPlayhead(false);
    };

    const handlePointerDown = (event: PointerEvent) => {
      // Only a scrollbar drag counts. A pointerdown on a segment is a seek, and
      // seeking should keep following — otherwise clicking a line to hear it
      // silently breaks the follow behaviour the annotator just relied on.
      if (event.target === node) release();
    };

    node.addEventListener("wheel", release, { passive: true });
    node.addEventListener("touchmove", release, { passive: true });
    node.addEventListener("pointerdown", handlePointerDown);

    return () => {
      node.removeEventListener("wheel", release);
      node.removeEventListener("touchmove", release);
      node.removeEventListener("pointerdown", handlePointerDown);
    };
    // `isEmpty` is a dependency because the scroller only exists once there are
    // segments to scroll — without it the listeners would never attach to a list
    // that started empty.
  }, [actions, isEmpty, store]);

  if (isEmpty) {
    return (
      <div
        className={cn(
          "flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center",
          className
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-alva-surface text-muted-foreground">
          <TextSquare size={22} weight="Linear" aria-hidden="true" />
        </span>
        <h3 className="text-sm font-semibold text-foreground">No segments yet</h3>
        <p className="max-w-xs text-xs leading-5 text-muted-foreground">
          This session has no transcript segments. Add a segment at the playhead and type
          what you hear — timings can be trimmed on the waveform afterwards.
        </p>
        <TextureButton
          variant="minimal"
          size="sm"
          className="mt-1 w-auto"
          onClick={handleInsertFirst}
        >
          <AddCircle size={16} weight="Linear" aria-hidden="true" />
          Add first segment
        </TextureButton>
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={scrollRef}
      className={cn("alva-thin-scrollbar h-full overflow-y-auto overflow-x-hidden", className)}
    >
      {/* Capped and centred: transcript is prose, and prose set to the full
          width of a 27" monitor is unreadable. The cap lives here rather than on
          the scroller so the scrollbar stays at the panel edge. */}
      <div
        role="list"
        aria-label="Transcript"
        className="relative mx-auto w-full max-w-4xl"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualItems.map((item) => {
          const segment = segments[item.index];
          if (!segment) return null;

          const next = segments[item.index + 1];
          const gapRoom = next
            ? next.start - segment.end
            : duration > 0
              ? duration - segment.end
              : Number.POSITIVE_INFINITY;

          const itemStyle: CSSProperties = {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(${item.start}px)`,
          };

          return (
            <div
              key={item.key}
              // `role="presentation"` keeps the absolutely-positioned wrapper out
              // of the accessibility tree, so each row's `listitem` is still read
              // as a direct child of the list.
              role="presentation"
              data-index={item.index}
              ref={virtualizer.measureElement}
              style={itemStyle}
            >
              <TranscriptSegmentRow
                segment={segment}
                speaker={speakerById.get(segment.speakerId)}
                speakers={speakers}
                isActive={item.index === activeIndex}
                isHighlighted={segment.id === selectedSegmentId}
                isDimmed={isSegmentDimmed(segment, activeSpeakerId)}
                isFirst={item.index === 0}
                onSeek={handleSeek}
                onSelect={actions.selectSegment}
                onTextChange={actions.setSegmentText}
                onSpeakerChange={actions.setSegmentSpeaker}
                onRenameSpeaker={actions.renameSpeaker}
                onSplit={actions.splitSegment}
                onMergeWithPrevious={handleMergeWithPrevious}
                onEndInteraction={actions.endInteraction}
                tokens={tokensForSegment(tokenIndex, segment.id)}
                spans={spans}
                nonSpeech={nonSpeech}
                onApplyTag={handleApplyTag}
                onRemoveTag={actions.removeSpan}
                onAddNonSpeech={handleAddNonSpeech}
              />

              <SegmentBoundary
                canMerge={Boolean(next)}
                canInsert={gapRoom >= MIN_SEGMENT_DURATION}
                mergeLabel={`Merge the segment at ${formatTimecode(segment.start)} with the next one`}
                insertLabel={`Add segment after ${formatTimecode(segment.end)}`}
                onMerge={() => actions.mergeWithNext(segment.id)}
                onInsert={() => handleInsertAfter(segment.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Boundary
 * ------------------------------------------------------------------ */

type SegmentBoundaryProps = {
  /** False on the last row — there is nothing after it to merge into. */
  canMerge: boolean;
  /** False when the following silence is too short to hold a segment. */
  canInsert: boolean;
  mergeLabel: string;
  insertLabel: string;
  onMerge: () => void;
  onInsert: () => void;
};

/**
 * The space between two segments, and the two operations that belong to it.
 *
 * These are boundary actions, not segment actions — merging joins the rows on
 * either side, and inserting drops into the silence between them. Hanging them
 * off one of the two rows would be a lie about what they act on, so they live
 * here, in the gap, indented to the text column beneath the row's end timecode.
 *
 * Merge is always visible (no fill until hover) because it is the frequent one.
 * Insert only surfaces on hover — a plus on all 400 boundaries is a dotted mess.
 */
const BOUNDARY_ACTION =
  "flex size-5 items-center justify-center rounded-full text-foreground transition-colors hover:bg-alva-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent";

const SegmentBoundary = memo(function SegmentBoundary({
  canMerge,
  canInsert,
  mergeLabel,
  insertLabel,
  onMerge,
  onInsert,
}: SegmentBoundaryProps) {
  if (!canMerge && !canInsert) return <div className="h-3" aria-hidden />;

  return (
    <div role="presentation" className="group/gap flex gap-3 px-6">
      {/* Spacer mirrors the row's speaker gutter so the actions land directly
          beneath the rail — change one, change the other. The negative margin
          centres the icons on the rail line rather than on its left edge. */}
      <div className="w-[9.5rem] shrink-0" aria-hidden />

      <div className="-ml-4 flex items-center gap-0.5">
        {canMerge && (
          <button
            type="button"
            onClick={onMerge}
            aria-label={mergeLabel}
            title="Merge these two segments"
            className={BOUNDARY_ACTION}
          >
            <ParagraphSpacing size={13} weight="Linear" aria-hidden />
          </button>
        )}

        {canInsert && (
          <button
            type="button"
            onClick={onInsert}
            aria-label={insertLabel}
            title="Add a segment here"
            className={cn(
              BOUNDARY_ACTION,
              "opacity-0 transition-opacity group-hover/gap:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none"
            )}
          >
            <AddCircle size={13} weight="Linear" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
});

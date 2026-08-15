import { memo, useCallback, useRef } from "react";
import { segmentPeaks } from "./peaks";
import { MIN_SEGMENT_DURATION, type Segment } from "@/lib/annotation/types";
import { formatTimecode } from "@/lib/annotation/segments";
import { cn } from "@/lib/utils";

/**
 * One segment rendered as a clip on its speaker's track.
 *
 * Body drag moves the clip; the edge handles trim it. Both go through the same
 * pointer pipeline so a gesture is exactly one undo step: `retime(live)` while
 * the pointer moves, `endInteraction()` on release.
 *
 * Pointer capture is taken on the element itself, so a fast drag that outruns
 * the cursor still delivers moves here instead of to whatever is underneath.
 */

/** Peak bars per 100px of clip width — enough texture without pointless detail. */
const BARS_PER_100PX = 22;

export type TimelineClipProps = {
  segment: Segment;
  color: string;
  /** Pixels per second. */
  pps: number;
  isSelected: boolean;
  /** Another speaker holds focus — this clip recedes. */
  isDimmed: boolean;
  onSelect: (id: string) => void;
  /** Live retime during a gesture. */
  onRetime: (id: string, next: { start: number; end: number }) => void;
  /** Closes the undo group on release. */
  onGestureEnd: () => void;
  /** Candidate edges to snap against, in seconds. */
  snapPoints: number[];
  duration: number;
};

type DragMode = "move" | "trim-start" | "trim-end";

/** Snap radius in pixels — converted to seconds against the current zoom. */
const SNAP_PX = 6;

function snap(value: number, points: number[], toleranceSeconds: number): number {
  let best = value;
  let bestDistance = toleranceSeconds;

  for (const point of points) {
    const distance = Math.abs(point - value);
    if (distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }

  return best;
}

function ClipWaveform({ segment, width }: { segment: Segment; width: number }) {
  const barCount = Math.max(4, Math.round((width / 100) * BARS_PER_100PX));
  const peaks = segmentPeaks(segment.id, barCount);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-1 inset-y-0 flex items-center gap-px overflow-hidden"
    >
      {peaks.map((peak, index) => (
        <span
          key={index}
          className="min-w-px flex-1 rounded-full bg-current"
          style={{ height: `${Math.round(peak * 68)}%`, opacity: 0.55 }}
        />
      ))}
    </div>
  );
}

function TimelineClipImpl({
  segment,
  color,
  pps,
  isSelected,
  isDimmed,
  onSelect,
  onRetime,
  onGestureEnd,
  snapPoints,
  duration,
}: TimelineClipProps) {
  const gestureRef = useRef<{
    mode: DragMode;
    originX: number;
    start: number;
    end: number;
  } | null>(null);

  const width = Math.max(2, (segment.end - segment.start) * pps);
  const left = segment.start * pps;

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>, mode: DragMode) => {
      // Ignore secondary buttons so a right-click context menu is not a drag.
      if (event.button !== 0) return;

      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);

      gestureRef.current = {
        mode,
        originX: event.clientX,
        start: segment.start,
        end: segment.end,
      };

      onSelect(segment.id);
    },
    [onSelect, segment.end, segment.id, segment.start]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const gesture = gestureRef.current;
      if (!gesture) return;

      const deltaSeconds = (event.clientX - gesture.originX) / pps;
      const tolerance = SNAP_PX / pps;
      const span = gesture.end - gesture.start;

      let start = gesture.start;
      let end = gesture.end;

      if (gesture.mode === "move") {
        start = snap(gesture.start + deltaSeconds, snapPoints, tolerance);
        // Snap the leading edge, then carry the trailing edge rigidly so the
        // clip keeps its length through the move.
        end = start + span;

        if (start < 0) {
          start = 0;
          end = span;
        }
        if (end > duration) {
          end = duration;
          start = end - span;
        }
      } else if (gesture.mode === "trim-start") {
        start = snap(gesture.start + deltaSeconds, snapPoints, tolerance);
        start = Math.min(start, gesture.end - MIN_SEGMENT_DURATION);
      } else {
        end = snap(gesture.end + deltaSeconds, snapPoints, tolerance);
        end = Math.max(end, gesture.start + MIN_SEGMENT_DURATION);
      }

      onRetime(segment.id, { start, end });
    },
    [duration, onRetime, pps, segment.id, snapPoints]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!gestureRef.current) return;
      gestureRef.current = null;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      onGestureEnd();
    },
    [onGestureEnd]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Segment from ${formatTimecode(segment.start)} to ${formatTimecode(segment.end)}`}
      aria-pressed={isSelected}
      title={segment.text.replace(/\n/g, " ")}
      onPointerDown={(event) => handlePointerDown(event, "move")}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(segment.id);
        }
      }}
      className={cn(
        "group absolute top-1.5 bottom-1.5 cursor-grab touch-none rounded-md transition-[opacity,box-shadow] focus-visible:outline-none active:cursor-grabbing",
        isDimmed ? "opacity-25" : "opacity-100"
      )}
      style={{
        left,
        width,
        backgroundColor: `color-mix(in srgb, ${color} ${isSelected ? "38%" : "22%"}, transparent)`,
        color,
        boxShadow: isSelected ? `inset 0 0 0 1.5px ${color}` : `inset 0 0 0 1px color-mix(in srgb, ${color} 45%, transparent)`,
      }}
    >
      {width > 12 ? <ClipWaveform segment={segment} width={width} /> : null}

      {/* Trim handles. Hidden until hover or selection so a dense track does not
          read as a row of grab bars. */}
      <span
        role="presentation"
        onPointerDown={(event) => handlePointerDown(event, "trim-start")}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          "absolute left-0.5 top-1/2 h-1/2 w-1 -translate-y-1/2 cursor-ew-resize touch-none rounded-full bg-current transition-opacity",
          isSelected ? "opacity-90" : "opacity-0 group-hover:opacity-70"
        )}
      />
      <span
        role="presentation"
        onPointerDown={(event) => handlePointerDown(event, "trim-end")}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          "absolute right-0.5 top-1/2 h-1/2 w-1 -translate-y-1/2 cursor-ew-resize touch-none rounded-full bg-current transition-opacity",
          isSelected ? "opacity-90" : "opacity-0 group-hover:opacity-70"
        )}
      />
    </div>
  );
}

export const TimelineClip = memo(TimelineClipImpl);

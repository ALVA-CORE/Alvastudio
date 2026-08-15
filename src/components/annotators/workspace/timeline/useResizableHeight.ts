import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/**
 * Drag-to-resize for a panel whose handle sits on its TOP edge.
 *
 * Dragging up grows the panel, so the delta is inverted against the pointer's
 * y movement. The gesture reads from a snapshot taken on pointer-down rather
 * than accumulating per-move deltas, which would drift over a long drag.
 *
 * Height is clamped rather than merely floored so the panel can never be
 * dragged past its own chrome — a timeline shrunk below its ruler is a timeline
 * with no visible time.
 */

export type ResizableHeight = {
  height: number;
  isResizing: boolean;
  /** Spread onto the handle element. */
  handleProps: {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  };
  /** Bounds, for the handle's ARIA values. */
  min: number;
  max: number;
};

export type UseResizableHeightOptions = {
  initial: number;
  min: number;
  max: number;
  /** Keyboard nudge, in pixels. */
  step?: number;
};

export function useResizableHeight({
  initial,
  min,
  max,
  step = 24,
}: UseResizableHeightOptions): ResizableHeight {
  const [height, setHeight] = useState(() => Math.min(max, Math.max(min, initial)));
  const [isResizing, setResizing] = useState(false);
  const gestureRef = useRef<{ originY: number; startHeight: number } | null>(null);

  const clamp = useCallback(
    (value: number) => Math.min(max, Math.max(min, value)),
    [max, min]
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      gestureRef.current = { originY: event.clientY, startHeight: height };
      setResizing(true);
    },
    [height]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const gesture = gestureRef.current;
      if (!gesture) return;

      // Handle is on the top edge: dragging up (negative dy) grows the panel.
      setHeight(clamp(gesture.startHeight - (event.clientY - gesture.originY)));
    },
    [clamp]
  );

  const endGesture = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!gestureRef.current) return;
    gestureRef.current = null;
    setResizing(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      setHeight((current) => clamp(current + (event.key === "ArrowUp" ? step : -step)));
    },
    [clamp, step]
  );

  return {
    height,
    isResizing,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endGesture,
      onPointerCancel: endGesture,
      onKeyDown,
    },
    min,
    max,
  };
}

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

/**
 * Drag-to-resize along one axis.
 *
 * The whole contract is the sign of the drag and the clamping, and both are easy
 * to regress into a panel that grows when you drag it shut, or one that can be
 * dragged past its own chrome. Gestures anchor to a snapshot taken on
 * pointer-down rather than accumulating per-move deltas, which would drift over
 * a long drag.
 *
 * `preferred` is live: until the user drags, the panel simply *is* that size.
 * Once they resize, the size is theirs and is only clamped when the bounds move
 * under it — an explicit choice should not be silently undone by, say, a speaker
 * being added.
 */

export type ResizeAxis = "x" | "y";

export type ResizableSize = {
  size: number;
  isResizing: boolean;
  handleProps: {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  };
  min: number;
  max: number;
};

export type UseResizableSizeOptions = {
  axis: ResizeAxis;
  /**
   * True when moving in the NEGATIVE direction grows the panel — i.e. the handle
   * sits on the panel's top or left edge.
   */
  invert?: boolean;
  /** The size the content wants. Followed exactly until the user resizes. */
  preferred: number;
  min: number;
  max: number;
  /** Keyboard nudge, in pixels. */
  step?: number;
};

export function useResizableSize({
  axis,
  invert = false,
  preferred,
  min,
  max,
  step = 24,
}: UseResizableSizeOptions): ResizableSize {
  const clamp = useCallback(
    (value: number) => Math.min(max, Math.max(min, value)),
    [max, min]
  );

  /** Null until the user takes ownership by resizing. */
  const [override, setOverride] = useState<number | null>(null);
  const [isResizing, setResizing] = useState(false);
  const gestureRef = useRef<{ origin: number; startSize: number } | null>(null);

  // Derived, not stored: no effect, and no frame where the panel is wrong.
  const size = clamp(override ?? preferred);

  const positionOf = useCallback(
    (event: ReactPointerEvent<HTMLElement>) =>
      axis === "x" ? event.clientX : event.clientY,
    [axis]
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();

      // Capture is best-effort: it throws on an inactive pointer id, and the
      // gesture must start regardless.
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* drag still tracks while the pointer stays over the handle */
      }

      gestureRef.current = { origin: positionOf(event), startSize: size };
      setResizing(true);
    },
    [positionOf, size]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const gesture = gestureRef.current;
      if (!gesture) return;

      const delta = positionOf(event) - gesture.origin;
      setOverride(clamp(gesture.startSize + (invert ? -delta : delta)));
    },
    [clamp, invert, positionOf]
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
    (event: ReactKeyboardEvent<HTMLElement>) => {
      const grow = axis === "x" ? "ArrowRight" : "ArrowUp";
      const shrink = axis === "x" ? "ArrowLeft" : "ArrowDown";
      if (event.key !== grow && event.key !== shrink) return;

      event.preventDefault();
      const sign = event.key === grow ? 1 : -1;
      setOverride((current) => clamp(clamp(current ?? preferred) + sign * step));
    },
    [axis, clamp, preferred, step]
  );

  return {
    size,
    isResizing,
    handleProps: { onPointerDown, onPointerMove, onPointerUp: endGesture, onPointerCancel: endGesture, onKeyDown },
    min,
    max,
  };
}

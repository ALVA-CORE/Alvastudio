import { useResizableSize, type ResizableSize } from "./useResizableSize";

/**
 * Drag-to-resize for a panel whose handle sits on its TOP edge, so dragging up
 * grows it. A thin wrapper over `useResizableSize` — the timeline dock is the
 * only caller and its public shape predates the generic hook.
 */

export type ResizableHeight = Omit<ResizableSize, "size"> & { height: number };

export type UseResizableHeightOptions = {
  /** The height the content wants. Followed exactly until the user resizes. */
  preferred: number;
  min: number;
  max: number;
  step?: number;
};

export function useResizableHeight(
  options: UseResizableHeightOptions
): ResizableHeight {
  const { size, ...rest } = useResizableSize({ ...options, axis: "y", invert: true });
  return { ...rest, height: size };
}

import { memo, useMemo } from "react";
import { useAnnotation } from "@/lib/annotation/context";
import { findActiveWordIndex, segmentWords } from "@/lib/annotation/segments";
import type { Segment } from "@/lib/annotation/types";
import { cn } from "@/lib/utils";

/**
 * Read-along transcript text.
 *
 * Body text sits at the muted weight by default; the word under the playhead
 * lifts to full foreground. That inversion is the point — the annotator's eye
 * lands on where the audio *is*, rather than having to track it themselves
 * against a wall of uniform white.
 *
 * Only mounted for the ACTIVE segment (`ActiveSegmentText`). Every other row
 * renders `StaticSegmentText`, which never subscribes to `currentTime` — one
 * subscriber at a time, not four hundred.
 */

type Props = {
  segment: Segment;
  className?: string;
};

const BASE = "whitespace-pre-wrap break-words text-sm leading-relaxed";

/** Non-active rows: no subscription, no per-frame work. */
export const StaticSegmentText = memo(function StaticSegmentText({
  segment,
  className,
}: Props) {
  return (
    <p className={cn(BASE, "text-muted-foreground", className)}>{segment.text}</p>
  );
});

/** The one row under the playhead. Subscribes to `currentTime`. */
export const ActiveSegmentText = memo(function ActiveSegmentText({
  segment,
  className,
}: Props) {
  const words = useMemo(() => segmentWords(segment), [segment]);

  // Reduced to an integer by the selector, so zustand's Object.is comparison
  // re-renders this once per word rather than once per frame.
  const activeIndex = useAnnotation((state) =>
    findActiveWordIndex(words, state.currentTime)
  );

  return (
    <p className={cn(BASE, "text-muted-foreground", className)}>
      {words.map((word, index) => (
        <span
          key={index}
          className={cn(
            "transition-colors duration-100 motion-reduce:transition-none",
            index <= activeIndex && activeIndex >= 0 && "text-foreground"
          )}
        >
          {word.text}
        </span>
      ))}
    </p>
  );
});

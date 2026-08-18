import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { segmentLines } from "@/lib/annotation/segments";
import { MAX_LINES_PER_SEGMENT } from "@/lib/annotation/types";
import { cn } from "@/lib/utils";

export type SegmentTextEditorProps = {
  /** Segment text. Fully controlled — every keystroke round-trips through the store. */
  value: string;
  /** Formatted start timecode, used only to build the accessible name. */
  timecode: string;
  onChange: (text: string) => void;
  /** Focus selects the segment, so clicking into text and clicking the row agree. */
  onSelect: () => void;
  /** Blur closes the store's coalescing group, sealing one undo step. */
  onEndInteraction: () => void;
  /**
   * Cmd/Ctrl+Enter. `caretRatio` is the caret's position through the text as a
   * 0..1 fraction; the row converts it to an absolute time, because only the row
   * knows the segment's start and end.
   */
  onSplit: (caretRatio: number) => void;
  /** Backspace at offset 0 — merges this segment into the one above it. */
  onMergeWithPrevious: () => void;
  readOnly?: boolean;
  /** Focus on mount — the row swaps display text for this editor on click. */
  autoFocus?: boolean;
  className?: string;
};

/**
 * Auto-growing textarea for one segment.
 *
 * Deliberately chrome-less: no background, no border, no focus ring of its own.
 * The parent row owns the focus affordance (`focus-within:ring-*`) so the ring
 * traces the whole segment — timecodes, counters and all — instead of a bare text
 * box floating inside it.
 */
export const SegmentTextEditor = forwardRef<HTMLTextAreaElement, SegmentTextEditorProps>(
  function SegmentTextEditor(
    {
      value,
      timecode,
      onChange,
      onSelect,
      onEndInteraction,
      onSplit,
      onMergeWithPrevious,
      readOnly = false,
      autoFocus = false,
      className,
    },
    forwardedRef
  ) {
    const innerRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(forwardedRef, () => innerRef.current as HTMLTextAreaElement, []);

    const resize = useCallback(() => {
      const node = innerRef.current;
      if (!node) return;
      // Collapsing to `auto` first is required: scrollHeight can only grow while
      // an explicit height is set, so without the reset the box never shrinks
      // back after text is deleted.
      node.style.height = "auto";
      node.style.height = `${node.scrollHeight}px`;
    }, []);

    // Layout effect, not effect: measuring after paint makes the row visibly
    // jump on mount and on every virtualizer remount as the list scrolls.
    useLayoutEffect(resize, [resize, value]);

    const handleKeyDown = useCallback(
      (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
        const node = event.currentTarget;

        if (event.key === "Enter") {
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            const caret = node.selectionStart ?? 0;
            const ratio = value.length === 0 ? 0.5 : caret / value.length;
            onSplit(Math.min(1, Math.max(0, ratio)));
            return;
          }

          // Subtitle conformance is enforced at the keystroke, not after the
          // fact, so the annotator never has to undo their way back under the
          // line ceiling.
          if (segmentLines(value).length >= MAX_LINES_PER_SEGMENT) {
            event.preventDefault();
          }
          return;
        }

        if (
          event.key === "Backspace" &&
          node.selectionStart === 0 &&
          node.selectionEnd === 0
        ) {
          event.preventDefault();
          onMergeWithPrevious();
        }
      },
      [onMergeWithPrevious, onSplit, value]
    );

    return (
      <textarea
        ref={innerRef}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the row swaps display
        // text for this editor on an explicit click; without focus the caret is lost.
        autoFocus={autoFocus}
        rows={1}
        value={value}
        readOnly={readOnly}
        spellCheck={false}
        aria-label={`Transcript text for segment starting at ${timecode}`}
        onChange={(event) => {
          onChange(event.target.value);
          resize();
        }}
        onFocus={onSelect}
        onBlur={onEndInteraction}
        onKeyDown={handleKeyDown}
        className={cn(
          "block w-full resize-none overflow-hidden border-0 bg-transparent p-0",
          "text-sm leading-6 text-foreground placeholder:text-muted-foreground",
          "focus-visible:outline-none focus:outline-none",
          readOnly && "cursor-default",
          className
        )}
        placeholder="Type what was said…"
      />
    );
  }
);

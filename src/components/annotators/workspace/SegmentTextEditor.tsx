import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { segmentLines } from "@/lib/annotation/segments";
import { INLINE_MARKERS, NON_SPEECH_COLOR } from "@/lib/annotation/tags";
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

    /* `[` starts a marker: the list offers the ones that match what follows. */
    const [caret, setCaret] = useState<number | null>(null);
    const [highlight, setHighlight] = useState(0);
    const typing = useMemo(
      () => (caret === null ? null : /\[([a-z-]*)$/i.exec(value.slice(0, caret))),
      [caret, value]
    );
    const suggestions = useMemo(
      () =>
        typing ? INLINE_MARKERS.filter((entry) => entry.marker.startsWith(typing[1].toLowerCase())) : [],
      [typing]
    );

    const insert = useCallback(
      (marker: string) => {
        if (caret === null || !typing) return;
        const start = caret - typing[0].length;
        const added = `[${marker}] `;
        onChange(value.slice(0, start) + added + value.slice(caret).replace(/^\s+/, ""));
        const at = start + added.length;
        setCaret(null);
        requestAnimationFrame(() => innerRef.current?.setSelectionRange(at, at));
      },
      [caret, typing, onChange, value]
    );

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

        if (suggestions.length) {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const step = event.key === "ArrowDown" ? 1 : -1;
            setHighlight((index) => (index + step + suggestions.length) % suggestions.length);
            return;
          }
          if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            insert(suggestions[Math.min(highlight, suggestions.length - 1)].marker);
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setCaret(null);
            return;
          }
        }

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
      [onMergeWithPrevious, onSplit, value, suggestions, highlight, insert]
    );

    const readCaret = (node: HTMLTextAreaElement) => {
      setCaret(node.selectionStart === node.selectionEnd ? node.selectionStart : null);
      setHighlight(0);
    };

    return (
      <div className="relative">
      {/* The text drawn again behind the box, so markers can be coloured:
          a textarea can't colour part of its text. Same font and wrapping. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 whitespace-pre-wrap break-words",
          "text-sm leading-6 text-foreground",
          className
        )}
      >
        {value.split(/(\[[a-z-]*\]?)/i).map((part, index) =>
          part.startsWith("[") ? (
            <span key={index} style={{ color: NON_SPEECH_COLOR }}>
              {part}
            </span>
          ) : (
            part
          )
        )}
        {"\n"}
      </div>
      <textarea
        ref={innerRef}
        /* The row swaps display text for this editor on an explicit click, so
           without focus the caret is lost. */
        autoFocus={autoFocus}
        rows={1}
        value={value}
        readOnly={readOnly}
        spellCheck={false}
        aria-label={`Transcript text for segment starting at ${timecode}`}
        onChange={(event) => {
          onChange(event.target.value);
          readCaret(event.target);
          resize();
        }}
        onSelect={(event) => readCaret(event.currentTarget)}
        onFocus={onSelect}
        onBlur={onEndInteraction}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative block w-full resize-none overflow-hidden border-0 bg-transparent p-0",
          "text-sm leading-6 text-transparent caret-foreground placeholder:text-muted-foreground",
          "focus-visible:outline-none focus:outline-none",
          readOnly && "cursor-default",
          className
        )}
        placeholder="Type what was said…"
      />
      {suggestions.length ? (
        <ul
          role="listbox"
          aria-label="Tags"
          className="absolute left-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-alva-border bg-alva-card py-1 shadow-lg"
        >
          {suggestions.map((entry, index) => (
            <li
              key={entry.marker}
              role="option"
              aria-selected={index === highlight}
              /* Keeps the caret in the box: a blur would end editing. */
              onMouseDown={(event) => {
                event.preventDefault();
                insert(entry.marker);
              }}
              className={cn(
                "cursor-pointer px-3 py-1.5 text-xs",
                index === highlight ? "bg-alva-surface" : undefined
              )}
              style={{ color: NON_SPEECH_COLOR }}
            >
              [{entry.marker}]
            </li>
          ))}
        </ul>
      ) : null}
      </div>
    );
  }
);

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { segmentLines } from "@/lib/annotation/segments";
import { NON_SPEECH_COLOR } from "@/lib/annotation/tags";
import {
  findSoundTags,
  insertMarker,
  markerAround,
  markerAtCaret,
  markerText,
  replaceMarker,
} from "@/lib/annotation/markers";
import { SoundTagList } from "@/components/annotators/workspace/tagging/SoundTagList";
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
  /** Tag colours as character ranges, drawn behind the text. */
  washes?: { start: number; end: number; color: string }[];
  /** The highlighted characters, or null when nothing is highlighted. */
  onSelectText?: (range: { start: number; end: number } | null) => void;
  /** Shown under the end of the highlighted text: the row's tag button. */
  selectionAddon?: ReactNode;
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
      washes,
      onSelectText,
      selectionAddon,
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
    const typing = useMemo(() => (caret === null ? null : markerAtCaret(value, caret)), [caret, value]);
    const suggestions = useMemo(() => (typing ? findSoundTags(typing.query) : []), [typing]);

    /* A [marker] clicked while editing, to change or remove. */
    const [changing, setChanging] = useState<{ from: number; to: number; type: string } | null>(null);
    const [changeQuery, setChangeQuery] = useState("");
    const changeMarker = (type: string | null) => {
      if (!changing) return;
      onChange(replaceMarker(value, changing, type));
      setChanging(null);
      requestAnimationFrame(() => innerRef.current?.focus());
    };

    const insert = useCallback(
      (type: string) => {
        if (!typing) return;
        const next = insertMarker(value, typing, markerText(type).slice(1, -1));
        onChange(next.value);
        setCaret(null);
        requestAnimationFrame(() => innerRef.current?.setSelectionRange(next.caret, next.caret));
      },
      [typing, onChange, value]
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
            insert(suggestions[Math.min(highlight, suggestions.length - 1)].type);
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

    /* Highlighted characters, reported so the row can tag those words. */
    const [selected, setSelected] = useState<{ start: number; end: number } | null>(null);
    const readCaret = (node: HTMLTextAreaElement) => {
      const range =
        node.selectionStart === node.selectionEnd
          ? null
          : { start: node.selectionStart, end: node.selectionEnd };
      setCaret(range ? null : node.selectionStart);
      setHighlight(0);
      setSelected(range);
      onSelectText?.(range);
    };

    /* Where a popup opens: under the `[` being typed, else under the end of
       the highlighted text. Measured from a mark in the drawn copy below. */
    const anchorAt = typing ? typing.from : changing ? changing.from : selected ? selected.end : null;
    const anchorRef = useRef<HTMLSpanElement>(null);
    const boxRef = useRef<HTMLDivElement>(null);
    const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
    useLayoutEffect(() => {
      const mark = anchorRef.current;
      if (anchorAt === null || !mark) {
        setAnchor(null);
        return;
      }
      const width = boxRef.current?.clientWidth ?? 0;
      const left = Math.max(0, Math.min(mark.offsetLeft, width - POPUP_WIDTH));
      const top = mark.offsetTop + LINE_HEIGHT;
      setAnchor((current) => (current?.left === left && current.top === top ? current : { left, top }));
    }, [anchorAt, value]);

    const popup = suggestions.length
      ? "markers"
      : changing
        ? "change"
        : selected && selectionAddon
          ? "addon"
          : null;

    return (
      <div ref={boxRef} className="relative">
      {/* The text drawn again behind the box, so tags and markers can be
          coloured: a textarea can't colour part of its text. Same font and
          wrapping, so it lines up letter for letter. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 whitespace-pre-wrap break-words",
          "text-sm leading-6 text-foreground",
          className
        )}
      >
        {drawn(value, washes, anchorAt, anchorRef)}
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
          setChanging(null);
          readCaret(event.target);
          resize();
        }}
        onClick={(event) => {
          const node = event.currentTarget;
          const around = node.selectionStart === node.selectionEnd ? markerAround(value, node.selectionStart) : null;
          setChanging(around);
          setChangeQuery("");
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
      {popup && anchor ? (
        <div className="absolute z-20 mt-1" style={{ left: anchor.left, top: anchor.top }}>
          {popup === "addon" ? (
            selectionAddon
          ) : popup === "change" && changing ? (
            /* Clicking a [marker] while editing: change it, or take it out. */
            <SoundTagList
              tags={findSoundTags(changeQuery)}
              current={changing.type}
              search={{ value: changeQuery, onChange: setChangeQuery }}
              onPick={(type) => changeMarker(type)}
              footer={
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    changeMarker(null);
                  }}
                  className="w-full border-t border-alva-border px-3 py-2 text-left text-xs text-red-400 hover:bg-alva-surface"
                >
                  Remove
                </button>
              }
            />
          ) : (
            <SoundTagList tags={suggestions} highlight={highlight} onPick={insert} />
          )}
        </div>
      ) : null}
      </div>
    );
  }
);

const LINE_HEIGHT = 24;
const POPUP_WIDTH = 192;
const MARKER_TEXT = /\[[a-z-]*\]?/gi;

/**
 * The text as drawn behind the textarea: tag washes as backgrounds, typed
 * markers in their colour, and an empty mark where a popup should open.
 */
function drawn(
  value: string,
  washes: { start: number; end: number; color: string }[] | undefined,
  anchorAt: number | null,
  anchorRef: RefObject<HTMLSpanElement>
): ReactNode[] {
  const background: (string | undefined)[] = Array(value.length).fill(undefined);
  const color: (string | undefined)[] = Array(value.length).fill(undefined);
  for (const wash of washes ?? []) {
    for (let i = wash.start; i < wash.end && i < value.length; i += 1) background[i] = wash.color;
  }
  for (const match of value.matchAll(MARKER_TEXT)) {
    for (let i = match.index ?? 0; i < (match.index ?? 0) + match[0].length; i += 1) color[i] = NON_SPEECH_COLOR;
  }

  const out: ReactNode[] = [];
  let from = 0;
  const flush = (to: number) => {
    if (to <= from) return;
    const bg = background[from];
    const fg = color[from];
    const text = value.slice(from, to);
    out.push(
      bg || fg ? (
        <span key={from} style={{ backgroundColor: bg, color: fg }} className={bg ? "rounded-[3px]" : undefined}>
          {text}
        </span>
      ) : (
        text
      )
    );
    from = to;
  };
  for (let i = 0; i <= value.length; i += 1) {
    if (i === anchorAt) {
      flush(i);
      out.push(<span key={`anchor-${i}`} ref={anchorRef} />);
    }
    if (i < value.length && i > from && (background[i] !== background[from] || color[i] !== color[from])) flush(i);
  }
  flush(value.length);
  return out;
}

import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { NON_SPEECH_COLOR, tagColor, type SpanKind } from "@/lib/annotation/tags";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SoundTagList } from "@/components/annotators/workspace/tagging/SoundTagList";
import { findSoundTags, markerText } from "@/lib/annotation/markers";
import type { AnnotationSpan, NonSpeechMark, Segment } from "@/lib/annotation/types";
import type { Token } from "@/lib/annotation/tokens";
import { useAnnotation } from "@/lib/annotation/context";
import { activeWord, wordStarts } from "@/lib/annotation/readAlong";

/**
 * A segment's text, rendered token by token so ranges can be tagged.
 *
 * Two things are layered onto the same tokens:
 *  - the read-along highlight (the token under the playhead), and
 *  - a tag wash for whichever span covers that token.
 *
 * Tags are a low-alpha background wash only, never a fill or a rule: a paragraph
 * carrying several span types has to read as *text* first.
 */

export type TaggedSegmentTextProps = {
  segment: Segment;
  /** Document-global tokens for this segment. */
  tokens: Token[];
  spans: AnnotationSpan[];
  /** Non-speech marks, drawn as `[laugh]` after the word they sit on. */
  marks: NonSpeechMark[];
  /** A mark's menu: change it to another type, or remove it (null). */
  onMarkChange: (markId: string, type: string | null) => void;
  /** Drawn just under a word: the tag button, under the last highlighted word. */
  addon?: { at: number; node: ReactNode } | null;
  /** Playhead is inside this segment. Drives the read-along highlight. */
  isActive: boolean;
  /** Inclusive, document-global token range, or null when nothing is selected. */
  onSelectRange: (range: { start: number; end: number } | null) => void;
  /** A highlight was finished (pointer up with words selected): the row opens its tag menu. */
  onSelectionDone?: () => void;
  /** Clicking an existing tag opens it for editing. */
  /** Opens an applied tag for inspection. Never destructive. */
  onSpanClick: (spanId: string) => void;
};

/** Spans covering each token, resolved once per render. */
function coverageByToken(tokens: Token[], spans: AnnotationSpan[]) {
  const map = new Map<number, AnnotationSpan[]>();
  if (tokens.length === 0) return map;

  const first = tokens[0].index;
  const last = tokens[tokens.length - 1].index;

  for (const span of spans) {
    if (span.endToken < first || span.startToken > last) continue;

    const from = Math.max(span.startToken, first);
    const to = Math.min(span.endToken, last);
    for (let i = from; i <= to; i += 1) {
      const list = map.get(i);
      if (list) list.push(span);
      else map.set(i, [span]);
    }
  }

  return map;
}

function TaggedSegmentTextImpl({
  segment,
  tokens,
  spans,
  marks,
  onMarkChange,
  addon,
  isActive,
  onSelectRange,
  onSelectionDone,
  onSpanClick,
}: TaggedSegmentTextProps) {
  const containerRef = useRef<HTMLParagraphElement | null>(null);

  /**
   * Word under the playhead (see `readAlong`). Each word's start is worked out
   * once per edit, not per frame.
   *
   * The selector returns an INTEGER, and zustand compares with Object.is — so
   * although every mounted row runs it on each of the ~60 store writes a second,
   * only the row whose word actually changed re-renders, a few times a second.
   * Returning `currentTime` here instead would repaint the whole transcript.
   */
  const starts = useMemo(
    () => wordStarts(segment.wordTimes, tokens.length, segment.start, segment.end),
    [segment.wordTimes, segment.start, segment.end, tokens.length]
  );
  const activeToken = useAnnotation((state) => {
    if (!isActive) return -1;
    const lit = activeWord(starts, state.currentTime);
    return lit === -1 ? -1 : tokens[lit].index;
  });
  /* Kept in a ref so the selection listener is attached exactly once, rather
   * than being torn down and rebuilt every time the parent re-renders. */
  const onSelectRangeRef = useRef(onSelectRange);
  onSelectRangeRef.current = onSelectRange;
  const onSelectionDoneRef = useRef(onSelectionDone);
  onSelectionDoneRef.current = onSelectionDone;
  const coverage = useMemo(() => coverageByToken(tokens, spans), [tokens, spans]);
  const marksAt = useMemo(() => {
    const map = new Map<number, NonSpeechMark[]>();
    for (const mark of marks) map.set(mark.atToken, [...(map.get(mark.atToken) ?? []), mark]);
    return map;
  }, [marks]);
  /**
   * Reads the browser's own text selection back into token indices.
   *
   * Driven by `selectionchange` on the document rather than a `mouseup` on this
   * element, for two reasons. A drag that ends outside the paragraph — which is
   * most of them, since you overshoot the last word — never fires mouseup here
   * at all. And mouseup lands *before* the selection settles in WebKit, so the
   * range read back is the previous one.
   *
   * Using the native selection also means shift-click, double-click-to-word and
   * keyboard selection work with no custom drag code.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frame = 0;

    /**
     * Resolves the selection by asking each token element whether the range
     * touches it.
     *
     * The obvious approach — walk up from `anchorNode`/`focusNode` looking for
     * `data-token` — silently fails whenever an endpoint lands on the whitespace
     * BETWEEN two tokens, because that text node has no tagged ancestor. Since
     * overshooting a word by a few pixels puts you on exactly that whitespace,
     * it failed constantly and looked random. `intersectsNode` has no such blind
     * spot, and a segment holds ~20 token elements, so the scan is trivial.
     */
    const read = () => {
      frame = 0;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) return;

      let min = Number.POSITIVE_INFINITY;
      let max = -1;

      for (const element of container.querySelectorAll<HTMLElement>("[data-token]")) {
        if (!range.intersectsNode(element)) continue;
        const index = Number(element.dataset.token);
        if (Number.isNaN(index)) continue;
        if (index < min) min = index;
        if (index > max) max = index;
      }

      if (max === -1) return;
      onSelectRangeRef.current({ start: min, end: max });
    };

    // `selectionchange` fires per character while dragging; coalesce to a frame.
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(read);
    };

    /**
     * Deliberately NOT cleared when the selection collapses.
     *
     * Opening the tag menu moves focus into a portal, which collapses the
     * selection — clearing on collapse unmounted the picker the instant it was
     * clicked. The range is cleared explicitly instead: by starting a new
     * selection, by applying a tag, or by the Clear button.
     */
    const handlePointerDown = (event: PointerEvent) => {
      /* The tag button hangs inside the text; pressing it keeps the highlight. */
      if (event.target instanceof Element && event.target.closest("[data-tag-addon]")) return;
      if (event.target instanceof Node && container.contains(event.target)) {
        onSelectRangeRef.current(null);
      }
    };

    /* On the document: a drag usually ends past the last word. A frame later,
       so the selection has settled and been read. */
    let doneFrame = 0;
    const handlePointerUp = () => {
      doneFrame = requestAnimationFrame(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
        if (!container.contains(selection.getRangeAt(0).commonAncestorContainer)) return;
        onSelectionDoneRef.current?.();
      });
    };

    document.addEventListener("selectionchange", schedule);
    document.addEventListener("pointerup", handlePointerUp);
    container.addEventListener("pointerdown", handlePointerDown);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (doneFrame) cancelAnimationFrame(doneFrame);
      document.removeEventListener("selectionchange", schedule);
      document.removeEventListener("pointerup", handlePointerUp);
      container.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  /**
   * Contiguous stretches sharing the same top tag.
   *
   * Rendering per token would leave the spaces BETWEEN tagged words unwashed, so
   * a tagged phrase reads as a row of separate chips rather than one continuous
   * highlight. Grouping into runs puts the inter-token whitespace inside the
   * washed element, which is what makes it look like a highlighter stroke.
   */
  const runs = useMemo(() => {
    const out: { spanId: string | null; hue?: string; tokens: Token[] }[] = [];

    for (const token of tokens) {
      const covering = coverage.get(token.index) ?? [];
      const top = covering.length > 0 ? covering[covering.length - 1] : null;
      const last = out[out.length - 1];

      if (last && last.spanId === (top?.id ?? null)) {
        last.tokens.push(token);
        continue;
      }

      out.push({
        spanId: top?.id ?? null,
        hue: top ? tagColor(top.kind as SpanKind) : undefined,
        tokens: [token],
      });
    }

    return out;
  }, [tokens, coverage]);

  /* Placed AFTER every hook: an early return above `useMemo` breaks the
   * rules of hooks, and a segment goes from empty to non-empty the moment
   * someone types into a freshly inserted one — React would then render
   * fewer hooks than the previous pass and throw. */
  if (tokens.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground/60">
        Empty segment, click to transcribe
      </p>
    );
  }

  return (
    <p ref={containerRef} className="whitespace-pre-wrap text-sm leading-relaxed">
      {runs.map((run, runIndex) => {
        const first = run.tokens[0];
        const previousRun = runs[runIndex - 1];
        const previousToken = previousRun?.tokens[previousRun.tokens.length - 1];

        // Whitespace before this run belongs OUTSIDE the wash — a highlight
        // should start at the first tagged letter, not a space before it.
        const lead = previousToken
          ? segment.text.slice(previousToken.charEnd, first.charStart) || " "
          : "";

        const body = run.tokens.map((token, i) => {
          const gap =
            i === 0
              ? ""
              : segment.text.slice(run.tokens[i - 1].charEnd, token.charStart) || " ";

          return (
            <span key={token.index}>
              {gap}
              <span
                data-token={token.index}
                className={
                  token.index === activeToken ? "text-foreground" : undefined
                }
              >
                {token.text}
              </span>
              {marksAt.get(token.index)?.map((mark) => (
                <MarkMenu key={mark.id} type={mark.type} onChange={(type) => onMarkChange(mark.id, type)} />
              ))}
              {/* No width, so the text doesn't move; the button hangs below. */}
              {addon?.at === token.index ? (
                <span className="relative inline-block w-0 align-baseline">
                  <span className="absolute left-0 top-full z-20 mt-0.5 whitespace-nowrap">{addon.node}</span>
                </span>
              ) : null}
            </span>
          );
        });

        if (run.spanId === null) {
          return (
            <span key={`run-${first.index}`} className="text-muted-foreground">
              {lead}
              {body}
            </span>
          );
        }

        return (
          <span key={`run-${first.index}`}>
            {lead}
            <span
              onClick={(event) => {
                event.stopPropagation();
                onSpanClick(run.spanId as string);
              }}
              style={{
                backgroundColor: `color-mix(in srgb, ${run.hue} 22%, transparent)`,
              }}
              className="cursor-pointer rounded-[3px] px-[1px] text-muted-foreground transition-colors"
            >
              {body}
            </span>
          </span>
        );
      })}
    </p>
  );
}

export const TaggedSegmentText = memo(TaggedSegmentTextImpl);

/** A mark in the text, `[laugh]`: a searchable list to change its type, or remove it. */
function MarkMenu({ type, onChange }: { type: string; onChange: (type: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pick = (next: string | null) => {
    setOpen(false);
    onChange(next);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          data-tag-addon
          onClick={(event) => event.stopPropagation()}
          className="ml-1 rounded px-0.5 text-[12px] font-medium"
          style={{
            color: NON_SPEECH_COLOR,
            backgroundColor: `color-mix(in srgb, ${NON_SPEECH_COLOR} 14%, transparent)`,
          }}
        >
          {markerText(type)}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto border-0 bg-transparent p-0 shadow-none">
        <SoundTagList
          tags={findSoundTags(query)}
          current={type}
          search={{ value: query, onChange: setQuery }}
          onPick={pick}
          footer={
            <button
              type="button"
              onClick={() => pick(null)}
              className="w-full border-t border-alva-border px-3 py-2 text-left text-xs text-red-400 hover:bg-alva-surface"
            >
              Remove
            </button>
          }
        />
      </PopoverContent>
    </Popover>
  );
}

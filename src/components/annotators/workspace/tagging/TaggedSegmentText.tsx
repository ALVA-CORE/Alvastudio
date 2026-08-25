import { memo, useEffect, useMemo, useRef } from "react";
import { tagColor, type SpanKind } from "@/lib/annotation/tags";
import type { AnnotationSpan, Segment } from "@/lib/annotation/types";
import type { Token } from "@/lib/annotation/tokens";
import { useAnnotation } from "@/lib/annotation/context";
import { cn } from "@/lib/utils";

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
  /** Playhead is inside this segment. Drives the read-along highlight. */
  isActive: boolean;
  /** Inclusive, document-global token range, or null when nothing is selected. */
  onSelectRange: (range: { start: number; end: number } | null) => void;
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
  isActive,
  onSelectRange,
  onSpanClick,
}: TaggedSegmentTextProps) {
  const containerRef = useRef<HTMLParagraphElement | null>(null);

  /**
   * Word under the playhead.
   *
   * There is no forced alignment yet, so position is interpolated across the
   * segment's duration — the schema's `nonSpeechEvent.start_sec` is filled by an
   * aligner later, and per-word timings will arrive the same way. Until then
   * this tracks the segment evenly, which is close enough to follow along with
   * and honest about being an estimate.
   *
   * The selector returns an INTEGER, and zustand compares with Object.is — so
   * although every mounted row runs it on each of the ~60 store writes a second,
   * only the row whose word actually changed re-renders, a few times a second.
   * Returning `currentTime` here instead would repaint the whole transcript.
   */
  const activeToken = useAnnotation((state) => {
    if (!isActive) return -1;

    const span = segment.end - segment.start;
    if (span <= 0 || tokens.length === 0) return -1;

    const progress = (state.currentTime - segment.start) / span;
    if (progress < 0 || progress > 1) return -1;

    const nth = Math.min(tokens.length - 1, Math.floor(progress * tokens.length));
    return tokens[nth].index;
  });
  /* Kept in a ref so the selection listener is attached exactly once, rather
   * than being torn down and rebuilt every time the parent re-renders. */
  const onSelectRangeRef = useRef(onSelectRange);
  onSelectRangeRef.current = onSelectRange;
  const coverage = useMemo(() => coverageByToken(tokens, spans), [tokens, spans]);
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
      if (event.target instanceof Node && container.contains(event.target)) {
        onSelectRangeRef.current(null);
      }
    };

    document.addEventListener("selectionchange", schedule);
    container.addEventListener("pointerdown", handlePointerDown);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", schedule);
      container.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  if (tokens.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground/60">
        Empty segment — click to transcribe
      </p>
    );
  }

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

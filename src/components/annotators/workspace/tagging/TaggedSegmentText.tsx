import { memo, useCallback, useMemo, useRef } from "react";
import { tagColor, type SpanKind } from "@/lib/annotation/tags";
import type { AnnotationSpan, NonSpeechMark, Segment } from "@/lib/annotation/types";
import type { Token } from "@/lib/annotation/tokens";
import { cn } from "@/lib/utils";

/**
 * A segment's text, rendered token by token so ranges can be tagged.
 *
 * Two things are layered onto the same tokens:
 *  - the read-along highlight (the token under the playhead), and
 *  - tag washes, one per span covering that token.
 *
 * Tags are drawn as a low-alpha background wash plus a 2px underline in the
 * family's hue, never a solid fill: a paragraph with four overlapping span types
 * has to stay readable as *text* first. Overlaps stack their underlines rather
 * than fighting over the background, so a token that is both Pidgin and a
 * disfluency shows both without either winning.
 */

export type TaggedSegmentTextProps = {
  segment: Segment;
  /** Document-global tokens for this segment. */
  tokens: Token[];
  spans: AnnotationSpan[];
  nonSpeech: NonSpeechMark[];
  /** Token index under the playhead, or -1. */
  activeToken: number;
  /** Called with an inclusive, document-global token range. */
  onSelectRange: (range: { start: number; end: number }) => void;
  /** Clicking an existing tag opens it for editing. */
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

function washFor(spans: AnnotationSpan[]): string | undefined {
  if (spans.length === 0) return undefined;
  // The first span owns the background; the rest are carried by underlines, so
  // a stack of tags never compounds into an unreadable block of colour.
  return `color-mix(in srgb, ${tagColor(spans[0].kind as SpanKind)} 16%, transparent)`;
}

function TaggedSegmentTextImpl({
  segment,
  tokens,
  spans,
  nonSpeech,
  activeToken,
  onSelectRange,
  onSpanClick,
}: TaggedSegmentTextProps) {
  const containerRef = useRef<HTMLParagraphElement | null>(null);
  const coverage = useMemo(() => coverageByToken(tokens, spans), [tokens, spans]);
  const marksByToken = useMemo(() => {
    const map = new Map<number, NonSpeechMark[]>();
    for (const mark of nonSpeech) {
      const list = map.get(mark.atToken);
      if (list) list.push(mark);
      else map.set(mark.atToken, [mark]);
    }
    return map;
  }, [nonSpeech]);

  /**
   * Reads the browser's own text selection back into token indices.
   *
   * Using the native selection rather than a custom drag means shift-click,
   * double-click-to-word and keyboard selection all work for free. Each token
   * carries `data-token`, so the anchor and focus nodes resolve by walking up to
   * the nearest tagged element.
   */
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const container = containerRef.current;
    if (!container) return;

    const tokenOf = (node: Node | null): number | null => {
      let el = node instanceof Element ? node : node?.parentElement ?? null;
      while (el && el !== container) {
        const raw = (el as HTMLElement).dataset?.token;
        if (raw !== undefined) return Number(raw);
        el = el.parentElement;
      }
      return null;
    };

    const from = tokenOf(selection.anchorNode);
    const to = tokenOf(selection.focusNode);
    if (from === null || to === null) return;

    // Selections run backwards as readily as forwards.
    onSelectRange({ start: Math.min(from, to), end: Math.max(from, to) });
  }, [onSelectRange]);

  if (tokens.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground/60">
        Empty segment — click to transcribe
      </p>
    );
  }

  return (
    <p
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className="whitespace-pre-wrap text-sm leading-relaxed"
    >
      {tokens.map((token, i) => {
        const covering = coverage.get(token.index) ?? [];
        const marks = marksByToken.get(token.index) ?? [];
        const isActive = token.index === activeToken;

        // Preserve the original spacing between tokens rather than assuming a
        // single space — line breaks inside a segment are subtitle breaks.
        const gap =
          i === 0
            ? ""
            : segment.text.slice(tokens[i - 1].charEnd, token.charStart) || " ";

        return (
          <span key={token.index}>
            {gap}
            <span
              data-token={token.index}
              onClick={
                covering.length > 0
                  ? (event) => {
                      event.stopPropagation();
                      onSpanClick(covering[covering.length - 1].id);
                    }
                  : undefined
              }
              style={{
                backgroundColor: washFor(covering),
                boxShadow: covering.length
                  ? covering
                      .map(
                        (span, depth) =>
                          `inset 0 -${2 + depth * 3}px 0 -${depth * 3}px ${tagColor(
                            span.kind as SpanKind
                          )}`
                      )
                      .join(", ")
                  : undefined,
              }}
              className={cn(
                "rounded-[3px] transition-colors",
                covering.length > 0 && "cursor-pointer",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {token.text}
            </span>
            {marks.length > 0 && (
              <sup
                title={marks.map((mark) => mark.type).join(", ")}
                className="ml-0.5 select-none text-[9px] text-[#5CE1E6]"
              >
                ●
              </sup>
            )}
          </span>
        );
      })}
    </p>
  );
}

export const TaggedSegmentText = memo(TaggedSegmentTextImpl);

import type { Segment } from "./types";

/**
 * Tokenization.
 *
 * Every span in the annotation schema is addressed by TOKEN index, not character
 * offset, and the ranges are **inclusive on both ends, zero-indexed** — a
 * single-token span has `startToken === endToken`. That convention is fixed by
 * `alva_schema_v2.json`; changing it silently misaligns every stored span, which
 * is exactly why the schema versions it per record.
 *
 * Indices are DOCUMENT-GLOBAL, running across segments in playback order, because
 * the schema defines them against `transcript_verbatim` — the whole clip's text,
 * not one segment's. `buildTokenIndex` is what maps between the two worlds.
 */

/** Matches `tokenization.convention_id` in the schema. */
export type TokenConvention = "whitespace_v1" | "whitespace_punct_split_v1";

/** Matches `tokenization.span_target`. */
export type SpanTarget = "transcript_verbatim" | "transcript_normalized";

export type Tokenization = {
  conventionId: TokenConvention;
  spanTarget: SpanTarget;
};

export const DEFAULT_TOKENIZATION: Tokenization = {
  conventionId: "whitespace_v1",
  spanTarget: "transcript_verbatim",
};

export type Token = {
  /** Document-global index. */
  index: number;
  text: string;
  segmentId: string;
  /** Character offset within the segment's own text. */
  charStart: number;
  charEnd: number;
};

/** Trailing punctuation split off as its own token under `whitespace_punct_split_v1`. */
const TRAILING_PUNCT = /^(.*?)([.,!?;:—…]+)$/u;

/**
 * Splits one segment's text into tokens.
 *
 * Newlines are subtitle line breaks, not token boundaries in their own right —
 * they are whitespace, and a token never spans one.
 */
export function tokenizeText(
  text: string,
  convention: TokenConvention = "whitespace_v1"
): { text: string; charStart: number; charEnd: number }[] {
  const out: { text: string; charStart: number; charEnd: number }[] = [];
  const pattern = /\S+/gu;

  let match = pattern.exec(text);
  while (match !== null) {
    const raw = match[0];
    const base = match.index;

    if (convention === "whitespace_punct_split_v1") {
      const split = TRAILING_PUNCT.exec(raw);
      if (split && split[1].length > 0) {
        out.push({
          text: split[1],
          charStart: base,
          charEnd: base + split[1].length,
        });
        out.push({
          text: split[2],
          charStart: base + split[1].length,
          charEnd: base + raw.length,
        });
        match = pattern.exec(text);
        continue;
      }
    }

    out.push({ text: raw, charStart: base, charEnd: base + raw.length });
    match = pattern.exec(text);
  }

  return out;
}

export type TokenIndex = {
  tokens: Token[];
  /** Document-global index of each segment's first token. */
  offsets: Map<string, number>;
  /** Token count per segment, so an empty segment is distinguishable from a missing one. */
  counts: Map<string, number>;
  convention: TokenConvention;
};

/**
 * Builds the document-global token map.
 *
 * Segments must already be in playback order — `transcript_verbatim` is their
 * concatenation, so a different order produces different indices for the same
 * words, and every stored span would point at the wrong place.
 */
export function buildTokenIndex(
  segments: Segment[],
  convention: TokenConvention = "whitespace_v1"
): TokenIndex {
  const tokens: Token[] = [];
  const offsets = new Map<string, number>();
  const counts = new Map<string, number>();

  for (const segment of segments) {
    offsets.set(segment.id, tokens.length);

    const parts = tokenizeText(segment.text, convention);
    for (const part of parts) {
      tokens.push({
        index: tokens.length,
        text: part.text,
        segmentId: segment.id,
        charStart: part.charStart,
        charEnd: part.charEnd,
      });
    }

    counts.set(segment.id, parts.length);
  }

  return { tokens, offsets, counts, convention };
}

/** The document-global token range a segment occupies, or null when it has none. */
export function segmentTokenRange(
  index: TokenIndex,
  segmentId: string
): { start: number; end: number } | null {
  const offset = index.offsets.get(segmentId);
  const count = index.counts.get(segmentId) ?? 0;
  if (offset === undefined || count === 0) return null;

  // Inclusive end, per the schema's range convention.
  return { start: offset, end: offset + count - 1 };
}

/** Tokens belonging to one segment, in order. */
export function tokensForSegment(index: TokenIndex, segmentId: string): Token[] {
  const range = segmentTokenRange(index, segmentId);
  if (!range) return [];
  return index.tokens.slice(range.start, range.end + 1);
}

/** True when two inclusive ranges share at least one token. */
export function rangesOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number }
): boolean {
  return a.start <= b.end && b.start <= a.end;
}

/** Reconstructs `transcript_verbatim` — the text every span index is defined against. */
export function transcriptVerbatim(segments: Segment[]): string {
  return segments
    .map((segment) => segment.text.replace(/\n/g, " ").trim())
    .filter(Boolean)
    .join(" ");
}

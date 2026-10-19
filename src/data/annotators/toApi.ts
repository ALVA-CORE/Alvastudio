import * as api from "@/lib/api/annotations";
import type {
  ApiAnnotationDocument,
  ApiAnnotationLanguage,
} from "@/lib/api/annotations";
import type { AnnotationSpan, Segment, TranscriptDoc } from "@/lib/annotation/types";

/**
 * Writing the workspace's document back.
 *
 * The API edits an annotation in pieces — a token splice, a segment at a time,
 * a document patch — and the workspace edits one object and asks to save it.
 * So this diffs what is on screen against what was last read from the server
 * and sends only what moved.
 *
 * **Tokenisation is whitespace**, confirmed by the API team: the server never
 * tokenises, and `tokenization_convention_id` is a provenance stamp that
 * nothing branches on. The reader joins a segment's tokens with a single
 * space, so splitting on whitespace round-trips exactly what was read.
 */

export type Baseline = {
  /** The document as last read, used as the diff base. */
  doc: TranscriptDoc;
  /** Server token list, so unchanged timings survive a splice. */
  tokens: { text: string; start_sec: number | null; end_sec: number | null }[];
  /** Token range per segment id, as the server had it. */
  ranges: Map<string, { start: number; end: number }>;
  /** The annotation's version. Moves on document, token, submit and review. */
  version: number;
  /**
   * Each segment's own version, which is separate.
   *
   * `PUT /segments/{id}` returns a `SegmentOut` that does not carry the
   * annotation's version, so there is nothing to chain from at that step — and
   * a token splice bumps every surviving segment's version, so these have to
   * be re-read from the document the splice returns.
   */
  segmentVersions: Map<string, number>;
};

export function baselineFrom(api: ApiAnnotationDocument, doc: TranscriptDoc): Baseline {
  return {
    doc,
    tokens: (api.tokens ?? []).map((token) => ({
      text: token.text,
      start_sec: token.start_sec,
      end_sec: token.end_sec,
    })),
    ranges: new Map(
      (api.segments ?? []).map((segment) => [
        segment.id,
        { start: segment.start_token, end: segment.end_token },
      ])
    ),
    version: api.version ?? 0,
    segmentVersions: new Map(
      (api.segments ?? []).map((segment) => [segment.id, segment.version])
    ),
  };
}

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean);

/**
 * The whole token array, rebuilt from the segments on screen.
 *
 * Only ever used to work out what changed — never sent whole. See
 * `narrowSplice` for why.
 */
function rebuildTokens(doc: TranscriptDoc, baseline: Baseline) {
  const ordered = [...doc.segments].sort((a, b) => a.start - b.start);
  const next: Baseline["tokens"] = [];

  for (const segment of ordered) {
    const was = baseline.ranges.get(segment.id);
    const previous = was
      ? baseline.tokens.slice(was.start, was.end + 1)
      : [];

    words(segment.text).forEach((text, index) => {
      const old = previous[index];
      next.push({
        text,
        /* Only keep the timing when the word itself is unchanged. A moved
         * word with an old timing is worse than no timing. */
        start_sec: old?.text === text ? old.start_sec : null,
        end_sec: old?.text === text ? old.end_sec : null,
      });
    });
  }

  return next;
}

/**
 * The smallest token range that actually changed.
 *
 * We used to send one splice covering the entire document, which looked safe
 * and was not: every existing index falls inside the replaced range, so the
 * server has nowhere to put the segments and spans that pointed at them. Every
 * segment collapses to cover the whole transcript and every tag lands on the
 * wrong words — with no error, which is the worst way for it to fail.
 *
 * So the splice is trimmed to the words that moved: skip the matching prefix,
 * skip the matching suffix, replace what is left. One edit to one word in a
 * long transcript becomes a one-token splice, and the ordering hazard that
 * made the whole-array version tempting never arises, because it is still one
 * splice per save.
 *
 * Returns null when nothing moved.
 */
function narrowSplice(
  before: Baseline["tokens"],
  after: Baseline["tokens"]
): { start_token: number; replace_count: number; tokens: Baseline["tokens"] } | null {
  let head = 0;
  const shortest = Math.min(before.length, after.length);
  while (head < shortest && before[head].text === after[head].text) head += 1;

  /* Stop the suffix scan at the prefix, so an insertion into a run of
   * identical words cannot produce overlapping ranges. */
  let tail = 0;
  while (
    tail < shortest - head &&
    before[before.length - 1 - tail].text === after[after.length - 1 - tail].text
  ) {
    tail += 1;
  }

  const replaceCount = before.length - head - tail;
  const inserted = after.slice(head, after.length - tail);

  if (replaceCount === 0 && inserted.length === 0) return null;

  return { start_token: head, replace_count: replaceCount, tokens: inserted };
}

/** Where each segment lands in the rebuilt array. Inclusive, as the API is. */
function rangesFor(doc: TranscriptDoc) {
  const ordered = [...doc.segments].sort((a, b) => a.start - b.start);
  const ranges = new Map<string, { start: number; end: number }>();

  let cursor = 0;
  for (const segment of ordered) {
    const length = words(segment.text).length;
    ranges.set(segment.id, {
      start: cursor,
      end: Math.max(cursor, cursor + length - 1),
    });
    cursor += length;
  }

  return ranges;
}

/** Our one flat span array, split back into the four the API keeps. */
function spansForSegment(
  spans: AnnotationSpan[],
  nonSpeech: TranscriptDoc["nonSpeech"],
  range: { start: number; end: number }
) {
  const inside = (from: number, to: number) =>
    from >= range.start && to <= range.end;

  return {
    language_spans: spans
      .filter((span) => span.kind === "language" && inside(span.startToken, span.endToken))
      .map((span) => ({
        start_token: span.startToken,
        end_token: span.endToken,
        /* The workspace's tag vocabulary is the API's, so a value that got
           this far is already a member of the enum. */
        language: span.value as ApiAnnotationLanguage,
        span_source: span.spanSource ?? "annotator_added",
      })),
    disfluencies: spans
      .filter((span) => span.kind === "disfluency" && inside(span.startToken, span.endToken))
      .map((span) => ({
        start_token: span.startToken,
        end_token: span.endToken,
        type: span.value,
      })),
    untranscribable_spans: spans
      .filter(
        (span) => span.kind === "untranscribable" && inside(span.startToken, span.endToken)
      )
      .map((span) => ({
        start_token: span.startToken,
        end_token: span.endToken,
        reason: span.value,
      })),
    non_speech_events: nonSpeech
      .filter((mark) => mark.atToken >= range.start && mark.atToken <= range.end)
      .map((mark) => ({ type: mark.type, at_token: mark.atToken })),
  };
}

function sameSegment(a: Segment, b: Segment | undefined) {
  return (
    b !== undefined &&
    a.text === b.text &&
    a.speakerId === b.speakerId &&
    a.start === b.start &&
    a.end === b.end
  );
}

/**
 * Saves the document, and returns the new baseline.
 *
 * Order is deliberate: tokens first, because every segment range is expressed
 * against them, then segments, then the document-level flags. Doing it the
 * other way round would send segment ranges that point into the old array.
 */
export async function saveAnnotation(
  annotationId: string,
  doc: TranscriptDoc,
  baseline: Baseline
): Promise<Baseline> {
  const tokens = rebuildTokens(doc, baseline);
  const ranges = rangesFor(doc);

  const splice = narrowSplice(baseline.tokens, tokens);
  const tokensChanged = splice !== null;

  let version = baseline.version;
  /* Segment versions are their own, and a splice bumps every surviving one.
   * Holding the versions we read at load would 409 on the next segment save,
   * so after a splice they come from the document the splice returned. */
  let segmentVersions = baseline.segmentVersions;

  if (splice) {
    const result = await api.spliceTokens(annotationId, {
      ...splice,
      expected_version: version,
    });
    version = result.version ?? version;
    segmentVersions = new Map(
      (result.segments ?? []).map((segment) => [segment.id, segment.version])
    );
  }

  const previous = new Map(baseline.doc.segments.map((segment) => [segment.id, segment]));

  for (const segment of doc.segments) {
    const range = ranges.get(segment.id);
    if (!range) continue;

    const body = {
      participant_id: segment.speakerId || null,
      start_token: range.start,
      end_token: range.end,
      ...spansForSegment(doc.spans, doc.nonSpeech, range),
    };

    if (!previous.has(segment.id)) {
      await api.createSegment(annotationId, body);
      continue;
    }

    /* Tokens moving changes every range, so a splice forces a write on every
     * segment even where the annotator touched none of them. */
    if (tokensChanged || !sameSegment(segment, previous.get(segment.id))) {
      const saved = await api.updateSegment(annotationId, segment.id, {
        ...body,
        expected_version: segmentVersions.get(segment.id),
      });
      /* Its own version, not the annotation's. Keeping it means a second save
       * in the same session does not 409 against a stale one. */
      if (saved.version != null) {
        segmentVersions = new Map(segmentVersions).set(segment.id, saved.version);
      }
    }
  }

  const live = new Set(doc.segments.map((segment) => segment.id));
  for (const segment of baseline.doc.segments) {
    if (!live.has(segment.id)) {
      await api.deleteSegment(annotationId, segment.id);
    }
  }

  const flagsChanged =
    doc.speechPresent !== baseline.doc.speechPresent ||
    doc.difficultyFlags.join("|") !== baseline.doc.difficultyFlags.join("|");

  if (flagsChanged) {
    const result = await api.updateAnnotation(annotationId, {
      difficulty_flags: doc.difficultyFlags,
      speech_present: doc.speechPresent,
      expected_version: version,
    });
    version = result.version ?? version;
  }

  return { doc, tokens, ranges, version, segmentVersions };
}

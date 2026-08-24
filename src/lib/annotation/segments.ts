import {
  MAX_CHARS_PER_LINE,
  MAX_CHARS_PER_SECOND,
  MAX_SEGMENT_DURATION,
  MAX_LINES_PER_SEGMENT,
  MIN_SEGMENT_DURATION,
  MIN_SEGMENT_GAP,
  type Segment,
  type SegmentId,
  type SpeakerId,
  type SegmentIssue,
  type SegmentValidation,
  type ValidationLevel,
} from "./types";

/**
 * Pure segment arithmetic. Nothing in this file touches React, the store, or the
 * DOM — it is all input → output, which is why it carries the bulk of the test
 * suite. Every timing mutation in the workspace routes through `retimeSegment` so
 * the invariants (ordering, minimum gap, minimum duration, bounds) hold in
 * exactly one place.
 */

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

/**
 * Segment timecode, `ss.cc` under a minute and `m:ss.cc` beyond it. Matches the
 * two-decimal precision annotators need to trim a region against a plosive.
 */
export function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00.00";

  const totalCentis = Math.round(seconds * 100);
  const mins = Math.floor(totalCentis / 6000);
  const secs = Math.floor((totalCentis % 6000) / 100);
  const centis = totalCentis % 100;

  const tail = `${String(secs).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
  return mins > 0 ? `${mins}:${tail}` : tail;
}

/** Ruler / duration clock, `m:ss`. Hours roll into minutes deliberately. */
export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Long-form duration for metadata panels, e.g. "32m 14s". */
export function formatDurationLong(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

/* ------------------------------------------------------------------ *
 * Measurement
 * ------------------------------------------------------------------ */

/** Segment text split into display lines. A segment with no text has zero lines. */
export function segmentLines(text: string): string[] {
  if (text === "") return [];
  return text.split("\n");
}

export function segmentDuration(segment: Pick<Segment, "start" | "end">): number {
  return Math.max(0, segment.end - segment.start);
}

/** Reading speed. Zero-duration segments report Infinity rather than dividing by 0. */
export function charsPerSecond(segment: Pick<Segment, "start" | "end" | "text">): number {
  const duration = segmentDuration(segment);
  const chars = segment.text.replace(/\n/g, " ").trim().length;
  if (chars === 0) return 0;
  if (duration <= 0) return Number.POSITIVE_INFINITY;
  return chars / duration;
}

const LEVEL_RANK: Record<ValidationLevel, number> = { ok: 0, warning: 1, error: 2 };

function worstLevel(issues: SegmentIssue[]): ValidationLevel {
  return issues.reduce<ValidationLevel>(
    (worst, issue) => (LEVEL_RANK[issue.level] > LEVEL_RANK[worst] ? issue.level : worst),
    "ok"
  );
}

/**
 * Runs every conformance check against one segment.
 *
 * Line and duration violations are errors because they break downstream
 * rendering contracts. Reading speed is a warning — it is a comprehension
 * guideline, and a fast-but-accurate transcript is still usable data.
 */
export function validateSegment(segment: Segment): SegmentValidation {
  const lines = segmentLines(segment.text).map((text) => ({
    text,
    length: text.length,
    overflow: text.length > MAX_CHARS_PER_LINE,
  }));

  const longestLine = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const duration = segmentDuration(segment);
  const cps = charsPerSecond(segment);
  const issues: SegmentIssue[] = [];

  if (segment.text.trim() === "") {
    issues.push({
      code: "empty",
      level: "warning",
      message: "Segment has no text",
    });
  }

  const overflowing = lines.filter((line) => line.overflow).length;
  if (overflowing > 0) {
    issues.push({
      code: "line-too-long",
      level: "error",
      message:
        overflowing === 1
          ? `One line exceeds ${MAX_CHARS_PER_LINE} characters`
          : `${overflowing} lines exceed ${MAX_CHARS_PER_LINE} characters`,
    });
  }

  if (lines.length > MAX_LINES_PER_SEGMENT) {
    issues.push({
      code: "too-many-lines",
      level: "error",
      message: `Segment has ${lines.length} lines, maximum is ${MAX_LINES_PER_SEGMENT}`,
    });
  }

  if (cps > MAX_CHARS_PER_SECOND) {
    issues.push({
      code: "reading-speed",
      level: "warning",
      message: `Reading speed ${cps === Number.POSITIVE_INFINITY ? "∞" : cps.toFixed(1)} cps exceeds ${MAX_CHARS_PER_SECOND}`,
    });
  }

  if (duration > 0 && duration < MIN_SEGMENT_DURATION) {
    issues.push({
      code: "too-short",
      level: "error",
      message: `Segment is shorter than ${MIN_SEGMENT_DURATION.toFixed(2)}s`,
    });
  }

  if (duration > MAX_SEGMENT_DURATION) {
    issues.push({
      code: "too-long",
      level: "warning",
      message: `Segment is longer than ${MAX_SEGMENT_DURATION}s`,
    });
  }

  return {
    level: worstLevel(issues),
    lines,
    longestLine,
    charsPerSecond: cps,
    duration,
    issues,
  };
}

/* ------------------------------------------------------------------ *
 * Ordering and lookup
 * ------------------------------------------------------------------ */

/** Chronological sort. Stable on ties via `end`, then id, so it is total. */
export function sortSegments(segments: Segment[]): Segment[] {
  return [...segments].sort(
    (a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id)
  );
}

/**
 * Index of the segment covering `time`, or -1 when the playhead sits in a gap.
 * Binary search — this runs on every timeupdate (~60/s) against transcripts
 * that reach four figures of segments on a long session.
 *
 * Assumes `segments` is sorted and non-overlapping, which `retimeSegment` guarantees.
 */
export function findActiveSegmentIndex(segments: Segment[], time: number): number {
  return findActiveSegmentIndexForSpeaker(segments, time, null);
}

/**
 * Index of the segment covering `time`, optionally restricted to one speaker.
 *
 * Segments may overlap ACROSS speakers — two people talking at once is normal in
 * a focus group — so a plain binary search is no longer sufficient: the match
 * may sit before the first segment whose `start` exceeds `time`.
 *
 * The list is still sorted by `start`, so binary search finds the insertion
 * point in O(log n), then we walk backwards. The walk is bounded in practice by
 * how many voices overlap at one instant, not by the size of the transcript.
 * `MAX_OVERLAP_SCAN` caps the pathological case.
 */
export function findActiveSegmentIndexForSpeaker(
  segments: Segment[],
  time: number,
  speakerId: SpeakerId | null
): number {
  let low = 0;
  let high = segments.length - 1;
  let firstAfter = segments.length;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (segments[mid].start > time) {
      firstAfter = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  const floor = Math.max(0, firstAfter - MAX_OVERLAP_SCAN);
  for (let i = firstAfter - 1; i >= floor; i -= 1) {
    const segment = segments[i];
    if (speakerId !== null && segment.speakerId !== speakerId) continue;
    if (time >= segment.start && time < segment.end) return i;
  }

  return -1;
}

/** Index of the segment at or after `time` — used to resume follow after a seek. */
export function findNextSegmentIndex(segments: Segment[], time: number): number {
  let low = 0;
  let high = segments.length - 1;
  let found = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (segments[mid].start >= time) {
      found = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return found;
}

/** Bound on the backward walk in `findActiveSegmentIndexForSpeaker`. */
const MAX_OVERLAP_SCAN = 64;

/** Nearest segment on the same speaker's row, scanning `direction` from `index`. */
function findRowNeighbour(
  sorted: Segment[],
  index: number,
  speakerId: SpeakerId,
  direction: 1 | -1
): Segment | undefined {
  for (let i = index + direction; i >= 0 && i < sorted.length; i += direction) {
    if (sorted[i].speakerId === speakerId) return sorted[i];
  }
  return undefined;
}

/** True when `candidate` would collide with another segment on the same row. */
export function overlapsRow(
  segments: Segment[],
  speakerId: SpeakerId,
  range: { start: number; end: number },
  ignoreId?: SegmentId
): boolean {
  return segments.some(
    (segment) =>
      segment.speakerId === speakerId &&
      segment.id !== ignoreId &&
      range.start < segment.end &&
      range.end > segment.start
  );
}

/* ------------------------------------------------------------------ *
 * Mutation — all timing edits funnel through here
 * ------------------------------------------------------------------ */

export type RetimeOptions = {
  /** Total audio length; timings clamp inside it. */
  duration: number;
  /**
   * When true, neighbours are pushed aside instead of acting as walls. Used by
   * keyboard nudges; region drags clamp instead, so a drag can never silently
   * destroy an adjacent segment.
   */
  ripple?: boolean;
};

/**
 * Moves one segment's boundaries, preserving every timing invariant.
 *
 * Clamping order matters: bounds first, then neighbours, then minimum duration
 * last — so a segment squeezed against a neighbour keeps its floor rather than
 * collapsing to zero width.
 */
export function retimeSegment(
  segments: Segment[],
  id: SegmentId,
  next: { start: number; end: number },
  { duration, ripple = false }: RetimeOptions
): Segment[] {
  const sorted = sortSegments(segments);
  const index = sorted.findIndex((segment) => segment.id === id);
  if (index === -1) return segments;

  const subject = sorted[index];

  /* Neighbours are the segments on the SAME speaker's row, not the globally
   * adjacent ones. Two speakers talking over each other is ordinary in a focus
   * group, so overlap is only forbidden within a single voice — one person
   * cannot say two things at once. */
  const prev = findRowNeighbour(sorted, index, subject.speakerId, -1);
  const following = findRowNeighbour(sorted, index, subject.speakerId, 1);

  let start = Math.max(0, Math.min(next.start, duration));
  let end = Math.max(0, Math.min(next.end, duration));

  if (end < start) [start, end] = [end, start];

  if (!ripple) {
    if (prev) start = Math.max(start, prev.end + MIN_SEGMENT_GAP);
    if (following) end = Math.min(end, following.start - MIN_SEGMENT_GAP);
  }

  // Floor the duration without escaping the clamps applied above.
  if (end - start < MIN_SEGMENT_DURATION) {
    const ceiling = following && !ripple ? following.start - MIN_SEGMENT_GAP : duration;
    const floor = prev && !ripple ? prev.end + MIN_SEGMENT_GAP : 0;

    if (start + MIN_SEGMENT_DURATION <= ceiling) {
      end = start + MIN_SEGMENT_DURATION;
    } else if (end - MIN_SEGMENT_DURATION >= floor) {
      start = end - MIN_SEGMENT_DURATION;
    } else {
      // No room between neighbours — take everything available.
      start = floor;
      end = ceiling;
    }
  }

  const updated = sorted.map((segment) =>
    segment.id === id ? { ...segment, start, end } : segment
  );

  /* ALWAYS re-sort. Ordering used to be preserved for free: segments could not
   * overlap, so a clamped retime could never cross a neighbour. Now that rows
   * overlap independently, a segment on one row can move past a segment on
   * another, and `findActiveSegmentIndex`'s binary search silently returns the
   * wrong answer on an unsorted list. */
  return sortSegments(updated);
}

let segmentIdCounter = 0;

/** Monotonic, collision-free within a document. */
export function createSegmentId(prefix = "segment"): SegmentId {
  segmentIdCounter += 1;
  return `${prefix}-${segmentIdCounter.toString(36)}`;
}

/** Test seam — resets the id counter so snapshots stay stable. */
export function __resetSegmentIdCounter() {
  segmentIdCounter = 0;
}

/**
 * Splits a segment at `time`, apportioning text at the nearest word boundary to the
 * split's position through the segment. Returns the original untouched when the
 * split point would leave either half below the minimum duration.
 */
export function splitSegmentAt(segment: Segment, time: number): [Segment, Segment] | null {
  if (time <= segment.start || time >= segment.end) return null;
  if (time - segment.start < MIN_SEGMENT_DURATION) return null;
  if (segment.end - time < MIN_SEGMENT_DURATION) return null;

  const ratio = (time - segment.start) / segmentDuration(segment);
  const flat = segment.text.replace(/\n/g, " ");
  const target = Math.round(flat.length * ratio);

  // Nearest space to the proportional point, so words survive the cut.
  let splitAt = flat.length;
  if (flat.trim() !== "") {
    let best = -1;
    for (let i = 0; i < flat.length; i += 1) {
      if (flat[i] !== " ") continue;
      if (best === -1 || Math.abs(i - target) < Math.abs(best - target)) best = i;
    }
    splitAt = best === -1 ? target : best;
  }

  return [
    { ...segment, end: time, text: flat.slice(0, splitAt).trim() },
    {
      ...segment,
      id: createSegmentId(),
      start: time,
      text: flat.slice(splitAt).trim(),
    },
  ];
}

/**
 * Merges `b` into `a`. Text joins with a space; the surviving segment keeps `a`'s
 * id and speaker so selection and speaker assignment do not jump.
 */
export function mergeSegments(a: Segment, b: Segment): Segment {
  const [first, second] = a.start <= b.start ? [a, b] : [b, a];
  const text = [first.text.trim(), second.text.trim()].filter(Boolean).join(" ");

  return {
    ...a,
    start: Math.min(first.start, second.start),
    end: Math.max(first.end, second.end),
    text,
  };
}

/** Total speaking time per speaker, for the diarization rail. */
export function speakingTimeBySpeaker(segments: Segment[]): Record<string, number> {
  return segments.reduce<Record<string, number>>((totals, segment) => {
    totals[segment.speakerId] = (totals[segment.speakerId] ?? 0) + segmentDuration(segment);
    return totals;
  }, {});
}

/** Document-wide conformance roll-up for the header badge. */
export function documentIssueCount(segments: Segment[]): { errors: number; warnings: number } {
  return segments.reduce(
    (totals, segment) => {
      const { level } = validateSegment(segment);
      if (level === "error") totals.errors += 1;
      else if (level === "warning") totals.warnings += 1;
      return totals;
    },
    { errors: 0, warnings: 0 }
  );
}

/* ------------------------------------------------------------------ *
 * Word timing
 * ------------------------------------------------------------------ */

export type TimedWord = {
  text: string;
  start: number;
  end: number;
  /** Which display line the word belongs to. */
  line: number;
};

/**
 * Distributes a segment's duration across its words.
 *
 * ASR gives real per-word timestamps; this approximates them by weighting each
 * word by its character length, which tracks speech duration closely enough for
 * a read-along highlight to feel locked to the audio. Whitespace is folded into
 * the preceding word so the timeline has no gaps.
 *
 * REPLACE WITH: the ASR's word array. The shape below is what the highlight
 * consumes — nothing in the component changes.
 */
export function segmentWords(segment: Segment): TimedWord[] {
  const lines = segmentLines(segment.text);
  if (lines.length === 0) return [];

  const tokens: { text: string; line: number; weight: number }[] = [];

  lines.forEach((lineText, lineIndex) => {
    for (const word of lineText.split(/(\s+)/)) {
      if (word === "") continue;
      tokens.push({
        text: word,
        line: lineIndex,
        // Whitespace carries no duration of its own.
        weight: word.trim() === "" ? 0 : word.trim().length,
      });
    }
  });

  const total = tokens.reduce((sum, token) => sum + token.weight, 0);
  const duration = segmentDuration(segment);

  if (total === 0 || duration <= 0) {
    return tokens.map((token) => ({
      text: token.text,
      line: token.line,
      start: segment.start,
      end: segment.end,
    }));
  }

  let elapsed = segment.start;

  return tokens.map((token) => {
    const start = elapsed;
    elapsed += (token.weight / total) * duration;
    return { text: token.text, line: token.line, start, end: elapsed };
  });
}

/** Index of the word under `time`, or -1. Linear — a segment has ~12 words. */
export function findActiveWordIndex(words: TimedWord[], time: number): number {
  for (let i = words.length - 1; i >= 0; i -= 1) {
    if (time >= words[i].start && time < words[i].end) return i;
  }
  return -1;
}

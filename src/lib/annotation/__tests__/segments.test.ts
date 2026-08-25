import { beforeEach, describe, expect, it } from "vitest";

import {
  __resetSegmentIdCounter,
  charsPerSecond,
  createSegmentId,
  segmentDuration,
  segmentLines,
  documentIssueCount,
  findActiveSegmentIndex,
  findNextSegmentIndex,
  formatClock,
  formatDurationLong,
  formatRulerTime,
  formatTimecode,
  mergeSegments,
  retimeSegment,
  sortSegments,
  speakingTimeBySpeaker,
  splitSegmentAt,
  validateSegment,
  segmentWords,
  findActiveWordIndex,
} from "../segments";
import {
  MAX_CHARS_PER_LINE,
  MAX_CHARS_PER_SECOND,
  MAX_SEGMENT_DURATION,
  MIN_SEGMENT_DURATION,
  MIN_SEGMENT_GAP,
  type Segment,
  type SegmentIssueCode,
} from "../types";

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

function segment(partial: Partial<Segment> & Pick<Segment, "id" | "start" | "end">): Segment {
  return { speakerId: "spk-0", text: "", ...partial };
}

/** Issue codes only — messages are copy and would make these tests brittle. */
function codes(target: Segment): SegmentIssueCode[] {
  return validateSegment(target).issues.map((issue) => issue.code);
}

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

describe("formatTimecode", () => {
  it("renders ss.cc under a minute", () => {
    expect(formatTimecode(4.9)).toBe("04.90");
    expect(formatTimecode(0)).toBe("00.00");
    expect(formatTimecode(12.34)).toBe("12.34");
    expect(formatTimecode(59.994)).toBe("59.99");
  });

  it("renders m:ss.cc from a minute up", () => {
    expect(formatTimecode(184.9)).toBe("3:04.90");
    expect(formatTimecode(60)).toBe("1:00.00");
    expect(formatTimecode(3600)).toBe("60:00.00");
  });

  it("carries a centisecond rounding overflow into the next second", () => {
    // The naive implementation renders "60.00" here; the seconds field must
    // never reach 60.
    expect(formatTimecode(59.999)).toBe("1:00.00");
    expect(formatTimecode(599.996)).toBe("10:00.00");
    expect(formatTimecode(0.999)).toBe("01.00");
  });

  it("guards against negatives and non-finite input", () => {
    expect(formatTimecode(-1)).toBe("00.00");
    expect(formatTimecode(-0.5)).toBe("00.00");
    expect(formatTimecode(Number.NaN)).toBe("00.00");
    expect(formatTimecode(Number.POSITIVE_INFINITY)).toBe("00.00");
    expect(formatTimecode(Number.NEGATIVE_INFINITY)).toBe("00.00");
  });
});

describe("formatClock", () => {
  it("truncates rather than rounds, so the clock never runs ahead of the audio", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(0.99)).toBe("0:00");
    expect(formatClock(59.9)).toBe("0:59");
    expect(formatClock(60)).toBe("1:00");
    expect(formatClock(61)).toBe("1:01");
  });

  it("rolls hours into minutes", () => {
    expect(formatClock(3600)).toBe("60:00");
    expect(formatClock(3661)).toBe("61:01");
  });

  it("guards against negatives and non-finite input", () => {
    expect(formatClock(-4)).toBe("0:00");
    expect(formatClock(Number.NaN)).toBe("0:00");
    expect(formatClock(Number.POSITIVE_INFINITY)).toBe("0:00");
  });
});

describe("formatDurationLong", () => {
  it("drops the empty unit at each boundary", () => {
    expect(formatDurationLong(0)).toBe("0s");
    expect(formatDurationLong(1)).toBe("1s");
    expect(formatDurationLong(59)).toBe("59s");
    expect(formatDurationLong(60)).toBe("1m");
    expect(formatDurationLong(120)).toBe("2m");
    expect(formatDurationLong(74)).toBe("1m 14s");
    expect(formatDurationLong(1934)).toBe("32m 14s");
  });

  it("rounds to the nearest second before splitting units", () => {
    expect(formatDurationLong(59.6)).toBe("1m");
    expect(formatDurationLong(59.4)).toBe("59s");
    expect(formatDurationLong(0.4)).toBe("0s");
  });

  it("guards against negatives and non-finite input", () => {
    expect(formatDurationLong(-10)).toBe("0s");
    expect(formatDurationLong(Number.NaN)).toBe("0s");
    expect(formatDurationLong(Number.POSITIVE_INFINITY)).toBe("0s");
  });
});

/* ------------------------------------------------------------------ *
 * Measurement
 * ------------------------------------------------------------------ */

describe("segmentLines", () => {
  it("treats no text as no lines, not one empty line", () => {
    // This is what keeps an empty segment's counter reading 0 rather than 1.
    expect(segmentLines("")).toEqual([]);
  });

  it("splits on newlines", () => {
    expect(segmentLines("one line")).toEqual(["one line"]);
    expect(segmentLines("first\nsecond")).toEqual(["first", "second"]);
    expect(segmentLines("a\nb\nc")).toEqual(["a", "b", "c"]);
    expect(segmentLines("\n")).toEqual(["", ""]);
  });
});

describe("segmentDuration", () => {
  it("measures the span and floors inverted segments at zero", () => {
    expect(segmentDuration({ start: 1, end: 3.5 })).toBe(2.5);
    expect(segmentDuration({ start: 3, end: 1 })).toBe(0);
    expect(segmentDuration({ start: 2, end: 2 })).toBe(0);
  });
});

describe("charsPerSecond", () => {
  it("counts flattened, trimmed characters over the span", () => {
    expect(charsPerSecond({ start: 0, end: 2, text: "abcdefghij" })).toBe(5);
    expect(charsPerSecond({ start: 0, end: 1, text: "ab\ncd" })).toBe(5);
    expect(charsPerSecond({ start: 0, end: 1, text: "  ab  " })).toBe(2);
  });

  it("reports 0 for text-free segments rather than dividing", () => {
    expect(charsPerSecond({ start: 0, end: 2, text: "" })).toBe(0);
    expect(charsPerSecond({ start: 0, end: 2, text: "   " })).toBe(0);
    // Empty text wins over zero duration — no segment is "infinitely fast" at
    // reading nothing.
    expect(charsPerSecond({ start: 1, end: 1, text: "" })).toBe(0);
  });

  it("reports Infinity for text in zero (or inverted) duration", () => {
    expect(charsPerSecond({ start: 1, end: 1, text: "hi" })).toBe(Number.POSITIVE_INFINITY);
    expect(charsPerSecond({ start: 3, end: 1, text: "hi" })).toBe(Number.POSITIVE_INFINITY);
  });
});

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

describe("validateSegment", () => {
  it("passes a conformant segment with no issues", () => {
    const result = validateSegment(
      segment({ id: "c1", start: 0, end: 2, text: "Good morning everyone." })
    );

    expect(result.level).toBe("ok");
    expect(result.issues).toEqual([]);
    expect(result.longestLine).toBe(22);
    expect(result.duration).toBe(2);
    expect(result.charsPerSecond).toBe(11);
    expect(result.lines).toEqual([
      { text: "Good morning everyone.", length: 22, overflow: false },
    ]);
  });

  it("accepts a line of exactly MAX_CHARS_PER_LINE", () => {
    const text = "x".repeat(MAX_CHARS_PER_LINE);
    const result = validateSegment(segment({ id: "c1", start: 0, end: 3, text }));

    expect(result.lines[0].overflow).toBe(false);
    expect(codes(segment({ id: "c1", start: 0, end: 3, text }))).not.toContain("line-too-long");
  });

  it("flags a line one character over the limit as an error", () => {
    const target = segment({
      id: "c1",
      start: 0,
      end: 3,
      text: "x".repeat(MAX_CHARS_PER_LINE + 1),
    });
    const result = validateSegment(target);

    expect(codes(target)).toEqual(["line-too-long"]);
    expect(result.level).toBe("error");
    expect(result.longestLine).toBe(43);
    expect(result.lines[0].overflow).toBe(true);
  });

  it("counts every overflowing line", () => {
    const long = "x".repeat(MAX_CHARS_PER_LINE + 1);
    const result = validateSegment(segment({ id: "c1", start: 0, end: 6, text: `${long}\n${long}` }));
    const issue = result.issues.find((i) => i.code === "line-too-long");

    expect(issue?.message).toContain("2 lines");
  });

  it("flags more than MAX_LINES_PER_SEGMENT as an error", () => {
    const target = segment({ id: "c1", start: 0, end: 2, text: "one\ntwo\nthree" });

    expect(codes(target)).toEqual(["too-many-lines"]);
    expect(validateSegment(target).level).toBe("error");
    // Two lines is the ceiling, not a violation.
    expect(codes(segment({ id: "c2", start: 0, end: 2, text: "one\ntwo" }))).toEqual([]);
  });

  it("flags excessive reading speed as a warning, not an error", () => {
    const target = segment({ id: "c1", start: 0, end: 1, text: "a".repeat(40) });
    const result = validateSegment(target);

    expect(codes(target)).toEqual(["reading-speed"]);
    expect(result.level).toBe("warning");
    expect(result.charsPerSecond).toBe(40);
    // Exactly at the ceiling is fine — the check is strictly greater-than.
    expect(
      codes(segment({ id: "c2", start: 0, end: 1, text: "a".repeat(MAX_CHARS_PER_SECOND) }))
    ).toEqual([]);
  });

  it("flags a segment under MIN_SEGMENT_DURATION as an error", () => {
    const target = segment({ id: "c1", start: 0, end: 0.5, text: "Hi" });

    expect(codes(target)).toEqual(["too-short"]);
    expect(validateSegment(target).level).toBe("error");
    // Exactly at the floor is conformant.
    expect(codes(segment({ id: "c2", start: 0, end: MIN_SEGMENT_DURATION, text: "Hi" }))).toEqual([]);
  });

  it("does not report a zero-duration segment as too-short", () => {
    // Zero duration is caught by reading-speed instead; double-reporting the
    // same defect would double-count it in the document roll-up.
    const target = segment({ id: "c1", start: 4, end: 4, text: "Hi" });

    expect(codes(target)).toEqual(["reading-speed"]);
    expect(validateSegment(target).issues[0].message).toContain("∞");
  });

  it("flags a segment over MAX_SEGMENT_DURATION as a warning", () => {
    const target = segment({ id: "c1", start: 0, end: 8, text: "Hello" });

    expect(codes(target)).toEqual(["too-long"]);
    expect(validateSegment(target).level).toBe("warning");
    expect(codes(segment({ id: "c2", start: 0, end: MAX_SEGMENT_DURATION, text: "Hello" }))).toEqual([]);
  });

  it("flags empty and whitespace-only text as a warning", () => {
    const empty = segment({ id: "c1", start: 0, end: 2, text: "" });
    const blank = segment({ id: "c2", start: 0, end: 2, text: "   " });

    expect(codes(empty)).toEqual(["empty"]);
    expect(validateSegment(empty).level).toBe("warning");
    expect(validateSegment(empty).lines).toEqual([]);
    expect(validateSegment(empty).longestLine).toBe(0);
    expect(codes(blank)).toEqual(["empty"]);
  });

  it("reports the worst level when a segment has both a warning and an error", () => {
    // 43-char line (error) inside a 9s segment (warning).
    const target = segment({
      id: "c1",
      start: 0,
      end: 9,
      text: "x".repeat(MAX_CHARS_PER_LINE + 1),
    });
    const result = validateSegment(target);

    expect(codes(target).sort()).toEqual(["line-too-long", "too-long"]);
    expect(result.level).toBe("error");
  });

  it("accumulates every violation a single segment commits", () => {
    const long = "x".repeat(MAX_CHARS_PER_LINE + 1);
    const target = segment({ id: "c1", start: 0, end: 0.5, text: `${long}\n${long}\n${long}` });

    expect(codes(target).sort()).toEqual([
      "line-too-long",
      "reading-speed",
      "too-many-lines",
      "too-short",
    ]);
    expect(validateSegment(target).level).toBe("error");
  });
});

/* ------------------------------------------------------------------ *
 * Ordering and lookup
 * ------------------------------------------------------------------ */

describe("sortSegments", () => {
  it("orders by start, then end, then id — a total order", () => {
    const segments = [
      segment({ id: "b", start: 1, end: 3 }),
      segment({ id: "a", start: 1, end: 3 }),
      segment({ id: "c", start: 1, end: 2 }),
      segment({ id: "d", start: 0, end: 9 }),
    ];

    expect(sortSegments(segments).map((c) => c.id)).toEqual(["d", "c", "a", "b"]);
  });

  it("does not mutate its input", () => {
    const segments = [segment({ id: "b", start: 5, end: 6 }), segment({ id: "a", start: 1, end: 2 })];
    const sorted = sortSegments(segments);

    expect(segments.map((c) => c.id)).toEqual(["b", "a"]);
    expect(sorted).not.toBe(segments);
  });
});

describe("findActiveSegmentIndex", () => {
  const segments = [
    segment({ id: "c0", start: 0, end: 2 }),
    segment({ id: "c1", start: 3, end: 5 }),
    segment({ id: "c2", start: 8, end: 11 }),
  ];

  it("treats start as inclusive and end as exclusive", () => {
    // A segment boundary belongs to exactly one segment, so back-to-back segments never
    // both light up on the same frame.
    expect(findActiveSegmentIndex(segments, 3)).toBe(1);
    expect(findActiveSegmentIndex(segments, 4.999)).toBe(1);
    expect(findActiveSegmentIndex(segments, 5)).toBe(-1);
  });

  it("returns -1 in a gap, before the first segment and past the last", () => {
    expect(findActiveSegmentIndex(segments, 2.5)).toBe(-1);
    expect(findActiveSegmentIndex(segments, 6)).toBe(-1);
    expect(findActiveSegmentIndex(segments, 11)).toBe(-1);
    expect(findActiveSegmentIndex(segments, 900)).toBe(-1);
  });

  it("returns -1 for an empty document", () => {
    expect(findActiveSegmentIndex([], 0)).toBe(-1);
  });

  it("agrees with a linear scan across a 200-segment document", () => {
    const many: Segment[] = Array.from({ length: 200 }, (_, i) => {
      // Deterministic, sorted, non-overlapping, with irregular gaps and
      // irregular durations so the search cannot pass by accident.
      const start = i * 2.5 + (i % 5) * 0.1;
      return segment({ id: `c${i}`, start, end: start + 1.2 + (i % 3) * 0.3 });
    });

    const linear = (time: number) =>
      many.findIndex((c) => time >= c.start && time < c.end);

    for (let t = -1; t <= 520; t += 0.13) {
      expect(findActiveSegmentIndex(many, t)).toBe(linear(t));
    }

    // Exact boundaries are where an off-by-one hides.
    for (const c of many) {
      expect(findActiveSegmentIndex(many, c.start)).toBe(linear(c.start));
      expect(findActiveSegmentIndex(many, c.end)).toBe(linear(c.end));
    }
  });
});

describe("findNextSegmentIndex", () => {
  const segments = [
    segment({ id: "c0", start: 0, end: 2 }),
    segment({ id: "c1", start: 3, end: 5 }),
    segment({ id: "c2", start: 8, end: 11 }),
  ];

  it("returns the first segment starting at or after the time", () => {
    expect(findNextSegmentIndex(segments, -5)).toBe(0);
    expect(findNextSegmentIndex(segments, 0)).toBe(0);
    expect(findNextSegmentIndex(segments, 2.5)).toBe(1);
    expect(findNextSegmentIndex(segments, 3)).toBe(1);
    expect(findNextSegmentIndex(segments, 3.1)).toBe(2);
  });

  it("returns -1 past the last segment's start", () => {
    expect(findNextSegmentIndex(segments, 8.1)).toBe(-1);
    expect(findNextSegmentIndex(segments, 11)).toBe(-1);
    expect(findNextSegmentIndex([], 0)).toBe(-1);
  });
});

/* ------------------------------------------------------------------ *
 * Retiming
 * ------------------------------------------------------------------ */

describe("retimeSegment", () => {
  const solo = [segment({ id: "a", start: 2, end: 4 })];
  const trio = [
    segment({ id: "a", start: 0, end: 2 }),
    segment({ id: "b", start: 3, end: 5 }),
    segment({ id: "c", start: 6, end: 8 }),
  ];

  const find = (segments: Segment[], id: string) => segments.find((c) => c.id === id)!;

  it("clamps to [0, duration]", () => {
    const [only] = retimeSegment(solo, "a", { start: -5, end: 100 }, { duration: 10 });

    expect(only.start).toBe(0);
    expect(only.end).toBe(10);
  });

  it("swaps an inverted start/end", () => {
    const [only] = retimeSegment(solo, "a", { start: 4, end: 1 }, { duration: 10 });

    expect(only.start).toBe(1);
    expect(only.end).toBe(4);
  });

  it("refuses to cross the previous segment, keeping MIN_SEGMENT_GAP", () => {
    const next = retimeSegment(trio, "b", { start: 1, end: 5 }, { duration: 10 });

    expect(find(next, "b").start).toBeCloseTo(2 + MIN_SEGMENT_GAP, 10);
    expect(find(next, "b").end).toBe(5);
    expect(find(next, "a")).toEqual(trio[0]);
  });

  it("refuses to cross the next segment, keeping MIN_SEGMENT_GAP", () => {
    const next = retimeSegment(trio, "b", { start: 3, end: 7 }, { duration: 10 });

    expect(find(next, "b").end).toBeCloseTo(6 - MIN_SEGMENT_GAP, 10);
    expect(find(next, "c")).toEqual(trio[2]);
  });

  it("enforces MIN_SEGMENT_DURATION by extending the end when there is room", () => {
    const next = retimeSegment(trio, "b", { start: 3.2, end: 3.3 }, { duration: 10 });
    const b = find(next, "b");

    expect(b.start).toBe(3.2);
    expect(b.end - b.start).toBeCloseTo(MIN_SEGMENT_DURATION, 10);
  });

  it("enforces MIN_SEGMENT_DURATION by pulling the start back when the end is walled in", () => {
    // Segment pinned to the very end of the timeline: it cannot grow right.
    const atEnd = [segment({ id: "a", start: 0, end: 1 })];
    const next = retimeSegment(atEnd, "a", { start: 0.9, end: 1 }, { duration: 1 });

    expect(next[0].end).toBe(1);
    expect(next[0].start).toBeCloseTo(1 - MIN_SEGMENT_DURATION, 10);
  });

  it("takes all available room when squeezed between two neighbours", () => {
    const tight = [
      segment({ id: "a", start: 0, end: 2 }),
      segment({ id: "b", start: 2.2, end: 2.3 }),
      segment({ id: "c", start: 2.5, end: 4 }),
    ];
    // The window between a and c is narrower than MIN_SEGMENT_DURATION, so the segment
    // keeps its floor rather than collapsing.
    const next = retimeSegment(tight, "b", { start: 2.2, end: 2.3 }, { duration: 10 });
    const b = find(next, "b");

    expect(b.start).toBeCloseTo(2 + MIN_SEGMENT_GAP, 10);
    expect(b.end).toBeCloseTo(2.5 - MIN_SEGMENT_GAP, 10);
  });

  it("returns the input array itself for an unknown id", () => {
    const result = retimeSegment(trio, "nope", { start: 0, end: 1 }, { duration: 10 });

    // Identity, not a copy — callers rely on this to skip a commit.
    expect(result).toBe(trio);
  });

  it("returns the sorted document, leaving untouched segments intact", () => {
    const unsorted = [trio[2], trio[0], trio[1]];
    const next = retimeSegment(unsorted, "b", { start: 3.5, end: 4.5 }, { duration: 10 });

    expect(next.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(next).not.toBe(unsorted);
  });

  it("preserves id, speaker and text", () => {
    const source = [segment({ id: "a", start: 0, end: 2, speakerId: "spk-3", text: "hello" })];
    const [only] = retimeSegment(source, "a", { start: 1, end: 3 }, { duration: 10 });

    expect(only).toEqual({ id: "a", start: 1, end: 3, speakerId: "spk-3", text: "hello" });
  });

  describe("ripple", () => {
    it("ignores neighbour walls and re-sorts the document", () => {
      const pair = [segment({ id: "a", start: 0, end: 2 }), segment({ id: "b", start: 3, end: 5 })];
      const next = retimeSegment(pair, "a", { start: 6, end: 8 }, { duration: 10, ripple: true });

      expect(next.map((c) => c.id)).toEqual(["b", "a"]);
      expect(find(next, "a")).toMatchObject({ start: 6, end: 8 });
      expect(find(next, "b")).toMatchObject({ start: 3, end: 5 });
    });

    it("still clamps to the timeline and still enforces MIN_SEGMENT_DURATION", () => {
      const pair = [segment({ id: "a", start: 0, end: 2 }), segment({ id: "b", start: 3, end: 5 })];
      const next = retimeSegment(pair, "b", { start: 9.9, end: 20 }, { duration: 10, ripple: true });
      const b = find(next, "b");

      expect(b.end).toBe(10);
      expect(b.start).toBeCloseTo(10 - MIN_SEGMENT_DURATION, 10);
    });

    it("can produce overlapping segments — documented sharp edge, see suite notes", () => {
      // `ripple` skips neighbour clamping without actually pushing neighbours
      // aside, so the caller is responsible for the non-overlap invariant that
      // findActiveSegmentIndex's binary search depends on.
      const pair = [segment({ id: "a", start: 0, end: 2 }), segment({ id: "b", start: 3, end: 5 })];
      const next = retimeSegment(pair, "a", { start: 4, end: 6 }, { duration: 10, ripple: true });

      expect(next.map((c) => c.id)).toEqual(["b", "a"]);
      expect(find(next, "a").start).toBeLessThan(find(next, "b").end);
    });
  });
});

/* ------------------------------------------------------------------ *
 * Ids
 * ------------------------------------------------------------------ */

describe("createSegmentId", () => {
  beforeEach(() => {
    __resetSegmentIdCounter();
  });

  it("is monotonic and prefixable", () => {
    expect(createSegmentId()).toBe("segment-1");
    expect(createSegmentId()).toBe("segment-2");
    expect(createSegmentId("seg")).toBe("seg-3");
  });

  it("produces no collisions across a burst", () => {
    const ids = new Set(Array.from({ length: 500 }, () => createSegmentId()));

    expect(ids.size).toBe(500);
  });
});

/* ------------------------------------------------------------------ *
 * Split / merge
 * ------------------------------------------------------------------ */

describe("splitSegmentAt", () => {
  beforeEach(() => {
    __resetSegmentIdCounter();
  });

  const source = segment({
    id: "c1",
    start: 0,
    end: 4,
    speakerId: "spk-2",
    text: "hello there wonderful world",
  });

  it("splits text at the word boundary nearest the proportional point", () => {
    const parts = splitSegmentAt(source, 2)!;

    expect(parts).not.toBeNull();
    expect(parts[0].text).toBe("hello there");
    expect(parts[1].text).toBe("wonderful world");
  });

  it("produces contiguous timings and keeps the speaker", () => {
    const [first, second] = splitSegmentAt(source, 2.5)!;

    expect(first.start).toBe(0);
    expect(first.end).toBe(2.5);
    expect(second.start).toBe(2.5);
    expect(second.end).toBe(4);
    expect(first.speakerId).toBe("spk-2");
    expect(second.speakerId).toBe("spk-2");
  });

  it("keeps the original id on the first half and mints a fresh one for the second", () => {
    const [first, second] = splitSegmentAt(source, 2)!;

    expect(first.id).toBe("c1");
    expect(second.id).toBe("segment-1");
  });

  it("does not mutate the source segment", () => {
    const snapshot = { ...source };
    splitSegmentAt(source, 2);

    expect(source).toEqual(snapshot);
  });

  it("flattens newlines into the split halves", () => {
    const wrapped = segment({ id: "c1", start: 0, end: 4, text: "first line\nsecond line" });
    const [first, second] = splitSegmentAt(wrapped, 2)!;

    expect(first.text).not.toContain("\n");
    expect(second.text).not.toContain("\n");
    expect(`${first.text} ${second.text}`).toBe("first line second line");
  });

  it("falls back to the proportional character index when there is no space", () => {
    const oneWord = segment({ id: "c1", start: 0, end: 4, text: "supercalifragilistic" });
    const [first, second] = splitSegmentAt(oneWord, 2)!;

    expect(first.text).toBe("supercalif");
    expect(second.text).toBe("ragilistic");
  });

  it("handles an empty segment without throwing", () => {
    const blank = segment({ id: "c1", start: 0, end: 4, text: "" });
    const [first, second] = splitSegmentAt(blank, 2)!;

    expect(first.text).toBe("");
    expect(second.text).toBe("");
    expect(first.end).toBe(2);
    expect(second.start).toBe(2);
  });

  it("returns null when the split point is outside the segment", () => {
    expect(splitSegmentAt(source, 0)).toBeNull();
    expect(splitSegmentAt(source, 4)).toBeNull();
    expect(splitSegmentAt(source, -1)).toBeNull();
    expect(splitSegmentAt(source, 9)).toBeNull();
  });

  it("returns null when either half would fall under MIN_SEGMENT_DURATION", () => {
    expect(splitSegmentAt(source, 0.5)).toBeNull();
    expect(splitSegmentAt(source, 3.5)).toBeNull();
    // Exactly at the floor on both sides is allowed.
    expect(splitSegmentAt(source, MIN_SEGMENT_DURATION)).not.toBeNull();
    expect(splitSegmentAt(source, 4 - MIN_SEGMENT_DURATION)).not.toBeNull();
  });

  it("never mints an id for a rejected split", () => {
    splitSegmentAt(source, 0.1);

    expect(createSegmentId()).toBe("segment-1");
  });
});

describe("mergeSegments", () => {
  const first = segment({ id: "a", start: 0, end: 2, speakerId: "spk-0", text: "Hello there" });
  const second = segment({ id: "b", start: 3, end: 5, speakerId: "spk-1", text: "how are you" });

  it("joins text with a single space and spans both segments", () => {
    expect(mergeSegments(first, second)).toEqual({
      id: "a",
      start: 0,
      end: 5,
      speakerId: "spk-0",
      text: "Hello there how are you",
    });
  });

  it("collapses stray whitespace at the join", () => {
    const padded = segment({ id: "a", start: 0, end: 2, text: "Hello there   " });
    const trailing = segment({ id: "b", start: 3, end: 5, text: "   how are you" });

    expect(mergeSegments(padded, trailing).text).toBe("Hello there how are you");
  });

  it("keeps `a`'s identity when passed in reverse chronological order", () => {
    const merged = mergeSegments(second, first);

    // Identity follows the first argument so selection does not jump, but the
    // text is always assembled in chronological order.
    expect(merged.id).toBe("b");
    expect(merged.speakerId).toBe("spk-1");
    expect(merged.start).toBe(0);
    expect(merged.end).toBe(5);
    expect(merged.text).toBe("Hello there how are you");
  });

  it("does not leave a dangling space when one side is empty", () => {
    const blank = segment({ id: "b", start: 3, end: 5, text: "" });

    expect(mergeSegments(first, blank).text).toBe("Hello there");
    expect(mergeSegments(blank, first).text).toBe("Hello there");
  });

  it("does not mutate either input", () => {
    const a = { ...first };
    const b = { ...second };
    mergeSegments(first, second);

    expect(first).toEqual(a);
    expect(second).toEqual(b);
  });
});

/* ------------------------------------------------------------------ *
 * Roll-ups
 * ------------------------------------------------------------------ */

describe("speakingTimeBySpeaker", () => {
  it("totals duration per speaker", () => {
    const segments = [
      segment({ id: "c0", start: 0, end: 2, speakerId: "spk-0" }),
      segment({ id: "c1", start: 3, end: 6, speakerId: "spk-1" }),
      segment({ id: "c2", start: 8, end: 11, speakerId: "spk-0" }),
    ];

    expect(speakingTimeBySpeaker(segments)).toEqual({ "spk-0": 5, "spk-1": 3 });
  });

  it("returns an empty map for an empty document and ignores inverted segments", () => {
    expect(speakingTimeBySpeaker([])).toEqual({});
    expect(
      speakingTimeBySpeaker([segment({ id: "c0", start: 5, end: 1, speakerId: "spk-0" })])
    ).toEqual({ "spk-0": 0 });
  });
});

describe("documentIssueCount", () => {
  it("counts each segment once, at its worst level", () => {
    const long = "x".repeat(MAX_CHARS_PER_LINE + 1);
    const segments = [
      segment({ id: "ok", start: 0, end: 2, text: "Good morning everyone." }),
      segment({ id: "warn", start: 3, end: 5, text: "" }),
      segment({ id: "err", start: 6, end: 9, text: long }),
      // Both an error and a warning — must count as one error, not one of each.
      segment({ id: "both", start: 10, end: 19, text: long }),
    ];

    expect(documentIssueCount(segments)).toEqual({ errors: 2, warnings: 1 });
  });

  it("returns zeroes for an empty document", () => {
    expect(documentIssueCount([])).toEqual({ errors: 0, warnings: 0 });
  });
});

/* ------------------------------------------------------------------ *
 * Word timing — drives the read-along highlight
 * ------------------------------------------------------------------ */

describe("segmentWords", () => {
  const seg = (text: string, start = 0, end = 10): Segment => ({
    id: "w",
    start,
    end,
    speakerId: "spk-0",
    text,
  });

  it("returns nothing for empty text", () => {
    expect(segmentWords(seg(""))).toEqual([]);
  });

  it("spans exactly the segment's duration", () => {
    const words = segmentWords(seg("one two three four", 4, 10));
    expect(words[0].start).toBeCloseTo(4, 5);
    expect(words[words.length - 1].end).toBeCloseTo(10, 5);
  });

  it("never goes backwards", () => {
    const words = segmentWords(seg("alpha bravo charlie delta echo", 2, 9));
    for (let i = 1; i < words.length; i += 1) {
      expect(words[i].start).toBeGreaterThanOrEqual(words[i - 1].start);
    }
  });

  it("weights longer words with more time", () => {
    const words = segmentWords(seg("a extraordinarily", 0, 10)).filter(
      (w) => w.text.trim() !== ""
    );
    const [short, long] = words;
    expect(long.end - long.start).toBeGreaterThan(short.end - short.start);
  });

  it("gives whitespace no duration of its own", () => {
    const words = segmentWords(seg("one two", 0, 4));
    const space = words.find((w) => w.text.trim() === "");
    expect(space).toBeDefined();
    expect(space!.end - space!.start).toBeCloseTo(0, 6);
  });

  it("tags each word with its display line", () => {
    const words = segmentWords(seg("first line\nsecond line", 0, 4));
    expect(words.some((w) => w.line === 0)).toBe(true);
    expect(words.some((w) => w.line === 1)).toBe(true);
  });

  it("degrades gracefully on a zero-length segment", () => {
    const words = segmentWords(seg("some text", 3, 3));
    expect(words).toHaveLength(3);
    for (const word of words) expect(word.start).toBe(3);
  });
});

describe("findActiveWordIndex", () => {
  const words = segmentWords({
    id: "w",
    start: 0,
    end: 6,
    speakerId: "spk-0",
    text: "alpha bravo charlie",
  });

  it("finds the word under the playhead", () => {
    const target = words.find((w) => w.text === "bravo")!;
    const mid = target.start + (target.end - target.start) / 2;
    expect(words[findActiveWordIndex(words, mid)].text).toBe("bravo");
  });

  it("returns -1 before the segment starts and after it ends", () => {
    expect(findActiveWordIndex(words, -1)).toBe(-1);
    expect(findActiveWordIndex(words, 99)).toBe(-1);
  });

  it("is inclusive at a word's start", () => {
    const target = words[0];
    expect(findActiveWordIndex(words, target.start)).toBe(0);
  });
});

/* ------------------------------------------------------------------ *
 * Zoom-dependent ruler precision
 * ------------------------------------------------------------------ */

describe("formatTimecode precision", () => {
  it("defaults to hundredths", () => {
    expect(formatTimecode(4.567)).toBe("04.57");
  });

  it("honours a requested precision", () => {
    expect(formatTimecode(4.567, 1)).toBe("04.6");
    expect(formatTimecode(4.567, 2)).toBe("04.57");
    expect(formatTimecode(4.567, 3)).toBe("04.567");
  });

  it("carries into the minute at every precision", () => {
    // 59.999 must not render as "60.000".
    expect(formatTimecode(59.9999, 3)).toBe("1:00.000");
    expect(formatTimecode(59.999, 1)).toBe("1:00.0");
  });

  it("guards negatives and NaN at the requested width", () => {
    expect(formatTimecode(-1, 3)).toBe("00.000");
    expect(formatTimecode(Number.NaN, 1)).toBe("00.0");
  });
});

describe("formatRulerTime", () => {
  it("shows no fraction when zoomed out", () => {
    // A whole minute per 40px — decimals here would repeat across ticks.
    expect(formatRulerTime(65, 8)).toBe("1:05");
  });

  it("adds precision as the scale grows", () => {
    expect(formatRulerTime(65.432, 40)).toBe("1:05.4");
    expect(formatRulerTime(65.432, 120)).toBe("1:05.43");
    expect(formatRulerTime(65.432, 260)).toBe("1:05.432");
  });

  it("steps up exactly at each threshold, not near it", () => {
    expect(formatRulerTime(1.234, 35)).toBe("0:01");
    expect(formatRulerTime(1.234, 36)).toBe("01.2");
    expect(formatRulerTime(1.234, 89)).toBe("01.2");
    expect(formatRulerTime(1.234, 90)).toBe("01.23");
    expect(formatRulerTime(1.234, 219)).toBe("01.23");
    expect(formatRulerTime(1.234, 220)).toBe("01.234");
  });

  it("never loses the minute component at high precision", () => {
    expect(formatRulerTime(605.5, 260)).toBe("10:05.500");
  });
});

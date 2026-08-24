import { describe, expect, it } from "vitest";
import {
  buildTokenIndex,
  segmentTokenRange,
  tokenizeText,
  tokensForSegment,
  transcriptVerbatim,
  rangesOverlap,
} from "../tokens";
import type { Segment } from "../types";

/**
 * The schema fixes the range convention: token indices are zero-indexed and
 * INCLUSIVE on both ends, defined against `transcript_verbatim` — the whole
 * clip, not one segment. Get either wrong and every stored span silently points
 * at the wrong words, which is exactly the failure the schema versions against.
 */

const seg = (id: string, text: string): Segment => ({
  id,
  start: 0,
  end: 1,
  speakerId: "spk-0",
  text,
});

describe("tokenizeText", () => {
  it("splits on whitespace", () => {
    expect(tokenizeText("abeg make you come").map((t) => t.text)).toEqual([
      "abeg",
      "make",
      "you",
      "come",
    ]);
  });

  it("returns nothing for empty or blank text", () => {
    expect(tokenizeText("")).toEqual([]);
    expect(tokenizeText("   \n  ")).toEqual([]);
  });

  it("treats a newline as whitespace, never as part of a token", () => {
    const tokens = tokenizeText("first line\nsecond line");
    expect(tokens.map((t) => t.text)).toEqual(["first", "line", "second", "line"]);
    expect(tokens.every((t) => !t.text.includes("\n"))).toBe(true);
  });

  it("keeps char offsets that map back into the source text", () => {
    const text = "no wahala o";
    for (const token of tokenizeText(text)) {
      expect(text.slice(token.charStart, token.charEnd)).toBe(token.text);
    }
  });

  it("keeps punctuation attached under whitespace_v1", () => {
    expect(tokenizeText("wetin dey happen?").map((t) => t.text)).toEqual([
      "wetin",
      "dey",
      "happen?",
    ]);
  });

  it("splits trailing punctuation under whitespace_punct_split_v1", () => {
    const tokens = tokenizeText("wetin dey happen?", "whitespace_punct_split_v1");
    expect(tokens.map((t) => t.text)).toEqual(["wetin", "dey", "happen", "?"]);
  });

  it("does not strand a token that is only punctuation", () => {
    const tokens = tokenizeText("yes ... no", "whitespace_punct_split_v1");
    expect(tokens.map((t) => t.text)).toEqual(["yes", "...", "no"]);
  });
});

describe("buildTokenIndex", () => {
  const segments = [
    seg("a", "abeg come"),
    seg("b", "I dey here"),
    seg("c", "na so"),
  ];

  it("numbers tokens continuously across segments", () => {
    const index = buildTokenIndex(segments);
    expect(index.tokens.map((t) => t.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(index.tokens.map((t) => t.text)).toEqual([
      "abeg",
      "come",
      "I",
      "dey",
      "here",
      "na",
      "so",
    ]);
  });

  it("attributes every token to its own segment", () => {
    const index = buildTokenIndex(segments);
    expect(index.tokens.filter((t) => t.segmentId === "b").map((t) => t.index)).toEqual([
      2, 3, 4,
    ]);
  });

  it("reports an INCLUSIVE range per segment", () => {
    const index = buildTokenIndex(segments);
    expect(segmentTokenRange(index, "a")).toEqual({ start: 0, end: 1 });
    expect(segmentTokenRange(index, "b")).toEqual({ start: 2, end: 4 });
    expect(segmentTokenRange(index, "c")).toEqual({ start: 5, end: 6 });
  });

  it("gives a single-token segment start === end", () => {
    const index = buildTokenIndex([seg("solo", "yes")]);
    expect(segmentTokenRange(index, "solo")).toEqual({ start: 0, end: 0 });
  });

  it("returns null for a segment with no tokens", () => {
    const index = buildTokenIndex([seg("a", "one"), seg("empty", "")]);
    expect(segmentTokenRange(index, "empty")).toBeNull();
    expect(tokensForSegment(index, "empty")).toEqual([]);
  });

  it("returns null for a segment that is not in the document", () => {
    expect(segmentTokenRange(buildTokenIndex(segments), "ghost")).toBeNull();
  });

  it("keeps an empty segment from shifting its neighbours' indices", () => {
    const index = buildTokenIndex([seg("a", "one"), seg("gap", ""), seg("b", "two")]);
    expect(segmentTokenRange(index, "b")).toEqual({ start: 1, end: 1 });
  });

  it("renumbers when an earlier segment's text changes", () => {
    const before = buildTokenIndex(segments);
    const after = buildTokenIndex([seg("a", "abeg come now"), segments[1], segments[2]]);

    // This is why the index is derived from live segments rather than cached:
    // one extra word upstream moves every downstream span.
    expect(segmentTokenRange(before, "b")!.start).toBe(2);
    expect(segmentTokenRange(after, "b")!.start).toBe(3);
  });

  it("orders tokens by segment order, which is playback order", () => {
    const index = buildTokenIndex(segments);
    const segmentOrder = index.tokens.map((t) => t.segmentId);
    expect(segmentOrder).toEqual(["a", "a", "b", "b", "b", "c", "c"]);
  });
});

describe("transcriptVerbatim", () => {
  it("is the concatenation every token index is defined against", () => {
    expect(transcriptVerbatim([seg("a", "abeg come"), seg("b", "na so")])).toBe(
      "abeg come na so"
    );
  });

  it("flattens subtitle line breaks into spaces", () => {
    expect(transcriptVerbatim([seg("a", "first\nsecond")])).toBe("first second");
  });

  it("skips empty segments rather than emitting double spaces", () => {
    expect(transcriptVerbatim([seg("a", "one"), seg("b", ""), seg("c", "two")])).toBe(
      "one two"
    );
  });

  it("has exactly as many words as the index has tokens", () => {
    const segments = [seg("a", "abeg come"), seg("b", "I dey here")];
    const words = transcriptVerbatim(segments).split(" ").length;
    expect(words).toBe(buildTokenIndex(segments).tokens.length);
  });
});

describe("rangesOverlap", () => {
  it("is true when ranges share a token", () => {
    expect(rangesOverlap({ start: 0, end: 3 }, { start: 3, end: 5 })).toBe(true);
  });

  it("is false when they merely touch end-to-start", () => {
    // Inclusive ranges: 0-2 and 3-5 are adjacent, not overlapping.
    expect(rangesOverlap({ start: 0, end: 2 }, { start: 3, end: 5 })).toBe(false);
  });

  it("is true when one contains the other", () => {
    expect(rangesOverlap({ start: 0, end: 9 }, { start: 4, end: 5 })).toBe(true);
  });

  it("is true for identical single-token ranges", () => {
    expect(rangesOverlap({ start: 2, end: 2 }, { start: 2, end: 2 })).toBe(true);
  });
});

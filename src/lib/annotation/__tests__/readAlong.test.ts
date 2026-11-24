import { describe, expect, it } from "vitest";
import { activeWord, wordStarts } from "@/lib/annotation/readAlong";

describe("read-along", () => {
  it("uses each word's own time", () => {
    const starts = wordStarts([{ start: 1 }, { start: 2 }, { start: 3 }], 3, 0, 4);
    expect(starts).toEqual([1, 2, 3]);
    expect(activeWord(starts, 2.5)).toBe(1);
  });

  it("holds the last word through a pause instead of running ahead", () => {
    const starts = wordStarts([{ start: 1 }, { start: 5 }], 2, 0, 6);
    expect(activeWord(starts, 3)).toBe(0);
  });

  it("spreads untimed words between the timed ones, so it keeps moving", () => {
    expect(wordStarts([{ start: 0 }, null, null, { start: 3 }], 4, 0, 4)).toEqual([0, 1, 2, 3]);
  });

  it("spreads leading and trailing untimed words to the segment's edges", () => {
    expect(wordStarts([null, { start: 2 }, null], 3, 0, 4)).toEqual([0, 2, 3]);
  });

  it("spreads evenly when nothing is timed, or the count no longer matches", () => {
    expect(wordStarts(undefined, 4, 0, 4)).toEqual([0, 1, 2, 3]);
    expect(wordStarts([{ start: 1 }], 2, 0, 2)).toEqual([0, 1]);
  });

  it("lights nothing before the first word", () => {
    expect(activeWord([1, 2], 0.5)).toBe(-1);
  });
});

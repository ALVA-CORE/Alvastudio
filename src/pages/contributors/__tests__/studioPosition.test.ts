import { describe, expect, it } from "vitest";

/**
 * The studio counts moves, not position.
 *
 * `index` grows every time somebody swipes and is wrapped where it is read.
 * It used to be wrapped for the card and not for the counter, so a bank of
 * twelve read "13/12" on the thirteenth swipe. This is that wrap.
 */
function position(index: number, total: number) {
  return total > 0 ? ((index % total) + total) % total : 0;
}

describe("studio position", () => {
  it("counts from 1 within the bank", () => {
    expect(position(0, 12) + 1).toBe(1);
    expect(position(11, 12) + 1).toBe(12);
  });

  it("wraps instead of running past the end", () => {
    expect(position(12, 12) + 1).toBe(1);
    expect(position(13, 12) + 1).toBe(2);
    expect(position(100, 12) + 1).toBe(5);
  });

  it("wraps backwards too", () => {
    /* Swiping left from the first card goes to the last, so the index goes
       negative and `%` alone would return a negative. */
    expect(position(-1, 12) + 1).toBe(12);
    expect(position(-13, 12) + 1).toBe(12);
  });

  it("is 0 on an empty bank, so the caller can show 0 of 0", () => {
    expect(position(5, 0)).toBe(0);
  });
});

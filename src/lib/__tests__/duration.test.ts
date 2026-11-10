import { describe, expect, it } from "vitest";
import { formatClockTime, formatDuration } from "../duration";

describe("formatDuration", () => {
  /* The bug: a six-hour session read "360:00". */
  it("breaks a length into hours, minutes and seconds, leaving out zeros", () => {
    expect(formatDuration(6 * 3600)).toBe("6h");
    expect(formatDuration(3725)).toBe("1h 2m 5s");
    expect(formatDuration(3605)).toBe("1h 5s");
    expect(formatDuration(1934)).toBe("32m 14s");
    expect(formatDuration(120)).toBe("2m");
    expect(formatDuration(45)).toBe("45s");
  });

  it("rounds to the second, and reads nothing as 0s", () => {
    expect(formatDuration(59.6)).toBe("1m");
    expect(formatDuration(0.4)).toBe("0s");
    expect(formatDuration(Number.NaN)).toBe("0s");
  });
});

describe("formatClockTime", () => {
  it("keeps m:ss under an hour and adds hours past it", () => {
    expect(formatClockTime(65)).toBe("1:05");
    expect(formatClockTime(6 * 3600)).toBe("6:00:00");
    expect(formatClockTime(3725.9)).toBe("1:02:05");
  });
});

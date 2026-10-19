import { describe, expect, it } from "vitest";
import { toRecordingMix, toWeeklySessions } from "../dashboard";

describe("toRecordingMix", () => {
  it("makes the second slice the remainder", () => {
    expect(toRecordingMix(6, 10)).toEqual([
      { type: "prompts", value: 6, fill: "var(--color-prompts)" },
      { type: "stimuli", value: 4, fill: "var(--color-stimuli)" },
    ]);
  });

  it("returns nothing when there are no recordings, so the caller draws its empty state", () => {
    expect(toRecordingMix(0, 0)).toEqual([]);
  });

  it("never draws a negative slice", () => {
    /* `prompts_read` counting a clip `total_recordings` has dropped would
       otherwise put a negative wedge in the donut. */
    expect(toRecordingMix(12, 10)[1].value).toBe(0);
  });
});

describe("toWeeklySessions", () => {
  const series = [
    { date: "2026-10-11", count: 1 },
    { date: "2026-10-12", count: 2 },
    { date: "2026-10-13", count: 3 },
    { date: "2026-10-14", count: 4 },
    { date: "2026-10-15", count: 5 },
    { date: "2026-10-16", count: 6 },
    { date: "2026-10-17", count: 7 },
    { date: "2026-10-18", count: 8 },
  ];

  it("takes the last seven days, labelled by weekday", () => {
    expect(toWeeklySessions(series)).toEqual([
      { day: "Mon", sessions: 2 },
      { day: "Tue", sessions: 3 },
      { day: "Wed", sessions: 4 },
      { day: "Thu", sessions: 5 },
      { day: "Fri", sessions: 6 },
      { day: "Sat", sessions: 7 },
      { day: "Sun", sessions: 8 },
    ]);
  });

  it("reads dates as calendar days, not UTC instants", () => {
    /* Parsed as UTC, 2026-10-18 is a Sunday that reads Saturday anywhere west
       of Greenwich. The API sends Africa/Lagos days, so the label must not
       depend on where the reader is. */
    expect(toWeeklySessions([{ date: "2026-10-18", count: 1 }])).toEqual([
      { day: "Sun", sessions: 1 },
    ]);
  });

  it("handles a shorter series than a week", () => {
    expect(toWeeklySessions(series.slice(0, 2))).toHaveLength(2);
  });

  it("handles an empty series", () => {
    expect(toWeeklySessions([])).toEqual([]);
  });
});

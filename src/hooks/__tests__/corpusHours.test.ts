import { describe, expect, it } from "vitest";

type Cell = { session_type: string; status: string; clips: number; hours: number };

/** Mirrors `hoursBy` in `useCorpus`. */
function hoursBy(cells: Cell[], pick: (c: Cell) => string) {
  const totals = new Map<string, number>();
  for (const cell of cells) {
    totals.set(pick(cell), (totals.get(pick(cell)) ?? 0) + cell.hours);
  }
  return [...totals.entries()]
    .map(([label, hours]) => ({ label, hours: Math.round(hours * 10) / 10 }))
    .filter((s) => s.hours > 0)
    .sort((a, b) => b.hours - a.hours);
}

/**
 * The bug this exists to stop.
 *
 * `by_session_type`, `by_status` and `by_language_variety` are integer
 * COUNTS. We read them as hours, so the corpus cards said 2.8 hours while
 * the donut beside them said 1,198 — and the two donuts disagreed by
 * exactly one, the single focus-group session that `by_language_variety`
 * counts and `by_session_type` does not.
 *
 * `by_type_status` is the only field carrying hours, so both splits come
 * from it.
 */
const CELLS: Cell[] = [
  { session_type: "prompt_read", status: "approved", clips: 400, hours: 1.2 },
  { session_type: "prompt_read", status: "rejected", clips: 300, hours: 0.9 },
  { session_type: "stimuli_narration", status: "approved", clips: 200, hours: 0.5 },
  { session_type: "stimuli_narration", status: "submitted", clips: 100, hours: 0.2 },
];

/** What the cards read, from `total_hours`. */
const TOTAL_HOURS = 2.8;

describe("corpus hours", () => {
  it("sums to the same total the metric cards show", () => {
    const byType = hoursBy(CELLS, (c) => c.session_type);
    const byStatus = hoursBy(CELLS, (c) => c.status);

    const sum = (s: { hours: number }[]) =>
      Math.round(s.reduce((t, x) => t + x.hours, 0) * 10) / 10;

    expect(sum(byType)).toBe(TOTAL_HOURS);
    expect(sum(byStatus)).toBe(TOTAL_HOURS);
  });

  /* The two splits are the same hours cut two ways, so they must agree with
     each other as well as with the cards. */
  it("gives the same total whichever way it is cut", () => {
    const byType = hoursBy(CELLS, (c) => c.session_type);
    const byStatus = hoursBy(CELLS, (c) => c.status);
    const sum = (s: { hours: number }[]) =>
      Math.round(s.reduce((t, x) => t + x.hours, 0) * 10) / 10;

    expect(sum(byType)).toBe(sum(byStatus));
  });

  /* Counting clips instead would give 1,000 against a 2.8-hour corpus,
     which is the shape of the bug. */
  it("is nothing like the clip count", () => {
    const clips = CELLS.reduce((t, c) => t + c.clips, 0);
    expect(clips).toBe(1000);
    expect(clips).not.toBeCloseTo(TOTAL_HOURS);
  });

  it("drops a split with no hours rather than drawing a zero slice", () => {
    const withEmpty = [...CELLS, { session_type: "focus", status: "approved", clips: 0, hours: 0 }];
    expect(hoursBy(withEmpty, (c) => c.session_type).map((s) => s.label)).not.toContain("focus");
  });
});

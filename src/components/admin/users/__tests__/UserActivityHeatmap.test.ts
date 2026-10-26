import { describe, expect, it } from "vitest";
import { toHeatmapColumns } from "../UserActivityHeatmap";

/**
 * The API sends a flat run of days; the calendar needs whole weeks.
 *
 * The two ways this goes wrong are both silent: a window that starts
 * mid-week draws its first column ragged, and a date parsed as UTC puts
 * every cell a day out west of Greenwich. Neither looks broken on screen.
 */
describe("toHeatmapColumns", () => {
  const run = (start: string, days: number) =>
    Array.from({ length: days }, (_, index) => {
      const date = new Date(2026, 0, 1);
      date.setTime(new Date(start).getTime());
      date.setDate(date.getDate() + index);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      return {
        date: `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, "0")}`,
        count: index,
      };
    });

  it("pads to whole weeks, starting on a Sunday", () => {
    /* 22 Oct 2026 is a Thursday. */
    const columns = toHeatmapColumns(run("2026-10-22T00:00:00", 10));

    expect(columns.every((column) => column.bins.length === 7)).toBe(true);
    expect(columns[0].bins[0].date.getDay()).toBe(0);
  });

  it("keeps each day on the date it was sent", () => {
    const columns = toHeatmapColumns([{ date: "2026-10-22", count: 5 }]);
    const day = columns.flatMap((column) => column.bins).find((bin) => bin.count === 5);

    expect(day?.date.getDate()).toBe(22);
    expect(day?.date.getMonth()).toBe(9);
  });

  it("is empty for an empty window rather than one blank week", () => {
    expect(toHeatmapColumns([])).toEqual([]);
  });
});

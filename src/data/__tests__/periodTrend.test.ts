import { describe, expect, it } from "vitest";
import { periodTrend } from "@/data/internDashboard";
import { NO_VALUE } from "@/lib/no-value";

describe("periodTrend", () => {
  it.each([
    [12, 10, "+20%"],
    [5, 10, "-50%"],
    [10, 10, "0%"],
    [3, 0, "New"],
    [0, 0, "0%"],
  ])("reads %s against %s as %s", (current, previous, label) => {
    expect(periodTrend(current, previous)).toBe(label);
  });

  it("is a dash when the window before isn't known", () => {
    expect(periodTrend(4, null)).toBe(NO_VALUE);
  });
});

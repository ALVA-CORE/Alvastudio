import { describe, expect, it } from "vitest";
import { approvalRate, decisionsFromStatus } from "@/data/admin/approval";

/**
 * Two screens, one answer.
 *
 * The dashboard read 0% while the review page read 100% on the same corpus:
 * one counted hours and divided by everything collected, the other counted
 * clips and divided by what had been decided. Both call this now.
 */
describe("approvalRate", () => {
  it("divides by what was decided, not by everything submitted", () => {
    /* One approved, none rejected, 199 still waiting. That is 100% of the
       decisions made, and it is what both screens must say. */
    expect(approvalRate({ approved: 1, rejected: 0 })).toBe(100);
  });

  it("is null when nothing has been decided", () => {
    /* Not 0. A queue nobody has reviewed has no approval rate, and a gauge
       reading 0% over it says something false about the reviewers. */
    expect(approvalRate({ approved: 0, rejected: 0 })).toBeNull();
  });

  it("rounds to whole percent", () => {
    expect(approvalRate({ approved: 2, rejected: 1 })).toBe(67);
    expect(approvalRate({ approved: 1, rejected: 2 })).toBe(33);
    expect(approvalRate({ approved: 0, rejected: 5 })).toBe(0);
  });
});

describe("decisionsFromStatus", () => {
  it("counts only the two statuses that are verdicts", () => {
    /* Flagged is not a verdict and in_review is not a decision, so neither
       belongs on either side of the fraction. */
    expect(
      decisionsFromStatus({
        approved: 8,
        rejected: 1,
        flagged: 3,
        in_review: 4,
        submitted: 200,
      })
    ).toEqual({ approved: 8, rejected: 1 });
  });

  it("reads a missing tally as nothing decided", () => {
    expect(decisionsFromStatus(undefined)).toEqual({ approved: 0, rejected: 0 });
    expect(approvalRate(decisionsFromStatus({}))).toBeNull();
  });
});

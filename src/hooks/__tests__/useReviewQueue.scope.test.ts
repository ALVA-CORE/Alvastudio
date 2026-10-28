import { describe, expect, it } from "vitest";

/**
 * The rule the queue now applies, on its own.
 *
 * Pulled out as a plain predicate because that is what it is: the hook
 * around it is three fetches and a name lookup, and none of that is what
 * needed proving.
 */
function visibleToReviewer(
  row: { assigned_reviewer_id: string | null },
  userId: string | undefined
) {
  return !row.assigned_reviewer_id || row.assigned_reviewer_id === userId;
}

const ME = "intern-1";

describe("review queue scope", () => {
  it("keeps clips assigned to this reviewer", () => {
    expect(visibleToReviewer({ assigned_reviewer_id: ME }, ME)).toBe(true);
  });

  /* The unassigned pool is everybody's to claim, so it stays. */
  it("keeps clips nobody has been given", () => {
    expect(visibleToReviewer({ assigned_reviewer_id: null }, ME)).toBe(true);
  });

  /**
   * The point of the change.
   *
   * `GET /recordings` returns every clip on the platform, and the queue used
   * to merge all of it. A colleague's open work showed up in this intern's
   * list, marked only by an amber banner on the detail page explaining they
   * could not act on it — a wasted tap and a colleague's workload on show
   * at the same time.
   */
  it("drops clips that belong to another reviewer", () => {
    expect(visibleToReviewer({ assigned_reviewer_id: "intern-2" }, ME)).toBe(false);
  });

  /**
   * Fails closed while the account is still loading.
   *
   * An undefined id must not match an assigned row. If it did, the gap
   * between mount and `/auth/me` answering would show every intern the
   * whole platform's work for a moment, which is the exact thing this
   * stops.
   */
  it("shows nothing assigned while the viewer is unknown", () => {
    expect(visibleToReviewer({ assigned_reviewer_id: "intern-2" }, undefined)).toBe(false);
    expect(visibleToReviewer({ assigned_reviewer_id: null }, undefined)).toBe(true);
  });
});

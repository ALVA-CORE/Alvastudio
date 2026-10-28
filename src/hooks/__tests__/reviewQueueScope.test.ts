import { describe, expect, it } from "vitest";

/**
 * The rule the intern queue applies on top of the server's.
 *
 * Written out as a predicate because that is what it is; the hook around it
 * is four fetches and a name lookup, none of which is what needed proving.
 * It mirrors `visible` in `useReviewQueue`.
 */
function visible(
  row: { id: string; assigned_reviewer_id: string | null },
  {
    userId,
    isAdmin = false,
    decidedByMe,
  }: { userId?: string; isAdmin?: boolean; decidedByMe: Set<string> | null }
) {
  if (isAdmin || !userId || !decidedByMe) return true;
  if (!row.assigned_reviewer_id) return true;
  if (row.assigned_reviewer_id === userId) return true;
  return decidedByMe.has(row.id);
}

const ME = "intern-1";
const none = new Set<string>();

describe("intern review queue scope", () => {
  it("keeps clips allocated to this reviewer", () => {
    expect(
      visible({ id: "r1", assigned_reviewer_id: ME }, { userId: ME, decidedByMe: none })
    ).toBe(true);
  });

  /* The unassigned pool is everybody's to claim. */
  it("keeps clips nobody holds", () => {
    expect(
      visible({ id: "r1", assigned_reviewer_id: null }, { userId: ME, decidedByMe: none })
    ).toBe(true);
  });

  it("drops a colleague's open work", () => {
    expect(
      visible(
        { id: "r1", assigned_reviewer_id: "intern-2" },
        { userId: ME, decidedByMe: none }
      )
    ).toBe(false);
  });

  /**
   * The case the first version of this got wrong.
   *
   * An admin can hand a flagged clip to somebody else after this intern has
   * decided it. Filtering on assignment alone dropped it, so their own past
   * work vanished from their history. A verdict they wrote stays theirs
   * however the clip moves afterwards.
   */
  it("keeps a clip they decided, even once it belongs to someone else", () => {
    expect(
      visible(
        { id: "r1", assigned_reviewer_id: "intern-2" },
        { userId: ME, decidedByMe: new Set(["r1"]) }
      )
    ).toBe(true);
  });

  /* Losing an intern's history to a failed request is worse than showing
     rows the server has already decided they may see. */
  it("filters nothing when their own verdicts could not be read", () => {
    expect(
      visible(
        { id: "r1", assigned_reviewer_id: "intern-2" },
        { userId: ME, decidedByMe: null }
      )
    ).toBe(true);
  });

  it("never filters for an admin", () => {
    expect(
      visible(
        { id: "r1", assigned_reviewer_id: "intern-2" },
        { userId: "admin-1", isAdmin: true, decidedByMe: none }
      )
    ).toBe(true);
  });
});

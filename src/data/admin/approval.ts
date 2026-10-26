/**
 * The approval rate, in one place.
 *
 * Two screens showed one under the same heading, with the same gauge, and
 * disagreed: the dashboard read 0% while the review page read 100% on the
 * same corpus. One counted hours and divided by everything collected, the
 * other counted clips and divided by what had been decided.
 *
 * **Clips, and only the decided ones.** A verdict is given to a clip, so a
 * rate of verdicts counts clips; weighting by length would make one long
 * recording worth ten short ones in a figure about reviewing. And a queue
 * that is mostly unreviewed says nothing about approval, so the denominator
 * is approved plus rejected. Flagged is not a verdict and nothing still in
 * review has been kept or lost yet.
 */
export type DecisionCounts = { approved: number; rejected: number };

/** Null when nothing has been decided, so a screen can say so rather than print 0%. */
export function approvalRate({ approved, rejected }: DecisionCounts): number | null {
  const decided = approved + rejected;
  return decided > 0 ? Math.round((approved / decided) * 100) : null;
}

/** The same counts, read off the API's own status tally. */
export function decisionsFromStatus(
  status: Record<string, number> | undefined
): DecisionCounts {
  return {
    approved: status?.approved ?? 0,
    rejected: status?.rejected ?? 0,
  };
}

export const APPROVAL_SUBTITLE = "Share of decided clips kept";

export const APPROVAL_EMPTY = {
  title: "Nothing decided",
  description: "No clip has been approved or rejected yet.",
};

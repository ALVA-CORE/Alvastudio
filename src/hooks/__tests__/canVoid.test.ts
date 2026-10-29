import { describe, expect, it } from "vitest";
import { canVoid } from "@/hooks/useContributorLedger";
import type { ApiLedgerEntry } from "@/lib/api/wallet";

const entry = (payout_status: ApiLedgerEntry["payout_status"]): ApiLedgerEntry => ({
  id: "e1",
  recording_id: "r1",
  unit_type: "prompt_read",
  amount: "10.00",
  currency: "NGN",
  payout_status,
  notes: null,
  created_at: new Date().toISOString(),
});

describe("canVoid", () => {
  it("allows an earning that has not moved", () => {
    expect(canVoid(entry("pending"))).toBe(true);
  });

  /**
   * Paid and in-flight money has left.
   *
   * Voiding it would make the ledger disagree with the bank rather than
   * correct it — and the API refuses, so offering the action would only
   * produce an error after the admin had written a reason for it.
   */
  it("refuses money that has already gone", () => {
    expect(canVoid(entry("paid"))).toBe(false);
    expect(canVoid(entry("in_flight"))).toBe(false);
  });

  /* Already voided. The entry stays in the ledger as the audit record, so
     it is still listed — just not actionable a second time. */
  it("refuses an entry that is already void", () => {
    expect(canVoid(entry("voided"))).toBe(false);
  });
});

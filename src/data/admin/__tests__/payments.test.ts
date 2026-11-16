import { describe, expect, it } from "vitest";
import { formatNaira, paymentMetrics, payoutStatus, type Earning } from "../payments";

const row = (over: Partial<Earning>): Earning => ({
  id: "c",
  contributor: "Ada Obi",
  recordings: 0,
  minutes: 0,
  earnedKobo: 0,
  heldKobo: 0,
  payableKobo: 0,
  inFlightKobo: 0,
  paidKobo: 0,
  status: "none",
  lastActivityAt: 0,
  lastActivityLabel: "Never",
  ...over,
});

const buckets = (held: number, payable: number, inFlight: number, paid: number) => ({
  heldKobo: held,
  payableKobo: payable,
  inFlightKobo: inFlight,
  paidKobo: paid,
});

describe("payoutStatus, from the four buckets", () => {
  it("is pending while anything is held or payable, whatever else is on its way", () => {
    expect(payoutStatus(buckets(100, 0, 500, 0))).toBe("pending");
    expect(payoutStatus(buckets(0, 100, 500, 900))).toBe("pending");
  });

  it("is on the way when nothing is owed and some is in flight", () => {
    expect(payoutStatus(buckets(0, 0, 500, 900))).toBe("in_flight");
  });

  it("is paid when all of it has gone out, and none when nothing was earned", () => {
    expect(payoutStatus(buckets(0, 0, 0, 900))).toBe("paid");
    expect(payoutStatus(buckets(0, 0, 0, 0))).toBe("none");
  });
});

describe("paymentMetrics", () => {
  /* Partly paid people used to count their whole earnings as owed. */
  it("owes earned less paid, per person", () => {
    const rows = [
      row({ earnedKobo: 10_000_00, paidKobo: 6_000_00, payableKobo: 4_000_00, status: "pending" }),
      row({ earnedKobo: 5_000_00, inFlightKobo: 5_000_00, status: "in_flight" }),
      row({ earnedKobo: 2_000_00, paidKobo: 2_000_00, status: "paid" }),
    ];
    const metrics = paymentMetrics(rows);
    expect(metrics.owed).toBe(formatNaira(9_000_00));
    expect(metrics.paid).toBe(formatNaira(8_000_00));
    expect(metrics.pending).toBe("1");
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EarningDetailPanel } from "@/components/admin/payments/EarningDetailPanel";
import type { Earning } from "@/data/admin/payments";

const ledger = vi.fn();
const voidEntry = vi.fn();

vi.mock("@/lib/api/payouts", () => ({
  contributorLedger: (id: string, query: unknown) => ledger(id, query),
  voidLedgerEntry: (id: string, reason: string) => voidEntry(id, reason),
}));

const EARNING: Earning = {
  id: "contributor-1",
  contributor: "Ada Obi",
  recordings: 12,
  minutes: 30,
  earnedKobo: 120_00,
  paidKobo: 0,
  status: "pending",
  lastActivityAt: Date.now(),
  lastActivityLabel: "today",
};

const entry = (id: string, status: string) => ({
  id,
  recording_id: "r1",
  unit_type: "prompt_read",
  amount: "10.00",
  currency: "NGN",
  payout_status: status,
  notes: `Entry ${id}`,
  created_at: new Date("2026-10-29T10:00:00Z").toISOString(),
});

beforeEach(() => {
  voidEntry.mockReset().mockResolvedValue({});
  ledger.mockReset().mockResolvedValue({
    contributor_id: "contributor-1",
    entry_count: 3,
    totals: {},
    entries: [entry("e1", "pending"), entry("e2", "paid"), entry("e3", "voided")],
  });
});

const panel = () =>
  render(<EarningDetailPanel open onOpenChange={() => {}} earning={EARNING} />);

const openTab = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Earnings" }));

describe("EarningDetailPanel", () => {
  /* Most admins open this to read a total, not to audit a line of it. A
     ledger per row would be four hundred requests for a table scroll. */
  it("does not read the ledger until the tab is opened", async () => {
    const user = userEvent.setup();
    panel();

    expect(ledger).not.toHaveBeenCalled();

    await openTab(user);
    await waitFor(() =>
      expect(ledger).toHaveBeenCalledWith("contributor-1", { limit: 100 })
    );
  });

  /**
   * A voided entry keeps its place.
   *
   * It is the audit record: removing it would answer "why is this person
   * owed less than they think" with silence.
   */
  it("lists every entry, voided ones included", async () => {
    const user = userEvent.setup();
    panel();
    await openTab(user);

    expect(await screen.findByText("Entry e1")).toBeInTheDocument();
    expect(screen.getByText("Entry e2")).toBeInTheDocument();
    expect(screen.getByText("Entry e3")).toBeInTheDocument();
  });

  /**
   * Only money that has not moved can be cancelled.
   *
   * Paid and in-flight money has left, and voiding it would make the ledger
   * disagree with the bank rather than correct it — so the action is not
   * offered rather than offered and refused.
   */
  it("offers a void only on an entry that has not gone anywhere", async () => {
    const user = userEvent.setup();
    panel();
    await openTab(user);

    expect(
      await screen.findByRole("button", { name: /Void Entry e1/ })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Void Entry e2/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Void Entry e3/ })
    ).not.toBeInTheDocument();
  });

  /* A void with no explanation is an unexplained cut to somebody's pay, and
     the question asked later is never "how much" but "why". */
  it("will not void without a reason", async () => {
    const user = userEvent.setup();
    panel();
    await openTab(user);
    await user.click(await screen.findByRole("button", { name: /Void Entry e1/ }));

    const confirm = await screen.findByRole("button", { name: "Void earning" });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText("Why"), "Duplicate upload");
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    await waitFor(() =>
      expect(voidEntry).toHaveBeenCalledWith("e1", "Duplicate upload")
    );

    /* The void dialog opens on top of the panel, and both lock the page
       with `pointer-events: none` on the body. The body staying locked here
       is correct — the panel is still open and still modal. What must not
       happen is the panel itself going dead, which is how the same clash
       presented in the duplicate-flags menu. */
    await waitFor(() =>
      expect(screen.queryByLabelText("Why")).not.toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: "Summary" }));
    expect(screen.getByText("Work counted")).toBeInTheDocument();
  });
});

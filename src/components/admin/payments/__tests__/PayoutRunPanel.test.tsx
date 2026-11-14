import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PayoutRunPanel } from "../PayoutRunPanel";
import { bankSummary } from "@/data/admin/payments";
import type { ApiPayoutRun, ApiPayoutRunItem } from "@/lib/api/payouts";

const leg = (id: string, over: Partial<ApiPayoutRunItem>): ApiPayoutRunItem => ({
  id,
  user_id: id,
  amount: "5000.00",
  currency: "NGN",
  status: "transferred",
  attempts: 1,
  failure_reason: null,
  settled_at: null,
  fee_cover: "50.00",
  bank_status: "paid",
  bank_failure_reason: null,
  bank_attempts: 1,
  bank_fee: null,
  bank_settled_at: null,
  bank_reference: null,
  bachs_payout_id: null,
  ...over,
});

const run: ApiPayoutRun = {
  id: "run1",
  reference: "PR-0001",
  currency: "NGN",
  status: "completed",
  total_amount: "20000.00",
  recipient_count: 4,
  succeeded_count: 4,
  failed_count: 0,
  created_at: new Date().toISOString(),
  completed_at: null,
  items: [
    leg("ada", { bank_status: "paid" }),
    leg("bayo", { bank_status: "processing" }),
    leg("chi", { bank_status: "failed", bank_failure_reason: "Account name mismatch" }),
    leg("dami", { bank_status: null }),
    leg("eko", { status: "unknown", bank_status: null }),
  ],
};

const names = new Map([
  ["ada", "Ada Obi"],
  ["bayo", "Bayo Ade"],
  ["chi", "Chi Eze"],
  ["dami", "Dami Ola"],
  ["eko", "Eko Uche"],
]);

const card = (name: string) => screen.getByText(name).closest("li") as HTMLElement;

/* A completed run is every transfer landed, not every bank reached (13 Nov). */
describe("PayoutRunPanel", () => {
  it("counts the legs at the bank and the legs to retry", () => {
    expect(bankSummary(run)).toEqual({ atBank: 1, toRetry: 2 });
  });

  it("offers a retry only where the bank payout failed, was lost or never asked for", async () => {
    const onRetryBank = vi.fn(async () => leg("chi", { bank_status: "processing" }));
    const onReconcile = vi.fn(async () => leg("eko", { bank_status: "processing" }));
    render(
      <PayoutRunPanel
        open
        onOpenChange={() => {}}
        run={run}
        names={names}
        onRetryBank={onRetryBank}
        onReconcile={onReconcile}
      />
    );

    expect(within(card("Ada Obi")).queryByRole("button")).not.toBeInTheDocument();
    expect(within(card("Bayo Ade")).queryByRole("button")).not.toBeInTheDocument();
    expect(within(card("Dami Ola")).getByRole("button", { name: "Send to bank" })).toBeInTheDocument();
    expect(within(card("Chi Eze")).getByText("Account name mismatch")).toBeInTheDocument();

    await userEvent.click(within(card("Chi Eze")).getByRole("button", { name: "Retry" }));
    expect(onRetryBank).toHaveBeenCalledWith("run1", "chi");

    /* An unknown transfer is reconciled, never paid again. */
    await userEvent.click(within(card("Eko Uche")).getByRole("button", { name: "Reconcile" }));
    expect(onReconcile).toHaveBeenCalledWith("run1", "eko");
  });
});

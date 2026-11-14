import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RunPaymentDialog } from "../RunPaymentDialog";

vi.mock("@/hooks/usePaymentTerms", () => ({
  usePaymentTerms: () => ({ payout_minimum_kobo: 500_000 }),
}));

const preview = {
  currency: "NGN",
  recipient_count: 2,
  total_amount: "11000.00",
  minimum_amount: "5000.00",
  bank_fee_cover: "53.75",
  total_bank_fee_cover: "107.50",
  recipients: [
    { user_id: "u1", email: "ada@example.test", amount: "6000.00" },
    { user_id: "u2", email: "bayo@example.test", amount: "5000.00" },
  ],
};

const dialog = (props: Partial<Parameters<typeof RunPaymentDialog>[0]> = {}) =>
  render(
    <RunPaymentDialog
      open
      onOpenChange={() => {}}
      preview={preview}
      isRunning={false}
      onConfirm={() => {}}
      payingUserId={null}
      onPay={() => {}}
      minimum={null}
      onMinimumChange={() => {}}
      {...props}
    />
  );

/* Paying one person moves money and cannot be undone, so it asks first. */
describe("RunPaymentDialog, paying one contributor", () => {
  it("asks before paying that row, with the real fee, and pays only them", async () => {
    const onPay = vi.fn();
    dialog({ onPay });

    await userEvent.click(screen.getAllByRole("button", { name: "Pay" })[0]);
    expect(await screen.findByText(/Pay ada@example\.test .*6,000\.00 now\?/)).toBeInTheDocument();
    expect(screen.getByText(/bank fee, .*53\.75, on top/)).toBeInTheDocument();
    expect(onPay).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Pay now" }));
    expect(onPay).toHaveBeenCalledWith(preview.recipients[0]);
  });

  it("holds the other rows and Send while one is being paid", () => {
    dialog({ payingUserId: "u1" });
    const [, other] = screen.getAllByRole("button", { name: "Pay" });
    expect(other).toBeDisabled();
    expect(screen.getByRole("button", { name: /Send/ })).toBeDisabled();
  });
});

/* A lower minimum for one run (14 Nov): what is shown is what will be sent. */
describe("RunPaymentDialog, minimum for this run", () => {
  it("shows the bank fees beside the total", () => {
    dialog();
    expect(screen.getByText(/107\.50 bank fees/)).toBeInTheDocument();
  });

  it("sends a valid minimum once typing stops, and never an invalid one", async () => {
    const onMinimumChange = vi.fn();
    dialog({ onMinimumChange });
    const field = screen.getByRole("textbox", { name: "Minimum payout" });

    await userEvent.type(field, "500.555");
    expect(screen.getByText("A number above 0, with at most two decimals.")).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(onMinimumChange).not.toHaveBeenCalledWith("500.555");

    await userEvent.clear(field);
    await userEvent.type(field, "500");
    await waitFor(() => expect(onMinimumChange).toHaveBeenCalledWith("500"));
  });

  it("says when the run is below the usual minimum, and drops it on close", async () => {
    const onMinimumChange = vi.fn();
    dialog({ minimum: "500", onMinimumChange });
    expect(screen.getByText(/Below the usual .*5,000\.00, for this run only\./)).toBeInTheDocument();

    /* Ours; the dialog's own × is hidden with CSS, which tests do not apply. */
    await userEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);
    expect(onMinimumChange).toHaveBeenLastCalledWith(null);
  });
});

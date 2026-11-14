import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RunPaymentDialog } from "../RunPaymentDialog";

const preview = {
  currency: "NGN",
  recipient_count: 2,
  total_amount: "11000.00",
  minimum_amount: "5000.00",
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
      {...props}
    />
  );

/* Paying one person moves money and cannot be undone, so it asks first. */
describe("RunPaymentDialog, paying one contributor", () => {
  it("asks before paying that row, and pays only them", async () => {
    const onPay = vi.fn();
    dialog({ onPay });

    await userEvent.click(screen.getAllByRole("button", { name: "Pay" })[0]);
    expect(await screen.findByText(/Pay ada@example\.test .*6,000\.00 now\?/)).toBeInTheDocument();
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

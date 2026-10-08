import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PointsBalanceCard } from "../PointsBalanceCard";
import { MOCK_WALLET, formatWalletNaira } from "@/data/contributors/wallet";

describe("PointsBalanceCard", () => {
  it("starts on the points face", () => {
    render(<PointsBalanceCard points={4820} />);
    expect(screen.getByText("Points balance")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wallet" })).toBeInTheDocument();
  });

  it("turns over to the wallet and back", async () => {
    render(<PointsBalanceCard points={4820} />);

    await userEvent.click(screen.getByRole("button", { name: "Wallet" }));
    expect(await screen.findByText("Wallet balance")).toBeInTheDocument();
    expect(
      screen.getByText(formatWalletNaira(MOCK_WALLET.balanceKobo))
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Points" }));
    expect(await screen.findByText("Points balance")).toBeInTheDocument();
  });

  /* A contributor earns money and takes it out — they never put any in, so
   * offering a top-up would be asking them to fund their own work. */
  it("never offers a top up", async () => {
    render(<PointsBalanceCard points={4820} />);
    await userEvent.click(screen.getByRole("button", { name: "Wallet" }));

    expect(await screen.findByRole("button", { name: /Withdraw/ })).toBeInTheDocument();
    expect(screen.queryByText(/top up/i)).not.toBeInTheDocument();
  });

  it("will not let an empty wallet withdraw", async () => {
    render(<PointsBalanceCard points={0} isEmpty />);
    await userEvent.click(screen.getByRole("button", { name: "Wallet" }));

    expect(await screen.findByRole("button", { name: /Withdraw/ })).toBeDisabled();
  });

  it("opens the history sheet", async () => {
    render(<PointsBalanceCard points={4820} />);
    await userEvent.click(screen.getByRole("button", { name: "Wallet" }));
    await userEvent.click(await screen.findByRole("button", { name: /History/ }));

    expect(
      await screen.findByRole("dialog", { name: "Wallet history" })
    ).toBeInTheDocument();
    expect(screen.getByText(MOCK_WALLET.entries[0].label)).toBeInTheDocument();
  });
});

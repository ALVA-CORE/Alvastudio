import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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
    // `<Money>` sets the ₦ in its own span so it can be sized down, so the
    // figure is split across elements and a plain string will not match it.
    expect(
      screen.getByText(
        (_, el) => el?.textContent === formatWalletNaira(MOCK_WALLET.balanceKobo),
        { selector: "span" }
      )
    ).toBeInTheDocument();

    // "Points" now lives on the wallet's flap, beside the other two verbs.
    await userEvent.click(screen.getByRole("button", { name: /Points/ }));
    expect(await screen.findByText("Points balance")).toBeInTheDocument();
  });

  /* A contributor earns money and takes it out — they never put any in, so
   * offering a top-up would be asking them to fund their own work. And
   * "Payout" is gone: the bank lives on the card, where people look for it. */
  it("offers withdraw, history and points, and nothing else", async () => {
    render(<PointsBalanceCard points={4820} />);
    await userEvent.click(screen.getByRole("button", { name: "Wallet" }));

    expect(await screen.findByRole("button", { name: /Withdraw/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /History/ })).toBeInTheDocument();
    expect(screen.queryByText(/top up/i)).not.toBeInTheDocument();
    // The card's own label mentions the payout account, so match the circle's
    // visible caption rather than any element containing the word.
    expect(screen.queryByText("Payout")).not.toBeInTheDocument();
  });

  /* Money must not leave before there is somewhere for it to land. */
  it("will not withdraw with no bank linked or no balance", async () => {
    render(<PointsBalanceCard points={0} isEmpty />);
    await userEvent.click(screen.getByRole("button", { name: "Wallet" }));

    expect(await screen.findByRole("button", { name: /Withdraw/ })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /No bank linked/ })
    ).toBeInTheDocument();
  });

  /* The card is the bank: tapping it is how an account gets linked, and the
   * name has to be resolved before anything can be saved. */
  it("links a bank from the card, and only once the name resolves", async () => {
    render(<PointsBalanceCard points={0} isEmpty />);
    await userEvent.click(screen.getByRole("button", { name: "Wallet" }));
    await userEvent.click(
      await screen.findByRole("button", { name: /No bank linked/ })
    );

    const sheet = await screen.findByRole("dialog");
    expect(
      within(sheet).getByRole("button", { name: /Link account/ })
    ).toBeDisabled();

    await userEvent.click(within(sheet).getByRole("combobox", { name: "Bank" }));
    await userEvent.click(await screen.findByRole("option", { name: "Zenith Bank" }));
    await userEvent.type(within(sheet).getByLabelText("Account number"), "0123456789");

    const link = await within(sheet).findByRole("button", { name: /Link account/ });
    await waitFor(() => expect(link).toBeEnabled());
    await userEvent.click(link);

    // Named twice once linked: on the card, and in the header above it.
    expect((await screen.findAllByText("Zenith Bank")).length).toBeGreaterThan(0);
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

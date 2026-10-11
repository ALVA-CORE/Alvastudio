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
    expect(await screen.findByText("Available")).toBeInTheDocument();
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
   * offering a top-up would be asking them to fund their own work. */
  it("offers the four verbs and nothing else", async () => {
    render(<PointsBalanceCard points={4820} />);
    await userEvent.click(screen.getByRole("button", { name: "Wallet" }));

    expect(await screen.findByRole("button", { name: /Withdraw/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Payout/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /History/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Points/ })).toBeInTheDocument();
    expect(screen.queryByText(/top up/i)).not.toBeInTheDocument();
  });

  /* Money splits four ways and only one part can be withdrawn. One balance
   * invites a contributor to tap Withdraw on money that is not theirs yet. */
  it("shows what is available, held and already paid as separate cards", async () => {
    render(<PointsBalanceCard points={4820} />);
    await userEvent.click(screen.getByRole("button", { name: "Wallet" }));

    expect(await screen.findByText("Available")).toBeInTheDocument();
    expect(screen.getByText("On hold")).toBeInTheDocument();
    expect(screen.getByText("Paid out")).toBeInTheDocument();
  });

  it("brings a card to the front when it is tapped", async () => {
    render(<PointsBalanceCard points={4820} />);
    await userEvent.click(screen.getByRole("button", { name: "Wallet" }));

    const held = await screen.findByRole("button", { name: /On hold/ });
    expect(held).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(held);
    expect(held).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Available/ })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  /* The flap covers the card's lower half, so a card you want to read
   * properly is a card you pull out of the pocket. */
  it("draws the front card out, and puts it back", async () => {
    render(<PointsBalanceCard points={4820} />);
    await userEvent.click(screen.getByRole("button", { name: "Wallet" }));

    const front = await screen.findByRole("button", { name: /Available.*Pull out/ });
    await userEvent.click(front);

    const drawn = await screen.findByRole("button", { name: /Available.*Put back/ });
    await userEvent.click(drawn);
    expect(
      await screen.findByRole("button", { name: /Available.*Pull out/ })
    ).toBeInTheDocument();
  });

  /* The gate covers the whole wallet, flap included, so nothing behind it is
   * reachable — not disabled, hidden. A sharp row of buttons sitting on top of
   * a blurred wallet looked like a rendering fault rather than a locked state. */
  it("puts the whole wallet behind the gate, not just the cards", async () => {
    render(<PointsBalanceCard points={0} isEmpty />);
    await userEvent.click(screen.getByRole("button", { name: "Wallet" }));

    expect(await screen.findByRole("button", { name: "Verify now" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Withdraw/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Payout/ })).not.toBeInTheDocument();
  });

  /* A verified NIN is the only route to being paid, so it gates the wallet
   * rather than sitting beside it. The figures stay on screen, blurred:
   * hiding a contributor's own earnings would punish them for a step nobody
   * has asked them to take yet. */
  it("blurs the money until identity is verified, then clears", async () => {
    render(<PointsBalanceCard points={0} isEmpty />);
    await userEvent.click(screen.getByRole("button", { name: "Wallet" }));

    expect(await screen.findByText("Verify your identity")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Verify now" }));
    const sheet = await screen.findByRole("dialog");
    await userEvent.type(
      within(sheet).getByLabelText("National Identity Number"),
      "12345678901"
    );
    await userEvent.click(
      within(sheet).getByRole("button", { name: /Submit for checking/ })
    );

    expect(await screen.findByText("We're checking your NIN")).toBeInTheDocument();
  });

  /* Payout is where the bank lives now: the cards are for shuffling, and a
   * card that opens a form on tap cannot be shuffled. The name has to resolve
   * before anything can be saved. */
  it("links a bank from Payout, and only once the name resolves", async () => {
    // The seeded wallet is already verified, so Payout is reachable.
    render(<PointsBalanceCard points={0} />);
    await userEvent.click(screen.getByRole("button", { name: "Wallet" }));
    await userEvent.click(await screen.findByRole("button", { name: /Payout/ }));

    const sheet = await screen.findByRole("dialog");
    expect(
      within(sheet).getByRole("button", { name: /account/i })
    ).toBeDisabled();

    await userEvent.clear(within(sheet).getByLabelText("Account number"));
    await userEvent.click(within(sheet).getByRole("combobox", { name: "Bank" }));
    await userEvent.click(await screen.findByRole("option", { name: "Zenith Bank" }));
    await userEvent.type(within(sheet).getByLabelText("Account number"), "0123456789");

    const link = await within(sheet).findByRole("button", { name: /account/i });
    await waitFor(() => expect(link).toBeEnabled());
    await userEvent.click(link);

    // Named on the Available card's caption once it is linked.
    expect((await screen.findAllByText(/Zenith Bank/)).length).toBeGreaterThan(0);
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

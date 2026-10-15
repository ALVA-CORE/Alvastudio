import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PointsBalanceCard } from "../PointsBalanceCard";
import { MOCK_WALLET, formatWalletNaira } from "@/data/contributors/wallet";

/* The wallet reads from the API now. These tests are about the face, not the
 * network, so the three calls behind it are stubbed with the seeded wallet. */
vi.mock("@/lib/api/wallet", async () => {
  const { MOCK_WALLET } = await import("@/data/contributors/wallet");
  return {
    getWallet: vi.fn(async () => ({
      wallet: { id: "w1", status: "active", identity_status: identity, identity_failure_reason: null },
      earnings: {
        currency: "NGN",
        held: "0", payable: "0", in_flight: "0", paid: "0",
        held_kobo: MOCK_WALLET.pendingKobo,
        payable_kobo: MOCK_WALLET.balanceKobo,
        in_flight_kobo: MOCK_WALLET.inFlightKobo,
        paid_kobo: MOCK_WALLET.paidKobo,
        lifetime_kobo: MOCK_WALLET.lifetimeKobo,
      },
      next_action: null,
      next_action_detail: null,
    })),
    getPayoutDestination: vi.fn(async () => ({
      bank_code: "057",
      bank_name: MOCK_WALLET.payoutAccount?.bank ?? "Zenith Bank",
      account_number: MOCK_WALLET.payoutAccount?.accountNumber ?? "0123456789",
      account_name: MOCK_WALLET.payoutAccount?.accountName ?? "Chioma Okafor",
    })),
    setPayoutDestination: vi.fn(async () => ({
      bank_code: "057",
      bank_name: "Zenith Bank",
      account_number: "0123456789",
      account_name: "Chioma Okafor",
    })),
    listEarnings: vi.fn(async () => ({
      contributor_id: "c1",
      entry_count: MOCK_WALLET.entries.length,
      totals: {},
      entries: MOCK_WALLET.entries.map((entry) => ({
        id: entry.id,
        recording_id: "r1",
        unit_type: "prompt_read",
        amount: String(entry.amountKobo / 100),
        currency: "NGN",
        payout_status: "pending",
        notes: entry.label,
        created_at: new Date(entry.at).toISOString(),
      })),
    })),
    listBanks: vi.fn(async () => [{ code: "057", name: "Zenith Bank" }]),
    /* The stub moves the state the way the API would, so the refetch the
       component fires after submitting sees the new one. */
    submitNin: vi.fn(async () => {
      identity = "submitted";
      return { identity_status: "submitted" };
    }),
    withdraw: vi.fn(async () => ({ id: "run1", status: "in_progress" })),
  };
});

/** Flipped per test, because the gate is the thing being checked. */
let identity: string = "passed";


beforeEach(() => {
  identity = "passed";
});

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
    await waitFor(() =>
      expect(screen.getByText("Paid out")).toBeInTheDocument()
    );
    // `<Money>` sets the ₦ in its own span so it can be sized down, so the
    // figure is split across elements and a plain string will not match it.
    await waitFor(() =>
      expect(
        screen.getByText(
          (_, el) => el?.textContent === formatWalletNaira(MOCK_WALLET.balanceKobo),
          { selector: "span" }
        )
      ).toBeInTheDocument()
    );

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
    identity = "not_started";
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
    identity = "not_started";
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

    /* Name enquiry IS the save: `POST /wallet/payout-destination` resolves the
       name and stores the destination in one call, so the name coming back is
       the confirmation and there is no separate verify step. */
    expect(await within(sheet).findByText("Chioma Okafor")).toBeInTheDocument();

    const link = await within(sheet).findByRole("button", { name: /account/i });
    await waitFor(() => expect(link).toBeEnabled());
    await userEvent.click(link);
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

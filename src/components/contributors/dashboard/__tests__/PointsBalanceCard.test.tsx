import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PointsBalanceCard } from "../PointsBalanceCard";
import { formatWalletNaira } from "@/data/contributors/wallet";
import { WALLET_FIXTURE } from "@/test/walletFixtures";

/* The wallet reads from the API now. These tests are about the face, not the
 * network, so the calls behind it are stubbed with the fixture wallet. */
vi.mock("@/lib/api/wallet", async () => {
  const { WALLET_FIXTURE } = await import("@/test/walletFixtures");
  return {
    getWallet: vi.fn(async () => ({
      wallet: { id: "w1", status: "active", identity_status: identity, identity_failure_reason: null },
      earnings: {
        currency: "NGN",
        held: "0", payable: "0", in_flight: "0", paid: "0",
        held_kobo: WALLET_FIXTURE.pendingKobo,
        payable_kobo: WALLET_FIXTURE.balanceKobo,
        in_flight_kobo: WALLET_FIXTURE.inFlightKobo,
        paid_kobo: WALLET_FIXTURE.paidKobo,
        lifetime_kobo: WALLET_FIXTURE.lifetimeKobo,
      },
      next_action: null,
      next_action_detail: null,
    })),
    /* A list, and no account number: the API returns the last four digits
       only. See `ApiPayoutDestination`. */
    listPayoutDestinations: vi.fn(async () => [
      {
        id: "d1",
        destination_type: "bank_account",
        bank_code: "057",
        account_name: WALLET_FIXTURE.payoutAccount?.accountName ?? "Chioma Okafor",
        account_last4: "6789",
        is_usable: true,
        bachs_destination_id: null,
        created_at: new Date().toISOString(),
      },
    ]),
    setPayoutDestination: vi.fn(async () => ({
      id: "d1",
      destination_type: "bank_account",
      bank_code: "057",
      account_name: "Chioma Okafor",
      account_last4: "6789",
      is_usable: true,
      bachs_destination_id: null,
      created_at: new Date().toISOString(),
    })),
    listEarnings: vi.fn(async () => ({
      contributor_id: "c1",
      entry_count: WALLET_FIXTURE.entries.length,
      totals: {},
      entries: WALLET_FIXTURE.entries.map((entry) => ({
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
    getIdentityMethods: vi.fn(async () => ({
      document_available: true,
      nin_available: false,
      hosted_available: false,
    })),
    createWalletAccount: vi.fn(async () => ({})),
    createOnboardingLink: vi.fn(async () => ({ url: "https://example.test/onboard" })),
    /* The stub moves the state the way the API would, so the refetch the
       component fires after submitting sees the new one. */
    submitIdentityDocument: vi.fn(async (body) => {
      submitted = body;
      identity = "submitted";
      return {
        status: "submitted",
        detail: "Your identity document has been submitted for review.",
        verification_url: null,
      };
    }),
    withdraw: vi.fn(async () => ({ id: "run1", status: "in_progress" })),
  };
});

/** Flipped per test, because the gate is the thing being checked. */
let identity: string = "passed";

/** The last body the document route received, so the shape can be asserted. */
let submitted: Record<string, unknown> | null = null;

beforeEach(() => {
  identity = "passed";
  submitted = null;
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
          (_, el) => el?.textContent === formatWalletNaira(WALLET_FIXTURE.balanceKobo),
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

  /* Clearing identity is the only route to being paid, so it gates the
   * wallet rather than sitting beside it. The figures stay on screen,
   * blurred: hiding a contributor's own earnings would punish them for a
   * step nobody has asked them to take yet. */
  it("blurs the money until identity is verified, then clears", async () => {
    identity = "not_started";
    render(<PointsBalanceCard points={0} isEmpty />);
    await userEvent.click(screen.getByRole("button", { name: "Wallet" }));

    expect(await screen.findByText("Verify your identity")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Verify now" }));
    const sheet = await screen.findByRole("dialog");

    await userEvent.type(within(sheet).getByLabelText("First name"), "Ada");
    await userEvent.type(within(sheet).getByLabelText("Last name"), "Obi");
    /* Three dropdowns rather than a calendar: a birthday thirty years back
       is one tap per field here and three hundred pages of grid there. */
    for (const [field, option] of [
      ["Day of birth", "12"],
      ["Month of birth", "April"],
      ["Year of birth", "1990"],
    ]) {
      await userEvent.click(within(sheet).getByRole("combobox", { name: field }));
      await userEvent.click(await screen.findByRole("option", { name: option }));
    }
    await userEvent.type(
      within(sheet).getByLabelText("National Identity Number"),
      "12345678901"
    );

    /* The API requires a consent attestation and rejects the submission
     * without it, so the step cannot be left until it is ticked. */
    const next = within(sheet).getByRole("button", { name: /Continue/ });
    expect(next).toBeDisabled();

    await userEvent.click(within(sheet).getByRole("checkbox"));
    await userEvent.click(next);

    /* Second step: the document itself. The front is required and the back
     * is not, so submitting is gated on the front alone. */
    const submit = within(sheet).getByRole("button", {
      name: /Submit for review/,
    });
    expect(submit).toBeDisabled();

    const file = new File(["jpeg-bytes"], "nin-slip.jpg", { type: "image/jpeg" });
    await userEvent.upload(
      within(sheet).getByTestId("identity-document-front") as HTMLInputElement,
      file
    );

    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);

    expect(await screen.findByText("We're reviewing your ID")).toBeInTheDocument();

    /* The declared type has to describe the bytes actually sent. Images are
       re-encoded to JPEG on the way out, whatever went in, so this is a
       constant rather than the picked file's type. A one-sided document
       omits the back field entirely rather than sending null. */
    expect(submitted).toMatchObject({
      nin: "12345678901",
      consent: true,
      first_name: "Ada",
      last_name: "Obi",
      dob: "1990-04-12",
      document_content_type: "image/jpeg",
    });
    expect(submitted).not.toHaveProperty("document_back_base64");
    expect(String(submitted?.document_base64)).not.toContain("data:");
  });

  /* A review is a person reading a document. There is nothing to press while
     that happens, and a "check status" button that only reopens the same
     sentence is a button that does nothing. */
  it("offers no retry while a review is running", async () => {
    identity = "submitted";
    render(<PointsBalanceCard points={0} isEmpty />);
    await userEvent.click(screen.getByRole("button", { name: "Wallet" }));

    expect(await screen.findByText("We're reviewing your ID")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Verify now/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Check status/ })).not.toBeInTheDocument();
  });

  /* A failed check is answerable; being sent round the same loop with the
     same words is how somebody submits the same bad crop three times. */
  it("says try again after a failed check", async () => {
    identity = "failed";
    render(<PointsBalanceCard points={0} isEmpty />);
    await userEvent.click(screen.getByRole("button", { name: "Wallet" }));

    expect(await screen.findByText("We could not verify your ID")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
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
    expect(screen.getByText(WALLET_FIXTURE.entries[0].label)).toBeInTheDocument();
  });
});

/**
 * The contributor's wallet.
 *
 * Invented, like the rest of the dashboard's sample data, so the screen can be
 * designed before `/payments/earnings` is wired to it. Shaped the way that
 * endpoint already reports money — kobo, never naira — so swapping it for a
 * fetch is a change of source, not of arithmetic.
 */

export type WalletEntryKind = "earned" | "withdrawal" | "bonus" | "adjustment";

export type WalletEntry = {
  id: string;
  kind: WalletEntryKind;
  label: string;
  /** Kobo. Positive is money in, negative is money out. */
  amountKobo: number;
  at: number;
};

/**
 * Where identity verification has got to.
 *
 * Clearing identity is the only route to being paid: without it there is no
 * payout destination to collect and no eligibility for a run. So this gates
 * the wallet rather than sitting beside it.
 *
 * `blocked` is not `failed`. A failed check is something the contributor can
 * answer by submitting again; a blocked one is a person deciding, and a retry
 * button would be a lie about what is happening.
 */
export type IdentityState =
  | "unverified"
  | "pending"
  | "verified"
  | "failed"
  | "blocked";

/**
 * The step the API says comes next.
 *
 * Carried alongside `identity` rather than folded into it, because the two
 * answer different questions: `identity` is whether the check has cleared,
 * this is what to put on the button. A passed check still leaves
 * `add_payout_destination` or `complete_onboarding` to do.
 */
export type WalletNextAction =
  | "create_account"
  | "verify_identity"
  | "await_verification"
  | "await_review"
  | "add_payout_destination"
  | "complete_onboarding"
  | "none"
  | (string & {});

export type PayoutAccount = {
  bank: string;
  accountNumber: string;
  accountName: string;
};

/**
 * Money, in the buckets the API reports it in.
 *
 * `GET /wallet` splits a contributor's money four ways, not two, and the split
 * is the point: a figure you cannot withdraw shown as one balance reads as a
 * broken button.
 */
export type Wallet = {
  /** Kobo. Matured, above the minimum, a run would send this now. */
  balanceKobo: number;
  /** Kobo. Earned, still inside the review hold window. */
  pendingKobo: number;
  /** Kobo. Claimed by a run, not yet settled. */
  inFlightKobo: number;
  /** Kobo. Settled and gone out. */
  paidKobo: number;
  /** Kobo. The sum of all four. */
  lifetimeKobo: number;
  identity: IdentityState;
  /** Why it failed, or what to do next. Straight from the API. */
  identityDetail?: string | null;
  /**
   * What the API says to do next, followed rather than inferred.
   *
   * Payout capability, a bank destination, account blocks and the hold
   * window all still apply after identity clears, and the API has already
   * weighed them. Reading `wallet.status === "active"` instead would unlock
   * a withdrawal that the next call refuses.
   */
  nextAction: WalletNextAction | null;
  /** Null until a bank is linked. */
  payoutAccount: PayoutAccount | null;
  entries: WalletEntry[];
};

const NAIRA = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Money as a plain string, for places that cannot take markup: a toast, an
 * aria-label. Anything rendered should use `<Money>`, which sets the currency
 * mark smaller than the figure.
 */
export function formatWalletNaira(kobo: number) {
  return NAIRA.format(kobo / 100);
}

function at(dayOffset: number, hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() - dayOffset);
  return date.getTime();
}

export const MOCK_WALLET: Wallet = {
  balanceKobo: 102_010_00,
  pendingKobo: 18_450_00,
  inFlightKobo: 25_000_00,
  paidKobo: 340_860_00,
  lifetimeKobo: 486_320_00,
  identity: "verified",
  nextAction: "none",
  payoutAccount: {
    bank: "Guaranty Trust Bank",
    accountNumber: "0123456789",
    accountName: "Chioma Okafor",
  },
  entries: [
    { id: "w-1", kind: "earned", label: "12 prompt reads approved", amountKobo: 18_000_00, at: at(0, 14, 6) },
    { id: "w-2", kind: "bonus", label: "Weekly streak bonus", amountKobo: 2_500_00, at: at(1, 23, 41) },
    { id: "w-3", kind: "withdrawal", label: "Withdrawal to GTBank", amountKobo: -40_000_00, at: at(3, 9, 18) },
    { id: "w-4", kind: "earned", label: "8 stimuli narrations approved", amountKobo: 18_000_00, at: at(5, 16, 52) },
    { id: "w-5", kind: "earned", label: "Focus group session · 42m", amountKobo: 33_600_00, at: at(8, 11, 5) },
    { id: "w-6", kind: "adjustment", label: "Clip rejected, reversed", amountKobo: -1_500_00, at: at(9, 19, 27) },
    { id: "w-7", kind: "withdrawal", label: "Withdrawal to GTBank", amountKobo: -25_000_00, at: at(14, 8, 2) },
    { id: "w-8", kind: "earned", label: "19 prompt reads approved", amountKobo: 28_500_00, at: at(17, 13, 44) },
  ],
};

export const EMPTY_WALLET: Wallet = {
  balanceKobo: 0,
  pendingKobo: 0,
  inFlightKobo: 0,
  paidKobo: 0,
  lifetimeKobo: 0,
  identity: "unverified",
  nextAction: null,
  payoutAccount: null,
  entries: [],
};

/**
 * Date and clock time. A ledger row without a time is hard to match against
 * what you remember doing, and two entries on the same day become one blur.
 */
export function formatEntryDate(ms: number) {
  const date = new Date(ms);
  const day = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${time}`;
}

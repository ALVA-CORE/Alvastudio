/**
 * The contributor's wallet: the types and the money formatting.
 *
 * Read from `GET /wallet` and `/payments/earnings` by `walletStore`. Money is
 * kobo throughout, never naira — the API sends the decimals as JSON strings
 * precisely so nobody floats them, and they are parsed once, at the boundary.
 *
 * No sample wallet lives here. The one the suite renders against is in
 * `src/test/walletFixtures.ts`, which `eslint.config.js` bars from anything
 * that ships.
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

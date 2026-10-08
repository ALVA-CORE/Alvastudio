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

export type Wallet = {
  /** Kobo. What could be withdrawn right now. */
  balanceKobo: number;
  /** Kobo. Approved but not yet released — recordings still inside the hold. */
  pendingKobo: number;
  /** Kobo, lifetime. */
  lifetimeKobo: number;
  payoutAccount: { bank: string; masked: string } | null;
  entries: WalletEntry[];
};

const NAIRA = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

/** Whole naira: a wallet headline with kobo on it reads like a receipt. */
export function formatWalletNaira(kobo: number) {
  return NAIRA.format(Math.round(kobo / 100));
}

/** Kept to two decimals — a ledger row is exactly where kobo matter. */
export function formatEntryAmount(kobo: number) {
  const sign = kobo < 0 ? "−" : "+";
  return `${sign}₦${(Math.abs(kobo) / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function daysAgo(n: number) {
  const date = new Date();
  date.setHours(9, 0, 0, 0);
  date.setDate(date.getDate() - n);
  return date.getTime();
}

export const MOCK_WALLET: Wallet = {
  balanceKobo: 102_010_00,
  pendingKobo: 18_450_00,
  lifetimeKobo: 486_320_00,
  payoutAccount: { bank: "GTBank", masked: "•••• 4471" },
  entries: [
    { id: "w-1", kind: "earned", label: "12 prompt reads approved", amountKobo: 18_000_00, at: daysAgo(0) },
    { id: "w-2", kind: "bonus", label: "Weekly streak bonus", amountKobo: 2_500_00, at: daysAgo(1) },
    { id: "w-3", kind: "withdrawal", label: "Withdrawal to GTBank", amountKobo: -40_000_00, at: daysAgo(3) },
    { id: "w-4", kind: "earned", label: "8 stimuli narrations approved", amountKobo: 18_000_00, at: daysAgo(5) },
    { id: "w-5", kind: "earned", label: "Focus group session · 42m", amountKobo: 33_600_00, at: daysAgo(8) },
    { id: "w-6", kind: "adjustment", label: "Clip rejected — reversed", amountKobo: -1_500_00, at: daysAgo(9) },
    { id: "w-7", kind: "withdrawal", label: "Withdrawal to GTBank", amountKobo: -25_000_00, at: daysAgo(14) },
    { id: "w-8", kind: "earned", label: "19 prompt reads approved", amountKobo: 28_500_00, at: daysAgo(17) },
  ],
};

export const EMPTY_WALLET: Wallet = {
  balanceKobo: 0,
  pendingKobo: 0,
  lifetimeKobo: 0,
  payoutAccount: null,
  entries: [],
};

export function formatEntryDate(at: number) {
  return new Date(at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

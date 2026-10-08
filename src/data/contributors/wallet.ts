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

export type PayoutAccount = {
  bank: string;
  accountNumber: string;
  accountName: string;
};

export type Wallet = {
  /** Kobo. What could be withdrawn right now. */
  balanceKobo: number;
  /** Kobo. Approved but not yet released — recordings still inside the hold. */
  pendingKobo: number;
  /** Kobo, lifetime. */
  lifetimeKobo: number;
  /** Null until a bank is linked, which is the card's empty state. */
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
  lifetimeKobo: 486_320_00,
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
  lifetimeKobo: 0,
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


const SAMPLE_NAMES = [
  "Chioma Okafor",
  "Tunde Adeyemi",
  "Amaka Nwosu",
  "Ibrahim Bello",
  "Blessing Uche",
];

/**
 * Stands in for the bank's name-enquiry lookup.
 *
 * The real one is a call to the payment provider with the bank code and
 * account number. Deterministic from the digits so the same number always
 * returns the same name — a verification step that gives a different answer
 * each time is not a verification step.
 */
export function resolveAccountName(bank: string, accountNumber: string): string {
  const digits = accountNumber.replace(/\D/g, "");
  let hash = 0;
  for (const char of `${bank}:${digits}`) {
    hash = (hash * 31 + char.charCodeAt(0)) % 100000;
  }
  return SAMPLE_NAMES[hash % SAMPLE_NAMES.length];
}

import type { Wallet, WalletEntry } from "@/data/contributors/wallet";

/**
 * A contributor's wallet, invented, for the suite only.
 *
 * It lives here rather than beside the type it fills because of what the
 * directory means: `eslint.config.js` bars `@/test/*` from anything that
 * ships. A sample wallet sitting in `src/data` is one import away from being
 * a fallback when `GET /wallet` fails, and a figure nobody measured shown to
 * somebody who will act on it is worse than an empty screen.
 *
 * Shaped the way the API reports money — kobo, never naira — so the tests
 * exercise the same arithmetic the screens do.
 */

function at(dayOffset: number, hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() - dayOffset);
  return date.getTime();
}

const ENTRIES: WalletEntry[] = [
  { id: "w-1", kind: "earned", label: "12 prompt reads approved", amountKobo: 18_000_00, at: at(0, 14, 6) },
  { id: "w-2", kind: "bonus", label: "Weekly streak bonus", amountKobo: 2_500_00, at: at(1, 23, 41) },
  { id: "w-3", kind: "withdrawal", label: "Withdrawal to GTBank", amountKobo: -40_000_00, at: at(3, 9, 18) },
  { id: "w-4", kind: "earned", label: "8 stimuli narrations approved", amountKobo: 18_000_00, at: at(5, 16, 52) },
  { id: "w-5", kind: "earned", label: "Focus group session · 42m", amountKobo: 33_600_00, at: at(8, 11, 5) },
  { id: "w-6", kind: "adjustment", label: "Clip rejected, reversed", amountKobo: -1_500_00, at: at(9, 19, 27) },
  { id: "w-7", kind: "withdrawal", label: "Withdrawal to GTBank", amountKobo: -25_000_00, at: at(14, 8, 2) },
  { id: "w-8", kind: "earned", label: "19 prompt reads approved", amountKobo: 28_500_00, at: at(17, 13, 44) },
];

export const WALLET_FIXTURE: Wallet = {
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
  entries: ENTRIES,
};

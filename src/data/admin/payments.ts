import type { PillTone } from "@/components/admin/shared/AdminStatusPill";
import { canRetryBank, type ApiPayoutRun } from "@/lib/api/payouts";

const NAIRA = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
});

export function formatNaira(kobo: number) {
  return NAIRA.format(kobo / 100);
}

/** The API's decimal-string naira ("5000.00"), formatted. Null stays null. */
export function formatNairaAmount(amount: string | null) {
  return amount == null ? null : formatNaira(Math.round(Number(amount) * 100));
}

export type PayoutStatus = "pending" | "processing" | "paid";

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  paid: "Paid",
};

export type Earning = {
  id: string;
  contributor: string;
  recordings: number;
  minutes: number;
  /** Kobo. */
  earnedKobo: number;
  paidKobo: number;
  status: PayoutStatus;
  lastActivityAt: number;
  lastActivityLabel: string;
};

/** Headline figures for the payments page, read off the rows it already has. */
export function paymentMetrics(rows: Earning[]) {
  const owed = rows
    .filter((row) => row.status !== "paid")
    .reduce((sum, row) => sum + row.earnedKobo, 0);

  return {
    owed: formatNaira(owed),
    paid: formatNaira(rows.reduce((sum, row) => sum + row.paidKobo, 0)),
    contributors: String(rows.length),
    pending: String(rows.filter((row) => row.status === "pending").length),
  };
}

export const EMPTY_PAYMENT_METRICS = {
  owed: formatNaira(0),
  paid: formatNaira(0),
  contributors: "0",
  pending: "0",
};

const CSV_HEADER = "contributor,recordings,minutes,earned_ngn,paid_ngn,status";

/** What the "Export" button hands over. Real runs will come from the backend. */
export function earningsToCsv(rows: Earning[]) {
  return [
    CSV_HEADER,
    ...rows.map((row) =>
      [
        `"${row.contributor}"`,
        row.recordings,
        row.minutes,
        (row.earnedKobo / 100).toFixed(2),
        (row.paidKobo / 100).toFixed(2),
        row.status,
      ].join(",")
    ),
  ].join("\n");
}

/** A pay run's own state, as the runs list and its panel show it. */
export const RUN_LABEL: Record<string, string> = {
  in_progress: "Sending",
  completed: "Completed",
  partial: "Partly settled",
  failed: "Failed",
};

export const RUN_TONE: Record<string, PillTone> = {
  in_progress: "pending",
  completed: "good",
  partial: "pending",
  failed: "bad",
};

/** Legs whose money reached the bank, and legs a retry is offered on. */
export function bankSummary(run: ApiPayoutRun) {
  return {
    atBank: run.items.filter((item) => item.bank_status === "paid").length,
    toRetry: run.items.filter(canRetryBank).length,
  };
}

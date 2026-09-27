import { NIGERIAN_NAMES, daysAgo, relativeDays, round1, seeded } from "./shared";

export type RateUnit =
  | "prompt_read"
  | "stimuli_narration"
  | "focus_group_minute"
  | "annotation_minute"
  | "review";

export const RATE_UNIT_LABELS: Record<RateUnit, string> = {
  prompt_read: "Prompt read",
  stimuli_narration: "Stimuli narration",
  focus_group_minute: "Focus group (per minute)",
  annotation_minute: "Annotation (per minute)",
  review: "Review",
};

export type Rate = {
  unit: RateUnit;
  /** Kobo, so the table never does float arithmetic on money. */
  amountKobo: number;
  updatedAt: number;
  updatedLabel: string;
  updatedBy: string;
};

const NAIRA = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
});

export function formatNaira(kobo: number) {
  return NAIRA.format(kobo / 100);
}

function buildRates(): Rate[] {
  const random = seeded(1999);
  const amounts: Record<RateUnit, number> = {
    prompt_read: 15000,
    stimuli_narration: 22500,
    focus_group_minute: 8000,
    annotation_minute: 12000,
    review: 5000,
  };

  return (Object.keys(amounts) as RateUnit[]).map((unit) => {
    const updated = daysAgo(Math.floor(random() * 90) + 5);
    return {
      unit,
      amountKobo: amounts[unit],
      updatedAt: updated.getTime(),
      updatedLabel: relativeDays(updated),
      updatedBy: "Alva Admin",
    };
  });
}

export const RATES: Rate[] = buildRates();

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

function buildEarnings(): Earning[] {
  const random = seeded(2024);

  return NIGERIAN_NAMES.map((contributor, index) => {
    const recordings = Math.floor(random() * 90) + 4;
    const minutes = round1(recordings * (0.4 + random() * 1.2));
    const earnedKobo = Math.round(recordings * 15000 + minutes * 800);
    const roll = random();
    const status: PayoutStatus =
      roll > 0.62 ? "paid" : roll > 0.38 ? "processing" : "pending";
    const activity = daysAgo(Math.floor(random() * 21));

    return {
      id: `e-${String(index + 1).padStart(3, "0")}`,
      contributor,
      recordings,
      minutes,
      earnedKobo,
      // Only a settled payout has money against it.
      paidKobo: status === "paid" ? earnedKobo : 0,
      status,
      lastActivityAt: activity.getTime(),
      lastActivityLabel: relativeDays(activity),
    };
  }).sort((a, b) => b.earnedKobo - a.earnedKobo);
}

export const EARNINGS: Earning[] = buildEarnings();

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

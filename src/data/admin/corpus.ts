import { STATES, daysAgo, isoDay, round1, seeded } from "./shared";

export type CorpusSlice = { label: string; hours: number };
export type GrowthPoint = { date: Date; hours: number };

export type CorpusSnapshot = {
  totalHours: number;
  approvedHours: number;
  contributors: number;
  sessions: number;
  byVariety: CorpusSlice[];
  byStatus: CorpusSlice[];
  byType: CorpusSlice[];
  byState: CorpusSlice[];
  byAge: CorpusSlice[];
  byGender: CorpusSlice[];
  growth: GrowthPoint[];
};

/**
 * Cumulative hours over a year, with a slow start and a steepening middle —
 * what collection actually looks like once interns are trained and the prompt
 * bank stops being the bottleneck. A straight line would flatter the design.
 */
function buildGrowth(days: number, endHours: number): GrowthPoint[] {
  const random = seeded(90210);
  const points: GrowthPoint[] = [];
  let total = 0;

  for (let day = days - 1; day >= 0; day -= 1) {
    const progress = (days - day) / days;
    // Ramp: little happens in the first two months, then it compounds.
    const rate = (endHours / days) * (0.25 + progress * 2.1);
    const weekend = [0, 6].includes(daysAgo(day).getDay()) ? 0.35 : 1;
    total += rate * weekend * (0.7 + random() * 0.6);
    points.push({ date: daysAgo(day), hours: round1(total) });
  }

  // Normalise so the series lands exactly on the headline number.
  const scale = endHours / (points[points.length - 1]?.hours || 1);
  return points.map((point) => ({ ...point, hours: round1(point.hours * scale) }));
}

const TOTAL_HOURS = 486.4;

export const CORPUS: CorpusSnapshot = {
  totalHours: TOTAL_HOURS,
  approvedHours: 351.2,
  contributors: 214,
  sessions: 63,
  byVariety: [
    { label: "Nigerian Pidgin", hours: 268.9 },
    { label: "Nigerian English", hours: 217.5 },
  ],
  byStatus: [
    { label: "Approved", hours: 351.2 },
    { label: "In review", hours: 62.8 },
    { label: "Submitted", hours: 41.1 },
    { label: "Rejected", hours: 31.3 },
  ],
  byType: [
    { label: "Prompt read", hours: 243.7 },
    { label: "Focus group", hours: 168.2 },
    { label: "Stimuli narration", hours: 74.5 },
  ],
  byState: [
    { label: "Lagos", hours: 121.4 },
    { label: "FCT", hours: 68.9 },
    { label: "Rivers", hours: 54.2 },
    { label: "Kano", hours: 47.8 },
    { label: "Oyo", hours: 41.3 },
    { label: "Enugu", hours: 36.7 },
    { label: "Kaduna", hours: 29.5 },
    { label: "Delta", hours: 24.1 },
    { label: "Other", hours: 62.5 },
  ],
  byAge: [
    { label: "18–24", hours: 142.6 },
    { label: "25–34", hours: 178.3 },
    { label: "35–44", hours: 94.7 },
    { label: "45–54", hours: 48.2 },
    { label: "55+", hours: 22.6 },
  ],
  byGender: [
    { label: "Female", hours: 251.8 },
    { label: "Male", hours: 219.4 },
    { label: "Prefer not to say", hours: 15.2 },
  ],
  growth: buildGrowth(365, TOTAL_HOURS),
};

export const EMPTY_CORPUS: CorpusSnapshot = {
  ...CORPUS,
  totalHours: 0,
  approvedHours: 0,
  contributors: 0,
  sessions: 0,
  byVariety: CORPUS.byVariety.map((slice) => ({ ...slice, hours: 0 })),
  byStatus: CORPUS.byStatus.map((slice) => ({ ...slice, hours: 0 })),
  byType: CORPUS.byType.map((slice) => ({ ...slice, hours: 0 })),
  byState: CORPUS.byState.map((slice) => ({ ...slice, hours: 0 })),
  byAge: CORPUS.byAge.map((slice) => ({ ...slice, hours: 0 })),
  byGender: CORPUS.byGender.map((slice) => ({ ...slice, hours: 0 })),
  growth: CORPUS.growth.map((point) => ({ ...point, hours: 0 })),
};

/** Coverage gaps — states with less than the target share of the corpus. */
export function underCoveredStates(snapshot: CorpusSnapshot, targetHours = 40) {
  return STATES.filter((state) => {
    const slice = snapshot.byState.find((entry) => entry.label === state);
    return !slice || slice.hours < targetHours;
  });
}

export const GROWTH_CSV_HEADER = "date,cumulative_hours";

export function growthToCsv(points: GrowthPoint[]) {
  return [
    GROWTH_CSV_HEADER,
    ...points.map((point) => `${isoDay(point.date)},${point.hours}`),
  ].join("\n");
}

import type { DemographicHoursPoint } from "@/data/internDashboard";
import { STATES } from "./shared";

export type CorpusSlice = { label: string; hours: number };
export type GrowthPoint = { date: Date; hours: number };

export type SankeyFlow = {
  nodes: { name: string; category?: "source" | "landing" | "outcome" }[];
  links: { source: number; target: number; value: number }[];
};

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
  /** Collection type through to outcome. Empty until there are clips. */
  flow: SankeyFlow;
};

/**
 * The axes, at zero.
 *
 * These are **categories, not data**: the varieties the corpus collects, the
 * statuses a clip moves through, the brackets the demographics are reported
 * in. A chart has to know them to draw an axis at all, and an empty chart
 * with labelled axes says "nothing yet" where an empty box says "broken".
 *
 * They used to be `CORPUS.byVariety.map(...)` — the labels of an invented
 * 486-hour snapshot with its hours knocked to zero. The snapshot is gone, so
 * they are written out, which is also the only way to see at a glance that
 * every number here is a zero.
 */
function zeroes(labels: string[]): CorpusSlice[] {
  return labels.map((label) => ({ label, hours: 0 }));
}

export const EMPTY_CORPUS: CorpusSnapshot = {
  totalHours: 0,
  approvedHours: 0,
  contributors: 0,
  sessions: 0,
  byVariety: zeroes(["Nigerian Pidgin", "Nigerian English"]),
  byStatus: zeroes(["Approved", "In review", "Submitted", "Rejected"]),
  byType: zeroes(["Prompt read", "Focus group", "Stimuli narration"]),
  byState: zeroes([
    "Lagos",
    "FCT",
    "Rivers",
    "Kano",
    "Oyo",
    "Enugu",
    "Kaduna",
    "Delta",
    "Other",
  ]),
  byAge: zeroes(["18–24", "25–34", "35–44", "45–54", "55+"]),
  byGender: zeroes(["Female", "Male", "Prefer not to say"]),
  growth: [],
  flow: { nodes: [], links: [] },
};

/** Coverage gaps — states with less than the target share of the corpus. */
export function underCoveredStates(snapshot: CorpusSnapshot, targetHours = 40) {
  return STATES.filter((state) => {
    const slice = snapshot.byState.find((entry) => entry.label === state);
    return !slice || slice.hours < targetHours;
  });
}


/**
 * Where audio comes from and how it resolves, in hours.
 *
 * This is the view the annotator dashboard correctly refused: an annotator
 * cannot change intake volume or another reviewer's scoring, so it was a
 * pipeline dashboard wearing a personal one's clothes. On the admin surface it
 * is exactly the right question — the whole job is moving hours from left to
 * right, and the diagram shows where they stop.
 */
export const CORPUS_FLOW: SankeyFlow = {
  nodes: [
    { name: "Prompt read", category: "source" },
    { name: "Focus group", category: "source" },
    { name: "Stimuli", category: "source" },
    { name: "In review", category: "landing" },
    { name: "Annotating", category: "landing" },
    { name: "Approved", category: "outcome" },
    { name: "Flagged", category: "outcome" },
    { name: "Rejected", category: "outcome" },
  ],
  links: [
    // Prompt reads and stimuli go to review; focus groups go to annotation.
    { source: 0, target: 3, value: 243 },
    { source: 2, target: 3, value: 74 },
    { source: 1, target: 4, value: 168 },

    { source: 3, target: 5, value: 241 },
    { source: 3, target: 6, value: 45 },
    { source: 3, target: 7, value: 31 },

    { source: 4, target: 5, value: 110 },
    { source: 4, target: 6, value: 38 },
    { source: 4, target: 7, value: 20 },
  ],
};

export const EMPTY_CORPUS_FLOW: SankeyFlow = {
  nodes: CORPUS_FLOW.nodes,
  links: CORPUS_FLOW.links.map((link) => ({ ...link, value: 0 })),
};


/**
 * The age brackets, with nothing in them.
 *
 * What the chart falls back to before `demographics` on `/corpus/summary`
 * arrives, and what it draws when a corpus has no contributor recordings yet.
 * The brackets stay because an empty pyramid still has to have axes.
 */
export const EMPTY_CORPUS_DEMOGRAPHICS: DemographicHoursPoint[] = [
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55+",
].map((ageBracket) => ({ ageBracket, male: 0, female: 0, undisclosed: 0 }));

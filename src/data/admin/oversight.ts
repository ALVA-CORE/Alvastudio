import {
  type Variety,
} from "./shared";
import type { SunburstNode } from "@/components/charts/sunburst-data";
import type { SankeyFlow } from "./corpus";
import { ANNOTATION_STATUS_COLORS, PERSON_COLORS } from "./statusColors";

/* ------------------------------------------------------------------ *
 * Review oversight
 * ------------------------------------------------------------------ */

export type RecordingStatus =
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "flagged";

export const RECORDING_STATUS_LABELS: Record<RecordingStatus, string> = {
  submitted: "Submitted",
  in_review: "In review",
  approved: "Approved",
  rejected: "Rejected",
  flagged: "Flagged",
};

export type AdminRecording = {
  id: string;
  code: string;
  contributor: string;
  mode: "Prompt read" | "Stimuli" | "Focus group";
  prompt: string;
  durationSec: number;
  duration: string;
  variety: Variety;
  status: RecordingStatus;
  reviewer: string;
  submittedAt: number;
  /** When a verdict landed. 0 while nothing has been decided. */
  reviewedAt: number;
  submittedLabel: string;
  /** Set only when rejected, and it is the thing the page exists to aggregate. */
  rejectionReason?: RejectionReason;
  /**
   * The four answers the reviewer actually gave, from `GET /reviews`.
   *
   * **Null until somebody has reviewed it**, and that is the point. These
   * used to be generated from a seeded random keyed on the recording id:
   * approved clips got four yeses, unreviewed clips got four yeses, and a
   * rejection got a roll of the dice. So an admin opening a clip read a named
   * intern's judgement that the intern had never made, and an unreviewed clip
   * showed a full set of answers under the heading "Reviewer answers".
   */
  rubric: RubricEntry[] | null;
  /** What the reviewer wrote, if anything. */
  reviewNotes?: string | null;
  /**
   * Where the audio lives.
   *
   * One demo file stands in for every clip until `/recordings/{id}` returns a
   * playable URL. The player is real; only the source is not.
   */
  audioUrl: string;
};




export const RUBRIC_QUESTIONS = [
  { id: "noiseFree", label: "Free of background noise" },
  { id: "audible", label: "Clear and audible" },
  { id: "matchesPrompt", label: "Matches the prompt" },
  { id: "natural", label: "Natural and intelligible" },
] as const;

export const RUBRIC_LABELS: Record<RubricAnswer, string> = {
  yes: "Yes",
  partial: "Partly",
  no: "No",
};

/** The rubric a reviewer filled in, derived from the verdict so the two agree. */
export type RubricEntry = {
  id: (typeof RUBRIC_QUESTIONS)[number]["id"];
  label: string;
  answer: RubricAnswer;
};

export type RejectionReason =
  | "Background noise"
  | "Too quiet"
  | "Does not match prompt"
  | "Unnatural delivery"
  | "Clipped or truncated";

export const REJECTION_REASONS: RejectionReason[] = [
  "Background noise",
  "Too quiet",
  "Does not match prompt",
  "Unnatural delivery",
  "Clipped or truncated",
];

/** Rejections grouped by cause — guidance problem or equipment problem. */
export function rejectionBreakdown(rows: AdminRecording[]) {
  const counts = new Map<RejectionReason, number>();
  for (const row of rows) {
    if (!row.rejectionReason) continue;
    counts.set(row.rejectionReason, (counts.get(row.rejectionReason) ?? 0) + 1);
  }
  return REJECTION_REASONS.map((reason) => ({
    reason,
    count: counts.get(reason) ?? 0,
  })).sort((a, b) => b.count - a.count);
}

/* ------------------------------------------------------------------ *
 * Annotation oversight
 * ------------------------------------------------------------------ */

export type AnnotationStatus =
  | "draft"
  | "in_progress"
  | "submitted"
  | "approved"
  | "needs_rework"
  | "rejected";

export const ANNOTATION_STATUS_LABELS: Record<AnnotationStatus, string> = {
  draft: "Draft",
  in_progress: "In progress",
  submitted: "Submitted",
  approved: "Approved",
  needs_rework: "Needs rework",
  rejected: "Rejected",
};

export type AdminAnnotation = {
  id: string;
  code: string;
  topic: string;
  annotator: string;
  status: AnnotationStatus;
  segments: number;
  tags: number;
  durationSec: number;
  duration: string;
  claimedAt: number;
  /** Last change to the annotation. 0 when the API did not say. */
  updatedAt: number;
  claimedLabel: string;
};


/* ------------------------------------------------------------------ *
 * Focus group oversight
 * ------------------------------------------------------------------ */

export type AdminSession = {
  id: string;
  code: string;
  topic: string;
  intern: string;
  state: string;
  variety: Variety;
  participants: number;
  turns: number;
  durationSec: number;
  duration: string;
  hasAudio: boolean;
  /**
   * How many people withdrew and were cut from the recording.
   *
   * A count, not names: they withdrew, so the API keeps no name and neither
   * do we. 0 on nearly every session.
   */
  redactedCount: number;
  /**
   * The annotator working on it, or null when nobody has picked it up.
   *
   * The admin page used to derive this by matching session topics against
   * annotation topics. Both draw from the same topic list, so every session
   * looked claimed and the queue was permanently empty. Unclaimed is a
   * property of the session, not a coincidence of strings.
   */
  claimedBy: string | null;
  createdAt: number;
  createdLabel: string;
};

/* ------------------------------------------------------------------ *
 * Detail-panel extras
 * ------------------------------------------------------------------ */


export type RubricAnswer = "yes" | "partial" | "no";


/* ------------------------------------------------------------------ *
 * Shapes for the oversight charts
 * ------------------------------------------------------------------ */

/** Past this the diagram is a thicket, and the long tail says nothing. */
const FLOW_LIMIT = 6;

/**
 * Reviewers on the left, verdicts on the right.
 *
 * Volume is the thickness of a reviewer's band and keep rate is how it splits,
 * so "decided a lot" and "kept most of it" arrive in one glance instead of as
 * two columns to cross-reference. A thin band running mostly red is the thing
 * this chart exists to surface.
 */
export function reviewerFlow(rows: AdminRecording[]): SankeyFlow {
  const byReviewer = new Map<string, { approved: number; rejected: number }>();

  for (const row of rows) {
    if (!row.reviewer) continue;
    if (row.status !== "approved" && row.status !== "rejected") continue;
    const entry = byReviewer.get(row.reviewer) ?? { approved: 0, rejected: 0 };
    entry[row.status] += 1;
    byReviewer.set(row.reviewer, entry);
  }

  const top = [...byReviewer.entries()]
    .sort((a, b) => b[1].approved + b[1].rejected - (a[1].approved + a[1].rejected))
    .slice(0, FLOW_LIMIT);

  if (top.length === 0) return { nodes: [], links: [] };

  const nodes: SankeyFlow["nodes"] = [
    ...top.map(([name]) => ({ name, category: "source" as const })),
    { name: "Approved", category: "outcome" as const },
    { name: "Rejected", category: "outcome" as const },
  ];

  const approvedIndex = top.length;
  const rejectedIndex = top.length + 1;
  const links: SankeyFlow["links"] = [];

  top.forEach(([, counts], index) => {
    if (counts.approved > 0) {
      links.push({ source: index, target: approvedIndex, value: counts.approved });
    }
    if (counts.rejected > 0) {
      links.push({ source: index, target: rejectedIndex, value: counts.rejected });
    }
  });

  return { nodes, links };
}

/**
 * Annotator, then where their sessions landed.
 *
 * Throughput on its own was three numbers in a row. Nested, the same work
 * answers the question that follows it: ring length is how much someone did
 * and the outer band is whether it stood up, so a big producer whose sessions
 * all sit in "Needs rework" is a shape rather than a figure you go looking
 * for.
 */
export function annotatorBreakdown(rows: AdminAnnotation[]): SunburstNode {
  const byAnnotator = new Map<string, Map<AnnotationStatus, number>>();

  for (const row of rows) {
    if (!row.annotator) continue;
    const statuses = byAnnotator.get(row.annotator) ?? new Map();
    statuses.set(row.status, (statuses.get(row.status) ?? 0) + 1);
    byAnnotator.set(row.annotator, statuses);
  }

  const children = [...byAnnotator.entries()]
    .map(([name, statuses], index) => ({
      name,
      color: PERSON_COLORS[index % PERSON_COLORS.length],
      children: [...statuses.entries()]
        .map(([status, count]) => ({
          name: ANNOTATION_STATUS_LABELS[status],
          value: count,
          color: ANNOTATION_STATUS_COLORS[status],
        }))
        .sort((a, b) => b.value - a.value),
    }))
    .sort(
      (a, b) =>
        b.children.reduce((sum, child) => sum + child.value, 0) -
        a.children.reduce((sum, child) => sum + child.value, 0)
    );

  return { name: "Annotators", children };
}

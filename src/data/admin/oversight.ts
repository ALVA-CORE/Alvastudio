import {
  NIGERIAN_NAMES,
  STATES,
  VARIETIES,
  daysAgo,
  formatDuration,
  pick,
  relativeDays,
  round1,
  seeded,
  type Variety,
} from "./shared";
import type { SunburstNode } from "@/components/charts/sunburst-data";
import type { SankeyFlow } from "./corpus";

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
  submittedLabel: string;
  /** Set only when rejected, and it is the thing the page exists to aggregate. */
  rejectionReason?: RejectionReason;
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

const MODES = ["Prompt read", "Stimuli", "Focus group"] as const;
const STATUSES: RecordingStatus[] = [
  "approved", "approved", "approved", "approved",
  "in_review", "in_review",
  "submitted", "submitted",
  "rejected",
  "flagged",
];

const SAMPLE_PROMPTS = [
  "The traffic for Lagos island go always choke by seven a.m.",
  "Tell us about a market day you still remember.",
  "Describe the last time you helped a stranger find their way.",
  "Talk about a meal your family makes that nobody else gets right.",
  "Explain how you get to work, from the moment you leave your door.",
];

function buildRecordings(count: number): AdminRecording[] {
  const random = seeded(31337);

  return Array.from({ length: count }, (_, index) => {
    const status = pick(random, STATUSES);
    const submitted = daysAgo(Math.floor(random() * 45));
    const durationSec = Math.floor(random() * 95) + 12;

    return {
      id: `r-${String(index + 1).padStart(3, "0")}`,
      code: `REC-${String(index + 1).padStart(4, "0")}`,
      contributor: pick(random, NIGERIAN_NAMES),
      mode: pick(random, MODES),
      prompt: pick(random, SAMPLE_PROMPTS),
      durationSec,
      duration: formatDuration(durationSec),
      variety: pick(random, VARIETIES),
      status,
      reviewer:
        status === "submitted" ? "" : pick(random, NIGERIAN_NAMES.slice(0, 6)),
      submittedAt: submitted.getTime(),
      submittedLabel: relativeDays(submitted),
      rejectionReason:
        status === "rejected" || status === "flagged"
          ? pick(random, REJECTION_REASONS)
          : undefined,
    };
  }).sort((a, b) => b.submittedAt - a.submittedAt);
}

export const ADMIN_RECORDINGS: AdminRecording[] = buildRecordings(64);

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
  claimedLabel: string;
};

const TOPICS = [
  "Discuss one habit young people have that older people complain about.",
  "Debate whether remote work is better than going to the office.",
  "Talk about how social media changed communication in Nigeria.",
  "Discuss what makes a voice sound trustworthy.",
  "Tell us about a memorable market day.",
];

const ANNOTATION_STATUSES: AnnotationStatus[] = [
  "approved", "approved", "approved",
  "submitted", "submitted",
  "in_progress", "in_progress",
  "draft",
  "needs_rework",
];

function buildAnnotations(count: number): AdminAnnotation[] {
  const random = seeded(8086);

  return Array.from({ length: count }, (_, index) => {
    const claimed = daysAgo(Math.floor(random() * 30));
    const durationSec = Math.floor(random() * 2100) + 600;
    const segments = Math.floor(random() * 220) + 40;

    return {
      id: `a-${String(index + 1).padStart(3, "0")}`,
      code: `ANN-${String(index + 1).padStart(4, "0")}`,
      topic: pick(random, TOPICS),
      annotator: pick(random, NIGERIAN_NAMES.slice(0, 8)),
      status: pick(random, ANNOTATION_STATUSES),
      segments,
      tags: Math.floor(segments * (0.3 + random() * 0.8)),
      durationSec,
      duration: formatDuration(durationSec),
      claimedAt: claimed.getTime(),
      claimedLabel: relativeDays(claimed),
    };
  }).sort((a, b) => b.claimedAt - a.claimedAt);
}

export const ADMIN_ANNOTATIONS: AdminAnnotation[] = buildAnnotations(38);

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
  createdAt: number;
  createdLabel: string;
};

function buildSessions(count: number): AdminSession[] {
  const random = seeded(6502);

  return Array.from({ length: count }, (_, index) => {
    const created = daysAgo(Math.floor(random() * 60));
    // A quarter never got their audio uploaded — invisible work, and the
    // single most useful thing this page surfaces.
    const hasAudio = random() > 0.25;
    const durationSec = hasAudio ? Math.floor(random() * 2400) + 900 : 0;
    const participants = Math.floor(random() * 5) + 2;

    return {
      id: `fg-${String(index + 1).padStart(3, "0")}`,
      code: `FG-${String(index + 1).padStart(4, "0")}`,
      topic: pick(random, TOPICS),
      intern: pick(random, NIGERIAN_NAMES.slice(8, 14)),
      state: pick(random, STATES),
      variety: pick(random, VARIETIES),
      participants,
      turns: hasAudio ? Math.floor(random() * 90) + participants * 4 : 0,
      durationSec,
      duration: hasAudio ? formatDuration(durationSec) : ", ",
      hasAudio,
      createdAt: created.getTime(),
      createdLabel: relativeDays(created),
    };
  }).sort((a, b) => b.createdAt - a.createdAt);
}

export const ADMIN_SESSIONS: AdminSession[] = buildSessions(42);


/* ------------------------------------------------------------------ *
 * Detail-panel extras
 * ------------------------------------------------------------------ */

import type { AuditEntry } from "@/components/admin/shared/detail";

export type RubricAnswer = "yes" | "partial" | "no";

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
export function recordingRubric(
  recording: AdminRecording
): Array<{ id: string; label: string; answer: RubricAnswer }> {
  const random = seeded(
    [...recording.id].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 1e5, 7)
  );

  return RUBRIC_QUESTIONS.map((question) => {
    if (recording.status === "approved") return { ...question, answer: "yes" as const };
    if (recording.status === "submitted" || recording.status === "in_review") {
      return { ...question, answer: "yes" as const };
    }
    // A rejection needs at least one "no"; a flag is softer.
    const roll = random();
    const answer: RubricAnswer =
      recording.status === "rejected"
        ? roll > 0.6
          ? "no"
          : roll > 0.3
            ? "partial"
            : "yes"
        : roll > 0.55
          ? "partial"
          : "yes";
    return { ...question, answer };
  });
}

export function recordingAudit(recording: AdminRecording): AuditEntry[] {
  const entries: AuditEntry[] = [
    {
      id: "submitted",
      label: `Submitted by ${recording.contributor}`,
      at: new Date(recording.submittedAt),
    },
  ];

  if (recording.reviewer) {
    entries.push({
      id: "claimed",
      label: `Claimed by ${recording.reviewer}`,
      at: new Date(recording.submittedAt + 36e5),
      byAdmin: true,
    });
  }

  if (recording.status !== "submitted" && recording.status !== "in_review") {
    entries.push({
      id: "decided",
      label: `${RECORDING_STATUS_LABELS[recording.status]}${
        recording.rejectionReason ? `, ${recording.rejectionReason}` : ""
      }`,
      at: new Date(recording.submittedAt + 72e5),
      byAdmin: true,
    });
  }

  return entries.sort((a, b) => b.at.getTime() - a.at.getTime());
}

export function annotationAudit(annotation: AdminAnnotation): AuditEntry[] {
  const entries: AuditEntry[] = [
    {
      id: "claimed",
      label: `Claimed by ${annotation.annotator}`,
      at: new Date(annotation.claimedAt),
    },
  ];

  if (annotation.status !== "draft" && annotation.status !== "in_progress") {
    entries.push({
      id: "submitted",
      label: "Submitted for review",
      at: new Date(annotation.claimedAt + 864e5),
    });
  }

  if (annotation.status === "approved" || annotation.status === "needs_rework") {
    entries.push({
      id: "reviewed",
      label:
        annotation.status === "approved" ? "Approved" : "Sent back for rework",
      at: new Date(annotation.claimedAt + 1728e5),
      byAdmin: true,
    });
  }

  return entries.sort((a, b) => b.at.getTime() - a.at.getTime());
}

export function sessionAudit(session: AdminSession): AuditEntry[] {
  const entries: AuditEntry[] = [
    {
      id: "created",
      label: `Session created by ${session.intern}`,
      at: new Date(session.createdAt),
    },
    {
      id: "participants",
      label: `${session.participants} participants logged`,
      at: new Date(session.createdAt + 6e5),
    },
  ];

  if (session.hasAudio) {
    entries.push({
      id: "audio",
      label: "Audio uploaded",
      at: new Date(session.createdAt + 36e5),
    });
  }

  return entries.sort((a, b) => b.at.getTime() - a.at.getTime());
}

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
    .map(([name, statuses]) => ({
      name,
      children: [...statuses.entries()]
        .map(([status, count]) => ({
          name: ANNOTATION_STATUS_LABELS[status],
          value: count,
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

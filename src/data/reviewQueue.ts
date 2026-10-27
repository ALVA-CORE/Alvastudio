export type ReviewVerdict = "approve" | "reject" | "flag";

export type ReviewQueueStatus = "pending" | "completed";

export type ReviewQueueItem = {
  id: string;
  contributor: string;
  mode: "Prompt reader" | "Stimuli" | "Focus group";
  duration: string;
  durationSec: number;
  submittedAt: string;
  prompt: string;
  audioSrc: string;
  device: string;
  language: string;
  status: ReviewQueueStatus;
  /**
   * Who the clip is assigned to, if anybody.
   *
   * Carried so the page can tell "yours to decide" from "somebody else's".
   * Without it an intern could fill in the whole rubric on a clip that had
   * been handed to another reviewer and only find out at submit.
   */
  assignedReviewerId: string | null;
  assignedReviewerName: string | null;
  draft?: {
    answers: QualityAnswers;
    notes: string;
    regions: AudioRegion[];
    playbackTime: number;
    completed: boolean;
  };
};

export type TriStateAnswer = "yes" | "partial" | "no" | "";

export type QualityAnswers = {
  noiseFree: TriStateAnswer;
  audible: TriStateAnswer;
  matchesPrompt: TriStateAnswer;
  natural: TriStateAnswer;
  verdict: ReviewVerdict | "";
};

export const QUALITY_QUESTIONS = [
  {
    id: "noiseFree" as const,
    label: "Is the audio free of background noise or interference?",
  },
  {
    id: "audible" as const,
    label: "Is speech clearly audible without clipping or distortion?",
  },
  {
    id: "matchesPrompt" as const,
    label: "Does the recording match the assigned prompt or stimulus?",
  },
  {
    id: "natural" as const,
    label: "Is speech natural and intelligible throughout?",
  },
];

export type RegionTag =
  | "background-noise"
  | "clipping"
  | "off-prompt"
  | "unintelligible"
  | "good-segment"
  | "custom";

export type AudioRegion = {
  id: string;
  start: number;
  end: number;
  tag: RegionTag;
  label: string;
  customText?: string;
  color: string;
};

export const TRI_STATE_OPTIONS: Array<{ value: TriStateAnswer; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "partial", label: "Partial" },
  { value: "no", label: "No" },
];

export const REVIEW_STATUS_LABELS: Record<
  "not-started" | "in-progress" | "completed",
  string
> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  completed: "Done",
};

export const VERDICT_LABELS: Record<ReviewVerdict, string> = {
  approve: "Accept",
  reject: "Reject",
  flag: "Flag for review",
};

export function isRubricComplete(answers: Omit<QualityAnswers, "verdict">) {
  return QUALITY_QUESTIONS.every((question) => answers[question.id] !== "");
}

/** Metrical verdict from rubric answers — not a discretionary intern choice. */
export function calculateVerdictFromAnswers(
  answers: Omit<QualityAnswers, "verdict">
): ReviewVerdict | "" {
  if (!isRubricComplete(answers)) return "";

  const values = QUALITY_QUESTIONS.map((question) => answers[question.id]);
  if (values.every((value) => value === "yes")) return "approve";
  if (values.some((value) => value === "no")) return "reject";
  return "flag";
}

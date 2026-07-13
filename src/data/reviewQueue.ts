import { buildReviewQueue } from "@/data/reviewQueueData";

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
  draft?: {
    answers: QualityAnswers;
    notes: string;
    regions: AudioRegion[];
    playbackTime: number;
    completed: boolean;
  };
};

export const REVIEW_QUEUE: ReviewQueueItem[] = buildReviewQueue();

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

/** @deprecated Use AudioRegion */
export type WaveMarker = AudioRegion;

export function colorWithAlpha(hex: string, alpha = 0.35) {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const MARKER_COLORS = [
  "#25F07D",
  "#53A8F2",
  "#B87CFF",
  "#F5A623",
  "#FF6B8A",
  "#5CE1E6",
] as const;

export const REGION_TAGS: Array<{
  id: Exclude<RegionTag, "custom">;
  label: string;
  description: string;
}> = [
  {
    id: "background-noise",
    label: "Background noise",
    description: "Traffic, room tone, or interference over the speaker",
  },
  {
    id: "clipping",
    label: "Clipping",
    description: "Distorted or peaking audio on loud moments",
  },
  {
    id: "off-prompt",
    label: "Off-prompt",
    description: "Speaker drifted from the assigned text or stimulus",
  },
  {
    id: "unintelligible",
    label: "Unintelligible",
    description: "Hard to understand speech at this timestamp",
  },
  {
    id: "good-segment",
    label: "Good segment",
    description: "Clean, usable audio worth keeping in the corpus",
  },
];

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

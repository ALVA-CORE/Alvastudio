export type ReviewVerdict = "approve" | "reject" | "flag";

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
};

export const REVIEW_QUEUE: ReviewQueueItem[] = [
  {
    id: "1",
    contributor: "Ada O.",
    mode: "Prompt reader",
    duration: "0:10",
    durationSec: 10,
    submittedAt: "2h ago",
    prompt: "The traffic for Lagos island go always choke by seven a.m.",
    audioSrc: "/audio/demo-ada.wav",
    device: "iPhone 14",
    language: "Nigerian English",
  },
  {
    id: "2",
    contributor: "Kemi A.",
    mode: "Stimuli",
    duration: "0:14",
    durationSec: 14,
    submittedAt: "4h ago",
    prompt: "Tell us about a time network failure affected your work or school.",
    audioSrc: "/audio/demo-kemi.wav",
    device: "Samsung A54",
    language: "Nigerian Pidgin",
  },
  {
    id: "3",
    contributor: "Tunde M.",
    mode: "Prompt reader",
    duration: "0:10",
    durationSec: 10,
    submittedAt: "6h ago",
    prompt: "She dey always reach office before anybody else for her team.",
    audioSrc: "/audio/demo-tunde.wav",
    device: "Pixel 7",
    language: "Nigerian English",
  },
  {
    id: "4",
    contributor: "Ngozi E.",
    mode: "Stimuli",
    duration: "0:14",
    durationSec: 14,
    submittedAt: "Yesterday",
    prompt: "Describe how people around you switch between English and Pidgin in daily talk.",
    audioSrc: "/audio/demo-ngozi.wav",
    device: "iPhone 13",
    language: "Nigerian English",
  },
];

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

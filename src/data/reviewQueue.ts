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

export const DEMO_AUDIO_SRC = "/audio/demo-review.mp3";

export const REVIEW_QUEUE: ReviewQueueItem[] = [
  {
    id: "1",
    contributor: "Ada O.",
    mode: "Prompt reader",
    duration: "0:42",
    durationSec: 42,
    submittedAt: "2h ago",
    prompt: "The traffic for Lagos island go always choke by seven a.m.",
    audioSrc: DEMO_AUDIO_SRC,
    device: "iPhone 14",
    language: "Nigerian English",
  },
  {
    id: "2",
    contributor: "Kemi A.",
    mode: "Stimuli",
    duration: "1:08",
    durationSec: 68,
    submittedAt: "4h ago",
    prompt: "Tell us about a time network failure affected your work or school.",
    audioSrc: DEMO_AUDIO_SRC,
    device: "Samsung A54",
    language: "Nigerian Pidgin",
  },
  {
    id: "3",
    contributor: "Tunde M.",
    mode: "Prompt reader",
    duration: "0:55",
    durationSec: 55,
    submittedAt: "6h ago",
    prompt: "She dey always reach office before anybody else for her team.",
    audioSrc: DEMO_AUDIO_SRC,
    device: "Pixel 7",
    language: "Nigerian English",
  },
  {
    id: "4",
    contributor: "Ngozi E.",
    mode: "Stimuli",
    duration: "1:22",
    durationSec: 82,
    submittedAt: "Yesterday",
    prompt: "Describe how people around you switch between English and Pidgin in daily talk.",
    audioSrc: DEMO_AUDIO_SRC,
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
  | "good-segment";

export type TimestampMarker = {
  id: string;
  time: number;
  tag: RegionTag;
  label: string;
};

export const REGION_TAGS: Array<{
  id: RegionTag;
  label: string;
  description: string;
}> = [
  {
    id: "background-noise",
    label: "Background noise",
    description: "Mark sections with interference or room noise",
  },
  {
    id: "clipping",
    label: "Clipping",
    description: "Flag distortion or peaking on loud segments",
  },
  {
    id: "off-prompt",
    label: "Off-prompt",
    description: "Speaker diverged from assigned text or stimulus",
  },
  {
    id: "unintelligible",
    label: "Unintelligible",
    description: "Speech is hard to understand at this point",
  },
  {
    id: "good-segment",
    label: "Good segment",
    description: "Highlight clean, usable audio for the corpus",
  },
];

export const ANNOTATION_TOOLS = [
  { id: "scrub", label: "Waveform scrub", description: "Click or drag timeline to jump" },
  { id: "speed", label: "Playback speed", description: "0.5x to 1.5x for careful listening" },
  { id: "skip", label: "Skip ±5s", description: "Move backward or forward in the clip" },
  { id: "markers", label: "Timestamp markers", description: "Drop flags at the playhead" },
  { id: "regions", label: "Region tags", description: "Label noise, clipping, or good spans" },
  { id: "notes", label: "Reviewer notes", description: "Free-text context for QA handoff" },
  { id: "rubric", label: "Quality rubric", description: "Five-question inclusion checklist" },
  { id: "verdict", label: "Verdict actions", description: "Approve, reject, or flag for review" },
];

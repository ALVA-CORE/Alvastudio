import type { AudioRegion, QualityAnswers, ReviewQueueItem } from "@/data/reviewQueue";

const CONTRIBUTORS = [
  "Ada O.",
  "Kemi A.",
  "Tunde M.",
  "Ngozi E.",
  "Chidi N.",
  "Fatima B.",
  "Emeka J.",
  "Amina S.",
  "Bola K.",
  "Yusuf H.",
  "Grace I.",
  "Segun P.",
  "Halima D.",
  "Ifeanyi C.",
  "Zainab R.",
  "David L.",
  "Blessing T.",
  "Musa F.",
  "Chioma V.",
  "Ibrahim W.",
];

const MODES: ReviewQueueItem["mode"][] = ["Prompt reader", "Stimuli", "Focus group"];

const AUDIO_SOURCES = [
  "/audio/demo-ada.wav",
  "/audio/demo-kemi.wav",
  "/audio/demo-tunde.wav",
  "/audio/demo-ngozi.wav",
];

const PROMPTS = [
  "The traffic for Lagos island go always choke by seven a.m.",
  "Tell us about a time network failure affected your work or school.",
  "She dey always reach office before anybody else for her team.",
  "Describe how people around you switch between English and Pidgin in daily talk.",
  "Explain one market phrase you hear every week in your neighborhood.",
  "How do you greet elders in your community when you arrive?",
  "Talk about a bus conductor shouting route names on your commute.",
  "Describe a family meal where everyone speaks differently.",
  "What phrase do you use when asking someone to wait briefly?",
  "Tell us about code-switching during a phone call with a relative.",
];

const DEVICES = ["iPhone 14", "Samsung A54", "Pixel 7", "iPhone 13", "Tecno Spark", "Redmi Note"];
const LANGUAGES = ["Nigerian English", "Nigerian Pidgin", "Yoruba-English mix", "Igbo-English mix"];
const SUBMITTED = ["1h ago", "2h ago", "4h ago", "6h ago", "Yesterday", "2d ago", "3d ago", "1w ago"];

export type ReviewDraft = {
  answers: QualityAnswers;
  notes: string;
  regions: AudioRegion[];
  playbackTime: number;
  completed: boolean;
};

const KEMI_DRAFT: ReviewDraft = {
  answers: {
    noiseFree: "yes",
    audible: "partial",
    matchesPrompt: "",
    natural: "",
    verdict: "",
  },
  notes: "Network drop around 0:04, checking Pidgin mix through the middle.",
  playbackTime: 4.2,
  regions: [
    {
      id: "seed-kemi-noise",
      start: 3.4,
      end: 6.1,
      tag: "background-noise",
      label: "Background noise",
      color: "#25F07D",
    },
  ],
  completed: false,
};

const ADA_COMPLETED: ReviewDraft = {
  answers: {
    noiseFree: "yes",
    audible: "yes",
    matchesPrompt: "yes",
    natural: "yes",
    verdict: "approve",
  },
  notes: "Clean read, good Lagos English cadence.",
  playbackTime: 0,
  regions: [
    {
      id: "seed-ada-good",
      start: 1.2,
      end: 4.8,
      tag: "good-segment",
      label: "Good segment",
      color: "#53A8F2",
    },
  ],
  completed: true,
};

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function buildReviewQueue(): ReviewQueueItem[] {
  return Array.from({ length: 36 }, (_, index) => {
    const id = String(index + 1);
    const contributor = CONTRIBUTORS[index % CONTRIBUTORS.length];
    const mode = MODES[index % MODES.length];
    const durationSec = mode === "Focus group" ? 14 : index % 2 === 0 ? 10 : 14;
    const isCompleted = index >= 28;
    const hasDraft = id === "2" || id === "5";

    let draft: ReviewDraft | undefined;
    if (id === "2") draft = KEMI_DRAFT;
    if (id === "5") {
      draft = {
        answers: {
          noiseFree: "partial",
          audible: "",
          matchesPrompt: "",
          natural: "",
          verdict: "",
        },
        notes: "Started rubric, need second listen on prompt match.",
        playbackTime: 2.8,
        regions: [],
        completed: false,
      };
    }
    if (id === "29") draft = ADA_COMPLETED;

    return {
      id,
      contributor: index < 4 ? CONTRIBUTORS[index] : contributor,
      mode: index < 4 ? MODES[index % 3] : mode,
      duration: formatDuration(durationSec),
      durationSec,
      submittedAt: SUBMITTED[index % SUBMITTED.length],
      prompt: PROMPTS[index % PROMPTS.length],
      audioSrc: AUDIO_SOURCES[index % AUDIO_SOURCES.length],
      device: DEVICES[index % DEVICES.length],
      language: LANGUAGES[index % LANGUAGES.length],
      status: isCompleted ? "completed" : "pending",
      draft: hasDraft || id === "29" ? draft : undefined,
    };
  });
}

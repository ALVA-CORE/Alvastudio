import { FOCUS_GROUP_PROMPTS } from "@/data/prompts";

/**
 * Focus-group sessions queued for annotation. Annotators work whole sessions
 * (multi-speaker conversational audio), not the single-speaker prompt/stimuli
 * clips that interns review.
 *
 * Replace with API data once the backend lands.
 */

export type AnnotationStatus = "not-started" | "in-progress" | "completed";

export type AnnotatorSession = {
  id: string;
  /** Human-facing session code, e.g. FG-2026-014. */
  code: string;
  topic: string;
  state: string;
  participants: number;
  speakers: number;
  duration: string;
  durationSec: number;
  language: "Nigerian English" | "Nigerian Pidgin" | "Mixed";
  recordedBy: string;
  recordedAt: string;
  recordedAtTs: number;
  status: AnnotationStatus;
  /** Tags applied so far. */
  tagCount: number;
  audioSrc: string;
};

export const ANNOTATION_STATUS_LABELS: Record<AnnotationStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  completed: "Done",
};

const STATES = ["Lagos", "FCT", "Rivers", "Kano", "Oyo", "Enugu", "Kaduna", "Delta"];

const INTERNS = [
  "Tolu A.",
  "Ngozi E.",
  "Musa F.",
  "Blessing T.",
  "Segun P.",
  "Halima D.",
];

const LANGUAGES: AnnotatorSession["language"][] = [
  "Nigerian Pidgin",
  "Nigerian English",
  "Mixed",
];

const AUDIO_SOURCES = [
  "/audio/demo-ada.wav",
  "/audio/demo-kemi.wav",
  "/audio/demo-tunde.wav",
  "/audio/demo-ngozi.wav",
];

const RECORDED_LABELS = [
  "2h ago",
  "5h ago",
  "Yesterday",
  "2d ago",
  "3d ago",
  "4d ago",
  "1w ago",
  "2w ago",
];

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function buildSessions(): AnnotatorSession[] {
  return Array.from({ length: 27 }, (_, index) => {
    const status: AnnotationStatus =
      index < 3 ? "in-progress" : index >= 19 ? "completed" : "not-started";

    // 18–47 min sessions — focus groups run long compared with solo clips.
    const durationSec = 18 * 60 + ((index * 137) % 1740);
    const participants = 2 + (index % 3);

    return {
      id: `fg-${String(index + 1).padStart(3, "0")}`,
      code: `FG-2026-${String(index + 1).padStart(3, "0")}`,
      topic: FOCUS_GROUP_PROMPTS[index % FOCUS_GROUP_PROMPTS.length].text,
      state: STATES[index % STATES.length],
      participants,
      // One extra voice on the tape: the intern moderating.
      speakers: participants + 1,
      duration: formatDuration(durationSec),
      durationSec,
      language: LANGUAGES[index % LANGUAGES.length],
      recordedBy: INTERNS[index % INTERNS.length],
      recordedAt: RECORDED_LABELS[index % RECORDED_LABELS.length],
      recordedAtTs: Date.now() - 1000 * 60 * 60 * (index * 7 + 2),
      status,
      tagCount:
        status === "not-started" ? 0 : status === "in-progress" ? 4 + (index % 9) : 18 + (index % 24),
      audioSrc: AUDIO_SOURCES[index % AUDIO_SOURCES.length],
    };
  });
}

export const ANNOTATOR_SESSIONS: AnnotatorSession[] = buildSessions();

/**
 * Hands a session back as finished.
 *
 * Mutates the in-memory row, the same shape `saveTranscript` uses for the
 * transcript cache — so a session marked done stays done while the app is open
 * and resets on reload. Replace with the API call when the backend lands; the
 * signature is already the one a mutation would take.
 */
export function markSessionComplete(id: string): Promise<AnnotatorSession | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const session = ANNOTATOR_SESSIONS.find((entry) => entry.id === id);
      if (!session) {
        resolve(null);
        return;
      }

      session.status = "completed";
      resolve(session);
    }, 380);
  });
}

export function getAnnotatorSessions() {
  return ANNOTATOR_SESSIONS;
}

export type AnnotatorSessionMetrics = {
  queued: string;
  queuedTrend: string;
  hoursPending: string;
  hoursPendingTrend: string;
  avgSession: string;
  avgSessionTrend: string;
  speakersCovered: string;
  speakersTrend: string;
  periodLabel: string;
};

export const SESSION_METRICS: AnnotatorSessionMetrics = {
  queued: "19",
  queuedTrend: "+6",
  hoursPending: "9.8h",
  hoursPendingTrend: "+1.4h",
  avgSession: "32m",
  avgSessionTrend: "-3m",
  speakersCovered: "84",
  speakersTrend: "+12",
  periodLabel: "Awaiting annotation",
};

export const EMPTY_SESSION_METRICS: AnnotatorSessionMetrics = {
  queued: "0",
  queuedTrend: "0",
  hoursPending: "0h",
  hoursPendingTrend: "0h",
  avgSession: "—",
  avgSessionTrend: "0m",
  speakersCovered: "0",
  speakersTrend: "0",
  periodLabel: SESSION_METRICS.periodLabel,
};

export function formatLanguageShort(language: AnnotatorSession["language"]) {
  if (language === "Nigerian Pidgin") return "Pidgin";
  if (language === "Nigerian English") return "English";
  return "Mixed";
}

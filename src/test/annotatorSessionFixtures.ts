import { FOCUS_GROUP_PROMPTS } from "@/test/focusGroupPrompts";
import type { AnnotationStatus, AnnotatorSession } from "@/data/annotators/sessions";

/**
 * Annotator sessions, invented, for the suite only.
 *
 * These lived in `src/data/annotators/sessions.ts` beside the real status
 * labels, which meant a generated roster of sessions — intern names, states,
 * durations, audio filenames — was one import away from any annotator
 * screen. `eslint.config.js` bars `@/test/*` from anything that ships, so
 * here it cannot be.
 */

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

export function getAnnotatorSessions() {
  return ANNOTATOR_SESSIONS;
}


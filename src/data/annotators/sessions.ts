import { NO_VALUE } from "@/lib/no-value";

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

/**
 * What the four cards are counting.
 *
 * A label, not a figure. There used to be a `SESSION_METRICS` beside this
 * holding "19" queued and "9.8h" pending, invented, and the page reached
 * into it for this one string — leaving eight fabricated numbers sitting one
 * typo away from a screen an annotator would act on.
 */
export const SESSIONS_PERIOD_LABEL = "Awaiting annotation";

export const EMPTY_SESSION_METRICS: AnnotatorSessionMetrics = {
  queued: "0",
  queuedTrend: "0",
  hoursPending: "0h",
  hoursPendingTrend: "0h",
  avgSession: NO_VALUE,
  avgSessionTrend: "0m",
  speakersCovered: "0",
  speakersTrend: "0",
  periodLabel: SESSIONS_PERIOD_LABEL,
};

export function formatLanguageShort(language: AnnotatorSession["language"]) {
  if (language === "Nigerian Pidgin") return "Pidgin";
  if (language === "Nigerian English") return "English";
  return "Mixed";
}

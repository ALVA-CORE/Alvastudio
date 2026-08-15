/**
 * Domain types for the annotation workspace.
 *
 * The workspace edits one `TranscriptDoc` per focus-group session. A doc is the
 * undoable unit: everything inside it goes through the history stack, and
 * everything outside it (playback position, zoom, which speaker is selected)
 * deliberately does not — rewinding the tape is not an edit, so Ctrl+Z must
 * never move the playhead.
 */

export type SegmentId = string;
export type SpeakerId = string;

/** Who is talking. Diarization produces these; the annotator renames them. */
export type Speaker = {
  id: SpeakerId;
  /** Stable machine label from diarization, e.g. "Speaker A". */
  label: string;
  /** Annotator-assigned display name. Falls back to `label` when unset. */
  name?: string;
  role: "moderator" | "participant";
  /** Hex, from `SPEAKER_PALETTE`. Drives waveform regions and transcript rails. */
  color: string;
};

/** One transcript segment, aligned to a span of audio. */
export type Segment = {
  id: SegmentId;
  /** Seconds from the start of the recording. */
  start: number;
  end: number;
  speakerId: SpeakerId;
  text: string;
};

export type TranscriptDoc = {
  sessionId: string;
  segments: Segment[];
  speakers: Speaker[];
};

/**
 * Autosave lifecycle.
 *
 * `dirty` means edits exist that have not been scheduled yet; `saving` means a
 * write is in flight. `offline` is terminal-ish — it resolves back to `dirty`
 * when connectivity returns so the next edit reschedules.
 */
export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error" | "offline";

/* ------------------------------------------------------------------ *
 * Subtitle conformance limits.
 *
 * These are the Netflix Timed Text Style Guide values, not invented ones —
 * they are what broadcast and dataset-licensing pipelines check against, so
 * encoding them here means a conformant transcript here is conformant
 * downstream. The reference design's "39 / 42" counter is CPL.
 * ------------------------------------------------------------------ */

/** Characters per line. */
export const MAX_CHARS_PER_LINE = 42;
/** Lines per segment. */
export const MAX_LINES_PER_SEGMENT = 2;
/** Reading speed ceiling, characters per second. */
export const MAX_CHARS_PER_SECOND = 17;
/** Minimum on-screen duration, seconds (5/6s). */
export const MIN_SEGMENT_DURATION = 5 / 6;
/** Maximum on-screen duration, seconds. */
export const MAX_SEGMENT_DURATION = 7;
/** Minimum silent gap between adjacent segments, seconds (2 frames @ 24fps). */
export const MIN_SEGMENT_GAP = 2 / 24;

/** Severity of a single conformance check. */
export type ValidationLevel = "ok" | "warning" | "error";

export type SegmentValidation = {
  /** Worst level across every check below. */
  level: ValidationLevel;
  /** Per-line character counts, in order. */
  lines: { text: string; length: number; overflow: boolean }[];
  /** Longest line's character count — the number shown in the counter. */
  longestLine: number;
  charsPerSecond: number;
  duration: number;
  issues: SegmentIssue[];
};

export type SegmentIssueCode =
  | "line-too-long"
  | "too-many-lines"
  | "reading-speed"
  | "too-short"
  | "too-long"
  | "empty"
  | "overlap";

export type SegmentIssue = {
  code: SegmentIssueCode;
  level: ValidationLevel;
  message: string;
};

/**
 * Diarization palette. Distinct hues are unavoidable here — this is the one
 * place the design system's single-accent rule yields, because speakers must be
 * told apart at a glance on the waveform. Accent leads so the moderator (always
 * speaker 0) stays on brand; the rest are deliberately desaturated so no single
 * region competes with the accent-filled play button.
 */
export const SPEAKER_PALETTE = [
  "#25F07D",
  "#53A8F2",
  "#B87CFF",
  "#F5A623",
  "#FF6B8A",
  "#5CE1E6",
  "#9BE15D",
  "#FFB86C",
] as const;

export function speakerColorAt(index: number): string {
  return SPEAKER_PALETTE[index % SPEAKER_PALETTE.length];
}

/** Display name for a speaker, preferring the annotator's rename. */
export function speakerDisplayName(speaker: Speaker): string {
  return speaker.name?.trim() || speaker.label;
}

import {
  MAX_CHARS_PER_LINE,
  MAX_LINES_PER_SEGMENT,
  speakerColorAt,
  type Segment,
  type Speaker,
  type TranscriptDoc,
} from "@/lib/annotation/types";
import { sortSegments } from "@/lib/annotation/segments";
import { MAX_SPEAKERS } from "@/lib/annotation/store";
import type { AnnotatorSession } from "@/data/annotators/sessions";

/**
 * Mock diarized transcripts for focus-group sessions.
 *
 * Generated deterministically from the session id so a reload lands on the same
 * transcript — a shuffling document would make undo/redo and autosave
 * impossible to reason about while developing.
 *
 * Replace `getTranscript` with the ASR + diarization endpoint once it lands.
 * Nothing else in the workspace needs to change: the shape below *is* the
 * contract.
 */

import {
  BACKCHANNELS,
  CLOSING_THREAD,
  OPENING_THREAD,
  threadsForTopic,
  type ConversationTurn,
} from "@/data/annotators/conversations";

/* Deterministic PRNG so a session always generates the same transcript. */
function seededRandom(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildSpeakers(session: AnnotatorSession): Speaker[] {
  const moderator: Speaker = {
    id: "spk-0",
    label: "Speaker A",
    name: `Moderator (${session.recordedBy})`,
    role: "moderator",
    color: speakerColorAt(0),
  };

  // A focus group tops out at MAX_SPEAKERS tracks, moderator included — the
  // timeline has exactly that many lanes, so the roster must not exceed it.
  const participantCount = Math.min(
    Math.max(1, session.speakers - 1),
    MAX_SPEAKERS - 1
  );

  const participants: Speaker[] = Array.from(
    { length: participantCount },
    (_, index) => ({
      id: `spk-${index + 1}`,
      // A, B, C… — the machine label diarization emits before a human renames it.
      label: `Speaker ${String.fromCharCode(66 + index)}`,
      role: "participant" as const,
      color: speakerColorAt(index + 1),
    })
  );

  return [moderator, ...participants];
}

/**
 * Greedy word wrap to the conformance line limit.
 *
 * The authored turns in `conversations.ts` carry line breaks as a readability
 * hint, not as gospel; they are re-wrapped here so the seeded document is
 * conformant by construction rather than by the author counting characters.
 */
function wrapToLines(text: string, max = MAX_CHARS_PER_LINE): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= max) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    // A single word longer than the limit still gets its own line — hyphenating
    // it would corrupt the transcript, and it is a genuine violation worth
    // surfacing rather than hiding.
    line = word;
  }

  if (line) lines.push(line);
  return lines;
}

/**
 * Splits one spoken turn into conformant segments: at most `MAX_LINES_PER_SEGMENT`
 * wrapped lines each. This is what a real subtitle pipeline does — a long
 * utterance becomes several segments rather than one unreadable block.
 */
function chunkTurn(text: string): string[] {
  const lines = wrapToLines(text);
  if (lines.length === 0) return [""];

  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += MAX_LINES_PER_SEGMENT) {
    chunks.push(lines.slice(i, i + MAX_LINES_PER_SEGMENT).join("\n"));
  }
  return chunks;
}

/**
 * Stitches a session-length transcript out of conversation threads.
 *
 * The tape runs: opening → topic threads (cycled, with backchannels dropped in
 * between substantive turns) → closing, timed to land just before the recording
 * ends. Threads are kept intact and in order, so consecutive segments actually
 * answer each other — an annotator reading three rows in a row sees a
 * conversation, not a shuffle.
 *
 * A deliberate minority of segments are left unwrapped, producing genuine
 * conformance violations. A perfectly clean seed would make the validator,
 * the row badges and the header roll-up all look like dead UI.
 */
function buildSegments(session: AnnotatorSession, speakers: Speaker[]): Segment[] {
  const random = seededRandom(hashString(session.id));
  const participants = speakers.filter((speaker) => speaker.role === "participant");
  const threads = threadsForTopic(session.topic);
  const segments: Segment[] = [];

  let time = 1.2;
  let index = 0;

  const resolveSpeakerId = (turn: ConversationTurn): string =>
    turn.speaker === "mod"
      ? speakers[0].id
      : participants[turn.speaker % participants.length].id;

  const pushTurn = (turn: ConversationTurn) => {
    const speakerId = resolveSpeakerId(turn);

    // Roughly one turn in sixteen is left as the author wrote it, breaks and
    // all. Those are the seeded conformance violations — a document with zero
    // issues makes the validator, the row badges and the header roll-up look
    // like dead UI, and an annotator would never learn to trust them.
    const seedViolation = random() < 0.06;
    const chunks = seedViolation ? [turn.text] : chunkTurn(turn.text);

    for (const chunk of chunks) {
      // Duration tracks text length at a natural ~14 chars/sec, plus a beat of
      // jitter so the clips are not suspiciously uniform.
      const chars = chunk.replace(/\n/g, " ").length;
      const spoken = Math.min(7.2, Math.max(1.0, chars / 14 + random() * 0.8));
      const end = Math.min(time + spoken, session.durationSec);

      if (end <= time) break;

      segments.push({
        id: `${session.id}-segment-${index}`,
        start: Number(time.toFixed(2)),
        end: Number(end.toFixed(2)),
        speakerId,
        text: chunk,
      });

      index += 1;
      // A continuation of the same utterance follows tighter than a speaker
      // change does; both stay above MIN_SEGMENT_GAP so segments never overlap.
      time = end + 0.14 + random() * 0.28;
    }

    // Beat between speakers. Real focus groups leave a breath at every handover
    // — and a gap shorter than MIN_SEGMENT_DURATION can never hold an inserted
    // segment, so tighter spacing would make the insert affordance dead UI.
    time += 0.35 + random() * 1.05;
  };

  // Reserve room so the closing thread is never truncated mid-sentence.
  const closingBudget = CLOSING_THREAD.length * 4.2;
  const bodyCeiling = session.durationSec - closingBudget;

  OPENING_THREAD.forEach(pushTurn);

  let threadCursor = 0;
  while (time < bodyCeiling) {
    const thread = threads[threadCursor % threads.length];

    for (const turn of thread) {
      if (time >= bodyCeiling) break;
      pushTurn(turn);

      // Roughly one in six substantive turns draws a backchannel from someone
      // who is not the current speaker.
      if (turn.speaker !== "mod" && random() < 0.17 && participants.length > 1) {
        const others = participants.filter(
          (speaker) => speaker.id !== resolveSpeakerId(turn)
        );
        const responder = others[Math.floor(random() * others.length)];
        const listenerIndex = participants.indexOf(responder);

        pushTurn({
          speaker: listenerIndex,
          text: BACKCHANNELS[Math.floor(random() * BACKCHANNELS.length)],
        });
      }
    }

    threadCursor += 1;
  }

  CLOSING_THREAD.forEach((turn) => {
    if (time < session.durationSec - 1) pushTurn(turn);
  });

  return sortSegments(segments);
}

export function buildTranscript(session: AnnotatorSession): TranscriptDoc {
  const speakers = buildSpeakers(session);

  return {
    sessionId: session.id,
    speakers,
    // A session nobody has opened has been diarized but not transcribed in the
    // mock world either — it still gets segments, because that is what the ASR
    // pass produces. "Not started" means no *human* has touched it.
    segments: buildSegments(session, speakers),
  };
}

/** A session whose ASR pass has not produced anything — drives the empty state. */
export function buildEmptyTranscript(session: AnnotatorSession): TranscriptDoc {
  return {
    sessionId: session.id,
    speakers: buildSpeakers(session),
    segments: [],
  };
}

const transcriptCache = new Map<string, TranscriptDoc>();

/**
 * Simulates the transcript fetch, including latency and the two failure modes
 * the UI has to handle. Sessions ending in `9` return an empty transcript so
 * the empty state is reachable without editing code.
 */
export function getTranscript(
  session: AnnotatorSession,
  { signal }: { signal?: AbortSignal } = {}
): Promise<TranscriptDoc> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }

      const cached = transcriptCache.get(session.id);
      if (cached) {
        resolve(cached);
        return;
      }

      const doc = session.id.endsWith("9")
        ? buildEmptyTranscript(session)
        : buildTranscript(session);

      transcriptCache.set(session.id, doc);
      resolve(doc);
    }, 620);

    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

/** Mock persistence. Resolves after a beat so `saving` is actually visible. */
export function saveTranscript(doc: TranscriptDoc): Promise<void> {
  return new Promise((resolve) => {
    transcriptCache.set(doc.sessionId, doc);
    setTimeout(resolve, 420);
  });
}

/** Test seam — drops memoised transcripts between suites. */
export function __clearTranscriptCache() {
  transcriptCache.clear();
}

/**
 * A transcript document, built from a seeded session.
 *
 * The workspace reads `GET /annotations/{id}` in normal use. This generator
 * backs two things that are not that: the workspace mount tests, and demo
 * mode, which fills the annotator surface with a believable session so it can
 * be recorded without a seeded backend account.
 */
import {
  MAX_CHARS_PER_LINE,
  MAX_LINES_PER_SEGMENT,
  emptyAnnotationState,
  speakerColorAt,
  speakerLabelAt,
  type Segment,
  type Speaker,
  type TranscriptDoc,
} from "@/lib/annotation/types";
import { sortSegments } from "@/lib/annotation/segments";
import { buildTokenIndex, segmentTokenRange } from "@/lib/annotation/tokens";
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

  // Seeded sessions run 2-4 voices including the moderator. The roster itself
  // is unbounded — annotators add tracks as they hear them.
  const participantCount = Math.min(Math.max(1, session.speakers - 1), 3);

  const participants: Speaker[] = Array.from(
    { length: participantCount },
    (_, index) => ({
      id: `spk-${index + 1}`,
      // A, B, C… — the machine label diarization emits before a human renames it.
      label: `Speaker ${speakerLabelAt(index + 1)}`,
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

/**
 * Tags across the first few segments.
 *
 * Placed against the real token index rather than guessed, because spans are
 * document-global and inclusive on both ends: a hand-written index would drift
 * the moment the generator changed a word. Deterministic from the session id,
 * so a session reopens looking the way it did.
 *
 * A session nobody has started gets none. Tags are the human pass, and a
 * "not started" row that already carries them would be a lie about what the
 * workspace does.
 */
function buildTags(
  session: AnnotatorSession,
  segments: Segment[]
): Pick<TranscriptDoc, "spans" | "nonSpeech"> {
  if (session.status === "not-started") return { spans: [], nonSpeech: [] };

  const index = buildTokenIndex(segments);
  const random = seededRandom(hashString(`${session.id}-tags`));

  const spans: TranscriptDoc["spans"] = [];
  const nonSpeech: TranscriptDoc["nonSpeech"] = [];

  segments.forEach((segment, position) => {
    const range = segmentTokenRange(index, segment.id);
    if (!range) return;

    /* Roughly every third segment, so the transcript reads as worked rather
     * than wallpapered. */
    if (random() > 0.38) return;

    const width = range.end - range.start;
    const start = range.start + Math.floor(random() * Math.max(1, width - 1));
    const end = Math.min(range.end, start + (random() > 0.6 ? 1 : 0));

    if (random() > 0.45) {
      spans.push({
        id: `demo-lang-${position}`,
        kind: "language",
        value: random() > 0.5 ? "pcm" : "yo",
        startToken: start,
        endToken: end,
        spanSource: "annotator_added",
      });
    } else {
      spans.push({
        id: `demo-disf-${position}`,
        kind: "disfluency",
        value: random() > 0.5 ? "filled_pause" : "repetition",
        startToken: start,
        endToken: end,
      });
    }

    if (random() > 0.78) {
      nonSpeech.push({
        id: `demo-ns-${position}`,
        type: random() > 0.5 ? "laugh" : "cough",
        atToken: range.start,
      });
    }
  });

  return { spans, nonSpeech };
}

/**
 * `tags` is off by default.
 *
 * The workspace tests build from here and assert on tags they apply
 * themselves, so a document that arrives pre-tagged would make them assert
 * against noise. Demo mode opts in, because an untagged transcript shows none
 * of the work the workspace exists to do.
 */
export function buildTranscript(
  session: AnnotatorSession,
  { tags = false }: { tags?: boolean } = {}
): TranscriptDoc {
  const speakers = buildSpeakers(session);
  // A session nobody has opened has been diarized but not transcribed in the
  // mock world either — it still gets segments, because that is what the ASR
  // pass produces. "Not started" means no *human* has touched it.
  const segments = buildSegments(session, speakers);

  return {
    sessionId: session.id,
    speakers,
    ...emptyAnnotationState(),
    ...(tags ? buildTags(session, segments) : {}),
    segments,
  };
}

/** A session whose ASR pass has not produced anything — drives the empty state. */

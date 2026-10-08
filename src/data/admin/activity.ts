import { NIGERIAN_NAMES, pick, seeded } from "./shared";

/**
 * The operation log behind annotation playback.
 *
 * An annotation is not a document, it is the sequence of moves that built one,
 * and the question an admin is really asking is "what did this person do, in
 * what order, and how long did it take them". That cannot be answered from the
 * finished artefact, so it is answered from an append-only log of operations.
 *
 * Replay is a fold: the state at step n is the first n events applied in
 * order. Because the workspace already keeps an undo stack, those operations
 * exist on the client already; persisting them is the whole of the feature.
 *
 * This file is seeded sample data. The shape is what we are asking the backend
 * for, so swapping it for `GET /annotations/{id}/events` is a change of
 * source. See docs/integration-status.md.
 */

export type ActivityOp =
  | "session.claim"
  | "segment.create"
  | "segment.resize"
  | "segment.delete"
  | "speaker.create"
  | "speaker.assign"
  | "tag.add"
  | "tag.remove"
  | "text.edit"
  | "session.submit";

export type ActivityEvent = {
  id: string;
  /** Monotonic within one annotation. The client assigns it. */
  seq: number;
  /** Wall clock, ms. Answers "how long did this take". */
  at: number;
  /** Position in the audio the move refers to, seconds. Drives the scrubber. */
  mediaTime: number;
  op: ActivityOp;
  actor: string;
  /** Already resolved for display, so the feed needs no second lookup. */
  detail: string;
};

export const ACTIVITY_OP_LABELS: Record<ActivityOp, string> = {
  "session.claim": "Claimed",
  "segment.create": "Segment added",
  "segment.resize": "Segment adjusted",
  "segment.delete": "Segment removed",
  "speaker.create": "Speaker added",
  "speaker.assign": "Speaker set",
  "tag.add": "Tag applied",
  "tag.remove": "Tag removed",
  "text.edit": "Text edited",
  "session.submit": "Submitted",
};

/** Grouping for the filter, and for the colour of a row in the feed. */
export const ACTIVITY_OP_GROUP: Record<ActivityOp, "segment" | "speaker" | "tag" | "text" | "session"> = {
  "session.claim": "session",
  "segment.create": "segment",
  "segment.resize": "segment",
  "segment.delete": "segment",
  "speaker.create": "speaker",
  "speaker.assign": "speaker",
  "tag.add": "tag",
  "tag.remove": "tag",
  "text.edit": "text",
  "session.submit": "session",
};

export const ACTIVITY_GROUP_COLORS: Record<
  "segment" | "speaker" | "tag" | "text" | "session",
  string
> = {
  segment: "hsl(199 89% 58%)",
  speaker: "hsl(262 72% 68%)",
  tag: "hsl(146 87% 54%)",
  text: "hsl(43 90% 62%)",
  session: "hsl(0 0% 52%)",
};

const TAGS = [
  "Code-switch",
  "Filled pause",
  "Laughter",
  "Overlap",
  "Background noise",
  "Unclear",
  "Proper noun",
  "Loanword",
];

const SPEAKER_NAMES = ["Speaker 1", "Speaker 2", "Speaker 3", "Speaker 4"];

function formatClock(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * A plausible working session, seeded off the annotation id.
 *
 * Deterministic on purpose. A playback that reshuffles every time the panel
 * opens is not evidence of anything.
 */
export function annotationActivity({
  id,
  annotator,
  durationSec,
  segments,
}: {
  id: string;
  annotator: string;
  durationSec: number;
  segments: number;
}): ActivityEvent[] {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 100000;
  }
  const random = seeded(hash + 11);

  const actor = annotator || pick(random, NIGERIAN_NAMES.slice(0, 8));
  /* Capped. A 400-segment session produces thousands of events, and nobody
   * scrubs through four thousand rows to form an opinion. */
  const segmentCount = Math.max(6, Math.min(segments, 60));

  const events: ActivityEvent[] = [];
  let seq = 0;
  // Started between one and four days ago, mid-morning.
  const start = new Date();
  start.setDate(start.getDate() - (1 + Math.floor(random() * 4)));
  start.setHours(9 + Math.floor(random() * 4), Math.floor(random() * 60), 0, 0);
  let at = start.getTime();

  const push = (op: ActivityOp, mediaTime: number, detail: string) => {
    seq += 1;
    events.push({
      id: `${id}-e${String(seq).padStart(4, "0")}`,
      seq,
      at,
      mediaTime: Math.min(mediaTime, durationSec),
      op,
      actor,
      detail,
    });
  };

  /** Working time between moves, with the occasional real pause. */
  const tick = () => {
    const base = 4000 + random() * 14000;
    const breather = random() > 0.94 ? 90000 + random() * 240000 : 0;
    at += base + breather;
  };

  push("session.claim", 0, "Picked the session up from the queue");
  tick();

  const speakerCount = 2 + Math.floor(random() * 3);
  for (let i = 0; i < speakerCount; i += 1) {
    push("speaker.create", 0, `Added ${SPEAKER_NAMES[i]}`);
    tick();
  }

  const step = durationSec / segmentCount;
  let cursor = 0;

  for (let i = 0; i < segmentCount; i += 1) {
    const length = step * (0.6 + random() * 0.7);
    const startAt = cursor;
    cursor = Math.min(cursor + length, durationSec);

    push(
      "segment.create",
      startAt,
      `Segment ${i + 1} at ${formatClock(startAt)}, ${Math.round(length)}s`
    );
    tick();

    const speaker = SPEAKER_NAMES[Math.floor(random() * speakerCount)];
    push("speaker.assign", startAt, `Segment ${i + 1} is ${speaker}`);
    tick();

    const tagCount = Math.floor(random() * 3);
    for (let t = 0; t < tagCount; t += 1) {
      push("tag.add", startAt, `${pick(random, TAGS)} on segment ${i + 1}`);
      tick();
    }

    if (random() > 0.72) {
      push("text.edit", startAt, `Rewrote the transcript for segment ${i + 1}`);
      tick();
    }
    if (random() > 0.88) {
      push("segment.resize", startAt, `Pulled segment ${i + 1} back by 0.4s`);
      tick();
    }
    if (random() > 0.93) {
      push("tag.remove", startAt, `Took a tag off segment ${i + 1}`);
      tick();
    }
    if (random() > 0.95) {
      push("segment.delete", startAt, `Dropped segment ${i + 1}, it was silence`);
      tick();
    }
  }

  push("session.submit", durationSec, "Marked the session complete");

  return events;
}

export type ActivityState = {
  segments: number;
  speakers: number;
  tags: number;
  edits: number;
};

/**
 * Replay, as a fold.
 *
 * `index` is inclusive, so the state after the first move is `at(events, 0)`.
 * The real version applies the same reducer the workspace already uses for
 * undo; this one only needs the counters the panel shows.
 */
export function activityStateAt(
  events: ActivityEvent[],
  index: number
): ActivityState {
  const state: ActivityState = { segments: 0, speakers: 0, tags: 0, edits: 0 };

  for (let i = 0; i <= index && i < events.length; i += 1) {
    switch (events[i].op) {
      case "segment.create":
        state.segments += 1;
        break;
      case "segment.delete":
        state.segments = Math.max(0, state.segments - 1);
        break;
      case "speaker.create":
        state.speakers += 1;
        break;
      case "tag.add":
        state.tags += 1;
        break;
      case "tag.remove":
        state.tags = Math.max(0, state.tags - 1);
        break;
      case "text.edit":
        state.edits += 1;
        break;
      default:
        break;
    }
  }

  return state;
}

export type EffortBar = { minute: number; count: number };

/**
 * Moves per minute of wall clock.
 *
 * This is the quality signal, not the segment count: flat gaps mean somebody
 * walked away, and a spike at the end means a session got bulk-tagged to clear
 * it. Both are invisible in the finished annotation.
 */
export function activityEffort(events: ActivityEvent[]): EffortBar[] {
  if (events.length === 0) return [];

  const first = events[0].at;
  const last = events[events.length - 1].at;
  const minutes = Math.max(1, Math.ceil((last - first) / 60000));
  const bars: EffortBar[] = Array.from({ length: minutes }, (_, minute) => ({
    minute,
    count: 0,
  }));

  for (const event of events) {
    const minute = Math.min(
      minutes - 1,
      Math.floor((event.at - first) / 60000)
    );
    bars[minute].count += 1;
  }

  return bars;
}

/** Wall-clock span of the whole session, in minutes. */
export function activitySpanMinutes(events: ActivityEvent[]) {
  if (events.length < 2) return 0;
  return Math.round((events[events.length - 1].at - events[0].at) / 60000);
}

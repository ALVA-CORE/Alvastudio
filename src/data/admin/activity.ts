
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
 * `fromApiEvents` maps the real log; `annotationActivity` seeds one for the
 * admin screens that have no annotation behind the row they are showing.
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

/** How each op reads in the feed, with what its payload carries. */
function describe(op: ActivityOp, payload: Record<string, unknown>): string {
  const segment = payload.segment_id ? String(payload.segment_id).slice(0, 6) : "";
  const value = (key: string) => (payload[key] == null ? "" : String(payload[key]));

  switch (op) {
    case "session.claim":
      return "Picked the session up from the queue";
    case "segment.create":
      return `Segment ${segment} added`;
    case "segment.resize":
      return `Segment ${segment} adjusted`;
    case "segment.delete":
      return `Segment ${segment} removed`;
    case "speaker.create":
      return `Added ${value("label") || "a speaker"}`;
    case "speaker.assign":
      return `Segment ${segment} speaker set`;
    case "tag.add":
      return `${value("tag") || "Tag"} on segment ${segment}`;
    case "tag.remove":
      return `${value("tag") || "Tag"} taken off segment ${segment}`;
    case "text.edit":
      return `Rewrote segment ${segment}`;
    case "session.submit":
      return "Marked the session complete";
    default:
      return op;
  }
}

/**
 * The real log, in the shape the replay reads.
 *
 * The API holds no transcript text, by design — `text.edit` carries a length
 * and nothing else — so the feed describes what happened rather than quoting
 * it. That is the whole point of the retention rules around this data.
 */
export function fromApiEvents(
  events: {
    id: string;
    seq: number;
    at: string;
    media_time: number | null;
    op: string;
    actor_id: string;
    payload: Record<string, unknown>;
  }[],
  actorNames: Map<string, string> = new Map()
): ActivityEvent[] {
  return events.map((event) => ({
    id: event.id,
    seq: event.seq,
    at: new Date(event.at).getTime(),
    mediaTime: event.media_time ?? 0,
    op: event.op as ActivityOp,
    actor: actorNames.get(event.actor_id) ?? "",
    detail: describe(event.op as ActivityOp, event.payload ?? {}),
  }));
}

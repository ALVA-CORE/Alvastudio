import { buildTokenIndex } from "./tokens";
import { eventSummary, sendEvents, type AnnotationEventOp } from "@/lib/api/annotationEvents";
import type { TranscriptDoc } from "./types";

/**
 * The annotation activity log, written from the workspace.
 *
 * An append-only record of how an annotation was built, so an admin can replay
 * it. Three things shape this file:
 *
 * **Nothing is recorded until the annotator agrees to it.** Batches come back
 * 403 until they accept `annotation_activity_log`, and the recorder then stops
 * for the session rather than retrying. Their work is never blocked by it, only
 * the log — so every failure here is silent by design.
 *
 * **It holds no transcript text.** `text.edit` carries a length and nothing
 * else. The transcript is already on the annotation; copying every revision of
 * it into an audit log multiplies the storage for nothing a reader of the log
 * needs, and turns a record of activity into a second copy of the work.
 *
 * **Ops are derived by diffing the document, not by instrumenting actions.**
 * Twenty store actions produce these ten ops between them, often several at a
 * time — a split is a resize and a create — and a diff sees what actually
 * changed rather than what was called. It also means undo is recorded as the
 * edit it is, which is what a replay should show.
 */

export type PendingEvent = {
  id: string;
  seq: number;
  at: string;
  media_time: number | null;
  op: AnnotationEventOp;
  payload: Record<string, unknown>;
};

/** Events without `id`/`seq`, which the logger assigns on the way into the buffer. */
export type DraftEvent = {
  op: AnnotationEventOp;
  payload: Record<string, unknown>;
};

/** Which segment a document-global token sits in. */
function segmentForToken(doc: TranscriptDoc, token: number): string | null {
  const index = buildTokenIndex(doc.segments);
  return index.tokens[token]?.segmentId ?? null;
}

/**
 * A tag's name in the log.
 *
 * The workspace keeps four tag families in one array discriminated by `kind`,
 * plus point-anchored non-speech marks in another. The log wants one string, so
 * the family is kept on the front of it: `language:yo` and `non_speech:laugh`
 * stay distinguishable from each other and from a disfluency of the same name.
 */
function tagName(kind: string, value: string): string {
  return `${kind}:${value}`;
}

/**
 * Everything that changed between two documents, as events.
 *
 * Order within one diff is create, then edit, then delete, so a replay never
 * sees a tag land on a segment that has not been created yet.
 */
export function diffDocuments(before: TranscriptDoc, after: TranscriptDoc): DraftEvent[] {
  const events: DraftEvent[] = [];

  const beforeSpeakers = new Map(before.speakers.map((speaker) => [speaker.id, speaker]));
  for (const speaker of after.speakers) {
    if (!beforeSpeakers.has(speaker.id)) {
      events.push({
        op: "speaker.create",
        payload: { speaker_id: speaker.id, label: speaker.name ?? speaker.label },
      });
    }
  }

  const beforeSegments = new Map(before.segments.map((segment) => [segment.id, segment]));
  const afterSegments = new Map(after.segments.map((segment) => [segment.id, segment]));

  for (const segment of after.segments) {
    const previous = beforeSegments.get(segment.id);

    if (!previous) {
      events.push({
        op: "segment.create",
        payload: { segment_id: segment.id, start: segment.start, end: segment.end },
      });
      /* A new segment arrives with its speaker and text already set, so those
       * are part of creating it rather than three events for one action. */
      continue;
    }

    if (previous.start !== segment.start || previous.end !== segment.end) {
      events.push({
        op: "segment.resize",
        payload: { segment_id: segment.id, start: segment.start, end: segment.end },
      });
    }

    if (previous.speakerId !== segment.speakerId) {
      events.push({
        op: "speaker.assign",
        payload: { segment_id: segment.id, speaker_id: segment.speakerId },
      });
    }

    if (previous.text !== segment.text) {
      events.push({
        op: "text.edit",
        payload: { segment_id: segment.id, length: segment.text.length },
      });
    }
  }

  for (const segment of before.segments) {
    if (!afterSegments.has(segment.id)) {
      events.push({ op: "segment.delete", payload: { segment_id: segment.id } });
    }
  }

  /* Tags are token-anchored and the log is segment-anchored, so each one is
   * resolved against the document it existed in: an added tag against the new
   * document, a removed one against the old, because the segment it sat on may
   * be gone from the new. */
  const beforeSpans = new Map(before.spans.map((span) => [span.id, span]));
  const afterSpans = new Map(after.spans.map((span) => [span.id, span]));

  for (const span of after.spans) {
    if (beforeSpans.has(span.id)) continue;
    events.push({
      op: "tag.add",
      payload: {
        segment_id: segmentForToken(after, span.startToken),
        tag: tagName(span.kind, span.value),
      },
    });
  }

  for (const span of before.spans) {
    if (afterSpans.has(span.id)) continue;
    events.push({
      op: "tag.remove",
      payload: {
        segment_id: segmentForToken(before, span.startToken),
        tag: tagName(span.kind, span.value),
      },
    });
  }

  const beforeMarks = new Map(before.nonSpeech.map((mark) => [mark.id, mark]));
  const afterMarks = new Map(after.nonSpeech.map((mark) => [mark.id, mark]));

  for (const mark of after.nonSpeech) {
    if (beforeMarks.has(mark.id)) continue;
    events.push({
      op: "tag.add",
      payload: {
        segment_id: segmentForToken(after, mark.atToken),
        tag: tagName("non_speech", mark.type),
      },
    });
  }

  for (const mark of before.nonSpeech) {
    if (afterMarks.has(mark.id)) continue;
    events.push({
      op: "tag.remove",
      payload: {
        segment_id: segmentForToken(before, mark.atToken),
        tag: tagName("non_speech", mark.type),
      },
    });
  }

  return events;
}

/** Flush when either is reached, whichever comes first. */
const FLUSH_DELAY = 2000;
const FLUSH_SIZE = 50;

export type ActivityLogger = {
  /** Buffers whatever changed between the two documents. */
  record: (before: TranscriptDoc, after: TranscriptDoc, mediaTime: number) => void;
  /** Buffers one event the document cannot show, such as a submit. */
  mark: (op: AnnotationEventOp, payload?: Record<string, unknown>) => void;
  /** Sends the buffer now. Resolves once it has been attempted. */
  flush: () => Promise<void>;
  destroy: () => void;
};

/** No consent, no annotation, or nothing to send: the workspace calls into this. */
export const INERT_LOGGER: ActivityLogger = {
  record: () => {},
  mark: () => {},
  flush: () => Promise.resolve(),
  destroy: () => {},
};

type LoggerOptions = {
  annotationId: string;
  /** Overridable for tests. */
  send?: typeof sendEvents;
  readLastSeq?: (annotationId: string) => Promise<number>;
  now?: () => number;
};

export function createActivityLogger({
  annotationId,
  send = sendEvents,
  readLastSeq = (id) => eventSummary(id).then((summary) => summary.last_seq),
  now = Date.now,
}: LoggerOptions): ActivityLogger {
  let buffer: PendingEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let nextSeq: number | null = null;
  let inFlight: Promise<void> = Promise.resolve();
  let stopped = false;
  let counter = 0;

  /* `seq` is unique per annotation and only moves forward, so a reload has to
   * continue where the last session left off rather than restart at 1. Read
   * lazily: an annotator who opens a session and changes nothing costs nothing. */
  const seqFor = async (count: number): Promise<number> => {
    if (nextSeq === null) nextSeq = (await readLastSeq(annotationId)) + 1;
    const start = nextSeq;
    nextSeq += count;
    return start;
  };

  const eventId = () => {
    counter += 1;
    return `${annotationId}-${now()}-${counter}`;
  };

  const send_ = async () => {
    if (stopped || buffer.length === 0) return;

    const batch = buffer;
    buffer = [];

    try {
      const start = await seqFor(batch.length);
      await send(
        annotationId,
        batch.map((event, offset) => ({ ...event, seq: start + offset }))
      );
    } catch (cause) {
      const status = (cause as { status?: number } | null)?.status;

      /* 403 is the annotator not having agreed to the log. It is an answer,
       * not a failure, and retrying it every two seconds for the rest of a
       * forty-minute session would be nothing but noise. */
      if (status === 403) {
        stopped = true;
        return;
      }

      /* 409 means our seq was stale — another device, or a reassignment. Drop
       * the base so the next flush re-reads it, and put the batch back in
       * front of whatever arrived while it was away. */
      if (status === 409) {
        nextSeq = null;
        buffer = [...batch, ...buffer];
        return;
      }

      /* Anything else is the network. Keep the events; the next flush, or the
       * one on unmount, takes them. */
      buffer = [...batch, ...buffer];
    }
  };

  const schedule = () => {
    if (stopped || timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      inFlight = inFlight.then(send_);
    }, FLUSH_DELAY);
  };

  const push = (draft: DraftEvent, mediaTime: number | null) => {
    if (stopped) return;

    /* Typing produces one event per keystroke, and the log only wants the
     * length it settled on. Collapsing into the pending event for the same
     * segment turns a sentence into one row rather than forty. */
    if (draft.op === "text.edit") {
      const open = buffer.find(
        (event) =>
          event.op === "text.edit" &&
          event.payload.segment_id === draft.payload.segment_id
      );
      if (open) {
        open.payload = draft.payload;
        open.at = new Date(now()).toISOString();
        open.media_time = mediaTime;
        return;
      }
    }

    buffer.push({
      id: eventId(),
      /* Assigned at send: a batch that comes back 409 is re-numbered, so a
       * number held from now would be wrong by the time it is used. */
      seq: 0,
      at: new Date(now()).toISOString(),
      media_time: mediaTime,
      op: draft.op,
      payload: draft.payload,
    });

    if (buffer.length >= FLUSH_SIZE) {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      inFlight = inFlight.then(send_);
      return;
    }

    schedule();
  };

  return {
    record(before, after, mediaTime) {
      for (const draft of diffDocuments(before, after)) push(draft, mediaTime);
    },
    mark(op, payload = {}) {
      push({ op, payload }, null);
    },
    async flush() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      inFlight = inFlight.then(send_);
      await inFlight;
    },
    destroy() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      stopped = true;
      buffer = [];
    },
  };
}

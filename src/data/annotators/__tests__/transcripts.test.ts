import { describe, expect, it, beforeEach } from "vitest";
import {
  __clearTranscriptCache,
  buildEmptyTranscript,
  buildTranscript,
  getTranscript,
} from "@/data/annotators/transcripts";
import { getAnnotatorSessions } from "@/data/annotators/sessions";
import { findActiveSegmentIndex } from "@/lib/annotation/segments";
import { MIN_SEGMENT_GAP } from "@/lib/annotation/types";
import { MAX_SPEAKERS } from "@/lib/annotation/store";
import { OPENING_THREAD, threadsForTopic } from "@/data/annotators/conversations";

/**
 * The workspace's binary search (`findActiveSegmentIndex`) assumes segments are sorted
 * and non-overlapping, and the waveform assumes they fit inside the audio.
 * Those are invariants of the *data*, so they are asserted here rather than
 * being left as an unwritten assumption of the generator.
 */

const SESSIONS = getAnnotatorSessions();

describe("buildTranscript", () => {
  beforeEach(() => __clearTranscriptCache());

  it("produces a transcript for every seeded session", () => {
    for (const session of SESSIONS) {
      const doc = buildTranscript(session);
      expect(doc.sessionId).toBe(session.id);
      expect(doc.segments.length).toBeGreaterThan(20);
    }
  });

  it("is deterministic — the same session always yields the same document", () => {
    const session = SESSIONS[3];
    expect(buildTranscript(session)).toEqual(buildTranscript(session));
  });

  it("emits segments in chronological order with no overlaps", () => {
    for (const session of SESSIONS) {
      const { segments } = buildTranscript(session);

      for (let i = 1; i < segments.length; i += 1) {
        const previous = segments[i - 1];
        const current = segments[i];

        expect(current.start).toBeGreaterThanOrEqual(previous.end);
        // The generator's floor gap is 0.14s, comfortably above MIN_SEGMENT_GAP.
        expect(current.start - previous.end).toBeGreaterThanOrEqual(MIN_SEGMENT_GAP);
      }
    }
  });

  it("keeps every segment inside the recording and positive in length", () => {
    for (const session of SESSIONS) {
      for (const segment of buildTranscript(session).segments) {
        expect(segment.start).toBeGreaterThanOrEqual(0);
        expect(segment.end).toBeLessThanOrEqual(session.durationSec);
        expect(segment.end).toBeGreaterThan(segment.start);
      }
    }
  });

  it("only references speakers that exist on the document", () => {
    for (const session of SESSIONS) {
      const doc = buildTranscript(session);
      const ids = new Set(doc.speakers.map((speaker) => speaker.id));

      for (const segment of doc.segments) {
        expect(ids.has(segment.speakerId)).toBe(true);
      }
    }
  });

  it("gives every session one moderator, capped at MAX_SPEAKERS tracks", () => {
    for (const session of SESSIONS) {
      const { speakers } = buildTranscript(session);

      // The timeline has exactly MAX_SPEAKERS lanes, so the roster must not
      // exceed it however many voices the session metadata claims.
      expect(speakers).toHaveLength(Math.min(session.speakers, MAX_SPEAKERS));
      expect(speakers.length).toBeLessThanOrEqual(MAX_SPEAKERS);
      expect(speakers.filter((s) => s.role === "moderator")).toHaveLength(1);
    }
  });

  it("assigns every speaker a distinct id and a colour", () => {
    const { speakers } = buildTranscript(SESSIONS[0]);
    expect(new Set(speakers.map((s) => s.id)).size).toBe(speakers.length);
    for (const speaker of speakers) {
      expect(speaker.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("opens with the session framing and reads as a real conversation", () => {
    const doc = buildTranscript(SESSIONS[0]);
    expect(doc.segments[0].text).toBe(OPENING_THREAD[0].text);
    // The opening is moderator-led.
    expect(doc.segments[0].speakerId).toBe(doc.speakers[0].id);
  });

  it("draws its body from the thread pool for the session's topic", () => {
    const session = SESSIONS[0];
    const doc = buildTranscript(session);
    const threadLines = new Set(
      threadsForTopic(session.topic).flatMap((thread) => thread.map((t) => t.text))
    );

    const bodyHits = doc.segments.filter((segment) => threadLines.has(segment.text));
    expect(bodyHits.length).toBeGreaterThan(10);
  });

  it("stays searchable by the binary search the workspace uses", () => {
    const { segments } = buildTranscript(SESSIONS[5]);

    // Sample the midpoint of many segments; the search must find that exact segment.
    for (let i = 0; i < segments.length; i += 7) {
      const segment = segments[i];
      const midpoint = segment.start + (segment.end - segment.start) / 2;
      expect(findActiveSegmentIndex(segments, midpoint)).toBe(i);
    }
  });

  it("reports -1 from the gap between two segments", () => {
    const { segments } = buildTranscript(SESSIONS[2]);
    const gapTime = (segments[0].end + segments[1].start) / 2;

    if (segments[1].start - segments[0].end > 0.02) {
      expect(findActiveSegmentIndex(segments, gapTime)).toBe(-1);
    }
  });
});

describe("buildEmptyTranscript", () => {
  it("keeps the diarized speakers but drops every segment", () => {
    const doc = buildEmptyTranscript(SESSIONS[0]);
    expect(doc.segments).toEqual([]);
    expect(doc.speakers.length).toBeGreaterThan(0);
  });
});

describe("getTranscript", () => {
  beforeEach(() => __clearTranscriptCache());

  it("resolves the built transcript", async () => {
    const session = SESSIONS[0];
    const doc = await getTranscript(session);
    expect(doc.sessionId).toBe(session.id);
    expect(doc.segments.length).toBeGreaterThan(0);
  });

  it("returns an empty transcript for sessions whose id ends in 9", async () => {
    const session = SESSIONS.find((entry) => entry.id.endsWith("9"));
    expect(session).toBeDefined();

    const doc = await getTranscript(session!);
    expect(doc.segments).toEqual([]);
  });

  it("memoises, so reopening a session returns the same document instance", async () => {
    const session = SESSIONS[1];
    const [first, second] = [await getTranscript(session), await getTranscript(session)];
    expect(first).toBe(second);
  });

  it("rejects with AbortError when the signal aborts", async () => {
    const controller = new AbortController();
    const pending = getTranscript(SESSIONS[4], { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toThrow(/abort/i);
  });
});

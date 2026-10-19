import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createActivityLogger, diffDocuments } from "../activityLog";
import type { TranscriptDoc } from "../types";

/**
 * The activity log is an audit record of somebody's work, so the two things
 * that matter are what it records and what it refuses to.
 *
 * It must never carry transcript text — `text.edit` sends a length — and it
 * must go quiet rather than retry when the annotator has not agreed to it.
 */

const doc = (patch: Partial<TranscriptDoc> = {}): TranscriptDoc => ({
  sessionId: "fg-1",
  segments: [
    { id: "s1", start: 0, end: 2, speakerId: "spk-0", text: "abeg come" },
    { id: "s2", start: 2, end: 4, speakerId: "spk-1", text: "i dey come" },
  ],
  speakers: [
    { id: "spk-0", label: "Speaker A", role: "moderator", color: "#fff" },
    { id: "spk-1", label: "Speaker B", role: "participant", color: "#000" },
  ],
  spans: [],
  nonSpeech: [],
  difficultyFlags: [],
  speechPresent: true,
  ...patch,
});

describe("diffDocuments", () => {
  it("records nothing when nothing changed", () => {
    expect(diffDocuments(doc(), doc())).toEqual([]);
  });

  it("records a created segment with its range", () => {
    const after = doc({
      segments: [
        ...doc().segments,
        { id: "s3", start: 4, end: 6, speakerId: "spk-0", text: "ok" },
      ],
    });

    expect(diffDocuments(doc(), after)).toEqual([
      { op: "segment.create", payload: { segment_id: "s3", start: 4, end: 6 } },
    ]);
  });

  it("records a deleted segment", () => {
    const after = doc({ segments: [doc().segments[0]] });

    expect(diffDocuments(doc(), after)).toEqual([
      { op: "segment.delete", payload: { segment_id: "s2" } },
    ]);
  });

  it("records a resize and a speaker change separately", () => {
    const after = doc({
      segments: [
        { id: "s1", start: 0, end: 3, speakerId: "spk-1", text: "abeg come" },
        doc().segments[1],
      ],
    });

    expect(diffDocuments(doc(), after)).toEqual([
      { op: "segment.resize", payload: { segment_id: "s1", start: 0, end: 3 } },
      { op: "speaker.assign", payload: { segment_id: "s1", speaker_id: "spk-1" } },
    ]);
  });

  it("sends a text length, never the text", () => {
    const after = doc({
      segments: [
        { id: "s1", start: 0, end: 2, speakerId: "spk-0", text: "abeg come here" },
        doc().segments[1],
      ],
    });

    const [event] = diffDocuments(doc(), after);
    expect(event).toEqual({
      op: "text.edit",
      payload: { segment_id: "s1", length: 14 },
    });
    expect(JSON.stringify(event)).not.toContain("abeg");
  });

  it("resolves a token-anchored tag back to the segment it sits on", () => {
    /* "abeg come" is tokens 0-1, so token 2 is the first word of s2. */
    const after = doc({
      spans: [
        { id: "sp1", kind: "language", value: "yo", startToken: 2, endToken: 2 },
      ],
    });

    expect(diffDocuments(doc(), after)).toEqual([
      { op: "tag.add", payload: { segment_id: "s2", tag: "language:yo" } },
    ]);
  });

  it("resolves a removed tag against the document it was removed from", () => {
    const before = doc({
      spans: [
        { id: "sp1", kind: "language", value: "yo", startToken: 2, endToken: 2 },
      ],
    });

    expect(diffDocuments(before, doc())).toEqual([
      { op: "tag.remove", payload: { segment_id: "s2", tag: "language:yo" } },
    ]);
  });

  it("keeps non-speech marks distinguishable from spans of the same name", () => {
    const after = doc({ nonSpeech: [{ id: "n1", type: "laugh", atToken: 0 }] });

    expect(diffDocuments(doc(), after)).toEqual([
      { op: "tag.add", payload: { segment_id: "s1", tag: "non_speech:laugh" } },
    ]);
  });

  it("records a new speaker", () => {
    const after = doc({
      speakers: [
        ...doc().speakers,
        { id: "spk-2", label: "Speaker C", role: "participant", color: "#111" },
      ],
    });

    expect(diffDocuments(doc(), after)).toEqual([
      { op: "speaker.create", payload: { speaker_id: "spk-2", label: "Speaker C" } },
    ]);
  });

  it("creates before it deletes, so a replay never tags a missing segment", () => {
    const after = doc({
      segments: [
        doc().segments[0],
        { id: "s3", start: 2, end: 4, speakerId: "spk-1", text: "new" },
      ],
    });

    expect(diffDocuments(doc(), after).map((event) => event.op)).toEqual([
      "segment.create",
      "segment.delete",
    ]);
  });
});

describe("createActivityLogger", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const textEdit = (text: string) =>
    doc({
      segments: [
        { id: "s1", start: 0, end: 2, speakerId: "spk-0", text },
        doc().segments[1],
      ],
    });

  it("continues from the last seq the annotation already holds", async () => {
    const send = vi.fn().mockResolvedValue({ accepted: 1, duplicates: 0, last_seq: 42 });
    const logger = createActivityLogger({
      annotationId: "a1",
      send,
      readLastSeq: () => Promise.resolve(41),
    });

    logger.record(doc(), textEdit("abeg come here"), 1.5);
    await logger.flush();

    expect(send.mock.calls[0][1][0]).toMatchObject({ seq: 42, op: "text.edit" });
  });

  it("collapses typing in one segment into a single pending event", async () => {
    const send = vi.fn().mockResolvedValue({ accepted: 1, duplicates: 0, last_seq: 1 });
    const logger = createActivityLogger({
      annotationId: "a1",
      send,
      readLastSeq: () => Promise.resolve(0),
    });

    logger.record(doc(), textEdit("abeg come h"), 1);
    logger.record(textEdit("abeg come h"), textEdit("abeg come he"), 1);
    logger.record(textEdit("abeg come he"), textEdit("abeg come here"), 1);
    await logger.flush();

    const batch = send.mock.calls[0][1];
    expect(batch).toHaveLength(1);
    expect(batch[0].payload).toEqual({ segment_id: "s1", length: 14 });
  });

  it("stops for good once the annotator has not agreed to the log", async () => {
    const send = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("forbidden"), { status: 403 }));
    const logger = createActivityLogger({
      annotationId: "a1",
      send,
      readLastSeq: () => Promise.resolve(0),
    });

    logger.record(doc(), textEdit("abeg come here"), 1);
    await logger.flush();
    expect(send).toHaveBeenCalledTimes(1);

    logger.record(textEdit("abeg come here"), textEdit("abeg come here o"), 1);
    await logger.flush();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("keeps the batch and re-reads its base when the seq was stale", async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("conflict"), { status: 409 }))
      .mockResolvedValue({ accepted: 1, duplicates: 0, last_seq: 100 });
    const readLastSeq = vi
      .fn()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(99);

    const logger = createActivityLogger({ annotationId: "a1", send, readLastSeq });

    logger.record(doc(), textEdit("abeg come here"), 1);
    await logger.flush();
    await logger.flush();

    expect(readLastSeq).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][1][0]).toMatchObject({ seq: 100 });
  });

  it("keeps the batch when the network drops it", async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("offline"), { status: 0 }))
      .mockResolvedValue({ accepted: 1, duplicates: 0, last_seq: 1 });

    const logger = createActivityLogger({
      annotationId: "a1",
      send,
      readLastSeq: () => Promise.resolve(0),
    });

    logger.record(doc(), textEdit("abeg come here"), 1);
    await logger.flush();
    await logger.flush();

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][1]).toHaveLength(1);
  });

  it("never reaches the API when there is nothing to record", async () => {
    const send = vi.fn();
    const readLastSeq = vi.fn();
    const logger = createActivityLogger({ annotationId: "a1", send, readLastSeq });

    logger.record(doc(), doc(), 0);
    await logger.flush();

    expect(send).not.toHaveBeenCalled();
    expect(readLastSeq).not.toHaveBeenCalled();
  });
});

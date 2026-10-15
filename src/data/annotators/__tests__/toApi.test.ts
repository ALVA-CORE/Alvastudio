import { describe, expect, it, vi, beforeEach } from "vitest";

const spliceTokens = vi.fn();
const createSegment = vi.fn();
const updateSegment = vi.fn();
const deleteSegment = vi.fn();
const updateAnnotation = vi.fn();

vi.mock("@/lib/api/annotations", () => ({
  spliceTokens: (...a: unknown[]) => spliceTokens(...a),
  createSegment: (...a: unknown[]) => createSegment(...a),
  updateSegment: (...a: unknown[]) => updateSegment(...a),
  deleteSegment: (...a: unknown[]) => deleteSegment(...a),
  updateAnnotation: (...a: unknown[]) => updateAnnotation(...a),
}));

import { baselineFrom, saveAnnotation } from "@/data/annotators/toApi";
import { toTranscriptDoc } from "@/data/annotators/fromApi";

const PARTICIPANTS = [
  { id: "p1", label: "Speaker 1", role: "participant" },
  { id: "p2", label: "Speaker 2", role: "moderator" },
] as never[];

function apiDoc() {
  return {
    id: "a1",
    session_id: "s1",
    status: "draft",
    version: 7,
    difficulty_flags: [],
    speech_present: true,
    tokens: [
      { idx: 0, text: "the", start_sec: 0, end_sec: 0.2 },
      { idx: 1, text: "traffic", start_sec: 0.2, end_sec: 0.6 },
      { idx: 2, text: "choke", start_sec: 0.6, end_sec: 1.0 },
    ],
    segments: [
      {
        id: "seg1",
        annotation_id: "a1",
        participant_id: "p1",
        start_token: 0,
        end_token: 2,
        language_spans: [
          { start_token: 0, end_token: 1, language: "pcm", span_source: "annotator_added" },
        ],
        disfluencies: [],
        untranscribable_spans: [],
        non_speech_events: [],
        version: 1,
        created_at: "",
        updated_at: "",
      },
    ],
  } as never;
}

function setup() {
  const api = apiDoc();
  const doc = toTranscriptDoc(api, PARTICIPANTS);
  return { api, doc, base: baselineFrom(api, doc) };
}

beforeEach(() => {
  for (const fn of [spliceTokens, createSegment, updateSegment, deleteSegment, updateAnnotation]) {
    fn.mockReset().mockResolvedValue({ version: 8 });
  }
});

describe("reading an annotation", () => {
  /* The API anchors on tokens and the workspace anchors on seconds, so this
   * conversion is the whole bridge between the two models. */
  it("turns a token range into seconds and text", () => {
    const { doc } = setup();
    expect(doc.segments).toHaveLength(1);
    expect(doc.segments[0]).toMatchObject({
      start: 0,
      end: 1,
      speakerId: "p1",
      text: "the traffic choke",
    });
  });

  it("flattens the four tag arrays into one", () => {
    const { doc } = setup();
    expect(doc.spans).toEqual([
      expect.objectContaining({ kind: "language", value: "pcm", startToken: 0, endToken: 1 }),
    ]);
  });
});

describe("writing it back", () => {
  it("sends nothing when nothing changed", async () => {
    const { doc, base } = setup();
    await saveAnnotation("a1", doc, base);
    expect(spliceTokens).not.toHaveBeenCalled();
    expect(updateSegment).not.toHaveBeenCalled();
    expect(updateAnnotation).not.toHaveBeenCalled();
  });

  /* One splice over the whole document, not one per segment: splices shift
   * every index after them, and several in sequence need index arithmetic
   * that is wrong the moment two edits overlap. */
  it("rewrites the token array once when text changes", async () => {
    const { doc, base } = setup();
    const edited = {
      ...doc,
      segments: [{ ...doc.segments[0], text: "the traffic dey choke" }],
    };

    await saveAnnotation("a1", edited, base);

    expect(spliceTokens).toHaveBeenCalledTimes(1);
    expect(spliceTokens).toHaveBeenCalledWith("a1", {
      start_token: 0,
      replace_count: 3,
      expected_version: 7,
      tokens: [
        { text: "the", start_sec: 0, end_sec: 0.2 },
        { text: "traffic", start_sec: 0.2, end_sec: 0.6 },
        /* "dey" is new, and "choke" has moved, so neither keeps a timing a
         * word no longer occupies. */
        { text: "dey", start_sec: null, end_sec: null },
        { text: "choke", start_sec: null, end_sec: null },
      ],
    });
  });

  it("creates, updates and deletes segments by what moved", async () => {
    const { doc, base } = setup();
    const edited = {
      ...doc,
      segments: [
        { ...doc.segments[0], speakerId: "p2" },
        { id: "new1", start: 2, end: 3, speakerId: "p1", text: "yes o" },
      ],
    };

    await saveAnnotation("a1", edited, base);

    expect(updateSegment).toHaveBeenCalledWith(
      "a1",
      "seg1",
      expect.objectContaining({ participant_id: "p2" })
    );
    expect(createSegment).toHaveBeenCalledWith(
      "a1",
      expect.objectContaining({ start_token: 3, end_token: 4 })
    );
    expect(deleteSegment).not.toHaveBeenCalled();
  });

  it("deletes a segment the editor dropped", async () => {
    const { doc, base } = setup();
    await saveAnnotation("a1", { ...doc, segments: [] }, base);
    expect(deleteSegment).toHaveBeenCalledWith("a1", "seg1");
  });

  /* Optimistic concurrency: the version the splice returns is what the
   * document patch has to carry, not the one we started with. */
  it("carries the version forward from the splice", async () => {
    const { doc, base } = setup();
    const edited = {
      ...doc,
      segments: [{ ...doc.segments[0], text: "changed words here" }],
      speechPresent: false,
    };

    await saveAnnotation("a1", edited, base);

    expect(updateAnnotation).toHaveBeenCalledWith(
      "a1",
      expect.objectContaining({ speech_present: false, expected_version: 8 })
    );
  });
});

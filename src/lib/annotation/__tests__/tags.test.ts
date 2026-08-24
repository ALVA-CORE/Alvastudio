import { describe, expect, it, beforeEach } from "vitest";
import { createAnnotationStore, selectNonSpeech, selectSpans } from "../store";
import {
  DIFFICULTY_FLAGS,
  NON_SPEECH_OPTIONS,
  TAG_FAMILIES,
  isValidTagValue,
  tagColor,
  tagFamily,
  tagLabel,
} from "../tags";
import { emptyAnnotationState, type TranscriptDoc } from "../types";
import { __resetSegmentIdCounter } from "../segments";

/**
 * The taxonomy is transcribed from `alva_schema_v2.json`. A value an annotator
 * can pick that the schema rejects is a row that fails validation on export —
 * worse than not offering it — so these tests pin the enums against the schema
 * as written.
 */

/** Verbatim from the schema, so drift in either direction fails here. */
const SCHEMA_ENUMS = {
  language: ["yo", "ha", "ig", "pcm", "en", "und"],
  disfluency: [
    "filled_pause",
    "repetition",
    "self_correction",
    "false_start",
    "prolongation",
  ],
  untranscribable: [
    "masked_by_noise",
    "overlapping_speech",
    "clipped_audio",
    "unknown_language",
    "unknown_word",
    "too_fast",
    "other",
  ],
  pcm_construction: [
    "serial_verb",
    "subjunctive_make",
    "progressive_dey",
    "completive_don",
    "future_go",
    "focus_copula_na",
    "negator_no",
    "ability_sabi",
    "relativizer_wey",
    "complementizer_say",
    "reduplication",
    "bare_plural_noun",
    "other",
  ],
} as const;

const SCHEMA_NON_SPEECH = [
  "cough",
  "laugh",
  "throat_clear",
  "breath",
  "lip_smack",
  "background_noise",
  "cross_talk",
  "music",
  "dtmf_or_beep",
  "non_lexical_hesitation",
  "other",
];

const SCHEMA_DIFFICULTY = [
  "heavy_accent",
  "heavy_noise",
  "overlapping_speech",
  "unclear_audio",
  "clipping",
  "low_volume",
  "fast_speech",
  "dense_code_switching",
  "domain_jargon",
];

describe("taxonomy matches the schema", () => {
  it.each(Object.keys(SCHEMA_ENUMS) as (keyof typeof SCHEMA_ENUMS)[])(
    "%s offers exactly the schema's values",
    (kind) => {
      const values = tagFamily(kind).options.map((option) => option.value);
      expect([...values].sort()).toEqual([...SCHEMA_ENUMS[kind]].sort());
    }
  );

  it("offers exactly the schema's non-speech event types", () => {
    expect(NON_SPEECH_OPTIONS.map((o) => o.value).sort()).toEqual(
      [...SCHEMA_NON_SPEECH].sort()
    );
  });

  it("offers exactly the schema's difficulty flags", () => {
    expect(DIFFICULTY_FLAGS.map((o) => o.value).sort()).toEqual(
      [...SCHEMA_DIFFICULTY].sort()
    );
  });

  it("gives every family a distinct hue", () => {
    const colors = TAG_FAMILIES.map((family) => family.color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it("labels every value, and falls back rather than throwing", () => {
    for (const family of TAG_FAMILIES) {
      for (const option of family.options) {
        expect(tagLabel(family.kind, option.value)).toBe(option.label);
      }
    }
    expect(tagLabel("language", "klingon")).toBe("klingon");
  });

  it("validates values against their own family only", () => {
    expect(isValidTagValue("language", "pcm")).toBe(true);
    // `other` is real in three families but not in language.
    expect(isValidTagValue("language", "other")).toBe(false);
    expect(isValidTagValue("untranscribable", "other")).toBe(true);
  });

  it("throws on an unknown kind rather than returning a silent default", () => {
    expect(() => tagFamily("nonsense" as never)).toThrow(/unknown tag kind/i);
  });

  it("exposes a colour for every kind", () => {
    for (const family of TAG_FAMILIES) {
      expect(tagColor(family.kind)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe("tagging actions", () => {
  beforeEach(() => __resetSegmentIdCounter());

  function taggedStore() {
    const doc: TranscriptDoc = {
      sessionId: "s",
      speakers: [
        { id: "spk-0", label: "Speaker A", role: "moderator", color: "#25F07D" },
      ],
      segments: [
        { id: "a", start: 0, end: 3, speakerId: "spk-0", text: "abeg make you come" },
      ],
      ...emptyAnnotationState(),
    };
    return createAnnotationStore(doc, { duration: 30 });
  }

  it("adds a span and makes it undoable", () => {
    const store = taggedStore();

    store.getState().addSpan({
      kind: "language",
      value: "pcm",
      startToken: 0,
      endToken: 1,
      spanSource: "annotator_added",
    });

    expect(selectSpans(store.getState())).toHaveLength(1);
    store.getState().undo();
    expect(selectSpans(store.getState())).toHaveLength(0);
  });

  it("replaces rather than duplicates the same kind over the same range", () => {
    const store = taggedStore();
    const span = { kind: "language" as const, startToken: 0, endToken: 1 };

    store.getState().addSpan({ ...span, value: "pcm" });
    store.getState().addSpan({ ...span, value: "en" });

    const spans = selectSpans(store.getState());
    expect(spans).toHaveLength(1);
    expect(spans[0].value).toBe("en");
  });

  it("keeps different families on the same range side by side", () => {
    const store = taggedStore();

    store.getState().addSpan({ kind: "language", value: "pcm", startToken: 0, endToken: 1 });
    store
      .getState()
      .addSpan({ kind: "disfluency", value: "repetition", startToken: 0, endToken: 1 });

    expect(selectSpans(store.getState())).toHaveLength(2);
  });

  it("keeps the same family on different ranges", () => {
    const store = taggedStore();

    store.getState().addSpan({ kind: "language", value: "pcm", startToken: 0, endToken: 1 });
    store.getState().addSpan({ kind: "language", value: "en", startToken: 2, endToken: 3 });

    expect(selectSpans(store.getState())).toHaveLength(2);
  });

  it("updates a span in place", () => {
    const store = taggedStore();
    store.getState().addSpan({ kind: "language", value: "pcm", startToken: 0, endToken: 0 });

    const id = selectSpans(store.getState())[0].id;
    store.getState().updateSpan(id, { value: "und" });

    expect(selectSpans(store.getState())[0].value).toBe("und");
  });

  it("removes a span", () => {
    const store = taggedStore();
    store.getState().addSpan({ kind: "language", value: "pcm", startToken: 0, endToken: 0 });

    store.getState().removeSpan(selectSpans(store.getState())[0].id);
    expect(selectSpans(store.getState())).toHaveLength(0);
  });

  it("anchors a non-speech mark to a single token", () => {
    const store = taggedStore();
    store.getState().addNonSpeechMark({ type: "cough", atToken: 2 });

    const marks = selectNonSpeech(store.getState());
    expect(marks).toHaveLength(1);
    expect(marks[0]).toMatchObject({ type: "cough", atToken: 2 });
  });

  it("allows several non-speech marks on one token", () => {
    const store = taggedStore();
    store.getState().addNonSpeechMark({ type: "cough", atToken: 2 });
    store.getState().addNonSpeechMark({ type: "laugh", atToken: 2 });

    expect(selectNonSpeech(store.getState())).toHaveLength(2);
  });

  it("toggles difficulty flags, which are a set not a choice", () => {
    const store = taggedStore();
    const flags = () => store.getState().history.present.difficultyFlags;

    // The schema is explicit that heavy accent and heavy noise co-occur.
    store.getState().toggleDifficultyFlag("heavy_accent");
    store.getState().toggleDifficultyFlag("heavy_noise");
    expect(flags()).toEqual(["heavy_accent", "heavy_noise"]);

    store.getState().toggleDifficultyFlag("heavy_accent");
    expect(flags()).toEqual(["heavy_noise"]);
  });

  it("lets a human overrule the speech gate in either direction", () => {
    const store = taggedStore();
    expect(store.getState().history.present.speechPresent).toBe(true);

    store.getState().setSpeechPresent(false);
    expect(store.getState().history.present.speechPresent).toBe(false);

    store.getState().undo();
    expect(store.getState().history.present.speechPresent).toBe(true);
  });

  it("does not disturb playback state when tagging", () => {
    const store = taggedStore();
    store.getState().setCurrentTime(12);
    store.getState().setZoom(80);

    store.getState().addSpan({ kind: "language", value: "pcm", startToken: 0, endToken: 1 });
    store.getState().undo();

    expect(store.getState().currentTime).toBe(12);
    expect(store.getState().zoom).toBe(80);
  });
});

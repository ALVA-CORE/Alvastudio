import { describe, expect, it } from "vitest";
import { toTranscriptDoc } from "@/data/annotators/fromApi";
import type { ApiAnnotationDocument } from "@/lib/api/annotations";

const PARTICIPANTS = [
  { id: "p-ada", label: "Ada", role: "participant" },
  { id: "p-bola", label: "Bola", role: "participant" },
] as never[];

const TOKENS = ["one", "two", "three", "four"].map((text, idx) => ({
  idx,
  text,
  start_sec: idx,
  end_sec: idx + 1,
}));

const doc = (segments: unknown[]) =>
  toTranscriptDoc(
    { tokens: TOKENS, segments } as unknown as ApiAnnotationDocument,
    PARTICIPANTS
  );

const segment = (id: string, extra: Record<string, unknown>) => ({
  id,
  annotation_id: "a1",
  participant_id: null,
  start_token: 0,
  end_token: 1,
  language_spans: [],
  disfluencies: [],
  untranscribable_spans: [],
  non_speech_events: [],
  version: 1,
  created_at: "",
  updated_at: "",
  ...extra,
});

describe("a Scribe pre-filled draft", () => {
  /**
   * The bug this exists to stop.
   *
   * A pre-filled segment carries `speaker_label` with `participant_id`
   * null. Reading `participant_id` alone put **every** voice onto the first
   * participant — which collapses the whole room into one person and throws
   * away the only thing diarization was for.
   */
  it("keeps two Scribe voices apart", () => {
    const { segments } = doc([
      segment("s1", { speaker_label: "speaker_0", start_token: 0, end_token: 1 }),
      segment("s2", { speaker_label: "speaker_1", start_token: 2, end_token: 3 }),
    ]);

    expect(segments).toHaveLength(2);
    expect(segments[0].speakerId).not.toBe(segments[1].speakerId);
  });

  /* Each unnamed voice needs somebody to belong to, or its segments fall
     back onto a participant nobody chose. */
  it("gives every unnamed voice a speaker of its own", () => {
    const { speakers } = doc([
      segment("s1", { speaker_label: "speaker_0" }),
      segment("s2", { speaker_label: "speaker_1", start_token: 2, end_token: 3 }),
    ]);

    expect(speakers.map((s) => s.name)).toEqual(["Ada", "Bola", "Voice 1", "Voice 2"]);
  });

  /* Once an annotator says who a voice is, the segment belongs to the
     person — not to the label it arrived under. */
  it("prefers the linked participant over the label", () => {
    const { segments } = doc([
      segment("s1", { speaker_label: "speaker_0", participant_id: "p-bola" }),
    ]);

    expect(segments[0].speakerId).toBe("p-bola");
  });

  /* A draft the annotator made themselves has no labels and must be
     unchanged by any of this. */
  it("leaves a hand-made draft alone", () => {
    const { speakers, segments } = doc([
      segment("s1", { participant_id: "p-ada" }),
    ]);

    expect(speakers.map((s) => s.name)).toEqual(["Ada", "Bola"]);
    expect(segments[0].speakerId).toBe("p-ada");
  });
});

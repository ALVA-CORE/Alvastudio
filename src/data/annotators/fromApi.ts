import type {
  ApiAnnotationDocument,
  ApiSegment,
  ApiToken,
} from "@/lib/api/annotations";
import type { ApiParticipant } from "@/lib/api/focusGroups";
import { SPEAKER_PALETTE } from "@/lib/annotation/types";
import type {
  AnnotationSpan,
  NonSpeechMark,
  Segment,
  Speaker,
  TranscriptDoc,
} from "@/lib/annotation/types";
import type { SpanKind } from "@/lib/annotation/tags";

/**
 * The API's annotation document, in the shape the workspace edits.
 *
 * The two models differ in one structural way and it shapes everything here:
 * **the API anchors on tokens, the workspace anchors on seconds.** A segment at
 * the API is a token range; on screen it is a stretch of audio with text in it.
 * Tokens carry their own timings, so the conversion is a lookup, and it only
 * goes one way cleanly — which is why the write path sends token ranges back
 * rather than re-deriving them from seconds.
 *
 * Tags are four arrays at the API, split by what they mean, and one array here
 * discriminated by `kind`. Four arrays that differ only by their value enum
 * make four near-identical code paths in an editor, so they are flattened on
 * the way in and split again on the way out.
 */

/** Token timings are optional. A segment with none falls back to zero. */
function startSecond(tokens: ApiToken[], index: number): number {
  return tokens[index]?.start_sec ?? 0;
}

function endSecond(tokens: ApiToken[], index: number): number {
  return tokens[index]?.end_sec ?? tokens[index]?.start_sec ?? 0;
}

/** The words a segment covers. Inclusive on both ends, as the API defines it. */
function segmentText(tokens: ApiToken[], from: number, to: number): string {
  return tokens
    .slice(from, to + 1)
    .map((token) => token.text)
    .join(" ");
}

/**
 * Participants become speakers.
 *
 * A segment points at a `participant_id`, and the names and roles live on the
 * session rather than the annotation, so the workspace needs both. Colour is
 * positional: the palette has to be stable across reloads or every region in
 * the waveform changes colour when the page is refreshed.
 */
export function toSpeakers(participants: ApiParticipant[]): Speaker[] {
  return participants.map((participant, index) => ({
    id: participant.id,
    label: participant.label,
    name: participant.label,
    role: participant.role === "moderator" ? "moderator" : "participant",
    color: SPEAKER_PALETTE[index % SPEAKER_PALETTE.length],
  }));
}

function toSpans(segments: ApiSegment[]): AnnotationSpan[] {
  const spans: AnnotationSpan[] = [];

  for (const segment of segments) {
    for (const [index, span] of segment.language_spans.entries()) {
      spans.push({
        id: `${segment.id}-lang-${index}`,
        kind: "language" as SpanKind,
        value: span.language,
        startToken: span.start_token,
        endToken: span.end_token,
        spanSource: span.span_source,
      });
    }

    /* `disfluencies` and `untranscribable_spans` are typed `unknown[]` in the
     * generated client because the API documents them as bare arrays. They
     * carry the same three fields as a language span, so they are read
     * defensively rather than cast. */
    for (const [index, raw] of segment.disfluencies.entries()) {
      const span = raw as { start_token?: number; end_token?: number; type?: string };
      if (span.start_token === undefined || span.end_token === undefined) continue;
      spans.push({
        id: `${segment.id}-disf-${index}`,
        kind: "disfluency",
        value: span.type ?? "",
        startToken: span.start_token,
        endToken: span.end_token,
      });
    }

    for (const [index, raw] of segment.untranscribable_spans.entries()) {
      const span = raw as {
        start_token?: number;
        end_token?: number;
        reason?: string;
      };
      if (span.start_token === undefined || span.end_token === undefined) continue;
      spans.push({
        id: `${segment.id}-untr-${index}`,
        kind: "untranscribable",
        value: span.reason ?? "",
        startToken: span.start_token,
        endToken: span.end_token,
      });
    }
  }

  return spans;
}

function toNonSpeech(segments: ApiSegment[]): NonSpeechMark[] {
  const marks: NonSpeechMark[] = [];

  for (const segment of segments) {
    for (const [index, raw] of segment.non_speech_events.entries()) {
      const event = raw as { type?: string; at_token?: number };
      if (event.at_token === undefined) continue;
      marks.push({
        id: `${segment.id}-ns-${index}`,
        type: event.type ?? "",
        atToken: event.at_token,
      });
    }
  }

  return marks;
}

export function toSegments(
  apiSegments: ApiSegment[],
  tokens: ApiToken[],
  speakers: Speaker[]
): Segment[] {
  const fallbackSpeaker = speakers[0]?.id ?? "";

  return apiSegments
    .map((segment) => ({
      id: segment.id,
      start: startSecond(tokens, segment.start_token),
      end: endSecond(tokens, segment.end_token),
      /* A segment with nobody on it is still a segment. Dropping it would
       * lose the annotator's work over a missing attribution. */
      speakerId: segment.participant_id ?? fallbackSpeaker,
      text: segmentText(tokens, segment.start_token, segment.end_token),
    }))
    .sort((a, b) => a.start - b.start);
}

export function toTranscriptDoc(
  api: ApiAnnotationDocument,
  participants: ApiParticipant[]
): TranscriptDoc {
  const speakers = toSpeakers(participants);
  const tokens = api.tokens ?? [];
  const segments = api.segments ?? [];

  return {
    sessionId: api.session_id,
    segments: toSegments(segments, tokens, speakers),
    speakers,
    spans: toSpans(segments),
    nonSpeech: toNonSpeech(segments),
    difficultyFlags: api.difficulty_flags ?? [],
    /* Defaults to true: the automated gate marks a clip as having no speech
     * and a human can overrule it, so an absent value means nobody has said
     * otherwise. */
    speechPresent: api.speech_present ?? true,
  };
}

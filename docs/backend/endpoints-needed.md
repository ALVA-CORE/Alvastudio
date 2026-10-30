# What we need from the backend

Checked against the live OpenAPI document, 30 Oct 2026.

**Every ask and every open question lives here, and nowhere else.**

- [`replies/`](replies/) — each handoff as sent, with what we did with it.
- [`our-handling.md`](our-handling.md) — decisions we made against what the
  API already does. Not asks.


## Open

| #   | Ask                                                       | Blocks                                    | Priority |
| --- | --------------------------------------------------------- | ----------------------------------------- | --------
|     
| 1   | What is ElevenLabs for, and how does its output reach us? | Any work on transcription or diarization  | **High** |
| 2   | Confirm audio isolation will not be run over the corpus   | The recordings being what we say they are | Medium   |

Nothing else. Both asks of 29 Oct are closed by
[`replies/api-status-2026-10-30.md`](replies/api-status-2026-10-30.md): the
uphold preview is wired, and the field-name ask was our mistake and is
withdrawn (recorded at the bottom of this file).

---

## 1. What is ElevenLabs for, and how does its output reach us?

Nothing in `/openapi.json` changed for it. `POST /audio/transcribe` still
returns `{transcript, speech_detected, duration_seconds, trimmed_duration_seconds, sample_rate}` — a flat string, no speakers, no
timings. We are not building against it until the shape is in the spec.

**a. Which product, and for what?** Scribe (speech-to-text with
diarization) is the one that fits the annotator workspace. Text-to-speech
and audio isolation also exist and we cannot see a use for either here.

**b. If it is Scribe, how does the output arrive?** New fields on
`TranscriptionResult`, pre-filled segments on the annotation, or a new
route? `AnnotationTokenOut` already carries `start_sec`/`end_sec`, so word
timings have somewhere to go. Speakers do not.

**c. Who maps diarized speakers to real people?**
`SegmentOut.participant_id` points at an actual participant the intern
logged. Scribe returns anonymous `speaker_0`, `speaker_1`. Something has to
join the two: the backend guessing, or the annotator choosing once per
speaker. We would build the second, but only if that is the intent.

## 2. Audio isolation must not touch the corpus

If the plan is to run isolation over contributor recordings, please confirm
it is not, or talk to us first.

Reviewers reject clips for background noise, and interns are told to record
in a quiet room. Cleaning the audio afterwards would hide the fault the
review exists to catch, and would change the corpus from "how Nigerians
actually sound" to "how Nigerians sound after processing".

Isolation on a **copy**, to improve ASR accuracy only, is a different thing
and is fine.

---

## Withdrawn: "four field names do not match the API"

We filed this on 29 Oct. It was wrong, and the way it was wrong is worth
keeping on the record.

**Their handoff never contained those names.** It described
`GET /payments/terms` in prose:

> Rates, minimum, pay day, next pay day and cutoff, the daily limits, the
> narration cap, and the long-pause length.

No field names at all. `daily_sentence_limit`, `daily_narration_seconds`
and `next_cutoff` were **invented on our side**, writing the TypeScript type
from that sentence. We then checked our own invention against the spec,
found it did not match, and reported it as their documentation bug.
`max_recording_seconds` is real but belongs to the quota's `narration`
object, not to the terms — also our conflation.

**One half of the ask was fair.** `BackPayOut` genuinely is ambiguous in
prose: "Each row:" reads as though `contributors` is the list, when it is a
count and the rows are in `awards`. We wired it the wrong way first, and
`.length` on a number is `undefined`, which renders as nothing rather than
as an error. They have confirmed the shape and are adding a spec checker.

**What we change here.** Types are written from `/openapi.json`, not from
prose. Where a handoff describes a field in words, we look the name up
before typing it. Prose is a summary; the spec is the contract.

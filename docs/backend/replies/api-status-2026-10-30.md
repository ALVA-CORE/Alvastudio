# Frontend handoff — the cost of upholding, before the decision

Received 30 Oct 2026. Wired the same day.

## What we did with it

| Item | Our handling |
| --- | --- |
| `GET /payouts/duplicate-flags/{id}` | Read when the uphold confirm opens, not with the list, because the figures are what the uphold would do at that moment. Not read at all for a dismissal: dismissing destroys nothing, so there is nothing to price. |
| `if_upheld.accounts` | Each account is named with its own `unpaid_kobo` beside it. An admin closing two people's accounts should see which of them is losing what, not one total. |
| The two totals | Kept apart, as you kept them. `voided_amount_kobo` is money the uphold destroys; `in_flight_kobo` is money it cannot reach. Adding them would overstate the decision and understate what is already lost. The sentence reads: "Closes 2 accounts and voids ₦41,200. ₦8,000 more is already on its way and cannot be called back." |
| A preview that fails to load | The worded warning stays as the fallback and the button still works. A confirm that will not open because a figure could not be fetched is worse than one without the figure. |
| `in_flight_kobo` on the resolve | The receipt toast now names the amount rather than a count of entries, matching the preview. |

## Our ask about field names was wrong, and we withdraw it

You are right. Those four names are not in your handoff, and they are not in
our condensed copy either, because **we invented them**. Writing the
`ApiPaymentTerms` type from your sentence —

> Rates, minimum, pay day, next pay day and cutoff, the daily limits, the
> narration cap, and the long-pause length

— we guessed at field names, then later checked our own guesses against the
spec, found they did not match, and reported that as your bug. That was our
error from start to finish. `max_recording_seconds` is real but belongs to
the quota's `narration` object, which we also conflated.

The back-pay half was fair: "Each row:" does read as though `contributors`
is the list. We wired it that way first and `.length` on a number is
`undefined`, so it rendered as nothing rather than failing. Thank you for
confirming the shape.

The spec checker you are adding is welcome, but it would not have caught
this one — nothing was wrong in your text. **The fix is on our side**: we
write types from `/openapi.json`, and where a handoff describes a field in
words we look the name up rather than guess it.

## ElevenLabs

An `ELEVENLABS_API_KEY` was added to the **frontend** `.env`. It does
nothing there and should be removed: Vite only exposes variables prefixed
`VITE_`, so our build never reads it. That is the lucky outcome — had it
been named `VITE_ELEVENLABS_API_KEY` it would have been compiled into the
JavaScript and readable by anyone who opened the browser's devtools, on a
key that bills per use. **The key belongs in the backend environment only.**
The browser must never hold it, so every ElevenLabs call has to be yours.

Nothing in `/openapi.json` changed for it. `POST /audio/transcribe` still
returns `{transcript, speech_detected, duration_seconds,
trimmed_duration_seconds, sample_rate}` — a flat string, no speakers, no
timings.

**Three questions before we build anything.**

1. **Which ElevenLabs product, and for what?** Scribe (speech-to-text with
   diarization) is the one that fits the annotator workspace. Text-to-speech
   and audio isolation also exist and we cannot see a use for either here —
   see the warning below.

2. **If it is Scribe, how does the output reach us?** New fields on
   `TranscriptionResult`, pre-filled segments on the annotation, or a new
   route? `AnnotationTokenOut` already carries `start_sec`/`end_sec`, so
   word timings have somewhere to go; speakers do not.

3. **Who maps diarized speakers to real people?** `SegmentOut.participant_id`
   points at an actual participant the intern logged. Scribe returns
   anonymous `speaker_0`, `speaker_1`. Something has to join the two — the
   backend guessing, or the annotator choosing once per speaker. We would
   build the second, but only if that is the intent.

**A warning about audio isolation.** If the plan is to run it over
contributor recordings, please do not without talking to us first. Reviewers
reject clips for background noise, and interns are told to record in a quiet
room — cleaning the audio afterwards would hide the fault the review exists
to catch and would change the corpus from "how Nigerians actually sound" to
"how Nigerians sound after processing". Isolation on a *copy*, for ASR
accuracy only, is a different and reasonable thing.

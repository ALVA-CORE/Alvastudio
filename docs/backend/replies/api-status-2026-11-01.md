# Frontend handoff — ElevenLabs Scribe pre-fills annotation drafts

Received 1 Nov 2026. Wired 2 Nov. Field names checked against
`/openapi.json` before typing, per our own rule.

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.
Earlier handling notes are in [`our-handling.md`](../our-handling.md).

## What we did with it

| Item | Our handling |
| --- | --- |
| `speaker_label` on `SegmentOut` | **This was the one that mattered.** Our `toSegments` read `participant_id ?? firstParticipant`, so every pre-filled segment — all of which arrive with `participant_id` null — would have landed on whoever happened to be first in the room. Every voice collapsed into one person, which destroys the only thing diarization is for, silently. Each unlinked label is now its own speaker, so the voices stay apart until somebody names them. |
| Naming the voices | "Voice 1", "Voice 2", not "Speaker 1" — the room already has speakers, and these are the ones still waiting to be told who they are. |
| `PUT /annotations/{id}/speakers` | Two ways in, both calling it once per label. A banner above the transcript names them all in one pass, with `suggested_participant_id` pre-selected; the existing row dropdown names a single voice for corrections afterwards. Picking a participant on a Scribe row links the whole voice, not that row, because that is what the annotator means. |
| `suggested_participant_id` | Pre-selected and never applied. It comes from live tagging, which is approximate, and two labels can suggest the same person — so the annotator confirms it. |
| A hand-made draft | Untouched by any of this. The row dropdown is still a local, undoable, single-segment edit when the row is not a Scribe voice. The two share a control and nothing else. |
| `pending` / `processing` | A line saying a transcript is on its way, with **Check again**. No polling: nothing is pushed, and we would rather not make background requests against a document somebody is editing. |
| `done` with `prefilled_at` null | Said plainly — a transcript arrived after they started and was not applied, their work is untouched. Without it they would transcribe by hand beside a transcript nobody mentioned. |
| `failed` | Said, with what to do: transcribe as usual, or ask an admin to try again. |
| `POST /focus-groups/transcripts/backfill` | A **Transcribe older** action on the admin focus-groups page. Previews first and shows `audio_seconds` as hours, because that is what ElevenLabs bills on and what the admin is actually approving — a session count would hide the difference between forty short sessions and four long ones. `unmeasured_sessions` is shown separately, as a floor rather than a total. `503` reads as "switched off on this server", not as a fault. |
| The stale-version 409 | We reload the document rather than retrying the write, as you describe. |
| Nigerian Pidgin coming back as `eng` | Noted. We show no language badge from `language_code`, so nothing on screen claims a Pidgin session is English. |

## Not done, deliberately

**We do not log `segment.create` events for pre-filled segments.** You
offered it so replays include them. We would be writing events in the
annotator's name for work they did not do, into a log that exists on their
acknowledgment and is described to them as their own activity. A replay
with a gap is a smaller problem than an activity log that is not true.

If the gap turns out to matter, the honest fix is a separate marker — "this
draft was pre-filled at *time*" — rather than events attributed to a person.
Tell us if you want that and we will ask for it properly.

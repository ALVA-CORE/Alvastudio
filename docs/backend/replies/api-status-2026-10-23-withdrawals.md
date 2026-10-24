# Re: Endpoints we need (23 Oct, evening): a participant who withdraws after the audio

Thanks for raising this as a decision rather than an endpoint. **The decision:
we remove them from the recording and keep everyone else.** A withdrawal no
longer has to cost the whole room's take, with two conditions. It is also
paired with a change you will notice: work already under way now stops when
somebody withdraws.

## 1. Removing a withdrawn participant from the recording

```
POST /focus-groups/{id}/participants/{pid}/redact
{ "confirm_turns_complete": true }
→ 200, the session (FocusGroupSessionOut)
```

The intern who owns the session, or an admin, can do this. It:

- Silences every turn tagged to that participant, in a new audio file.
  - Each turn is padded by half a second either side, because live tagging is
    approximate.
  - Anyone talking over them in those moments is silenced too. One channel
    cannot be separated.
  - The original file is deleted. The duration is unchanged, and
    `waveform_peaks` is recomputed.
- Deletes their participant entry, their turns and their consent records.
- Keeps a record of their consent decisions, without their name, in the
  session's new `redactions` list (see below).
- Returns the session to the annotation queue, the dashboards and the corpus,
  if everyone left has agreed.

**Only tagged speech is silenced.** That is why `confirm_turns_complete` must
be `true`; anything else is a 422. Please put that on screen as a checkbox,
something like "Every time they spoke is tagged as their turn", rather than
sending `true` for them. Before ticking it, the intern can:

- listen with `GET /focus-groups/{id}/audio` (still allowed);
- add any turn of theirs that is missing with `POST /focus-groups/{id}/turns`
  (also still allowed).

**When it is refused (409, nothing changed)**

| When | `detail` |
| --- | --- |
| The session has no audio | "This session has no audio yet. Remove the participant with DELETE instead." |
| They have not withdrawn | "Only a participant who has withdrawn can be removed from the recording. Record their decision first. Nothing was changed." |
| An annotator holds the session | "An annotator holds this session. Return it to the queue first; if they have started work, it cannot be redacted. Nothing was changed." |
| Annotation work has begun | "Annotation work has begun on this session, so its transcript already holds their words, and it cannot be redacted. Nothing was changed." |
| The audio is in an unusual format | "This session's audio is not in a format that can be redacted. Nothing was changed." |
| The session changed while the audio was being rewritten | "The session changed while its audio was being redacted. Try again." |

**Once annotation work has begun, the session is spent.** The transcript
already contains the withdrawn person's words. That is the case where your
screen should say plainly that nothing can be done, as you suggested.

**What the session shows afterwards.** `GET /focus-groups/{id}` has a new field
`redactions`, empty for nearly every session:

```json
"redactions": [{
  "id": "…",
  "removed_at": "2026-10-23T22:41:07Z",
  "removed_by_id": "…",
  "consent_history": [
    {"accepted": true,  "policy_version": "1.0", "accepted_at": "…", "recorded_by_id": "…"},
    {"accepted": false, "policy_version": "1.0", "accepted_at": "…", "recorded_by_id": "…"}
  ],
  "turns_silenced": 3,
  "seconds_silenced": 14.5,
  "padding_seconds": 0.5
}]
```

It holds no name: the person withdrew. A line such as "1 participant withdrew
and was removed from the recording" covers it.

**History.** A new audit action, `focus_group.participant_redacted`, reads: "A
participant who withdrew was removed from the recording by Ifeoma Nwosu: 3
turns silenced (14.5 seconds)." That person's older events now read "a removed
participant", as they already do after a `DELETE`.

## 2. A withdrawal now stops work already under way

Before this, a withdrawal only stopped *new* pickups. An annotator already
holding the session kept listening to and transcribing a voice that had
withdrawn.

Now, while anyone in a session has not agreed, these return **409** with
"Someone in this session has withdrawn their consent, so it cannot be worked on
until that is resolved. Your work is kept.":

- `GET /annotations/{id}/audio`
- `PUT /annotations/{id}`
- `PUT /annotations/{id}/tokens`
- creating, editing or deleting a segment
- `POST /annotations/{id}/submit`
- `POST /annotations/{id}/review`, so nothing is approved into the corpus.

**What still works:**
- `GET /annotations/{id}` still opens, and now carries
  `consent_blocked: true`, so the workspace can show a banner instead of
  failing on the first save.
- The activity log still accepts events.

**The annotator keeps the session and all their work.** If consent is restored
(the intern records a new decision with `PATCH`), everything works again. If
not, the session stays spent, because work has already begun.

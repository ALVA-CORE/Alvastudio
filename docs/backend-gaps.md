# What the frontend still needs — 25 Sep 2026

Tested live against `https://api.alvacoreai.com` with real accounts for all
three roles. Most screens are now wired to the API.

This is what is still fake or missing.

---

## 1. No annotator dashboard — BLOCKING

There is `/dashboard/contributor` and `/dashboard/intern`. There is no
`/dashboard/annotator`.

The whole annotator dashboard is fake because of this.

**Add `GET /api/v1/dashboard/annotator`** returning:

- `sessions_annotated`
- `segments_created`
- `tags_applied`
- `hours_annotated`
- `daily_activity` — a list of `{date, count}` for the chart

### `daily_activity` — what to count

**Count segments, on the day each segment was created.** Not submissions.

Why:

- Submissions are 0 or 1 on most days. A daily series of mostly zeros with the
  odd 1 draws a flat line. The chart is a smoothed area chart of throughput — it
  needs a number that moves.
- A session claimed Monday and submitted Friday puts all five days of work on
  Friday if you count submissions. Segment timestamps put the work on the days
  it actually happened.
- The card is labelled "Clips annotated per day".

Four things it needs:

- **Include days with no activity**, as `{date, count: 0}`. Do not leave them
  out. The chart buckets days into weeks and months and runs a centred 3-point
  rolling mean — a missing day shifts the curve instead of showing a dip.
- **365 days of history.** The range selector goes up to 12 months.
- **`date` as `YYYY-MM-DD`, in Africa/Lagos.** Day boundaries at UTC split an
  evening's work across two days.
- **Scoped to the caller.** The card is "Your activity".

`daily_activity` summed over a window should equal `segments_created` for that
same window, so the headline number and the chart agree.

---

## 2. The prompt and stimulus banks are empty — BLOCKING

`/prompts/next` and `/stimuli/next` both return 404 "No unread prompts
available". Only an admin can add them, and contributors cannot self-register as
admin.

So a contributor logs in and has nothing to record. The studio works, it just
has no content.

**Please seed the prompt and stimulus banks**, or give me an admin account so I
can.

---

## 3. Participants lose four fields — BLOCKING

The intern intake form collects nine things per participant. `ParticipantIn`
stores five: `label`, `age_bracket`, `gender`, `role`, `language_variety`.

These four have nowhere to go:

| Field | Why it matters |
| --- | --- |
| `consent` | Verbal or signed. **This is a legal record.** |
| `state` | The corpus samples by state. Without it there is no coverage data. |
| `native_language` | Needed to interpret the speaker's variety. |
| `phone` | How the intern re-contacts a participant. |

I am keeping them in browser localStorage so the intern does not lose their own
work. That is a stopgap and not an acceptable one — it does not survive a
different browser or device, and a consent record held in one laptop's
localStorage is not a consent record.

**Please add these four to `ParticipantIn` and `Participant`.**

---

## 4. `GET /focus-groups` returns counts, not participants

The list row has `participant_count` but no participants. To show a participant
table I fetch the list, then one `GET /focus-groups/{id}` per session.

Twenty sessions is twenty-one requests for one page.

**Please either** add `?expand=participants` to the list, **or** add
`GET /participants` returning the caller's participants directly.

---

## 5. No way to delete a focus group session

`DELETE /api/v1/focus-groups/{id}` returns 405.

A session created by mistake — wrong topic, wrong participants, a test — is
permanent, and once it has audio it goes into the annotation queue where someone
will waste time on it.

**Please add a delete, or a soft-delete/cancel.**

---

## 6. Say which audio formats decode

`POST /focus-groups/{id}/audio` rejected a file with
`"Could not decode audio; the file may be corrupt or in an unsupported format"`.

The browser's `MediaRecorder` produces **`audio/webm`** (Opus) on Chrome and
Android, and `audio/mp4` on Safari. Neither is something I can change — it is
what the browser gives me.

**Please confirm webm/Opus and mp4/AAC both decode.** If they do not, the record
pages cannot upload at all and I need to know what to convert to.

---

## 7. No time-series data on any dashboard

`/dashboard/contributor` and `/dashboard/intern` return totals only.

Every chart on both dashboards is still fake: weekly sessions, the trend line,
the radar, the demographic pyramid over time.

**Add a date range and daily buckets**, for example:
`GET /dashboard/intern?from=2026-08-01&to=2026-09-01` returning
`[{date, sessions, participants, hours}]`.

---

## 8. No waveform data

The annotation workspace draws a waveform per segment. I generate a fake one.

**Add a peaks array per session** — numbers between 0 and 1, derived from the
real audio.

---

## 9. Missing fields on list rows

**`/annotations/queue`** gives `session_id`, `topic`, `duration_seconds`,
`participant_count`, `created_at`.
The sessions table also shows **state**, **language** and **who recorded it**.
Those columns are blank.

**`/recordings`** gives `prompt_id` but not the prompt **text**. The review queue
shows the prompt, so it currently shows an id. Fetching the text per row would be
one extra call per row.

**Please add:** `language_variety`, `state` and `intern_name` to the annotation
queue row, and `prompt_text` to the recording row.

---

## 10. No contributor points

The contributor home shows a points balance. There is no points field anywhere.
`/payments/earnings` returns money, which is a different thing.

**Either add a points figure, or tell me to show earnings instead.**

---

## 11. Small things

**a. Document the audio rule.** A focus-group session does not appear in
`/annotations/queue` until audio is uploaded. Took me a while to work out.

**b. No total count on lists.** Only `limit` and `offset`. I can build "Load
more" but not page numbers. A `total` field or `X-Total-Count` header fixes it.

**c. Token lasts 24 hours.** `/auth/refresh` works and I now refresh
automatically before it expires. No change needed — just confirming.

**d. Please delete my test data.** Accounts:
`alva-qa-contributor@example.com`, `alva-qa-intern@example.com`,
`alva-qa-annotator@example.com`. Plus two focus-group sessions with test audio
and two annotations.

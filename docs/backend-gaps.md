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

## 3. No time-series data on any dashboard

`/dashboard/contributor` and `/dashboard/intern` return totals only.

Every chart on both dashboards is still fake: weekly sessions, the trend line,
the radar, the demographic pyramid over time.

**Add a date range and daily buckets**, for example:
`GET /dashboard/intern?from=2026-08-01&to=2026-09-01` returning
`[{date, sessions, participants, hours}]`.

---

## 4. No waveform data

The annotation workspace draws a waveform per segment. I generate a fake one.

**Add a peaks array per session** — numbers between 0 and 1, derived from the
real audio.

---

## 5. Missing fields on list rows

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

## 6. No contributor points

The contributor home shows a points balance. There is no points field anywhere.
`/payments/earnings` returns money, which is a different thing.

**Either add a points figure, or tell me to show earnings instead.**

---

## 7. Small things

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

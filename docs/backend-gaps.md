# What the frontend still needs — 26 Sep 2026

Re-tested live against `https://api.alvacoreai.com` with an admin account.

**Most of the last round is fixed.** Confirmed working now:

- `GET /dashboard/annotator` — with `daily_activity` in exactly the shape asked for
- Participants carry `state`, `native_language`, `phone`, `consent_given`,
  `consent_version`, `consent_at`
- `GET /focus-groups?expand=participants` — one request instead of one per session
- `DELETE /focus-groups/{id}` — returns 204
- `GET /users`, `DELETE /users/{id}`, `GET /users/{id}/deletion-preview`
- `AnnotationQueueRow` carries `language_variety`, `intern_name`, `state`
- `RecordingOut` carries `prompt_text` and `stimulus_text`
- `GET /focus-groups/{id}/audio`, `/payments/rates` with `PUT`

All of that is wired. What follows is what is left.

---

## 1. The prompt and stimulus banks are empty — BLOCKING

`GET /prompts` and `GET /stimuli` both return `[]`. `/prompts/next` and
`/stimuli/next` both 404.

A contributor logs in with nothing to record. This is the last thing blocking the
contributor flow end to end, and it is the oldest item on this list.

**Please seed both banks.** I have an admin account and can load them if you send
me the content — I am not going to invent prompts for a linguistic corpus.

---

## 2. No admin dashboard

`GET /dashboard/admin` returns 404.

There is no way to answer "how many hours do we have", "which annotators are
working", or "what is being rejected and why".

**Add `GET /api/v1/dashboard/admin`** with corpus totals and a growth series —
the same `daily_activity` shape as the annotator dashboard works well.

---

## 3. Cannot create or edit users

`GET /users` and `DELETE /users/{id}` exist. `POST /users` and
`PATCH /users/{id}` do not.

So an admin can list and delete people but cannot create an annotator or change
anyone's role. Staff accounts still have to be made by self-registration, and
`annotator` cannot be self-registered.

**Add `POST /users` and `PATCH /users/{id}`.**

---

## 4. No notifications

`GET /notifications` returns 404. The contributor and intern notification
screens are entirely mock.

**Add a notifications list**, or tell me to drop those screens.

---

## 5. Stimuli cannot be edited or removed

Prompts have `PATCH` and `DELETE`. Stimuli have neither — only `GET` and `POST`.

**Add `PATCH /stimuli/{id}` and `DELETE /stimuli/{id}`** so the two banks behave
the same. A bulk create for both would also save a linguist loading 200 one at a
time.

---

## 6. No time-series on the contributor or intern dashboards

`/dashboard/contributor` and `/dashboard/intern` return totals only. The
annotator one now has `daily_activity`; these two do not, so their charts are
still fake.

**Add the same `daily_activity` array to both.**

---

## 7. No waveform data

The annotation workspace draws a waveform per segment. I generate a fake one.

**Add a peaks array per session** — numbers between 0 and 1, from the real audio.

---

## 8. No contributor points

The contributor home shows a points balance. There is no points field anywhere.
`/payments/earnings` returns money, which is a different thing.

**Either add a points figure, or tell me to show earnings instead.**

---

## 9. No per-annotator tag or demographic breakdown

The annotator dashboard has two charts left on sample data: tag mix (variety →
category → tag) and demographic reach (annotated hours by age and gender).

`/dashboard/annotator` gives `tags_applied` as a single number.

**Add a per-tag breakdown and a per-speaker-demographic breakdown**, or say so
and I will drop the two charts.

---

## 10. Small things

**a. `consent_version` is carrying the wrong thing.** The intake form asks *how*
consent was given — verbal or signed. There is no field for that, so I put it in
`consent_version`, which is meant for a document version. A `consent_method`
would be cleaner.

**b. No total count on lists.** Only `limit` and `offset`. I can build "Load
more" but not page numbers. A `total` field or `X-Total-Count` header fixes it.

**c. Confirm the audio formats.** `POST /focus-groups/{id}/audio` rejects what it
cannot decode. Browsers produce **webm/Opus** (Chrome, Android) and **mp4/AAC**
(Safari), and I cannot change that. A WAV decodes fine. Please confirm those two
do as well.

**d. Please delete my test data.** Accounts `alva-qa-contributor@example.com`,
`alva-qa-intern@example.com`, `alva-qa-annotator@example.com`, and four
focus-group sessions with test audio.

# Backend status — tested 25 Sep 2026

Tested live against `https://api.alvacoreai.com`. Almost everything from the last
list is done. Thank you.

I registered four test accounts (`alva-qa-<role>@example.com`) and ran the full
annotator flow end to end. It works.

---

## Confirmed working

- All roles register and log in. `annotator` is live.
- `admin` correctly refuses self-registration (403). Good catch.
- Full annotation flow: claim → splice tokens → add segment → edit segment →
delete segment → set flags → submit.
- Optimistic concurrency works. A stale `expected_version` returns 409 with a
clear message.
- `/onboarding/annotator-profile` and `/onboarding/intern-profile` both respond.
- `GET /focus-groups/{id}/audio` works. Upload then fetch is fine.

One thing I learned by testing: a session only enters the annotation queue
**after audio is uploaded**. That is sensible, just not written down anywhere.

---



## 1. There is no annotator dashboard

`/dashboard/contributor` and `/dashboard/intern` exist. There is no
`/dashboard/annotator`.

The annotator dashboard needs: sessions annotated, hours annotated, segments
created, tags applied, and a daily activity count for the chart.

**Add** `GET /api/v1/dashboard/annotator` **and**
`GET /api/v1/dashboard/annotator/{annotator_id}`**.**

This is the only thing still blocking the annotator dashboard. Everything else
on that screen is now real.

---



## 2. Waveform data

The annotation workspace draws a waveform per segment. There is no source for
it, so I generate a fake one.

**Add a peaks file or endpoint per session** — one array of numbers between 0
and 1. Anything works as long as it is derived from the real audio.

If that is heavy, say so and I will keep the placeholder.

---



## 3. Small things

**a. Document the audio-before-queue rule.** A session does not appear in
`/annotations/queue` until audio is uploaded. Worth one line in the docs.

**b.** `/annotations/queue` **rows are thin.** They carry `session_id`, `topic`,
`duration_seconds`, `participant_count`, `created_at`. The session list screen
also shows state, language and who recorded it. Right now those columns are
blank. Can you add `language_variety`, `state` and `intern_name` to the row?

**c. List endpoints still have no total count.** Only `limit` and `offset`. I can
only build "Load more", not page numbers. A `total` field or `X-Total-Count`
header would fix it.

**d. Please delete my test accounts when convenient.** They are
`alva-qa-contributor@example.com`, `alva-qa-intern@example.com` and
`alva-qa-annotator@example.com`. I also created two focus-group sessions with
test audio.
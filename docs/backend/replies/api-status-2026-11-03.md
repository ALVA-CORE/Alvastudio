# Frontend handoff: hours by language, "how did you hear about us", bulk profiles, and upload checks

Received 3 Nov 2026. Wired 4 Nov. Every field and route name checked against
the live `/openapi.json` before typing. The handoff as sent is at the end.

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here. This
closes #1, #2 and #3, leaves #4 open, and opens #5.

## What we did with it

| Item | Our handling |
| --- | --- |
| `hours_by_language_variety` | The corpus "By variety" donut is in hours now, labelled as hours. It falls back to the `by_language_variety` count, labelled as a count, on an API without it. `unknown` reads "Not recorded". |
| `referral_source` / `referral_source_detail` | Sign-up already sent both. The detail goes only with `other`, so the 422 for a detail on any other source cannot be hit from our form. Both are in the users CSV export. |
| `referral_sources` | The corpus "How contributors found us" card, already built against this shape. `unknown` is counted in the subtitle as "with no answer", not drawn as a wedge. |
| `referral_other_details` | Listed under that card's ring, most common first, four shown and the rest in the hover title. |
| `GET /users/profiles` | The users CSV export uses it, 500 a request, and passes `role` when everyone in view shares one. Our status filter has no exact match among the route's filters, so rows are matched to the accounts in view by id. A 404 (an API without the route) falls back to one request per person. |
| `already_read` (409) | The studio's stack is paged locally, so a sent sentence used to come round again on a swipe. Sent sentences now leave the stack, on success and on any 409. The next card takes the place of the one sent. |
| `duplicate_audio` (409) | The same as any 409: the take is dropped and the sentence leaves the stack. In practice it means a retried upload that had in fact landed. On stimuli the take is dropped and the stack moves on. |
| `no_speech` / `too_short` (422) | The API's sentence is shown as it comes. The take stays so they can hear it, and Retake is beside it. |
| `too_fast` (429) | The take is kept and Save counts down ("Save in 0:42") until the wait is over, then says they can send it. Told from the daily-limit 429 by `code`; that one reloads the quota as before. |
| `Retry-After` | Read when the browser lets us. Cross-origin it does not yet (only `X-Total-Count` is exposed), so the wait falls back to a minute. That is ask #5. |
| Queued uploads | The studio sends one take at a time and has no queue, so there is nothing to keep. |
| `measured_duration_seconds` | Preferred over `duration_seconds` wherever a recording's length is shown: the review queue, the admin reviews list and contributor notifications. |

## Not done, deliberately

- **An admin screen for `GET /users/{id}/uploads`.** Offered, not asked for.
  Worth building if the 7-minute burst is not a one-off. It would sit on the
  user detail panel beside the audit log.

## As sent

> Field and route names below are checked against the OpenAPI document
> (`/openapi.json`), which is the contract. The prose is a summary of it.
>
> This answers all three open asks from 2 Nov. Section 4 is new from our side,
> and it changes what the studio's upload can be told: please read it first.
>
> **1. Hours by language variety.** `GET /corpus/summary` gains
> `hours_by_language_variety`: hours per variety, as a map like
> `by_language_variety`. It covers the same clips and sessions as
> `by_language_variety`, and measures them as `total_hours` does, so the
> values add up to `total_hours`, give or take rounding to 2 places. Sessions
> recorded without a variety are under `unknown`. Nothing existing changed.
>
> **2. "How did you hear about us?"** `PUT /onboarding/profile` accepts
> `referral_source` (any of the 15 values; anything else is a 422) and
> `referral_source_detail` (free text up to 120 characters, for `other`
> only). Both come back on `GET /onboarding/profile` and
> `GET /users/{id}/profiles`. PUT merges, so the detail is judged against the
> profile as it will be after the save: a detail with a source that will not
> be `other` is a 422; changing the source away from `other` clears the
> stored detail; a blank detail is stored as `null`. `GET /corpus/summary`
> gains `referral_sources` (contributor accounts per answer, every contributor
> account including the waiting list and deactivated ones; `unknown` is
> everyone with no answer; sources nobody chose are left out) and
> `referral_other_details` (the `other` answers in contributors' own words,
> with counts, grouped ignoring case and spacing).
>
> **3. Every user's profile in one request.** New: `GET /users/profiles`
> (admin), with the same filters and order as `GET /users` (`email`, `role`,
> `approved`), `limit` up to 500 (100 by default), `offset` and `envelope`.
> Each row holds everything `GET /users/{id}/profiles` returns, plus `email`,
> `full_name`, `is_active` and `created_at`. A fixed handful of queries per
> page.
>
> **4. Uploads the studio must handle.** Both recording routes now refuse a
> recording nobody could have made. A refusal carries a stable `code` beside
> `detail`: branch on `code`, show `detail`. Nothing is stored, and it does
> not count toward the daily limit.
>
> | `code` | Status | When | Routes |
> | --- | --- | --- | --- |
> | `already_read` | 409 | They have a reading of this sentence that was not rejected. | prompt-read |
> | `no_speech` | 422 | Nobody could be heard. | both |
> | `too_short` | 422 | Less speech than reading the sentence takes. | prompt-read |
> | `duplicate_audio` | 409 | This exact recording was uploaded before, by anyone. | both |
> | `too_fast` | 429 | More recorded audio in the last 10 minutes than 10 minutes can hold. `Retry-After` gives the seconds to wait. | both |
>
> The studio should stop offering "record again" for a sentence already
> submitted, read `code` on a 429 (the daily-limit 429 has none), and keep
> queued uploads after a `too_fast` refusal, the one to retry later.
> `RecordingOut` gains `measured_duration_seconds`. New, optional:
> `GET /users/{id}/uploads?since=&until=`, one contributor's clips in a period
> with `gap_seconds`, `speech_seconds` against `min_speech_seconds`, `device`,
> `duplicate_of` and `would_refuse`, plus a summary.

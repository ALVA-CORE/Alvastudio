# Re: Endpoints we need — what's built, and two things to fix first

Thank you for `endpoints-needed.md`. Checking every ask against the live
OpenAPI first made this far quicker to work through, and the proposed shapes
were clear enough that most of them are built exactly as you wrote them.

**Everything on your list is answered below, and every endpoint is built and
tested.** It goes live with the next deploy; we will confirm when it has. Where
we built something slightly differently from what you proposed, the reason is
right beside it.

Before any of the new endpoints, though, **§1 is worth reading first**: two of
the four workspace assumptions in your §8 turn out not to hold, and one of them
moves tags onto the wrong words without any error.

---

## 1. Please read first: two workspace assumptions that do not hold

Thank you for writing these down as assumptions rather than just building on
them — it is the only reason they surfaced.

**A whole-array splice destroys every segment and span.** When you send
`PUT /tokens` with `start_token: 0` and `replace_count: <all>`, every existing
index falls inside the replaced range. The server then has nowhere sensible to
put them, so every segment collapses to cover the whole new transcript, and
every language span, disfluency and untranscribable span with it. It does not
error; the tags simply end up on the wrong words. We would suggest sending the
narrowest range that actually changed instead. Your ordering concern is a fair
one, and one splice per save — just a narrow one — avoids it as well.

**`version` does not move after every write.** The annotation's `version`
advances on exactly four calls: `PUT /annotations/{id}`, `PUT .../tokens`,
`POST .../submit` and `POST .../review`. A segment save (`PUT .../segments/{sid}`)
moves only that segment's own `version`, and returns a `SegmentOut` that does
not carry the annotation's. So a save chained across all three writes has
nothing to chain from at the segment step. Two suggestions:

- chain the annotation `version` only from responses that return the full
  document;
- after any token splice, re-read segment versions from the returned document.
  A splice bumps the `version` of **every** surviving segment, so versions held
  from before it will 409 on the next segment save.

The other two you had exactly right:

| Your assumption | Confirmed |
| --- | --- |
| Tokens split on whitespace | Yes. The server never tokenizes at all, and nothing branches on `tokenization_convention_id` yet — it is a provenance stamp. |
| You carry token timings yourself | Yes, and you are right to. Untouched tokens keep their `start_sec`/`end_sec`; new ones take exactly what you send; nothing is ever re-derived. |

---

## 2. #5 — Assigning an unclaimed session

**`PATCH /focus-groups/{session_id}/assignee`**, admin-only, body
`{"annotator_id": "<id>"}`. We went with your second option, since, as you said,
the thing being handed out is a session.

- It opens the annotation as a side effect, through the same code `claim-next`
  uses, so the draft is identical either way — including the speaker segments
  seeded from the intern's turns.
- If the session already has an annotation, both ownership records move
  together.
- `{"annotator_id": null}` returns the session to the queue.
- Returns the session detail.

| Response | When |
| --- | --- |
| 400 | The session has no audio yet, or the user is not an annotator |
| 404 | No such session or user |
| 409 | The annotation is already approved |

**Who holds a session is now visible.** `assigned_annotator_id` is on the
session list row and the detail, and the list row also carries
`annotator_name`. Neither was available anywhere before.

**`open_count` on `GET /users`**, for the lightest-loaded-first picker: the
annotations still on that person's desk (`draft` + `needs_rework`). It is `null`
on other responses that return a user, such as `/auth/me`, meaning "not counted
here" rather than zero.

One thing worth knowing for the UI: assigning creates annotation work, and
deleting a session is refused once work exists. So an admin who assigns by
mistake needs to unassign (`null`) before deleting.

## 3. #1 — `GET /points/leaderboard`

As specified: `?limit=3` returns `[{contributor_id, full_name, points, rank}]`,
with the full name for you to shorten.

- **`limit` is capped at 3 on the server**, and anything above returns 422.
  Every contributor can read this endpoint, so "nobody below rank 3 is ever
  shown" has to be enforced here rather than by the UI.
- **Ties will be common early on.** Every approval pays the same rate, so ten
  people with one clip each are a ten-way tie for 1st. Tied contributors share a
  rank number, are listed in the order they reached that score, and the list
  stops at `limit`. A podium can therefore read "1st, 1st, 1st".

Building this also fixed two ranking bugs, which your podium would otherwise
have put on screen. Voided credits were still counting toward other people's
ranks, and interns or admins with earnings could be ranked among contributors.
`rank` on `/dashboard/contributor` uses the same corrected standings, so a few
rank numbers may shift slightly. `ranked_contributors` now counts exactly the
people `rank` is computed among.

## 4. #7 — `GET /payments/earnings/summary`

Admin-only, highest earner first, with `?envelope=true` supported:

| Field | Meaning |
| --- | --- |
| `contributor_id`, `full_name` | Who |
| `role` | Almost always `contributor` — see below |
| `recordings` | Clips that passed review |
| `minutes` | Of those clips, **measured** from the audio |
| `currency` | `NGN` |
| `held_kobo`, `payable_kobo`, `in_flight_kobo`, `paid_kobo` | The same four buckets as `GET /wallet` |
| `earned_kobo` | The sum of those four; the figure `/wallet` calls `lifetime_kobo` |
| `payout_status` | `pending` / `in_flight` / `paid` — the same badge as the contributor dashboard |
| `last_activity_at` | Their most recent recording, or null |

We added the four buckets beside `earned` and `paid`, because they cost nothing
extra and they are what make the two add up. Everybody is listed, including
contributors who have not earned yet and anyone the next pay run would skip. So
are people who earned as contributors and have since changed role, since money
owed does not stop being owed — that is what `role` is for.

These figures are tested against each person's own dashboard, so the payments
page and a contributor's wallet cannot disagree.

## 5. #9 — Review work is now allocated automatically

Thank you for spelling out the two edge cases — both are handled exactly as you
described.

- **A clip is assigned the moment it is submitted**, to the active, approved
  intern holding the least open review work. With nobody reviewing yet, 1,000
  clips across 10 interns is 100 each.
- **`GET /reviews/queue?mine=true` is an intern's desk**: clips assigned to them
  and still awaiting a verdict, oldest first. The default (without `mine`) is
  still the unassigned pool, so nothing you have wired breaks. It now supports
  `?envelope=true` too.
- **A clip on someone's desk is theirs.** A verdict from anyone else returns
  409, admins included. An admin moves it first with
  `PATCH /recordings/{id}/assignee`, which also leaves a record.
- **`POST /reviews/assign-next` claims only from the unassigned pool**, never
  from a colleague. The API cannot tell a clip someone is listening to from one
  they have not opened, so taking one could throw away their work. An intern
  who clears their desk still gets more quickly, because they become the
  least-loaded and receive each new arrival. Under allocation the pool is
  usually empty, so a 404 here is normal.
- **Deactivating an intern, moving them to another role, or deleting them**
  shares out their unreviewed clips to the others immediately. Clips they have
  reviewed stay with them.
- **A newly approved intern** receives new arrivals; the existing backlog is not
  re-levelled.

One related change: `stuck_unreviewed_recordings` on `/dashboard/admin` now
counts clips that have been awaiting a verdict for over three days, whoever
holds them. It used to mean "nobody assigned", which would always read zero now.

## 6. #10 — The focus-group topic bank

**`/focus-group-topics`**, with the same shape as `/prompts`, including
`used_by_count`:

| Endpoint | Who |
| --- | --- |
| `GET /focus-group-topics` (filters: `is_active`, `language_variety`, `category`; envelope supported) | Interns and admins |
| `GET /focus-group-topics/{id}` | Interns and admins |
| `POST`, `PATCH /focus-group-topics/{id}` | Admins |
| `DELETE /focus-group-topics/{id}` — retires it; `PATCH is_active: true` brings it back | Admins |

Contributors and annotators cannot see the bank, which closes the
`/prompts/next` hazard you flagged.

**Starting a session from a topic:** `POST /focus-groups` now accepts
`topic_id`.

- With only `topic_id`, the session takes the topic's text.
- With both `topic_id` and `topic`, your typed wording is kept and the link is
  kept as well.
- A retired topic returns 409; an unknown one returns 404.

Sessions carry `topic_id`, and editing a topic later does not rewrite sessions
already run from it.

**Your existing topics move across on their own.** On deploy, every prompt with
`category="focus_group_topic"` is copied into the topic bank — keeping the same
id, so any reference you hold stays valid — and retired in the prompt bank. So
the third tab only needs to read from the new endpoint; there is nothing to move
by hand. The copies drop the `focus_group_topic` category, since it was a
storage marker rather than a real category.

## 7. #3 — The annotation activity log

Thank you for raising the monitoring question yourselves rather than leaving it
for later. It has been settled as follows, and the API enforces it:

- **Nothing is recorded until the annotator acknowledges it.** They record
  `POST /onboarding/consent` with
  `{"consent_type": "annotation_activity_log", "accepted": true}` once. Until
  then, and after any withdrawal (`accepted: false`), event batches return 403
  and nothing is stored. Their annotation work is never blocked by this — only
  the log.
- **Events are kept for 90 days** from when the server received them, then
  deleted automatically.
- **Only admins, and the annotator it describes, can read the log** — not
  reviewers.
- **It holds no transcript text**, as you designed: each op accepts exactly the
  payload keys you specified, and anything extra is refused.

The four endpoints are as you proposed:

| Endpoint | Notes |
| --- | --- |
| `POST /annotations/{id}/events` | `{events: [...]}`, up to 500 per batch. Returns `{accepted, duplicates, last_seq}`. Assigned annotator only. |
| `GET /annotations/{id}/events?after_seq=&limit=` | Replay order. Page with `after_seq`, not an offset, since the log may grow while you read it. `X-Total-Count` / envelope `total` = events after `after_seq`. `limit` up to 1,000. |
| `GET /annotations/{id}/events/summary` | `by_op`, `by_actor` (with names), `active_minutes`, `first_at`/`last_at`, `last_seq`. |
| `GET /annotations/{id}/snapshot?at_seq=` | The workspace state folded at that point: segments with speaker, tags and text length, plus speakers. Events that refer to a segment that was never created are counted in `unresolved`, not dropped. |

Your rules, as implemented:

- **A batch is all or nothing.** A retried event (same `id`, same `seq`) is
  skipped and counted under `duplicates`, so re-sending a whole buffer after a
  lost response is safe.
- **`seq` is unique per annotation and only moves forward per actor.** A stale
  buffer gets a 409 whose message says what to resend. An annotator picking up
  a reassigned annotation continues after `last_seq`.
- **The server records the caller as the actor** and stamps its own receipt
  time. `actor_id` is optional; if you send it, it must be the caller. A time
  without an offset is read as UTC.

`active_minutes` counts distinct minutes in which anything was recorded. Since
listening without clicking records nothing, it is a rough measure of activity
rather than of hours worked.

## 8. #6 — The missing fields

**On `GET /recordings` rows:** `language_variety`, `contributor_name` and
`reviewer_name` (null while unassigned).

One small difference from your note: `language_variety` comes from the prompt
or stimulus the clip was read from, not from the contributor's profile. The
profile holds a *preference*, which can be `both`, so it cannot label a single
clip, whereas the prompt's variety is exactly what was spoken.

**On `GET /annotations` rows:** `topic` and `duration_seconds`, plus a
`segment_count`.

- We named it `segment_count` rather than `segments`, so it cannot be confused
  with the full document's `segments` list, and to match `participant_count`.
- `duration_seconds` is the session's reported duration — the same figure the
  queue row shows — so one session reads as one number everywhere.
- **`tag_count` comes with `?expand=tags`**, and is null otherwise. It is
  opt-in because tags are stored in a way that means counting them reads every
  span on the page. It uses the same definition as the annotator dashboard's
  `tags_applied`, so the two always agree.

**On `/corpus/summary`:**

| Field | Shape |
| --- | --- |
| `daily_hours` + `hours_in_window` | `[{date, hours}]` over the same 365-day window as every dashboard, zero-filled; measured hours, clips and sessions both |
| `by_type_status` | `[{session_type, status, clips, hours}]` — the real joint, so it sums back to both marginals |
| `demographics` | `{by_gender, by_age_bracket}`, each `[{value, speakers, hours}]`, every value present including `unspecified` |

About the demographics hours: they come from contributors' recordings only.
A focus-group session has several speakers and one audio file, so dividing its
hours by gender would mean inventing a number — the same rule the coverage map
already follows. Session participants are still counted under `speakers`.

**The empty cards you asked about.** Thank you for flagging this rather than
labelling around it. It is not a bug: `by_session_type` and `by_status` count
clips only, while `by_language_variety` counts clips *and* focus-group
sessions. On a corpus that so far has sessions but no clips, the first two are
empty and the third is not, and `clips` reads `0` in the same payload. Each
field's description in the OpenAPI document now says which population it
covers.

## 9. #2 — Permissions, and creating users

**Role remains the whole model, so the per-area picker can go.** A permission
list that is enforced on some routes and not others would imply a boundary the
API does not actually hold, and we would rather the UI promise only what is
real.

**Your second point is done.** `POST /users` no longer needs a password, and we
recommend leaving it out. The account is then created with a random password
nobody ever sees, and the response includes `password_reset`: a single-use
token, shown once, for the person to set their own at
`POST /auth/password-reset/redeem`. That replaces the throwaway-then-reset round
trip. Sending a password still works, so nothing breaks in the meantime.

## 10. #4 — Scoring definitions

Thank you for proposing concrete definitions — they make this a quick yes. They
look right to us, with one adjustment: the window. Every dashboard currently
shares one 365-day window so the charts stay comparable, so a 90-day window
should either reuse 365 or carry its window in the field name, so nobody
compares the two by accident. The floor of 10 decided clips seems sensible.
These remain sequenced for a later round.

## 11. #11 — The status breakdown

Both confirmed:

- `not_approved` is `rejected + flagged`, so it should not be plotted beside
  its own parts. `approved`, `rejected`, `flagged`, `in_review` and `submitted`
  sum to `total`.
- `status_breakdown` covers the whole lifetime, so your "All time" label was
  correct.

## 12. One new behaviour to handle: an upload limit

Contributors can now upload **at most 200 clips per day and 1,000 per week**.
Days and weeks are calendar periods in Nigerian time: the day resets at midnight
WAT, and the week on Monday.

- **`GET /recordings/quota`** returns `remaining` (the smaller of the two
  allowances), each limit's used and remaining counts, both reset times, and
  `available_again_at` once the limit is reached. **We would gently suggest
  checking it before recording**, since a refusal at upload would discard a
  clip someone has just spoken.
- Past the limit, uploads return **429**, with a `Retry-After` header and a
  message saying when uploads reopen, in WAT.
- Every upload counts, whatever its review outcome.

## 13. On your "on our side" notes

- **`kind` on notifications is now an enum** in the OpenAPI document —
  `review`, `annotation`, `earning`, `queue` — so you can switch on it rather
  than substring-match.
- **iOS mp4/AAC and the `MediaRecorder.mimeType` change** are fine on our side;
  both formats decode.
- **`/prompts/next`** — agreed, reading the whole active bank is the better fit
  for your studio.

---

Thank you again — the document made a large round straightforward. If anything
here does not match what you see in the OpenAPI document once it is deployed,
please tell us and we will look straight away.

# Endpoints we need

Checked against the live OpenAPI document, 15 Oct 2026. Everything not listed
here already exists.

## Asks

| # | Ask | Blocks | Priority |
| --- | --- | --- | --- |
| 5 | A way to assign an unclaimed session | A button that errors today | **High** |
| 1 | `GET /points/leaderboard` | Contributor podium | **High** |
| 2 | `permissions` on the user model, or a decision to drop it | Create and edit user | **High** |
| 7 | An all-contributors earnings summary | Admin payments, the last unwired page | **High** |
| 6 | Fields missing from list rows | 5 admin columns and charts | Medium |
| 3 | Annotation activity events, 4 endpoints | Playback tab | Medium |
| 9 | Review allocation across interns | Interns sharing the review load | **High** |
| 10 | A home for focus group topics | Admin prompts, third tab | Medium |
| 8 | Four confirmations about the workspace | Annotator workspace correctness | Medium |
| 4 | Scoring definitions, not endpoints | 3 chart figures | Medium |

---

## 1. `GET /points/leaderboard`

`/dashboard/contributor` gives `points`, `rank` and `ranked_contributors`, so
we can render "4th of 212". The podium shows three people by name and nothing
returns other contributors, so those three are invented.

| | |
| --- | --- |
| Request | `GET /points/leaderboard?limit=3` |
| Response | `[{ contributor_id, full_name, points, rank }]` |
| Who is returned | Top 3 only. Nobody below rank 3 is ever shown. |
| Opt out | Not needed. |
| Name shown | We render the first word of `full_name`. Send the full name. |

## 2. `permissions` on the user model

`AdminUserCreate` is `{email, password, full_name, role}` and `UserOut` has no
permissions field. Our admin UI has a per-area picker that currently sets
nothing.

| Option | What we do |
| --- | --- |
| Add `permissions: string[]` to `AdminUserCreate`, `AdminUserUpdate`, `UserOut`, enforced per route | Wire the picker |
| Role is the whole model | We remove the picker |

If you add it, this is the exact enum our picker already uses. Only meaningful
for `role: "admin"`; every other role's reach is fixed by the role itself.

| Value | Guards |
| --- | --- |
| `prompts` | `POST`/`PATCH`/`DELETE /prompts`, `/stimuli`, both imports |
| `users` | Everything under `/users` |
| `corpus` | `GET /corpus/summary`, `/corpus/coverage` |
| `reviews` | `GET /reviews`, `GET /recordings`, `PATCH /recordings/{id}/assignee` |
| `annotations` | `GET /annotations`, `PATCH /annotations/{id}/assignee` |
| `focus-groups` | `GET /focus-groups` across all interns |
| `payments` | `/payments/*`, `/payouts/*` |
| `audio` | `/audio/analyze`, `/audio/transcribe`, `/audio/quality-score` |

Default for a new admin, if you want one: `["prompts", "corpus", "reviews",
"annotations", "focus-groups"]`. Read-heavy, no money, no account control.

Separately: `POST /users` requires a password, and an admin must never choose
one. We generate a throwaway and immediately call
`POST /users/{id}/password-reset`. An optional password, with the token in the
create response, would remove a round trip.

## 3. Annotation activity events

Append-only operation log, so an admin can replay how an annotation was built.
Our UI is built and runs on seeded data.

| Endpoint | Params / body | Returns |
| --- | --- | --- |
| `POST /annotations/{id}/events` | `{events: [...]}` | Highest accepted `seq` |
| `GET /annotations/{id}/events` | `?after_seq=&limit=` | Ordered page |
| `GET /annotations/{id}/events/summary` | — | Counts by op and actor, active minutes |
| `GET /annotations/{id}/snapshot` | `?at_seq=` | Optional, server-side fold |

Event:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Client-generated, makes retries idempotent |
| `seq` | int | Monotonic per annotation, client assigns |
| `at` | timestamp | Wall clock |
| `media_time` | float | Seconds into the audio |
| `op` | enum | Below |
| `actor_id` | string | |
| `payload` | object | Op-specific |

`op` and its `payload`:

| `op` | `payload` |
| --- | --- |
| `session.claim` | `{}` |
| `segment.create` | `{segment_id, start, end}` |
| `segment.resize` | `{segment_id, start, end}` |
| `segment.delete` | `{segment_id}` |
| `speaker.create` | `{speaker_id, label}` |
| `speaker.assign` | `{segment_id, speaker_id}` |
| `tag.add` | `{segment_id, tag}` |
| `tag.remove` | `{segment_id, tag}` |
| `text.edit` | `{segment_id, length}` — the length only, not the text |
| `session.submit` | `{}` |

`text.edit` deliberately carries no text. The transcript is already on the
annotation and duplicating every revision of it into an audit log multiplies
the storage for nothing a reader of the log needs.

| Rule | Why |
| --- | --- |
| Append only | It is an audit record |
| Client sends `id` and `seq` | Retries and offline batches merge deterministically |
| Reject out-of-order `seq` per actor | Catches a stale client buffer |
| Server stamps its own receipt time | Client clocks drift |

Volume: we batch at ~2s or 50 events and coalesce `text.edit` per segment per
idle gap, so a 40-minute session is ~3,000 events.

**To settle first:** this is worker monitoring data. It needs a stated purpose
and retention window, and annotators should know it is recorded.

## 4. Scoring definitions

Not endpoints. Sequenced on your side and we agree with the reasoning. Listed
so they are not forgotten.

Our proposed definitions, so this is a yes/no rather than a design session.
Tell us where we are wrong and we will take yours.

| Figure | Where it appears | What we would compute |
| --- | --- | --- |
| Acceptance rate | Contributor quality bar, admin user panel | `approved / (approved + rejected)`, excluding anything still in review, over the last 90 days. Null below 10 decided clips. |
| Median review time | Contributor quality bar | Median of `reviewed_at - created_at` across that contributor's decided clips, last 90 days. Median, not mean, because one clip left over a weekend drags a mean badly. |
| Quality radar | Intern dashboard | 5 axes, each 0-100: consent completeness, demographic completeness, audio pass rate, participants per session against target, clip approval rate. |

Two things we would want settled with them, since they go in front of the
person being scored: the window (we assumed 90 days) and the floor below which
no figure is shown at all (we assumed 10).

## 5. Assigning an unclaimed session

**This one is blocking a button that currently errors.**

An admin can see sessions nobody has picked up, and cannot hand one to
anybody. There is no annotation to reassign until an annotator claims it,
`POST /annotations` does not exist, and `claim-next` claims for the caller
rather than for somebody else. Pressing Assign patched a session id as if it
were an annotation id and came back **"annotation not found"**, so the button
is disabled with that reason until this exists.

| Option | Shape |
| --- | --- |
| Let an admin create the annotation | `POST /annotations` → `{session_id, annotator_id}`, returns the document |
| Or assign on the session | `PATCH /focus-groups/{id}/assignee` → `{annotator_id}`, creating the annotation as a side effect |

Either works for us. The second is closer to how it reads on screen: the thing
being handed out is a session, not an annotation that does not exist yet.

Related, smaller: **nothing reports what a person is already holding.** The
assign picker used to offer the lightest-loaded annotator first. Counting that
now means fetching every annotation and tallying by assignee, which an assign
dialog should not do, so the list is alphabetical and shows no load. An
`open_count` on `GET /users?role=annotator` would bring it back.

## 6. Fields missing from list rows

Each of these turned a column or a chart into a blank, a zero or a hardcoded
value. None is urgent on its own; together they are most of what is still not
real on the admin surface.

| Field | On | Why we need it | Where it shows |
| --- | --- | --- | --- |
| `language_variety` | `RecordingOut` | It lives on the contributor's profile and `/recordings` does not join it | Admin reviews, Variety column, currently hardcoded |
| `segments` and `tags` counts | `AnnotationSummary` | They are only on the full document, which is one request per row | Admin annotations table, shows 0. The panel fetches the document and shows the real figures. |
| `contributor_name`, `reviewer_name` | `RecordingOut` | `ReviewOut` already resolves both. We fetch `/users` and join client side, which works but is a request we would not need. | Admin reviews |
| `topic` and `duration_seconds` | `AnnotationSummary` | Same join, against `/focus-groups` | Admin annotations |
| Hours over time | `/corpus/summary`, e.g. `daily_hours: [{date, hours}]` | The summary is a snapshot with no time axis. `/dashboard/admin` has `daily_activity`, but that counts recordings, and an hours curve drawn from clip counts is a different measurement wearing the same label. | Corpus growth, overview and corpus |
| Type-by-status join | `/corpus/summary`, e.g. `by_type_status` | `by_session_type` and `by_status` are marginals. A sankey drawn from marginals invents its own links. | "Where the hours go", overview and corpus |
| Corpus-wide demographics | `/corpus/summary`, `by_gender` and `by_age_bracket` in hours | `/dashboard/intern` has both but scoped to one intern's sessions. The question on the corpus page is whether the dataset is balanced. | Speaker demographics, corpus |

**One thing to check at your end rather than an ask.** On the live data
`by_language_variety` comes back populated while **`by_session_type` and
`by_status` come back empty**, so two cards that should have numbers draw their
empty state. Same endpoint, same clips. If that is expected while durations are
still being measured, say so and we will label it; if not, it looks like a bug.

## 7. An all-contributors earnings summary

Admin payments is the one admin page still on mock data, and this is the only
reason. `GET /payments/earnings` returns **one** contributor's ledger, and
`GET /payments/earnings/{contributor_id}` is the same thing addressed directly.
Nothing returns every contributor at once.

`GET /payouts/preview` comes closest, but it is a different question. It
answers "who would the next run pay", as `{user_id, email, amount}`, which is
not "what has each contributor earned, and how much of it have they been
paid". The payments page needs the second.

**Proposed:**

```
GET /payments/earnings/summary?limit=&offset=&envelope=true
→ [{ contributor_id,
      full_name,
      recordings,          // clips they have had approved
      minutes,             // measured, not reported
      earned_kobo,         // lifetime
      paid_kobo,
      payout_status,       // pending | in_flight | paid
      last_activity_at }]
```

`full_name` matters as much as the figures: with only a `contributor_id` we
would fetch `/users` on every load purely to turn ids into names, which is
what we already do on three other admin screens.

Everything else that page needs is live: `GET /payments/rates` and
`PUT /payments/rates/{unit_type}` for the rates card, `GET /payouts/preview`,
`GET`/`POST /payouts/runs` for running one. We have left the page on mock
rather than wiring half of it, because live rates feeding a mock earnings table
would show figures that do not follow from each other.

## 8. Four confirmations about the annotation workspace

The workspace is wired and saving. None of these blocks it, but each is an
assumption we had to make from the OpenAPI document alone, and each one is
quietly load-bearing.

| Question | What we assumed | Why it matters |
| --- | --- | --- |
| **How are tokens split?** | Whitespace. We join a segment's tokens with one space to render it, and split on whitespace to send it back. | `tokenization_convention_id` on the document implies it may not always be whitespace. If it is ever anything else, every text edit we send is mis-tokenised. |
| **Is a whole-array splice acceptable?** | Yes. On a text edit we send one `PUT /tokens` with `start_token: 0`, `replace_count: <all>`, and the rebuilt array. | Several targeted splices would each shift the indices after them, which is wrong the moment two edits overlap. One splice has no ordering hazard, but it rewrites rows that did not change. If that is expensive at your end, say so. |
| **Do token timings survive a splice?** | No, so we carry them ourselves. A token whose text is unchanged keeps its `start_sec`/`end_sec`; a moved or new one is sent with nulls. | If the server re-aligns after a splice, we should stop sending timings at all and let it. If it does not, we are the only thing preserving the aligner's work. |
| **Does `expected_version` move after every write?** | Yes. We take the `version` from each response and pass it to the next call in the same save. | A save does up to three writes. If version only advances on some of them, our second call will 409 on a save that was perfectly valid. |

Two smaller things from the same surface:

- **`GET /annotations` carries no `tag_count`.** The annotator's session list shows a dash in that column. The full document has the spans, but that is one request per row.
- **A session has no state of its own.** We take the commonest `state` among its participants for the admin focus-groups column, which is right in practice but is a derivation rather than a fact.

## 9. Even review allocation across interns

**Interns do not claim work, they are given it.** Claiming is the annotator
model, and it is right there: an annotator takes the next session when they are
free. Interns are different — a contributor's clip should land on a named
intern's desk the moment it is submitted, without anybody racing for it.

| | |
| --- | --- |
| Trigger | A recording reaching `submitted` |
| Rule | Spread evenly across interns who are active and approved |
| Shape | 1,000 clips, 10 active interns, 100 each |
| Field | `assigned_reviewer_id` on the recording, which already exists |

Two cases worth deciding with it:

| Case | What we would expect |
| --- | --- |
| An intern is deactivated or unapproved | Their unreviewed clips go back into the pool and are shared out again. Reviewed ones stay with them, since the verdict is theirs. |
| A new intern is approved mid-run | They start taking a share of what arrives next. Whether the existing backlog is re-levelled is your call — we would not, since moving a clip somebody has started reading is worse than an uneven count. |

`POST /reviews/assign-next` can stay for the case where an intern clears their
own queue and wants more. `PATCH /recordings/{id}/assignee` already covers an
admin moving one by hand.

**What we show today:** the intern review queue reads `GET /reviews/queue`,
which is unassigned work. Once allocation is automatic we would read what is
assigned to the caller instead, so a filter or a separate route for "mine"
would help.

## 10. A home for focus group topics

Prompts and stimuli each have a bank. Focus group topics have none: the topic
is free text typed on the session at record time, so there is nothing to
curate, reuse or retire, and no way to see which topics have been covered.

The admin prompts page now has three tabs, and the third stores topics in the
**prompts bank with `category="focus_group_topic"`**. That works today because
`category` is free text, and it is reversible, but it means a focus group topic
is a prompt as far as the API is concerned — so it would be handed to a
contributor by `/prompts/next` if anything still used that route.

**What we are asking for**, in preference order:

```
GET    /focus-group-topics?is_active=&limit=&offset=&envelope=true
POST   /focus-group-topics        { text, language_variety, is_active }
PATCH  /focus-group-topics/{id}   { text, language_variety, is_active }
DELETE /focus-group-topics/{id}   → retires it, like /prompts does
```

Same shape as `/prompts`, including `used_by_count` so an admin can see which
topics have actually been run. That gives the third tab view, create, edit and
retire, which is all it needs.

| Alternative | What it means for us |
| --- | --- |
| Keep them in `/prompts` but exclude `category="focus_group_topic"` from `/prompts/next` and from anything a contributor sees | Smaller change at your end. We would want that exclusion written down rather than assumed, because today a topic would be handed to a contributor to read aloud. |
| Topics are genuinely ad-hoc and not worth curating | We remove the tab |

**Also worth knowing:** `category` is free text, and the whole seeded bank
comes back tagged `placeholder`. We show what an item *is* from which bank it
came out of rather than printing that raw, because "placeholder" is a note to
whoever seeded it, not a category.

---

## On our side, not asks

| Item | Our handling |
| --- | --- |
| Six `identity_status` values | Gate handles three today. Fixing with the wallet. |
| `next_action` on `GET /wallet` | Will drive the verification gate from this |
| `*_kobo` vs decimal strings | We use the integers |
| Four money buckets | Four cards, not one balance |
| `kind` is a free string | Substring match, generic fallback. An enum would let us stop guessing. |
| `X-Total-Count` header | Not reachable from our client, so we pass `?envelope=true` |
| `/prompts/next` hands out each contributor's next **unread** item | The studio no longer uses it. A prompt is not used up by being read: twelve prompts in the bank should be twelve every contributor can record, not twelve recordings shared between everybody. We read the whole active bank and page it locally. |
| iOS Safari records mp4/AAC, not webm | We were labelling every blob `audio/webm`, so on an iPhone playback failed and the upload named the wrong format. We now take the type from `MediaRecorder.mimeType` and send a matching extension. Worth knowing if you see mp4 arriving where webm used to. |

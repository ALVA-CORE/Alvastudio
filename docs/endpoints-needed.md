# Endpoints we need

Checked against the live OpenAPI document, 15 Oct 2026. Everything not listed
here already exists.

## Asks

| # | Ask | Blocks | Priority |
| --- | --- | --- | --- |
| 1 | `GET /points/leaderboard` | Contributor podium | **High** |
| 2 | `permissions` on the user model, or a decision to drop it | Create and edit user | **High** |
| 3 | Annotation activity events, 4 endpoints | Playback tab | Medium |
| 4 | Scoring definitions, not endpoints | 3 chart figures | Medium |
| 5 | Three small corpus fields | 3 admin charts | Low |

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

## 5. Three small corpus fields

Each one removed a chart from an admin page rather than letting it draw from
seeded data. None is urgent.

| Ask | Why | Where it was |
| --- | --- | --- |
| Hours over time on `/corpus/summary`, e.g. `daily_hours: [{date, hours}]` | The summary is a snapshot with no time axis. `/dashboard/admin` has `daily_activity`, but that counts recordings, and an hours curve drawn from clip counts is a different measurement wearing the same label. | Corpus growth chart, admin overview and corpus |
| The join between session type and status, e.g. `by_type_status: {prompt_read: {approved: 120, …}}` | `by_session_type` and `by_status` are marginals. A sankey drawn from marginals invents its own links. | "Where the hours go" flow, admin overview and corpus |
| Corpus-wide demographics, e.g. `by_gender` and `by_age_bracket` in hours on `/corpus/summary` | `/dashboard/intern` has both, but scoped to one intern's sessions. The question on the corpus page is whether the dataset is balanced. | Speaker demographics pyramid, admin corpus |

One more, smaller: **`language_variety` on `RecordingOut`.** It lives on the
contributor's profile and `/recordings` does not join it, so the variety column
on admin reviews is currently hardcoded.

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

# Integration status

What runs on live data, what runs on mock data, and the endpoints we need to
close the gap. Current as of 8 Oct 2026.

Base: `/api/v1`. All endpoints are bearer-authenticated unless noted.

---

## 1. Live

| Surface | Endpoints |
| --- | --- |
| Login, refresh, session | `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` |
| Contributor signup, consent, profile | `POST /auth/register`, `POST /onboarding/consent`, `POST /onboarding/profile` |
| Contributor studio | `GET /prompts/next`, `GET /stimuli/next`, `POST /recordings/prompt-read`, `POST /recordings/stimuli` |
| Contributor dashboard counts | `GET /dashboard/contributor` |
| Intern dashboard counts | `GET /dashboard/intern` |
| Intern focus groups | `GET/POST /focus-groups`, `DELETE /focus-groups/{id}`, `?expand=participants` |
| Intern review queue | `GET /reviews/queue`, `POST /reviews/assign-next`, `POST /reviews/{id}` |
| Annotator dashboard | `GET /dashboard/annotator` |
| Annotator session queue | `GET /annotations/queue`, `POST /annotations/claim-next` |

---

## 2. Not integrated

### 2.1 Admin

Every admin page runs on mock data in `src/data/admin/`.

| Page | Needs | Status |
| --- | --- | --- |
| Overview | `GET /dashboard/admin` | **Missing** |
| Users, list | `GET /users` | Exists, not wired |
| Users, create | `POST /users` | **Missing** |
| Users, edit | `PATCH /users/{id}` | **Missing** |
| Users, deactivate | `PATCH /users/{id}` with `is_active` | **Missing** |
| Users, delete | `DELETE /users/{id}` | **Missing** |
| Users, approve intern | `POST /users/{id}/approve` | **Missing** |
| Users, reset password | `POST /users/{id}/password-reset` | **Missing** |
| Users, activity heatmap | daily counts per user | **Missing** |
| Prompts, list and create | `GET/POST /prompts`, `GET/POST /stimuli` | Exist, not wired |
| Prompts, edit and retire | `PATCH/DELETE /prompts/{id}`, `PATCH/DELETE /stimuli/{id}` | **Missing** for stimuli |
| Prompts, CSV import | bulk create | **Missing** |
| Corpus | `GET /corpus/summary` | **Missing** |
| Corpus, coverage by state | `GET /corpus/coverage` | **Missing** |
| Reviews | `GET /reviews` (all, not just my queue) | **Missing** |
| Reviews, reassign | `PATCH /reviews/{id}/assignee` | **Missing** |
| Annotations | `GET /annotations` (all) | **Missing** |
| Annotations, assign | `PATCH /annotations/{id}/assignee` | **Missing** |
| Focus groups, all interns | `GET /focus-groups?all=true` | **Missing** |
| Payments, earnings | `GET /payments/earnings` | Exists, not wired |
| Payments, rates | `GET /payments/rates` | Exists, not wired |
| Payments, edit rates | `PATCH /payments/rates` | **Missing** |
| Payments, run a payout | `POST /payments/run` | **Missing** |
| Audio QC | `POST /audio/analyze`, `/audio/transcribe`, `/audio/quality-score` | Exist, return 503 without the ML stack |

### 2.2 Contributor

| Feature | Needs | Status |
| --- | --- | --- |
| Points balance | `GET /points` or a `points` field on `/dashboard/contributor` | **Missing** |
| Leaderboard | `GET /points/leaderboard` | **Missing** |
| Wallet balance | `GET /wallet` returning kobo | **Missing** |
| Wallet ledger | `GET /wallet/entries` | **Missing** |
| Link a bank | `GET /banks`, `POST /wallet/account`, name enquiry | **Missing** |
| Withdraw | `POST /wallet/withdrawals` | **Missing** |
| Dashboard charts | daily buckets on `/dashboard/contributor` | **Missing** |
| Quality breakdown figures | acceptance rate, median review time | **Missing** |
| Notifications | `GET /notifications`, `PATCH /notifications/{id}/read` | **Missing** |

### 2.3 Intern

| Feature | Needs | Status |
| --- | --- | --- |
| Dashboard charts | daily buckets on `/dashboard/intern` | **Missing** |
| Demographic hours | hours split by age, gender | **Missing** |
| Quality radar | per-metric scores | **Missing** |
| Notifications | `GET /notifications` | **Missing** |

### 2.4 Annotator

| Feature | Needs | Status |
| --- | --- | --- |
| Transcripts | `GET /annotations/{id}` with segments, `PATCH` to save | **Missing** |
| Waveform | peaks array per session, 0–1 | **Missing** |
| Mark complete | `POST /annotations/{id}/submit` | Exists, not wired |
| Dashboard charts | `daily_activity` on `/dashboard/annotator` | Delivered, charts not wired |

---

## 3. Endpoints we need, by priority

### Blocking

| Endpoint | Returns | Unblocks |
| --- | --- | --- |
| `GET /dashboard/admin` | totals, status breakdown, stuck-work counts | Admin overview |
| `POST /users` | the created user | Admin creates staff accounts |
| `PATCH /users/{id}` | the updated user | Edit, deactivate, change role |
| `DELETE /users/{id}` | 204 | Remove an account |
| `POST /users/{id}/approve` | the updated user | Intern signup approval |
| `GET /reviews` | all recordings and verdicts, paginated | Admin reviews |
| `GET /annotations` | all annotations, paginated | Admin annotations |
| `GET /corpus/summary` | hours, clips, speakers, splits by variety and type | Admin corpus |

### High

| Endpoint | Returns | Unblocks |
| --- | --- | --- |
| `GET /wallet` | `{balance_kobo, pending_kobo, lifetime_kobo, payout_account}` | Contributor wallet |
| `GET /wallet/entries` | ledger, kobo, signed, with timestamps | Wallet history |
| `GET /banks` | `{code, name}` | Bank picker |
| `POST /wallet/account` | resolved account name | Link a bank |
| `POST /wallet/withdrawals` | the withdrawal | Withdraw |
| `GET /notifications` | list, with read state | Contributor and intern notifications |
| Points on `/dashboard/contributor` | `points`, `rank` | Points card, leaderboard |
| `audio_url` on `/recordings` rows | a playable URL | Admin plays the clip from the review panel |
| `POST /annotations/{id}/events` | accepted seq | Annotation activity playback, see section 4 |
| `GET /annotations/{id}/events` | ordered page | Annotation activity playback, see section 4 |

### Medium

| Endpoint | Returns | Unblocks |
| --- | --- | --- |
| `?from=&to=&bucket=day` on all three dashboards | daily series | Every time-series chart |
| `PATCH/DELETE /stimuli/{id}` | the updated stimulus | Edit and retire stimuli |
| `PATCH /payments/rates` | the updated rates | Admin edits pay rates |
| `POST /payments/run` | the payment run | Admin pays contributors |
| `GET /corpus/coverage` | hours per state | Nigeria coverage map |
| `peaks` on annotation sessions | array of 0–1 | Annotator waveform |
| `total` on every list response | count | Pagination past "load more" |

---

## 4. Annotation activity playback

New requirement: admins want to see the complete work an annotator did on an
annotation, in order. What tag went on when, which speaker was switched, how
long it took.

The finished annotation cannot answer that, so it is answered from an
append-only **operation log**. Replay is a fold: the state at step *n* is the
first *n* events applied in order. The workspace already keeps an undo stack,
so the operations exist client side; persisting them is the whole feature.

The UI is built and runs on seeded data in `src/data/admin/activity.ts`. It is
reachable from the **Activity** tab on both the annotation and the review
detail panels.

### 4.1 Event shape

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Client-generated. Makes retries idempotent. |
| `seq` | int | Monotonic within one annotation. Client assigns. |
| `at` | timestamp | Wall clock. Answers "how long did this take". |
| `media_time` | float | Seconds into the audio. Drives the scrubber. |
| `op` | enum | See below. |
| `actor_id` | string | Who did it. |
| `payload` | object | Op-specific. |

Ops: `session.claim`, `segment.create`, `segment.resize`, `segment.delete`,
`speaker.create`, `speaker.assign`, `tag.add`, `tag.remove`, `text.edit`,
`session.submit`.

### 4.2 Endpoints

| Endpoint | Body / params | Returns |
| --- | --- | --- |
| `POST /annotations/{id}/events` | `{events: [...]}`, batched | Highest accepted `seq` |
| `GET /annotations/{id}/events` | `?after_seq=&limit=` | Ordered page of events |
| `GET /annotations/{id}/events/summary` | — | Counts by op and actor, active minutes, first and last event |
| `GET /annotations/{id}/snapshot` | `?at_seq=` | Optional. Server-side fold, so long sessions do not replay client side. |

### 4.3 Rules

| Rule | Why |
| --- | --- |
| Append only, never rewrite | It is an audit record. A log that can be edited proves nothing. |
| Client sends `id` and `seq` | Retries and offline batches merge deterministically. |
| Reject out-of-order `seq` per actor | Catches a client replaying a stale buffer. |
| Server sets its own receipt time alongside `at` | Client clocks drift and can be set by hand. |
| Batch writes, ~2s or 50 events | Per-keystroke writes are 100× the volume for no extra answer. |
| Coalesce `text.edit` per segment per idle gap | Otherwise 90% of the log is typing. |

### 4.4 Volume

A 40-minute session with 300 segments and 1,200 tags is roughly 3,000 events,
a few hundred KB of JSON. Keystroke-level would be ~100× that, which is why
`text.edit` is coalesced rather than streamed.

### 4.5 Open question for the team

This is worker monitoring data. It needs a stated purpose, a retention window,
and annotators should know it is being recorded. Worth settling before it
ships, not after.

---

## 5. Other blockers

| Issue | Impact |
| --- | --- |
| Prompt and stimulus banks are empty | No contributor can record anything. Blocks all end-to-end testing. |
| A focus group only reaches `/annotations/queue` after audio is uploaded | Undocumented. Worth stating in the API docs. |
| Audio format support unconfirmed | Need confirmation that webm/Opus and mp4/AAC both decode server side. |
| Test data from our accounts is still in the database | Should be cleared before launch. |

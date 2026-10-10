# Integration status

What runs on live data, what still runs on mock data, and what is left to ask
for. Rewritten 10 Oct 2026 against the backend's reply in
`api-status-2026-10-08.md`.

Base: `/api/v1` on `https://api.alvacoreai.com`. Bearer auth unless noted.

**Headline: almost nothing is missing any more.** Sixteen endpoints we listed
as missing were already deployed, eight more shipped since, and the wallet and
payouts surface landed on 7 Oct. The work left is ours: wiring screens that are
still reading from `src/data/`.

---

## 1. Wiring backlog

Every row here has a live endpoint. Nothing is blocked on the backend.

### 1.1 Admin

| Page | Endpoint | Note |
| --- | --- | --- |
| Overview | `GET /dashboard/admin` | Stuck-work carries `count`, `oldest_at`, `oldest_age_days` |
| Users, list | `GET /users` | |
| Users, create | `POST /users` | Any role, including `admin` |
| Users, edit and deactivate | `PATCH /users/{user_id}` | `role`, `is_active`, `full_name`, `phone` |
| Users, delete | `DELETE /users/{user_id}` | Call `GET /users/{user_id}/deletion-preview` first |
| Users, approve intern | `POST /users/{id}/approve-intern` | UI is built, on mock state |
| Users, password reset | `POST /users/{id}/password-reset` | Returns a single-use token, not a new password. See §3 |
| Prompts and stimuli | `GET/POST/PATCH/DELETE /prompts`, `/stimuli` | |
| Prompts, CSV import | `POST /prompts/import`, `POST /stimuli/import` | Per-row failures returned |
| Corpus | `GET /corpus/summary` | Server-measured durations, plus `unmeasured_rows` |
| Corpus, coverage map | `GET /corpus/coverage` | All 37 states including empty ones, plus `unknown` |
| Reviews, recordings table | `GET /recordings` | Admins see everything |
| Reviews, verdicts | `GET /reviews` | Filter by `verdict`, `reviewer_id` |
| Reviews, reassign | `PATCH /recordings/{id}/assignee` | Assignment is on the recording, not the review. `null` returns it to the queue |
| Annotations, list | `GET /annotations` | Admins and reviewers see all |
| Annotations, assign | `PATCH /annotations/{id}/assignee` | Updates annotation and session in one transaction |
| Focus groups, all interns | `GET /focus-groups` | No flag needed, admins see every session |
| Payments, rates | `GET /payments/rates`, `PUT /payments/rates/{unit_type}` | One rate per call |
| Payments, earnings | `GET /payments/earnings` | |
| Payments, runs | `GET /payouts/preview`, `GET/POST /payouts/runs`, `GET /payouts/runs/{id}` | |
| Payments, reconcile and void | `POST /payouts/runs/{id}/items/{item_id}/reconcile`, `POST /payouts/ledger/{id}/void` | |
| Payments, duplicate flags | `GET /payouts/duplicate-flags`, `.../resolve` | No UI yet |
| Audio QC | `POST /audio/analyze`, `/transcribe`, `/quality-score` | 503 without the ML stack, which is a normal state |

### 1.2 Contributor

| Feature | Endpoint | Note |
| --- | --- | --- |
| Points and rank | `points`, `rank`, `ranked_contributors` on `GET /dashboard/contributor` | Renders "4th of 212" |
| Dashboard charts | `daily_activity` + `recordings_in_window` | 365 zero-filled daily buckets |
| Wallet | `GET /wallet` | Four buckets, not two. See §3 |
| Wallet ledger | `GET /payments/earnings` | |
| Bank list | `GET /banks` | `{code, name}` |
| Link a bank | `POST /wallet/payout-destination` | Performs name enquiry, returns `account_name` |
| Identity | `GET /wallet/identity/methods`, `POST /wallet/identity/nin` | Gate ahead of the balance. See §3 |
| Withdraw | `POST /wallet/withdrawals` | Returns a run. Expect 409. See §3 |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/read` | Read is bulk: `{keys: [...]}` or `{all: true}` |

### 1.3 Intern

| Feature | Endpoint |
| --- | --- |
| Dashboard charts | `daily_activity` + `*_in_window` on `GET /dashboard/intern` |
| Demographic hours | `demographics` on the same payload, `by_gender` and `by_age_bracket` |
| Notifications | `GET /notifications` |

### 1.4 Annotator

| Feature | Endpoint |
| --- | --- |
| Transcripts | `GET /annotations/{annotation_id}`, full document with segments |
| Save | `PUT /annotations/{id}/segments/{segment_id}`, `PUT .../tokens` |
| Submit | `POST /annotations/{id}/submit` |
| Waveform | `waveform_peaks` on `GET /focus-groups/{session_id}`, 1000 buckets of 0–1 |
| Dashboard charts | `daily_activity` on `GET /dashboard/annotator` |

---

## 2. Shapes that differ from what we assumed

A regenerated client will not find these at the paths we asked for.

| We assumed | It is actually |
| --- | --- |
| `total` in the body | `X-Total-Count` header, or `?envelope=true` for `{items, total, limit, offset}` |
| `PATCH /notifications/{id}/read` | `POST /notifications/read` with `{keys: [...]}` or `{all: true}` |
| `PATCH /payments/rates` | `PUT /payments/rates/{unit_type}`, one per call |
| `PATCH /reviews/{id}/assignee` | `PATCH /recordings/{recording_id}/assignee` |
| `POST /users/{id}/approve` | `POST /users/{id}/approve-intern` |
| `POST /wallet/account` | `POST /wallet/payout-destination` |
| `POST /payments/run` | `POST /payouts/runs` |
| `peaks` on annotations | `waveform_peaks` on focus groups |

`envelope=true` is opt-in, and the header is set either way, so existing
screens reading bare arrays keep working.

Notification `key` is opaque and goes back verbatim. Annotation keys include
the status (`annotation:<id>:needs_rework`) on purpose, so returned work and
later-approved work are two notifications rather than one that changes meaning.

---

## 3. Behaviours to design around

These are not wiring tasks. Each one changes a screen.

| Behaviour | What it means for us |
| --- | --- |
| **Interns need approval** | `POST /auth/register` with `role: "intern"` succeeds but lands unapproved, and every intern route returns 403 `Intern account is awaiting admin approval`. Signup no longer redirects to the dashboard; it shows a pending screen. **Done.** |
| **Suspended accounts** | Login returns 403 `Inactive account`, not 401. Must not be offered a password reset. **Done.** |
| **Admins cannot set passwords** | `POST /users/{id}/password-reset` returns a single-use token to hand over out of band. The person redeems it at `POST /auth/password-reset/redeem`. Our panel currently claims "Reset link sent", which is wrong, it needs to show the token. |
| **Wallet has four buckets** | `held`, `payable`, `in_flight`, `paid`. Our wallet shows one balance. Show `held` separately or a contributor sees money they cannot withdraw and assumes it is broken. |
| **NIN before payout** | No verified identity means no payout destination and no eligibility. The wallet needs a verification step ahead of the balance. Not built. |
| **Withdrawal 409s** | Nothing matured above the minimum, or a payment already in flight. The second is "already on its way", not a retry. |
| **A leg reported `unknown`** | Not a failure, not lost. Settles by webhook or reconciliation. |
| **Use the `*_kobo` integers** | Decimals are JSON strings so JS never floats them, but an integer cannot be got wrong. We already hold money in kobo. |
| **Focus groups reach the annotation queue only after upload** | Intended. Now documented at their end. |

---

## 4. Still outstanding

| Item | Status |
| --- | --- |
| Acceptance rate, median review time, intern quality radar | Sequenced. Each is a scoring rule that becomes a contract on ship, and some is shown to the person being scored, so definitions get agreed with the Head of Data first. Our charts stay on seeded values until then. |
| `?from=&to=&bucket=day` | Not built, and probably not needed. All four dashboards return 365 zero-filled daily buckets, so any window is a slice of what we already hold. |
| Annotation activity playback | Not built. Our side is built and running on seeded data. See §5. |
| Vercel preview deployments | Blocked by CORS. Only the production alias is allowlisted. Send them the Vercel team slug to enable previews. |
| Prompt bank wording | 12 prompts and 6 stimuli are seeded and tagged `category="placeholder"`. Not the real bank. Anything recorded against them is development data. |

---

## 5. Annotation activity playback

The one feature with no endpoint behind it. Admins want to see the complete
work an annotator did on an annotation, in order: what tag went on when, which
speaker was switched, how long it took.

The finished annotation cannot answer that, so it is answered from an
append-only **operation log**. Replay is a fold: the state at step *n* is the
first *n* events applied in order. The workspace already keeps an undo stack,
so the operations exist client side; persisting them is the whole feature.

The UI is built and runs on seeded data in `src/data/admin/activity.ts`,
reachable from the **Activity** tab on the annotation and review detail panels.

### 5.1 Event shape

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

### 5.2 Endpoints

| Endpoint | Body / params | Returns |
| --- | --- | --- |
| `POST /annotations/{id}/events` | `{events: [...]}`, batched | Highest accepted `seq` |
| `GET /annotations/{id}/events` | `?after_seq=&limit=` | Ordered page of events |
| `GET /annotations/{id}/events/summary` | — | Counts by op and actor, active minutes, first and last event |
| `GET /annotations/{id}/snapshot` | `?at_seq=` | Optional. Server-side fold, so long sessions do not replay client side |

### 5.3 Rules

| Rule | Why |
| --- | --- |
| Append only, never rewrite | It is an audit record. A log that can be edited proves nothing. |
| Client sends `id` and `seq` | Retries and offline batches merge deterministically. |
| Reject out-of-order `seq` per actor | Catches a client replaying a stale buffer. |
| Server sets its own receipt time alongside `at` | Client clocks drift and can be set by hand. |
| Batch writes, ~2s or 50 events | Per-keystroke writes are 100× the volume for no extra answer. |
| Coalesce `text.edit` per segment per idle gap | Otherwise 90% of the log is typing. |

### 5.4 Volume

A 40-minute session with 300 segments and 1,200 tags is roughly 3,000 events, a
few hundred KB of JSON. Keystroke-level would be ~100× that, which is why
`text.edit` is coalesced rather than streamed.

### 5.5 Open question

This is worker monitoring data. It needs a stated purpose, a retention window,
and annotators should know it is being recorded. Worth settling before it
ships, not after.

---

## 6. Closed

| Was | Now |
| --- | --- |
| CORS blocked `alvastudio.vercel.app` | Both origins allowlisted, verified in production |
| `audio/webm;codecs=opus` rejected with 415 | Fixed 25 Sep. Opus and AAC both decode, with regression tests |
| Prompt and stimulus banks empty | 12 prompts and 6 stimuli seeded |
| Four participant fields dropped | Live |
| No annotator dashboard | `GET /dashboard/annotator` live |
| No way to delete a focus group | `DELETE /focus-groups/{id}` live |

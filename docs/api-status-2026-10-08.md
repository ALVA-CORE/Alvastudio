# Re: Integration status — where things stand

Thank you for `integration-status.md` — the per-endpoint detail made this quick
and precise to answer, which is not usually the case. Everything below is
checked against the deployed OpenAPI document rather than written from memory.

**The headline is good news: most of what you listed as Missing is already
live.** Sixteen of those endpoints were deployed before your document was
written, and the whole wallet and payouts surface shipped on 7 Oct. That is on
us rather than on you — we released without telling you, so your document was
accurate when you wrote it. Re-pulling `https://api.alvacoreai.com/openapi.json`
should shorten the Blocking list considerably.

A few are live at a different path or shape from the one in your document.
Those are in §2, because a regenerated client will not find them otherwise.

**Two items will need some work at your end**, so §5 is worth reading before you
estimate: interns now need admin approval, and the money endpoints landed under
different names from the ones in your list.

---

## 0. The CORS block is fixed

Thank you for the screenshot — it identified the problem exactly.
`https://studio.alvacoreai.com` was on the allowlist and
`https://alvastudio.vercel.app` was not, so every call from the Vercel
deployment failed preflight. You were right that it was reading as "offline":
the browser rejects the response before your code sees it, so there is nothing
useful to catch, and nothing appeared in our logs either.

Both origins are allowed now, verified in production. Nothing is needed on your
side beyond a reload.

One thing worth flagging so it does not look like the fix failed: **Vercel
preview deployments will still be blocked.** Only the production alias is
allowlisted, and previews get a new hostname per commit, which no fixed list can
cover. If you would like previews working, send us your Vercel team slug and we
will enable them — it is a config change at our end, not a release.

## 1. Already live — listed as Missing in your document

| Your entry | Live as |
| --- | --- |
| Users, create — `POST /users` | `POST /users`. Creates at **any** role including `admin` |
| Users, edit — `PATCH /users/{id}` | `PATCH /users/{user_id}` — `role`, `is_active`, `full_name`, `phone` |
| Users, deactivate | Same endpoint, `{"is_active": false}` |
| Users, delete — `DELETE /users/{id}` | `DELETE /users/{user_id}`, plus `GET /users/{user_id}/deletion-preview` |
| Prompts, edit/retire — stimuli | `PATCH /stimuli/{stimulus_id}`, `DELETE /stimuli/{stimulus_id}` |
| Contributor points | `points` on `GET /dashboard/contributor` |
| Contributor dashboard charts | `daily_activity` + `recordings_in_window` on the same payload |
| Intern dashboard charts | `daily_activity` + `sessions_in_window` / `participants_in_window` / `hours_in_window` |
| Demographic hours (intern) | `demographics` — `by_gender`, `by_age_bracket` |
| Notifications | `GET /notifications`, `GET /notifications/unread-count` |
| Annotator transcripts | `GET /annotations/{annotation_id}` returns the full document with segments |
| Annotator save | `PUT /annotations/{annotation_id}/segments/{segment_id}` (also `PUT .../tokens`) |
| Annotations, all | `GET /annotations` — annotators see their own, **reviewers and admins see all** |
| Waveform peaks | `waveform_peaks` on `GET /focus-groups/{session_id}` — array of 0–1, 1000 buckets |
| Focus groups, all interns | No flag needed — **admins already see every session** on `GET /focus-groups` |
| `total` on list responses | Available on every list endpoint — see §2 |

Also from §4 of your document: **the audio format problem was real, and thank
you for pinning it down.** `MediaRecorder` sends `audio/webm;codecs=opus`, and
our allowlist was comparing the entire string including the codec parameter, so
every Chrome and Safari recording was rejected with a 415 before a byte was
read. Fixed on 25 Sep, with regression tests using genuine Opus and AAC files.
Both decode correctly now.

## 2. Live, but shaped differently from your document

**`total` arrives as a response header by default.** Every list endpoint sets
`X-Total-Count` to the count *before* `limit`/`offset`. You mentioned your
generated client does not surface headers, which is a fair point — a number
nobody can reach is not much of an answer — so every list endpoint now also
accepts **`?envelope=true`** and returns `{items, total, limit, offset}`.

It is opt-in rather than the default only because your existing screens are
already wired to the bare arrays, and switching the default would have broken
all of them on the day it shipped. The header is set either way, so the two can
be mixed freely.

**Marking a notification read is a bulk operation.** Not
`PATCH /notifications/{id}/read` but:

```
POST /notifications/read   {"keys": ["review:7c1f…"]}
POST /notifications/read   {"all": true}
```

The reasoning: `{"all": true}` clears everything the user can see, including
items your client has not loaded. Sending back only the keys currently on screen
would leave the badge showing a number they could never clear. It is idempotent
— marking twice returns `marked: 0` rather than an error.

`key` is opaque and should be sent back verbatim. It encodes which table the
notification came from and may change. Annotation keys deliberately include the
status (`annotation:<id>:needs_rework`), so work that is returned and later
approved produces two notifications rather than one that quietly changes
meaning.

**Editing pay rates** is `PUT /payments/rates/{unit_type}`, one rate per call,
rather than `PATCH /payments/rates`.

## 3. Two endpoints we would like to propose slightly differently

Both are reasonable as written; they just do not quite fit how assignment is
modelled underneath, and we would rather explain than quietly build something
else.

**`PATCH /reviews/{id}/assignee`.** A `Review` is a verdict that has already
been written, so by the time one exists there is nothing left to reassign.
Assignment lives on the *recording* (`assigned_reviewer_id`). We have built
**`PATCH /recordings/{recording_id}/assignee`** instead, which should serve the
same screen — pass `null` to return the item to the queue.

**`PATCH /annotations/{id}/assignee`** needs to update two rows: the
annotation's annotator and the session's assigned annotator. Updating only one
would leave the queue and the annotation disagreeing about who owns the work.
The endpoint does both in a single transaction, so it behaves exactly as you
would expect — this is just a heads-up that reassignment is not a single-field
edit underneath.

## 4. Shipped since your document — now live

These were written and tested when you wrote to us, and have since been
deployed. They are in the OpenAPI document now.

| Endpoint | Returns |
| --- | --- |
| `GET /dashboard/admin` | Totals, status breakdowns, and **stuck-work counts** |
| `GET /reviews` | Flat list of verdict rows, paginated, filterable by `verdict` and `reviewer_id` |
| `PATCH /recordings/{id}/assignee` | The updated recording |
| `PATCH /annotations/{id}/assignee` | The updated annotation document |
| `GET /corpus/summary` | Hours, clips, speakers, split by type / variety / status |
| `GET /corpus/coverage` | Speakers and hours per Nigerian state |
| `POST /prompts/import`, `POST /stimuli/import` | CSV bulk create, with per-row failures |
| `POST /users/{id}/password-reset` | A single-use token — see §5 |

Three things about them that may save you some guessing:

**Stuck work carries ages, not just counts.** Each of the three
(`stuck_unreviewed_recordings`, `stuck_unclaimed_sessions`,
`stuck_annotations_in_rework`) has `count`, `oldest_at` and `oldest_age_days`,
since "three items stuck" and "three items stuck for a month" call for rather
different reactions. Nothing counts as stuck until it has waited three days.

**Corpus hours are measured server-side rather than taken from the client.**
`duration_seconds` is whatever the browser reported and was never verified, so a
corpus total built from it would really be a total of what browsers asserted.
Every upload is fully decoded on intake anyway, so the true duration is now
measured and stored alongside it. `unmeasured_rows` in the summary tells you how
many rows still fall back to the reported value, which is useful context if the
number is going in front of anyone.

**Coverage returns all 37 states including the empty ones**, plus `unknown` —
the gaps are rather the point of the map. State is free text in the forms, so
values are normalised on read: "Lagos", "lagos" and "Lagos State" come back as
one state. Anything matching no state lands in `unknown` and is listed verbatim
in `unmatched_states`, so a typo can be corrected at source rather than quietly
disappearing.

For the *recordings* half of your Admin Reviews page, nothing new is needed:
`GET /recordings` already returns everything to reviewers and admins, with a
status filter and the total.

## 5. Design decisions worth knowing about

**Password reset does not let an admin set someone's password.** An admin who
could set passwords could log in as anyone, including another admin, with
nothing in the record to show it had happened. Instead an admin generates a
**single-use token**, returned once, and passes it to the person out of band;
the person redeems it themselves at `POST /auth/password-reset/redeem` with a
password of their own choosing. Who issued it, and when it was used, are both
recorded.

**Interns now need admin approval, and this one does mean a new screen for you —
apologies for the late notice.** A public `POST /auth/register` with
`role: "intern"` still succeeds, but the account lands unapproved and every
intern route returns **403 `Intern account is awaiting admin approval`** until
an admin calls `POST /users/{id}/approve-intern`. It is distinguishable from the
generic role 403 by its message, so it can be surfaced as "pending approval"
rather than as a permissions error.

Existing intern accounts were backfilled as approved, so nobody currently
working was locked out, and annotators and contributors are unaffected.

Separately, `PATCH /users/{id}` with `is_active: false` suspends any account
reversibly. The login path then returns **403 `Inactive account`** rather than
401, which is worth distinguishing — a suspended user sent to a password reset
will not get anywhere.

**Annotators can already self-register.** `role: "annotator"` on
`POST /auth/register` has worked since the role was added, so if you are still
seeing a failure there we would like to look at it — could you send us the
response body? Something else is going on.

**A focus group reaches `/annotations/queue` only once audio has been
uploaded.** That is intended, since there is nothing to annotate before then,
but it had never been written down anywhere — it is documented now.

## 6. Sequenced for a later round

Not declined, just not this round:

- **Acceptance rate, median review time, the intern quality radar.** `rank` has
  shipped; these have not. Each is a scoring rule that becomes a contract the
  moment it ships, and some of it is displayed to the person being scored, so we
  would rather agree the definitions with you and the Head of Data first than
  have them inferred from a chart.
- **`?from=&to=&bucket=day`.** Not built, and possibly not needed: all four
  dashboards return 365 zero-filled daily buckets, so any window you want is a
  slice of what you already hold. They share one window deliberately, so the
  four charts stay comparable, and each series comes with a matching
  `*_in_window` total that it sums to exactly. If server-side ranges would help
  regardless, do say and we will add them without disturbing that.

## 7. Payouts and wallets — your priority list, mapped

This was built as a separate piece of work, so some names differ from your list.
Where they differ we have mapped them below rather than asking you to adapt, and
where your contract was right and we were missing it, we built what you asked
for.

| Contributor | Purpose |
| --- | --- |
| `GET /wallet` | Balance, payout account and verification state |
| `GET /wallet/identity/methods` | How identity can be verified |
| `POST /wallet/identity/nin` | Submit a NIN for verification |
| `GET`/`POST /wallet/payout-destination` | The account money goes to |
| `POST /wallet/onboarding-link` | Provider-hosted onboarding, once the NIN passes |
| `POST /wallet/sync` | Re-read a pending decision |

| Admin | Purpose |
| --- | --- |
| `GET /payouts/preview` | What the next run would pay |
| `GET`/`POST /payouts/runs` | List and start pay runs |
| `GET /payouts/runs/{id}` | One run and its legs |
| `POST /payouts/runs/{id}/items/{item_id}/reconcile` | Settle an uncertain outcome |
| `POST /payouts/ledger/{id}/void` | Void a mis-credit while the money is still ours |
| `GET /payouts/duplicate-flags`, `.../resolve` | Review suspected duplicate accounts |

**Your priority list, line by line:**

| You asked for | Use |
| --- | --- |
| `GET /wallet` → `{balance_kobo, pending_kobo, lifetime_kobo, payout_account}` | `GET /wallet`. Now carries `*_kobo` integers alongside the decimals, including `lifetime_kobo`. Balance splits four ways rather than three — see below |
| `GET /wallet/entries` | `GET /payments/earnings` — the ledger, with timestamps |
| `GET /banks` | **Built, as asked.** `GET /banks`, returns `{code, name}` |
| `POST /wallet/account` → resolved account name | `POST /wallet/payout-destination` — it already performs name enquiry and returns `account_name` |
| `POST /wallet/withdrawals` | **Built, as asked.** `POST /wallet/withdrawals` |
| `POST /payments/run` | `POST /payouts/runs` |
| `PATCH /payments/rates` | `PUT /payments/rates/{unit_type}`, one rate per call |
| `POST /users/{id}/approve` | `POST /users/{id}/approve-intern` |
| `peaks` on annotation sessions | `waveform_peaks` on `GET /focus-groups/{id}` |
| `points`, `rank` on `/dashboard/contributor` | **Both present now**, plus `ranked_contributors` so you can render "4th of 212" |
| `total` on every list response | **Built, as asked.** `?envelope=true` on any list endpoint returns `{items, total, limit, offset}` |
| `?from=&to=&bucket=day` on dashboards | `daily_activity` already returns 365 zero-filled daily buckets to slice — see §6 |

**Money comes back in four buckets rather than three.** `held` (earned, still
inside the review window), `payable` (a run would send this now), `in_flight`
(claimed, not yet settled) and `paid`. Your `balance`/`pending` maps onto
`payable`/`held` — though we would gently suggest showing `held` separately
rather than folding it in, because a contributor who sees one number and cannot
withdraw it will reasonably conclude something is broken. `lifetime_kobo` is the
sum of all four.

**The `*_kobo` integers are the better choice for new code.** The decimals are
JSON strings ("450.00") specifically so JavaScript never parses money as a
float, but that still leaves each consumer to parse them correctly, whereas an
integer number of kobo cannot be got wrong. Both are returned, so there is no
rush to migrate anything already working.

Two behaviours worth designing around rather than meeting at runtime:

**A verified NIN is the only route to being paid.** `GET /wallet` reports the
state. Until identity passes there is no payout destination to collect and the
contributor is not eligible for a run, so the wallet screen needs a verification
step ahead of anything that shows a balance.

**Earnings are not immediately payable.** A ledger entry matures through a hold
window before a pay run will touch it — that window is the only period in which
a mis-credit can still be voided while the money is ours. Hence the payable and
held split above.

**A withdrawal is a pay run with a single recipient.**
`POST /wallet/withdrawals` runs the same eligibility, minimum, balance check and
transfer machinery an admin run uses, deliberately, so it cannot become a weaker
second route to the same money. It returns the run.

Expect **409** in two cases: when there is nothing matured above the minimum, or
when a payment to that person is already in flight. The second is what stops a
double tap producing two transfers, so it is best treated as "already on its
way" rather than an error to retry. A leg reported as `unknown` is not a failure
and the money is not lost — it settles by webhook or reconciliation.

## 8. The prompt and stimulus banks are seeded

This was the genuine blocker, and it is now cleared: **12 prompts and 6 stimuli
are live**, so contributors have something to record against.

They are tagged `category="placeholder"` so the whole set can be found and
retired in one go once the real bank arrives
(`GET /prompts?category=placeholder`, then `DELETE`). The seeding command is
idempotent if it ever needs re-running:

```bash
python scripts/seed_via_api.py --base-url https://api.alvacoreai.com \
  --email <admin> --password <password>
```

One caveat worth passing on to whoever reviews the data: the placeholder wording
is **not** the real bank. Prompt wording determines the phonetic coverage of the
dataset and is the Head of Data's call, so anything recorded against these
should be treated as development data.

---

Thanks again for the document — it was an efficient way to do this, and we are
glad to work the same way next round. If anything above does not match what you
are seeing in the OpenAPI document, please tell us and we will look straight
away.

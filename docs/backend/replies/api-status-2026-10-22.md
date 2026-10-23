# Re: Endpoints we need (20 Oct), and a hardening release

Thank you for the 20 Oct `endpoints-needed.md`. Checking each ask against the
live OpenAPI first made this quick to work through. **All six asks are answered
below and deployed**, along with a review of the whole API for anything that
would misbehave in production.

**Nothing you have built should break.** A handful of requests that used to
succeed, or failed with a 500, now return a clear 4xx. Every one is listed, so
none comes as a surprise.

| Your ask | Where |
| --- | --- |
| 1. Annotator sign-up and approval | §4 |
| 2. Scoring definitions | §8 |
| 3. Speaker demographics as a joint | §7 |
| 4. `under_18` on `AgeBracket` | §7 |
| 5. Error messages that name Bachs | §5 |
| 6. A state on the session | §7 |

§1-3 and §6 are the hardening and security changes you will notice.

---

## 1. Requests that are now refused

| Request | Now | Why |
| --- | --- | --- |
| `PATCH /recordings/{id}/assignee` or `PATCH /focus-groups/{id}/assignee` with `{}` | **422** | An empty body used to read as "unassign" and quietly took the work back. To unassign, send the field explicitly: `{"reviewer_id": null}` / `{"annotator_id": null}`. |
| An explicit `null` on a field that cannot be empty, e.g. `PATCH /prompts/{id}` with `{"text": null}` | **422** naming the field | It reached the database and failed as a 500. Leaving a field out still means "leave it alone"; `null` only clears fields that may be empty, such as `category`. |
| A number that is `Infinity`, `NaN`, negative or over **6 hours** (`21600`) for a duration, turn time, token timing or event time | **422** | An infinite duration was stored, and then every screen that read it failed: the contributor's dashboard and the reviewing intern's desk, until the row was fixed by hand. |
| A list `offset` over **1,000,000** | **422** | Large offsets overflowed the database. |
| `category: "focus_group_topic"` on a prompt or stimulus (create, edit or CSV row) | **422** / a failed CSV row | Topics live in `/focus-group-topics`. In the prompt bank, `/prompts/next` could hand a topic to a contributor to read aloud. |
| A category over 64 characters, a `device_mic` over 255, a rate over `NUMERIC(12,2)` or a currency that is not three letters | **422** | These are the sizes of the columns behind them. |
| `POST /notifications/read` with more than 500 keys, or a key over 128 characters | **422** | |

## 2. Assignment rules that are now enforced

- **Finished work does not change hands.** Moving an annotation that is
  submitted, approved or rejected to someone else, by either assignee route, is
  a **409**. Only work still in progress can move.
- **Nobody inactive can be handed work.** Assigning a deactivated annotator or
  intern is a **400**. Deactivating someone gives their open sessions back to
  the queue, as it already did for interns' clips.
- **A session somebody holds cannot be deleted** (**409**). Unassign it first.
  If nobody has started work on it, it can then be deleted. Before this, that
  route was blocked once anyone had been assigned, even for a moment.
- `open_count` on `GET /users` counts only sessions a person **still holds**.
  A draft left behind after an unassign no longer counts as their load.

## 3. Smaller changes you may notice

- **`reviewer_name` is `null` for contributors** on their own recordings.
  Interns and admins still see it. A contributor knowing which intern holds
  their clip invites lobbying, or worse.
- **Activity log, after a reassignment:** each annotator reads only their own
  events, and admins read everything. The new holder numbers on from the whole
  log. If they start too low, the 409 says where to continue (`last_seq N`).
- **A 422 whose input was `Infinity` or `NaN`** echoes it as the string `"inf"`
  or `"nan"` in `detail[].input`. Before, the error itself could not be written,
  and you received a 500.

## 4. Annotator sign-up and approval (your 20 Oct ask 1)

Thank you for writing down the three assumptions; all three were false
until this release, and they are true now.

1. **Registering as `annotator` now leaves the account unapproved.**
   `POST /auth/register` returns `approved: false` for an intern or annotator.
   Contributors still start at once. Annotators already working are unaffected.
2. **The approval route is now `POST /users/{id}/approve`**, for interns and
   annotators both. `approve-intern` still works, for both roles, so your
   current button keeps working, but it is marked deprecated, and we would
   suggest moving to `approve` when convenient. `UserOut` has a new `approved`
   field; `intern_approved` is kept as an alias with the same value, so a
   pending annotator reads `false` there too.
3. **Annotator routes return 403 until approval**, with
   `detail: "Annotator account is awaiting admin approval"`. The intern
   message is unchanged (`"Intern account is awaiting admin approval"`). If
   you recognise "pending" by matching that string, please add the annotator
   one.

What a pending applicant **can** still do: `/auth/me`,
`PUT /onboarding/profile`, consent, notifications and **their own sign-up
form**. `PUT /onboarding/annotator-profile` works before approval, since it is
the claim being approved. So does `PUT /onboarding/intern-profile` for
interns. That one was refused before approval until now, so pending
interns' profiles were being dropped.

New for the admin screen:

- `GET /users?approved=false` lists everyone waiting. It supports the
  envelope and `X-Total-Count` as usual.
- `GET /users/{id}/profiles` returns what the person submitted:
  `{profile, intern_profile, annotator_profile}`, each `null` if never filled
  in.
- Admins get a notification for each person waiting:
  `kind: "approval"`, with the new `user_id` field. `kind` gains that one
  value.
- Creating an account through `POST /users`, or changing anyone's role
  through `PATCH /users/{id}`, counts as approving it.

**One annotator may hold two open sessions** (draft or sent back for rework).
A third `claim-next` returns 409:
`"You have 2 sessions open. Submit one before claiming another."` To show
this before a claim is refused, `GET /dashboard/annotator` now carries
`open_claims` and `claim_limit` (`null` for admins, who are not capped).
`queue_available` stays the depth of the whole queue. Queue notifications
stop while someone is at the cap. An admin assigning a named session to a
named annotator is not held to the cap.

## 5. Messages that named Bachs (your 20 Oct ask 5)

You were right, and thank you for passing our text through rather than
rewriting it. That made the problem visible. **Every 4xx and 5xx a contributor
can receive is now written for them. The vendor's name, setting names and
upstream text go to our logs only.** "Bachs not found" was Bachs's own 404
text, passed through as `"Bachs: Not found"`. Nothing was logged at the time,
so the next one will now tell us which call failed.

You can drop the pattern-matching at your boundary. If a contributor ever sees
a vendor name again, it is a bug on our side, and we would be grateful to
hear about it.

What contributors now see:

| When | Status | `detail` |
| --- | --- | --- |
| Payouts switched off | 503 | `Payouts aren't available right now. Please try again later.` |
| Payment partner unreachable | 502 | `We couldn't reach our payment partner. Please try again in a few minutes.` |
| Payment partner refused | 502 | `We couldn't complete that with our payment partner. Please try again later.` |
| Bank account will not resolve | 422 | `We couldn't verify that bank account. Check the account number and bank, then try again.` |
| NIN check sent, outcome unknown | 502 | `We couldn't confirm your identity check was received. Open your wallet again in a few minutes to see where it stands.` The check stays pending, and a second submission is a 409 until `GET /wallet` settles it. |
| Identity checks switched off | 503 | `Identity checks aren't available right now. Please try again later.` |
| A withdrawal while our balance is short | **503** (was 409) | `Withdrawals are paused for a moment. Please try again later.` This used to show the contributor the platform's balance. |
| A withdrawal with nothing payable | 409 | The actual reason: verify your identity, set up or finish your payout account, an account on hold, or no matured earnings above the minimum. |

Three related changes:

- **`POST /wallet/withdrawals` returns `WithdrawalOut`.** It carries the same
  run-level fields as before. Each item now carries only `id`, `amount`,
  `currency`, `status`, `settled_at` and a `failure_reason` written for the
  contributor; `idempotency_key`, `bachs_account_id`, `bachs_transfer_id`,
  `attempts` and `user_id` are gone. Please check your client does not read
  those from this response. Admin run views are unchanged.
- **`identity_failure_reason` and the identity `detail` only carry the
  vendor's reason when it is safe to show**, for example "Face did not match ID
  photo.". Otherwise they are `null`, or our own sentence.
- **A failed NIN check no longer holds the NIN.** Previously, typing somebody
  else's NIN and failing the check left that number claimed, and its real
  owner was then blocked as a duplicate.

On `selfie_base64`: the schema now describes it, caps it at 4 MB, and refuses
anything that is not base64. A `data:image/jpeg;base64,` prefix is accepted if
one slips through. It still shows as optional in the schema because a
deployment can switch selfie matching off, but it is required in production.
Leaving it out gets the same sentence as before.

## 6. Security fixes you will notice

**Sessions now end when they should.** A token used to stay valid for its full
24 hours after the person's password was reset, after their role changed, and
after they were deactivated. `/auth/refresh` could also renew it indefinitely.
Now:

- A password reset, a role change or a deactivation ends every session that
  person has. Their next request gets **401**; they sign in again. Reactivating
  an account does not bring old sessions back.
- `/auth/refresh` keeps the original sign-in time and stops **one week** after
  it. Past that it answers 401 with `"Your session has expired. Please sign in
  again."`. With "remember me", that means signing in once a week.
- Nobody is signed out by this release itself.

**Interns no longer see earnings.** They review the clips, not the pay.

- `GET /payments/earnings/{id}` is now the contributor's own, or any for an
  admin. For interns it returns **403**.
- When an intern opens a contributor's dashboard, `payment` and `points` are
  `null`, meaning "not shown to you", not zero.
- `GET /payouts/duplicate-flags` is admin-only. Each flag names two people
  suspected of being one.

**No session is processed without every speaker's consent.**

- `POST /focus-groups/{id}/audio` returns **409** until the session has at
  least one participant, and every participant has agreed to take part. The
  `detail` names anyone who has not, for example
  `"... Not agreed: Bayo."`. A participant with no consent record does not
  count as agreeing.
- `PATCH /focus-groups/{id}/assignee` returns the same 409 when handing such a
  session out. Taking it back (`annotator_id: null`) still works.
- Such sessions stay out of the annotation queue, claim-next, queue
  notifications and the queue counts on the dashboards.
- `GET /corpus/summary` counts only consented sessions and their participants.
  A new `sessions_without_consent` field says how many sessions with audio
  were left out.
- One gap: there is no route to remove a participant. A session recorded with
  someone who said no has to be deleted and recreated without them.

**Audio uploads:**

- A file longer than **six hours** returns 422:
  `"Audio is longer than the 6-hour limit. Please split it and upload the
  parts."`. Until now it would have been taken.
- An upload ffmpeg cannot decode returns 422 with the same message as before.
- Behind the scenes, uploads are now converted on disk rather than in memory.
  A long session no longer risks taking the server down, and the API framework
  has been upgraded for two published security fixes. Neither changes
  anything you call.

## 7. Your 20 Oct asks 3, 4 and 6

**3. Demographics as a joint.**

- `demographics` on `/dashboard/intern` and `speaker_demographics` on
  `/dashboard/annotator` both gain `by_gender_age`: a list of
  `{gender, age_bracket, speakers}`, one row per pair that occurs. It has the
  same shape as `by_type_status`.
- `by_gender` and `by_age_bracket` are now summed from those rows, so the three
  always agree.
- The unit is a speaker in a session. A participant is logged per session with
  no identity across sessions, so someone in two sessions counts twice.
- **The annotator's numbers may drop.** They counted each speaker once for
  every annotation the annotator held on that session, for example a revision
  or a draft left behind after an unassign. They now count each speaker once.

**4. `under_18`.**

- It is refused, with 422 `"Alva Studio is open to people aged 18 and over."`,
  on `PUT /onboarding/profile` for every role.
- It is also refused for focus-group participants, on both create routes, with
  the `detail` naming who. A guardian's consent has nowhere to be recorded, so
  a minor's own consent cannot stand.
- The value stays in the enum, so records stored before this rule still read.
  "Under 18" remains the right label for them.
- This checks the value only. The account itself is created at
  `/auth/register`, so the age attestation at sign-up is still yours to
  enforce.

**6. A state on the session.**

- `FocusGroupSession.state` is **where the session was recorded**, as typed.
  It appears on create, on the list row and on the detail.
- It is not where the speakers are from; that is still each participant's
  `state`.
- It is `null` when not recorded. We did not backfill it from the participants,
  since that would store the derivation you rightly called out as a fact.
- To fill in older sessions, use the new
  `PATCH /focus-groups/{id}` with `{"state": "Lagos"}`. It is open to the
  session's intern or an admin; `null` clears the value.
- One related field keeps its old meaning: `state` on the annotation queue row
  is still the intern's state of origin.

## 8. Scoring (your ask 2)

These are built to the definitions agreed on 17 Oct. Both use the shared
365-day window, and their names carry `_in_window`, so neither can be mistaken
for a 90-day figure.

**Median review time**, on `GET /dashboard/contributor`:

- `median_review_seconds_in_window` is the median time from upload to verdict,
  in seconds.
- It covers the contributor's clips **decided** in the window, meaning approved
  or rejected. A flag is not a decision.
- `decided_in_window` says how many clips the median is over.
- It is `null` below 10 decided clips, the agreed floor. Your dash stays right
  for that case.

**Quality radar**, on `GET /dashboard/intern` as `quality_in_window`.

Each of the five axes is `{score, numerator, denominator}`. `score` runs
0-100, and is `null` when there is nothing to score yet. Please draw that as
"no data", not as zero.

| Axis | Definition |
| --- | --- |
| `consent` | Participants whose latest participation consent is accepted, out of all participants in the window's sessions. |
| `demographics` | Filled fields out of five per participant: age bracket, gender, language variety, state and native language. Blank text is not filled; "prefer not to say" is an answer. |
| `audio` | Sessions whose audio decoded and is not silent, out of the window's sessions with audio. This is coarse on purpose. It catches a broken upload or a dead mic without the optional ML stack. |
| `participants` | Attendance against each session's target. The score is the mean of participants ÷ target, capped at 100 per session. `numerator` counts the sessions that met their target. |
| `clip_approval` | Of the clips the intern decided, the share approved. `null` below 10 decided clips. |

**Participant targets** are set per topic on the bank:

- `target_participants` is a new field on the topic create, edit and read
  schemas, between 1 and 50.
- Topics without one use a default of 8.
- Each session copies the target it was run against
  (`FocusGroupSession.target_participants`), so editing a topic later does not
  re-score sessions already run.

One caution, which we have also put in the field's description: a higher
`clip_approval` means more approvals, which is not by itself better reviewing.
It may be worth labelling it so that interns are not nudged towards approving.

That is everything. If any of these turns out to block something you rely on,
please tell us and we will look again.

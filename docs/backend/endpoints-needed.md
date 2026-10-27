# Endpoints we need

Checked against the live OpenAPI document, 27 Oct 2026. Only what is still
open is listed here.

## Open

| # | Ask | Blocks | Priority |
| --- | --- | --- | --- |
| 1 | Close sign-ups and sign-ins at a capacity | Holding the platform at a set number of people | **High** |

---

## 1. A waiting list for contributors when we are full

We want to hold the platform at a set number of contributors. **Nobody is
turned away** — we still want their details. They just do not get in until a
place opens.

This is the approval flow you already have for interns and annotators,
applied to contributors when a cap is on. It is **contributors only**: an
intern or an annotator already waits on an admin, so a cap adds nothing to
their sign-up.

**What should happen**

1. Contributor signs up while we are full. **The account is created**, with
   everything they filled in, and `approved: false`.
2. They get the "waiting for approval" email straight away, and every admin
   gets the "an account is waiting" one. Both already exist.
3. Signing in gets the `403` you already send for an unapproved account, so
   nothing new is needed on login.
4. An admin opens the gate, approves them, and **the existing "Your account
   is approved" email goes out**. They sign in. No new mail template.

So the only new thing is the switch itself, and making register honour it.

**The switch**

```
GET   /platform/capacity                     (public, unauthenticated)
  → { open: true, accounts: 412, limit: 500 }

PATCH /platform/capacity   { open, limit }   (admin)
  → the same shape
```

- **`open`** is the switch an admin flips. `limit` is a number it can close
  at on its own; either is enough on its own, and an admin can close early by
  sending `open: false`.
- **Public on the read.** The sign-up page needs it before anybody has an
  account. It carries no personal data, only three numbers.
- **`accounts`** is whatever you count towards the cap. Tell us which roles
  it includes; we only display it.

**What register should do while closed**

```
POST /auth/register, role=contributor, while closed
  → 201, the account created with approved: false
```

Not a `403`. We want the person and their data; we are only deferring
access. Interns and annotators are unaffected either way.

**Two things we would like on the response**, so the screen can tell "you
are in" from "you are on the list" without guessing:

```json
{ "...": "...", "approved": false, "waitlisted": true }
```

Without it we infer waitlisted from `approved: false`, which is also true of
a normal intern sign-up, and the two need different words on screen.

**And a stable `code` on the refusals**, rather than English we have to match
on. We are currently reading messages for two things:

| What we match | Why we need it |
| --- | --- |
| `at capacity`, `registration is closed` | Opens the waiting-list sheet instead of a field error |
| `already registered`, `already exists`, `already taken` | Somebody already on the list who signs up again gets the same sheet, not a red line implying they mistyped |

Both fall back safely to showing your own sentence, so a reword cannot
mislead anybody — it just makes the screen less helpful. Something like
`{"detail": "...", "code": "at_capacity"}` and `code: "email_taken"` would
settle it.

**Signing in is a dead end for a waitlisted contributor**, which is correct
and we are not asking you to change it: the account exists and is not
approved, so your existing `403` refuses them. The sheet therefore offers
nowhere to go — no "back to sign in", because that would be a second dead
end after the first.

**Nothing else is enforced client-side.** Until this exists the admin switch
only reaches the browser it was pressed in, and the confirm dialog says so.
A door the client closes is not closed, and we are not shipping a control
that claims otherwise.

---

Both asks from 26 Oct are answered in
[`replies/api-status-2026-10-26.md`](replies/api-status-2026-10-26.md) and
wired: `POST/GET/PATCH /feedback`, and sign-ins kept a year.

All five asks from 24 Oct were answered in
[`replies/api-status-2026-10-24.md`](replies/api-status-2026-10-24.md) and are
wired: the email list, the recovery 503s, sign-ins in the audit log,
`GET /users/{id}/activity`, and the cached bank list.

**One thing we are waiting on rather than asking for.** Emails still reach
nobody until the sending domain is verified with Resend. Nothing on our side
changes when it is done. Until then an approved recovery answers 503 and we
show that, and the manual reset on the user panel is the way back in.

---

---

## On our side, not asks

| Item | Our handling |
| --- | --- |
| Upload quota | `GET /recordings/quota` is read before recording, so a refusal never discards a clip somebody has just spoken. 429 is handled with its `Retry-After`. |
| `session.claim` events | Sent from the claim call, not the workspace, because claiming happens on the way to a session that is not open yet. |
| `text.edit` payloads | Length only. Keystrokes are collapsed per segment per flush, so a sentence is one row rather than forty. |
| Leaderboard ties | A podium that reads "1st, 1st, 1st" renders as-is. It is the truth about an early corpus. |
| Six `identity_status` values | Driven from `next_action` on `GET /wallet` |
| `*_kobo` vs decimal strings | We use the integers |
| `X-Total-Count` header | Not reachable from our client, so we pass `?envelope=true` |
| `POST /wallet/identity/nin` consent | Collected with a checkbox. It is an attestation to a government database check, so we do not send `true` on somebody's behalf. |
| `selfie_base64` | Now sent. Worth knowing it is `anyOf: [string, null]` and absent from `required`, but the call is refused without it — "A selfie is required so your face can be matched to your ID photo". We read that as required and built a camera step for it; if the schema could say so too, the next person reading it would not have to find out by submitting. A fallback upload covers a blocked camera. Downscaled to 720px JPEG, bare base64, no `data:` prefix. |
| `/prompts/next` | Unused. A prompt is not used up by being read, so we page the whole active bank locally. |
| `device_mic` on an upload | Now sent. We read the label off the live audio track, so it is the mic that clip was recorded on rather than the one typed into a profile. Blank where a browser withholds the label, and then omitted rather than guessed. |
| `GET /wallet/payout-destination` | We were reading it as a single object with an `account_number`. It is a list, and carries `account_last4`, so the wallet shows a masked number and picks the first `is_usable` destination. |
| `english_fluency` | Now sent and read back. It had nowhere to go when the onboarding form was built. |
| Duration bounds | We drop a duration that is negative, infinite, NaN or over six hours rather than sending one that would be refused. A recorder left running in a background tab can produce one, and losing the take to a 422 is worse than losing the figure. |
| `device_mic` length | Truncated to 255, the column width. A virtual device can carry a long label. |
| The message guard is gone | We were pattern-matching "Bachs" at our boundary. Your 4xx and 5xx text is shown as sent now. |
| Reassigning finished work | The button is gone for a submitted, approved or rejected annotation rather than offered and refused with a 409. |
| Assign pickers | Filter on active AND approved. An unapproved annotator cannot do the work they would be handed. |
| Session `state` | Read from the session's own field. We used to take the commonest state among the participants, which read Ogun for a Lagos session with a room from Ogun. |
| Demographic charts | The pyramid counts speakers on the intern and annotator dashboards, and hours on the corpus page, since a focus-group file holds several voices. |
| Clip approval axis | Labelled "Clips approved", not "Quality", per your caution. A higher share of approvals is not by itself better reviewing. |
| `ethnicity`, `occupation` | Now sent and read back. They were collected at onboarding and discarded. |
| Redaction | Wired from two places, as an intern meets the problem in two. The confirm checkbox is ticked by a person, never sent for them: untagged speech is not silenced, and no care at our end changes that. The player sits above it so the tick means something. |
| `consent_blocked` | The workspace shows a banner on open, hides Mark as done, and makes autosave inert. Every write is a 409 while it holds, and an indicator cycling through "saving" and "failed" says nothing the banner has not. |
| A duplicate NIN | The 409 replaces the form rather than flashing a toast. Retyping cannot fix it, so there is nothing to go back to. |
| Toasts | Wrap to two lines now, left aligned and smaller. "This payout account is on hold while we r…" was being cut mid-word. |
| Account recovery | Wired, both ends. `POST /auth/password-reset/request` from the forgot-password page, and an admin queue on the users page for approve and deny. The form says the same thing whatever the email was, because the API does: anything else turns it into a way to find out who has an account here. |
| Recovery 503s | Shown as sent, on both routes. The forgot-password page prints your sentence under the form instead of its "request sent" screen, and the admin queue's toast carries it instead of a green tick. |
| The reset link, after an approval | The toast now reads `GET /users/{id}/emails` rather than the 200. A `failed` row says the email was refused and points the admin at the manual reset; `sent` says sent, not delivered. This is the screen that spent three weeks telling admins a link had gone out while every one of them was being refused. |
| Emails | We send none and add none. The list in §1 of your 24 Oct reply is what we build around: no in-app message claims an email was sent except the recovery one above, which now reads the delivery record. Templates are still coming to us to style. |
| Milestone pay | The progress bar sits on the contributor's points card: points are not money, and money arrives in ₦5,000 steps. Ledger rows handle a null `recording_id` and `unit_type` — reading `unit_type` blindly threw on the first award. |
| The rate editor | Read-only now, titled "Historic rates", with the milestone terms in the subtitle. A field that changes nothing is worse than no field. |
| Back-pay | In a menu on the payments header rather than a third button beside Run payment. Previews, then credits. |
| Password change | Sends them to sign in on the 200, rather than waiting to be thrown out by a 401 on whatever they tap next. |
| History tabs | All four read `GET /audit`, with `sign_ins` left at its default, so they are unchanged by the new actions. |
| Sign-ins | In the audit log, not beside it. One list, `sign_ins=include`, interleaved: "signed in on a new device" followed by "password changed" is a story you can only read if the two are in the same timeline. The filter that used to narrow to sign-ins is gone, and so is the reason for it — the tab pages now, so a year of sign-ins can no longer push a password change off the end of a fixed fetch. The 90-day retention is stated on the tab, since a gap means two different things either side of that line. See ask 2. |
| `POST /auth/logout` | Called from the sign-out button, and not awaited. The token is stateless, so dropping it is what ends the session; a sign-out must not fail because the network did. `everywhere` is not wired to anything yet — we have no screen where somebody would reach for it. |
| A deleted account signing in | We show nothing specific, because a deleted account answers exactly as a typo does. That is the right call and we are not asking you to change it. Approval-pending and deactivated both get their own screen, since those two are safe to name. |
| The activity log | No longer a switch. It is on, locked, and the copy says what is recorded rather than thanking anybody for agreeing to it. |
| Deleting an account | The bin opened a confirm pair with no words on it, on a hard delete. It now opens a dialog built from `GET /users/{id}/deletion-preview`, which your description already said to call first, and offers deactivating as the reversible alternative. |
| The Activity tab | Refilled from `GET /users/{id}/activity`. Every noun on it comes from your `unit` rather than a lookup on our side, and the outcome figures are printed as sent. The heatmap pins each UTC day to the same-numbered local day: parsed as a timestamp, `2026-10-24` is the 23rd west of Greenwich, and a calendar a day out does not look broken. |
| A 401 | Signs the person out and sends them to login. Every screen used to render its own red box about credentials with a Retry that could not work. |
| Invented history | Removed. Four History tabs were reconstructing events with made-up timestamps. They now show only what you measure, with a line saying the list is partial. |
| Seeded fallbacks | Cleared. A dashboard with no response shows zeroes, never a sample: these are figures about one person's own work. The seeded sets are reachable only from demo mode. |
| Remember me | Entirely ours, nothing needed from you. Ticked keeps the token in localStorage, unticked in sessionStorage, so it only decides whether the token outlives the tab. How long the token is valid stays yours. |
| Sign-up drafts | All three sign-up forms keep their answers across a refresh, in localStorage. Password fields are excluded and never written. |
| `RegisterIn.role` | We were downgrading `annotator` to `contributor` before sending, left over from when there was no annotator sign-up. Now sent as-is. |
| iOS Safari mp4/AAC | The type comes from `MediaRecorder.mimeType`, with a matching extension. |
| Mock data | Gone, and barred. Demo mode, the seeded datasets behind it and the `alva-dev-ui-state` switch are deleted. Every generated row now lives in `src/test`, which an ESLint rule stops shipping code from importing, so a screen with no data shows zeroes rather than a sample. The ones that were still live: the intern charts drew a fixture on a live page, two dashboards fell back to a seeded year when a request failed, and two pages ran a timer that pretended to be a fetch. |
| `stuck_*` counts | Relabelled. "217 recordings await a verdict" read as the whole pending queue and disagreed with the review page's own total; your `stuck_*` figures count only what has waited past `STUCK_AFTER_DAYS`. It says "have waited too long" now. |
| Reviewer answers | The admin panel was generating them from a seeded random keyed on the recording id: an approved clip got four yeses, an unreviewed one got four yeses under the heading "Reviewer answers", and a rejection got a roll of the dice. So an admin read a named intern's judgement the intern had never made. They come from the `q_*` fields on `GET /reviews` now, and a clip with no verdict says nobody has reviewed it. |
| `GET /reviews/recording/{id}` | Now used. It has been in the API the whole time and nothing was calling it, so an intern reopening a review they had submitted saw an empty rubric unless the draft happened to still be in that browser. |
| A submitted review | Read-only on the intern side. The radios show what they chose, disabled, and there is no Submit button: your API refuses a second verdict on the same recording, so an editable form could only ever end in a refusal after the work of filling it in. |
| Approval rate | One definition, shared. The dashboard read 0% while the review page read 100% on the same corpus, because one counted hours over the whole corpus and the other counted clips over what had been decided. Both now count **clips**, divided by approved plus rejected, from `recording_status`. A queue with no verdicts says so rather than showing 0%. |
| Page size | We were sending `limit: 200` and treating the answer as the whole list. Your cap is 200, so "Recordings 200" on the oversight screen was the page size, and the status ring, the approval gauge and the reviewer flow were all computed from whichever 200 came back — which is why a clip approved outside that window never appeared. Every admin list pages to its envelope `total` now. |
| Focus group speakers | An admin could see a speaker count and nothing else. The participants and the recording both come back from `GET /focus-groups/{id}` and `GET /focus-groups/{id}/audio`, and neither was being read, so a session was approved on a count and the word "uploaded". Both are on the session panel now, consent first. |
| `GET /users/contributors` | Now used for the reviewer's contributor names. `GET /users?role=contributor` is admin-only, so an intern's review screen was getting a 403 and falling back to eight characters of a UUID in place of every name — silently, because that lookup is deliberately non-fatal. |
| Feedback routes | Wired. `POST /feedback` from the form, `GET /feedback` for the admin table, `PATCH /feedback/{id}` for the row menu. The mailto fallback stays as a backstop for a 404 and no longer fires. |
| Stars | Required, 1 to 5, as the ask said. Our "on our side" note calling them optional was out of date, not the API. |
| Sign-in retention | A year. The copy on the user panel says so. The annotation activity log stays at 90 days, which the annotator profile still says, because it is a different record and 90 days is part of what they agreed to. |
| Feedback | A form on every profile page: optional stars, a dropdown, the writing, and the route they were on. Submitting tries `POST /feedback` and falls back to a prefilled mail to support when that 404s, so nothing anybody writes is lost waiting for a deploy. See ask 1. |
| Reset password, in the admin panel, again | It now emails them. `POST /users/{id}/password-reset` queues the mail itself ("a reset email is queued when Resend is configured"), so the admin confirms, we send, and we report delivery from `GET /users/{id}/emails`. The token is shown **only** when the email did not go, with the reason, because an admin whose mail is down and who is shown nothing has a locked-out colleague and no way to help. Creating an account does not re-issue: `POST /users` already minted one and queued the invitation, and a second token would expire the link already in their inbox. |
| Reset password, in the admin panel | Was offered for annotators and admins only, on the belief that there was no admin-triggered reset for the other roles. `POST /users/{id}/password-reset` takes any account, and while mail is refused it is the only way back in, so it is offered for every role now. |
| Profile rows | Merged. "Location & accent" into the language profile, since where somebody is from is read to interpret their accent; "Recording setup" into account details; and "Consent & privacy" with "Notifications" into one "Privacy & alerts". |
| Notification rows | The old ones read "Review updates: On" and similar, written into the page as strings with nothing behind them. They are sentences now, saying what the bell carries and what the inbox does, per §1 of your 24 Oct reply. |
| A version number | At the foot of each profile page, one per role rather than one for the app: the roles ship on different clocks, and a contributor told their app moved because the admin surface did is reading somebody else's news. |
| `GET /banks` | Nothing changed on our side for the cache. The empty picker is gone either way: an empty list was already being shown as a failure rather than as no banks. |

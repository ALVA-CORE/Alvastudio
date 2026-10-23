# Endpoints we need

Checked against the live OpenAPI document, 22 Oct 2026. Only what is still
open is listed here.

## Open

| # | Ask | Blocks | Priority |
| --- | --- | --- | --- |
| 1 | An audit log, as events | Every History tab across the admin surface | **High** |
| 2 | A way to fix a participant's consent | A session that cannot be saved or repaired | **High** |
| 3 | `POST /auth/password`, change your own | Nobody can change their password | **High** |
| 4 | An admin view of a contributor's identity status | KYC on the admin user panel | Medium |
| 5 | `home_languages` on the profile | One onboarding answer is discarded | Low |
| 6 | `target_participants` on a session, not only its topic | Nothing yet, a question | Low |

Everything on the 20 Oct list was answered in
[`replies/api-status-2026-10-22.md`](replies/api-status-2026-10-22.md) and is
wired. The 22 Oct release is checked against our client in full: nothing we
send was refused by the new validation, and the two defensive changes we made
are listed under "on our side".

---

## 1. An audit log, as events

Four panels on the admin surface have a History tab: a user, a clip, an
annotation and a session. None of them has a source.

**We have to own the first half of this.** Those tabs were filled by
reconstructing a plausible history from the row — "Claimed" placed an hour
after submission, a verdict two hours after that, and on the user panel a
couple of admin actions drawn from a seeded random with dates to match. It
looked like a record and it was invented. That is gone as of today, and the
tabs now show only timestamps you actually measured, with a line saying so.

What is left is thin, because this is everything the API records:

| Panel | Real entries |
| --- | --- |
| Clip | Submitted (`created_at`), decided (`reviewed_at`) |
| Annotation | Claimed, started, submitted, reviewed, from the full document |
| Session | Created |
| User | Joined |

Everything an admin opens a History tab to find is missing: who reassigned
this and when, when it was approved and by whom, when somebody was approved,
deactivated or had their role changed, when a payout went out, when a profile
was edited.

**What would close it:**

```
GET /audit?subject_type=user|recording|annotation|focus_group
          &subject_id=...&limit=&offset=&envelope=true

→ [{ id, at, actor_id, actor_name, action, detail }]
```

One route with a subject filter, rather than four. `action` as an enum we can
switch on, `detail` as a written sentence we can show. The annotation activity
log is already exactly this shape for one subject, so the pattern is yours
already.

Events worth recording, roughly in the order we would miss them: assignment
and reassignment, verdicts, approval and deactivation, role changes, password
resets, payout runs and withdrawals, profile edits, prompt and topic changes.

It is a bigger piece than the other asks, so partial is fine. The first three
would cover most of what an admin opens that tab for.

## 2. A way to fix a participant's consent

You flagged this yourselves: *"there is no route to remove a participant. A
session recorded with someone who said no has to be deleted and recreated
without them."*

It is the one gap in the 22 Oct release with no path out of it. An intern who
hits the consent 409 is holding a take they cannot upload and a session they
cannot repair, and the only honest thing our screen can say is "log it again",
which throws away the recording.

Either of these closes it:

| Route | What it allows |
| --- | --- |
| `PATCH /focus-groups/{id}/participants/{pid}` with `{consent_given, consent_version}` | Recording agreement that was given but not logged, which is the common case |
| `DELETE /focus-groups/{id}/participants/{pid}` | Dropping somebody who genuinely refused, so the rest of the room's session survives |

The first is the one we would use. The second has the obvious hazard that the
audio still contains their voice, so it may be the wrong tool, and we would
take your read on that.

Our intake never creates an unconsented participant, so this should be rare
for sessions started in our app. It is not rare for anything created another
way.

## 3. Changing your own password

There is no route for it. `POST /users/{id}/password-reset` is an admin
issuing a token, and `POST /auth/password-reset/redeem` spends one, so the
only way anybody changes a password is to ask an admin for a link.

That is a support ticket for every forgotten password, and it puts admins
within reach of other people's credentials for no reason.

```
POST /auth/password   { current_password, new_password }
```

Current password checked even though the bearer token already proves who they
are: it is the signed-in tab somebody walked away from that this stops.

We have built the screen on all four profile pages against exactly that shape,
so it works the day it lands. Until then it catches a 404 or 405 and tells
them to ask an admin, which is the truth.

## 4. An admin view of a contributor's identity status

`GET /wallet` is the caller's own, so an admin cannot see whether a
contributor has passed their NIN check, what it is waiting on, or why it
failed. They can see the person's email and when they joined, and nothing
about the one thing that decides whether that person can be paid.

Anything that answers it is fine. The smallest would be `identity_status`,
`identity_failure_reason` and `next_action` on `GET /users/{id}/profiles`,
which an admin already reads for the person in front of them. A whole
`GET /users/{id}/wallet` would also work, though it carries balances an admin
may not need.

The NIN itself should stay where it is. We are asking whether the check
passed, not what the number is.

## 5. `home_languages` on the profile

The contributor onboarding form asks two language questions: what somebody
grew up speaking, and what is spoken at home now. `native_languages` carries
the first. The second has nowhere to go and is dropped at sign-in on another
device.

`ethnicity` and `occupation` were in the same state and are now on `ProfileIn`,
so this is the last one. A `home_languages: string[]` alongside
`native_languages` closes it.

## 6. `target_participants` on a session

`FocusGroupSession.target_participants` is copied from the topic, which is
exactly right for scoring. An admin setting it per topic is now in the prompts
form.

The question: should an intern be able to set it on a single session? A topic
run deliberately as a four-person conversation currently scores as half
attended against a target of eight. Not urgent, and we have not built anything
for it, but it is the one way the attendance axis can read unfairly.

## On our side, not asks

| Item | Our handling |
| --- | --- |
| Upload quota | `GET /recordings/quota` is read before recording, so a refusal never discards a clip somebody has just spoken. 429 is handled with its `Retry-After`. |
| Activity log consent | A switch on the annotator's profile, off by default. Not a prompt in front of the editor: a prompt somebody dismisses to get to work is not consent. |
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
| Invented history | Removed. Four History tabs were reconstructing events with made-up timestamps. They now show only what you measure, with a line saying the list is partial. |
| Seeded fallbacks | Cleared. A dashboard with no response shows zeroes, never a sample: these are figures about one person's own work. The seeded sets are reachable only from demo mode. |
| Remember me | Entirely ours, nothing needed from you. Ticked keeps the token in localStorage, unticked in sessionStorage, so it only decides whether the token outlives the tab. How long the token is valid stays yours. |
| Sign-up drafts | All three sign-up forms keep their answers across a refresh, in localStorage. Password fields are excluded and never written. |
| `RegisterIn.role` | We were downgrading `annotator` to `contributor` before sending, left over from when there was no annotator sign-up. Now sent as-is. |
| iOS Safari mp4/AAC | The type comes from `MediaRecorder.mimeType`, with a matching extension. |

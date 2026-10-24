# Endpoints we need

Checked against the live OpenAPI document, 23 Oct 2026. Only what is still
open is listed here.

## Open

| # | Ask | Blocks | Priority |
| --- | --- | --- | --- |
| 1 | Which emails do you send? | Knowing what we can stop saying on screen | **High** |
| 2 | `GET /banks` fails and nobody can link an account | Payouts, whenever the provider is down | Medium |

All six asks from 22 Oct were answered in
[`replies/api-status-2026-10-23.md`](replies/api-status-2026-10-23.md) and are
wired, the audit log included. Milestone pay is wired too.

---

## 1. Which emails do you send?

We know of two, both from what you have told us rather than from the API:
the reset link on an approved recovery, and a confirmation after a password
change. We send none ourselves.

**A list would settle several screens.** Right now we assume nothing is
emailed, so the app says everything in-app, and if an email already covers it
we are saying it twice. The ones that would change what we build:

| Event | Does an email go out? |
| --- | --- |
| Signing up | |
| An account approved, or declined | |
| A clip approved | |
| A clip rejected or flagged | |
| A milestone reached, ₦5,000 credited | |
| A withdrawal paid, or failed | |
| An account flagged as a duplicate | |
| Identity check passed or failed | |

Two things we would want with it:

- **Who gets them.** A contributor, an intern and an admin have different
  stakes in the same event, and a clip approval is noise to an admin.
- **Whether a notification and an email are the same event.** If both fire,
  somebody reading the app has already seen it, and we would rather not have
  the bell and the inbox disagree about what happened.

Templates are coming to us to style. We will match whatever they say, but we
need to know which events have one.

## 2. `GET /banks` returning 503

The bank picker came back empty during testing and the request had failed.
Our fault for swallowing it, which is fixed — the sheet now says the list
could not be loaded instead of showing an empty picker.

The underlying thing is still worth a word. It is served from the payment
provider on purpose, so the one screen a contributor needs to get paid stops
working whenever the provider does, and there is nothing they can do but come
back later.

Is a short cache on your side possible, so a provider blip does not take the
picker down with it? The list barely changes. We are not asking for a
hardcoded list — your reasoning against one is right, since a code from
anywhere else can be rejected at name enquiry.

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
| Redaction | Wired from two places, as an intern meets the problem in two. The confirm checkbox is ticked by a person, never sent for them: untagged speech is not silenced, and no care at our end changes that. The player sits above it so the tick means something. |
| `consent_blocked` | The workspace shows a banner on open, hides Mark as done, and makes autosave inert. Every write is a 409 while it holds, and an indicator cycling through "saving" and "failed" says nothing the banner has not. |
| A duplicate NIN | The 409 replaces the form rather than flashing a toast. Retyping cannot fix it, so there is nothing to go back to. |
| Toasts | Wrap to two lines now, left aligned and smaller. "This payout account is on hold while we r…" was being cut mid-word. |
| Account recovery | Wired, both ends. `POST /auth/password-reset/request` from the forgot-password page, and an admin queue on the users page for approve and deny. The form says the same thing whatever the email was, because the API does: anything else turns it into a way to find out who has an account here. The forgot-password page was a `TODO` before this. |
| Emails | We send nothing and show nothing about them. The API emails the reset link on approval, and a confirmation on a password change. If a template should say something the app also says, tell us and we will keep the two in step. |
| Milestone pay | The progress bar sits on the contributor's points card: points are not money, and money arrives in ₦5,000 steps. Ledger rows handle a null `recording_id` and `unit_type` — reading `unit_type` blindly threw on the first award. |
| The rate editor | Read-only now, titled "Historic rates", with the milestone terms in the subtitle. A field that changes nothing is worse than no field. |
| Back-pay | In a menu on the payments header rather than a third button beside Run payment. Previews, then credits. |
| Password change | Sends them to sign in on the 200, rather than waiting to be thrown out by a 401 on whatever they tap next. |
| History tabs | All four read `GET /audit` now. The derived builders are deleted. |
| Invented history | Removed. Four History tabs were reconstructing events with made-up timestamps. They now show only what you measure, with a line saying the list is partial. |
| Seeded fallbacks | Cleared. A dashboard with no response shows zeroes, never a sample: these are figures about one person's own work. The seeded sets are reachable only from demo mode. |
| Remember me | Entirely ours, nothing needed from you. Ticked keeps the token in localStorage, unticked in sessionStorage, so it only decides whether the token outlives the tab. How long the token is valid stays yours. |
| Sign-up drafts | All three sign-up forms keep their answers across a refresh, in localStorage. Password fields are excluded and never written. |
| `RegisterIn.role` | We were downgrading `annotator` to `contributor` before sending, left over from when there was no annotator sign-up. Now sent as-is. |
| iOS Safari mp4/AAC | The type comes from `MediaRecorder.mimeType`, with a matching extension. |

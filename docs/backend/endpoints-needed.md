# Endpoints we need

Checked against the live OpenAPI document, 20 Oct 2026. Everything asked for
before this date was answered in
[`replies/api-status-2026-10-17.md`](replies/api-status-2026-10-17.md), and is
deployed and wired. Only what is still open is listed here.

## Open

| # | Ask | Blocks | Priority |
| --- | --- | --- | --- |
| 1 | Annotator sign-up and approval, 3 questions | Annotators applying for accounts | **High** |
| 2 | Scoring definitions, not endpoints | The quality radar and one figure | Medium |
| 3 | Speaker demographics as a joint, not two marginals | 2 charts, still seeded | Low |
| 4 | `under_18` on `AgeBracket`, a question | Nothing, but the enum allows what we refuse | Low |
| 5 | Error messages that name Bachs | Contributors reading "Bachs not found" | Medium |
| 6 | A state on the session itself | One admin column, derived today | Low |

Three asks came off this list on 20 Oct without anything being built at your
end: `daily_activity` on `/dashboard/intern`, `tag_breakdown` on
`/dashboard/annotator`, and the intern's `*_in_window` totals were all already
deployed. We had them down as missing. Apologies for the noise.

---

## 1. Annotator sign-up and approval

Annotators now apply for their own accounts rather than being created by an
admin, the same way interns do. The page is built at `/annotator/signup` and
posts `role: "annotator"` to `POST /auth/register`, which the `UserRole` enum
accepts. Three things we had to assume:

**1. Does registering as `annotator` leave the account unapproved?** We show
the new annotator "an admin needs to approve it" and send them back to sign-in
rather than into a queue. If `intern_approved` only defaults false for interns,
an annotator is live the moment they register and that message is a lie.

**2. Is `POST /users/{id}/approve-intern` the right call for an annotator?**
It is the only approval route, so the admin Approve button uses it for both.
A name that says `intern` doing double duty is workable but easy to get wrong
later; `approve-user`, or an `approved` flag beside `intern_approved`, would
say what it does.

**3. Do annotator routes 403 until approved?** Intern routes do. If annotator
routes do not, an unapproved annotator can claim and submit work, which is the
thing approval exists to prevent.

| What we send | Where |
| --- | --- |
| `{full_name, email, phone, password, role: "annotator"}` | `POST /auth/register` |
| `{language_varieties, sessions_covered}` | `PUT /onboarding/annotator-profile` |

The second is the claim an admin is approving: which varieties they say they
can tag, and which sessions they can cover. It is written straight after
registration and is non-fatal if it fails, so a dropped request costs the
clearance rather than the account.

## 2. Scoring definitions

Agreed in principle on 17 Oct and sequenced for a later round, so this is a
placeholder rather than a new ask. Two figures draw a dash or a sample until it
lands.

| Figure | Where | Definition we agreed |
| --- | --- | --- |
| Median review time | Contributor quality bar | Median of `reviewed_at - created_at` across that contributor's decided clips. Median, not mean, because one clip left over a weekend drags a mean badly. Shows a dash today. |
| Quality radar | Intern dashboard | 5 axes, each 0-100: consent completeness, demographic completeness, audio pass rate, participants per session against target, clip approval rate. Seeded today. |

Acceptance rate is off the list: `status_breakdown` already carries it, and the
contributor quality bar computes it live.

**The window is yours to pick.** You asked that a 90-day window either reuse the
365-day one every dashboard already shares, or carry its window in the field
name so nobody compares the two by accident. Either works for us, we will label
whatever the field says. The floor of 10 decided clips is settled.

## 3. Speaker demographics as a joint

Two charts draw hours or speakers by age bracket, split by gender:

| Chart | Reads |
| --- | --- |
| Intern dashboard, demographic reach | `demographics` on `/dashboard/intern` |
| Annotator dashboard, demographic reach | `speaker_demographics` on `/dashboard/annotator` |

Both fields give `by_gender` and `by_age_bracket` as separate marginals, which
cannot be crossed, so both charts are seeded. This is the same shape as
`by_type_status` on the corpus summary: the joint rather than the two edges.
Speaker counts would do, we do not need hours, and we know a focus group's
hours cannot be split by speaker.

## 4. `under_18` on `AgeBracket`

We do not approve anyone under 18. Sign-up gates on it with an attestation
checkbox, the form's bracket list starts at 18-24, and we never send
`under_18`.

The enum still accepts it, so a record can carry a value our product says
cannot exist. **Could it be rejected for contributors at the API?** Until then
we surface it as "Under 18" rather than folding it into 18-24, which is what we
were doing and which hid exactly the case worth seeing.

`65_plus` we do fold, into our "55+" bucket. That one is a display choice and
is correct, since 55+ includes 65+.

## 5. Error messages that name Bachs

A failed NIN submission came back **"Bachs not found"**, which went straight to
a contributor. FastAPI's `detail` is what we show — most of yours are written
for the reader and are better than anything we would invent, so we pass them
through rather than translating them.

A few are not. Anything naming the payment vendor asks a contributor to care
about a company they have never heard of, and gives them nothing to do.

We now replace those at our boundary, but we are pattern-matching on your
wording, which will drift. **Could messages that reach a 4xx body be written
for the person reading them**, with the vendor name kept to logs? We are happy
to show whatever you send.

## 6. A state on the session itself

`GET /focus-groups` has no session state, so the admin column takes the
commonest `state` among the participants. It is right in practice and wrong in
principle: a derivation presented as a fact. A `state` on the session, or
confirmation that the derivation is the intended rule, closes it.

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
| Remember me | Entirely ours, nothing needed from you. Ticked keeps the token in localStorage, unticked in sessionStorage, so it only decides whether the token outlives the tab. How long the token is valid stays yours. |
| Sign-up drafts | All three sign-up forms keep their answers across a refresh, in localStorage. Password fields are excluded and never written. |
| `RegisterIn.role` | We were downgrading `annotator` to `contributor` before sending, left over from when there was no annotator sign-up. Now sent as-is. |
| iOS Safari mp4/AAC | The type comes from `MediaRecorder.mimeType`, with a matching extension. |

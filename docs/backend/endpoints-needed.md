# Endpoints we need

Checked against the live OpenAPI document, 20 Oct 2026. Everything asked for
before this date was answered in
[`replies/api-status-2026-10-17.md`](replies/api-status-2026-10-17.md), and is
deployed and wired. Only what is still open is listed here.

## Open

| # | Ask | Blocks | Priority |
| --- | --- | --- | --- |
| 1 | Scoring definitions, not endpoints | The quality radar and one figure | Medium |
| 2 | Speaker demographics as a joint, not two marginals | 2 charts, still seeded | Low |
| 3 | A state on the session itself | One admin column, derived today | Low |

Three asks came off this list on 20 Oct without anything being built at your
end: `daily_activity` on `/dashboard/intern`, `tag_breakdown` on
`/dashboard/annotator`, and the intern's `*_in_window` totals were all already
deployed. We had them down as missing. Apologies for the noise.

---

## 1. Scoring definitions

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

## 2. Speaker demographics as a joint

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

## 3. A state on the session itself

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
| `/prompts/next` | Unused. A prompt is not used up by being read, so we page the whole active bank locally. |
| `device_mic` on an upload | Now sent. We read the label off the live audio track, so it is the mic that clip was recorded on rather than the one typed into a profile. Blank where a browser withholds the label, and then omitted rather than guessed. |
| `GET /wallet/payout-destination` | We were reading it as a single object with an `account_number`. It is a list, and carries `account_last4`, so the wallet shows a masked number and picks the first `is_usable` destination. |
| `english_fluency` | Now sent and read back. It had nowhere to go when the onboarding form was built. |
| iOS Safari mp4/AAC | The type comes from `MediaRecorder.mimeType`, with a matching extension. |

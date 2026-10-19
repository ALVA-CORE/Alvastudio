# Endpoints we need

Checked against the live OpenAPI document, 19 Oct 2026. Everything asked for
before this date was answered in
[`replies/api-status-2026-10-17.md`](replies/api-status-2026-10-17.md), and is
deployed and wired. Only what is still open is listed here.

## Open

| # | Ask | Blocks | Priority |
| --- | --- | --- | --- |
| 1 | A time series on `/dashboard/intern` | 2 intern charts, still seeded | Medium |
| 2 | Scoring definitions, not endpoints | The quality radar and one figure | Medium |
| 3 | A tag and speaker breakdown per annotator | 2 annotator charts, still seeded | Low |
| 4 | Age by gender, in the intern's own figures | 1 intern chart, still seeded | Low |
| 5 | A state on the session itself | One admin column, derived today | Low |

---

## 1. A time series on `/dashboard/intern`

`/dashboard/contributor` has `daily_activity`, and both contributor charts now
read from it. `/dashboard/intern` returns three totals and a demographic
breakdown with no time axis, so "Sessions this week" and the capture trend are
the last two seeded charts in the app.

```
daily_activity: [{date, count}]   // sessions run, same 365-day window
```

Clips reviewed over the same window would fill the second chart properly. We
can draw both off one series if that is easier, but a sessions count and a
review count are different measurements and we would rather not label one as
the other.

## 2. Scoring definitions

Agreed in principle on 17 Oct and sequenced for a later round, so this is a
placeholder rather than a new ask. Three figures draw a dash until it lands.

| Figure | Where | Definition we agreed |
| --- | --- | --- |
| Median review time | Contributor quality bar | Median of `reviewed_at - created_at` across that contributor's decided clips. Median, not mean, because one clip left over a weekend drags a mean badly. Shows a dash today. |
| Quality radar | Intern dashboard | 5 axes, each 0-100: consent completeness, demographic completeness, audio pass rate, participants per session against target, clip approval rate. Seeded today. |

Acceptance rate is off the list: `status_breakdown` already carries it, and the
contributor quality bar computes it live.

**The window is yours to pick.** You asked that a 90-day window either reuse the
365-day one every dashboard already shares, or carry its window in the field
name so nobody compares the two by accident. Either works for us — we will
label whatever the field says. The floor of 10 decided clips is settled.

## 3. A tag and speaker breakdown per annotator

`/dashboard/annotator` gives totals, a status breakdown and `daily_activity`,
all of which are live. Two charts on that screen need a shape it does not have:

| Chart | Needs |
| --- | --- |
| Tag mix | `by_tag: [{kind, value, count}]` across that annotator's annotations |
| Demographic reach | Speakers they have annotated, by age bracket and gender |

`tags_applied` is already a total on that endpoint, so the first is the same
figure split by kind. Neither is urgent.

## 4. Age by gender, in the intern's own figures

The intern's demographic chart is hours by age bracket, split by gender.
`/dashboard/intern` has `by_age_bracket` and `by_gender` as separate marginals,
which cannot be crossed, so the chart is seeded.

This is the same shape as `by_type_status` on the corpus summary: the joint
rather than the two edges. Speaker counts would do; we do not need hours here,
and we know focus-group hours cannot be split by speaker.

## 5. A state on the session itself

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
| iOS Safari mp4/AAC | The type comes from `MediaRecorder.mimeType`, with a matching extension. |

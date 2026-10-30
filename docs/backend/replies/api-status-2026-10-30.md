# Frontend handoff — the cost of upholding, before the decision

Received 30 Oct 2026. Wired the same day.

## What we did with it

Earlier handoffs' notes are in [`our-handling.md`](../our-handling.md).
Asks are in [`endpoints-needed.md`](../endpoints-needed.md), never here.

| Item | Our handling |
| --- | --- |
| `GET /payouts/duplicate-flags/{id}` | Read when the uphold confirm opens, not with the list, because the figures are what the uphold would do at that moment. Not read at all for a dismissal: dismissing destroys nothing, so there is nothing to price. |
| `if_upheld.accounts` | Each account is named with its own `unpaid_kobo` beside it. An admin closing two people's accounts should see which of them is losing what, not one total. |
| The two totals | Kept apart, as you kept them. `voided_amount_kobo` is money the uphold destroys; `in_flight_kobo` is money it cannot reach. Adding them would overstate the decision and understate what is already lost. The sentence reads: "Closes 2 accounts and voids ₦41,200. ₦8,000 more is already on its way and cannot be called back." |
| A preview that fails to load | The worded warning stays as the fallback and the button still works. A confirm that will not open because a figure could not be fetched is worse than one without the figure. |
| `in_flight_kobo` on the resolve | The receipt toast now names the amount rather than a count of entries, matching the preview. |

## Our ask about field names was wrong, and we withdraw it

You are right. Those four names are not in your handoff, and they are not in
our condensed copy either, because **we invented them**. Writing the
`ApiPaymentTerms` type from your sentence —

> Rates, minimum, pay day, next pay day and cutoff, the daily limits, the
> narration cap, and the long-pause length

— we guessed at field names, then later checked our own guesses against the
spec, found they did not match, and reported that as your bug. That was our
error from start to finish. `max_recording_seconds` is real but belongs to
the quota's `narration` object, which we also conflated.

The back-pay half was fair: "Each row:" does read as though `contributors`
is the list. We wired it that way first and `.length` on a number is
`undefined`, so it rendered as nothing rather than failing. Thank you for
confirming the shape.

The spec checker you are adding is welcome, but it would not have caught
this one — nothing was wrong in your text. **The fix is on our side**: we
write types from `/openapi.json`, and where a handoff describes a field in
words we look the name up rather than guess it.

## ElevenLabs

An `ELEVENLABS_API_KEY` was added to the frontend `.env`, and nothing in
`/openapi.json` changed for it. Three questions and one warning, all in
[`endpoints-needed.md`](../endpoints-needed.md) — asks live there, not in
these replies.

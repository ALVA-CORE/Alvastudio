# What we need from the backend

Checked against the live OpenAPI document, 30 Oct 2026.

Only open asks live here. Notes on how we handle each handoff are in the
reply docs under [`replies/`](replies/), beside the handoff they answer.

## Open

**Nothing.**

Both asks of 29 Oct are closed by
[`replies/api-status-2026-10-30.md`](replies/api-status-2026-10-30.md):

1. **The uphold preview is wired.** `GET /payouts/duplicate-flags/{id}`
   carries `if_upheld`, and the confirm dialog now reads the real figure
   before the decision instead of reporting it afterwards.
2. **The field-name ask was our mistake.** Withdrawn — see below.

---

## Withdrawn: "four field names do not match the API"

We filed this on 29 Oct. It was wrong, and the way it was wrong is worth
keeping on the record.

**Their handoff never contained those names.** It described
`GET /payments/terms` in prose:

> Rates, minimum, pay day, next pay day and cutoff, the daily limits, the
> narration cap, and the long-pause length.

No field names at all. `daily_sentence_limit`, `daily_narration_seconds`
and `next_cutoff` were **invented on our side**, writing the TypeScript type
from that sentence. We then checked our own invention against the spec,
found it did not match, and reported it as their documentation bug.
`max_recording_seconds` is real but belongs to the quota's `narration`
object, not to the terms — also our conflation.

**One half of the ask was fair.** `BackPayOut` genuinely is ambiguous in
prose: "Each row:" reads as though `contributors` is the list, when it is a
count and the rows are in `awards`. We wired it the wrong way first, and
`.length` on a number is `undefined`, which renders as nothing rather than
as an error. They have confirmed the shape and are adding a spec checker to
their handoff process.

**What we change here.** Types are written from `/openapi.json`, not from
prose. Where a handoff describes a field in words, we look the name up
before typing it. Prose is a summary; the spec is the contract.

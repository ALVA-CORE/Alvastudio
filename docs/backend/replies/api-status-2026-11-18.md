# Frontend handoff: 18 Nov, asks #20, #21 and #22

Received 18 Nov 2026; wired 18 Nov. `total_seconds` is new and not in the
`openapi` artifact we hold (origin/main `9d64df3`), so it is typed from the
handoff.

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| # | Our handling |
| --- | --- |
| 20 Pool length | The Narrations tab asks `GET /annotations/narrations/queue?envelope=true&limit=1`. "Minutes pending" is `total_seconds / 60` and "Avg narration" is `total_seconds / total`, or "—" when `total` is 0. It no longer adds up the first 200 rows. |
| 21 ₦75 | Nothing to change; see [`api-status-2026-11-17.md`](api-status-2026-11-17.md). |
| 22 Email on link | After a link, the wallet's toast reads "Bank account linked. We've emailed you to confirm this change." The History tab already shows the API's own sentence for each event, and the user's email list falls back to the kind's name, "payout account changed". |

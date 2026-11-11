# Frontend handoff: 10 Nov (2)

Received 10 Nov 2026. Wired the same day, before the deploy. It ships with
the third 10 Nov handoff ([`api-status-2026-11-10c.md`](api-status-2026-11-10c.md)).

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| Item | Our handling |
| --- | --- |
| A Interns' graphs | Not built: each intern's Activity tab in the account panel already shows it. You withdrew the route before it shipped. |
| B 7pm deal | The refetch after each verdict is gone. "Review next" (`assign-next`) shows only when the desk is empty and the bank isn't. The bank count reads "N clips waiting · dealt at 7pm". The empty desk says "New clips are dealt at 7pm." The desk is read in pages of 200 (`envelope=true`) until `total`, since a 7pm deal can put more than one page on a desk. |
| C One reader | No change needed. The studio already drops the take on a 409 and moves on. The Prompts page already shows "Recorded" and "Active, never recorded" from `bank_total` and `recorded_total`. |

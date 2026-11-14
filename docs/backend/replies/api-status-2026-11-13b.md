# Frontend handoff: 13 Nov (2), pay one contributor

Received 13 Nov 2026; wired 14 Nov. No new route: `user_id` and
`off_schedule` on `POST /payouts/runs`, already checked against origin/main
`aa0d182`.

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| Item | Our handling |
| --- | --- |
| Pay per row | Each row of the Run payment dialog has a Pay button. It asks first, in your wording, and sends `user_id` and `off_schedule: true`. Only that row spins; the other rows and Send wait. Send still sends neither field. |
| The result | Read from `items[0]` with your sentences. When the bank payout needs a retry, or the transfer is unknown, the run's panel opens on that leg, where Retry or Reconcile is. |
| Reconcile | New on the run panel, for a leg whose `status` is `unknown`: `POST .../items/{id}/reconcile`. |
| Errors | 404: "That contributor no longer exists.", then reload. 409: `detail` as it is. |

## Removed

The dialog's "N below the minimum, carried to the next run" line. The preview
lists only people who can be paid in full, so it could never show.

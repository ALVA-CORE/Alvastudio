# Frontend handoff: 14 Nov, set the minimum for one pay run

Received and wired 14 Nov 2026. Checked against the `openapi` artifact from
CI run 43649563138 (origin/main `a7bc527`).

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| Item | Our handling |
| --- | --- |
| Minimum field | "Minimum payout" in the Run payment dialog, blank by default: its label sits in the field and lifts as you type, a ₦ prefix appears, and the usual minimum (from `GET /payments/terms`) is named under it. A valid value goes to `GET /payouts/preview?minimum_amount=` 400 ms after typing stops, and to `POST /payouts/runs` as `minimum_amount` for Send and for each row's Pay. An invalid one is never sent and says why. Closing the dialog drops it. |
| Bank fees | The dialog leads with the total (`total_amount`), the number of contributors above it and "+ ₦Y in bank fees, paid by Alva" (`total_bank_fee_cover`) under it. Under ₦1,000 the fee is shown in amber. A row's Pay confirm now quotes `bank_fee_cover` instead of "about ₦100". |
| Below the usual minimum | The dialog says "Below the usual ₦5,000 minimum, for this run only." while a lower one is set. |
| `notes` | On each run in the list (cut short) and in full on the run's panel. |
| 409, nobody to pay | Shown as it is. |

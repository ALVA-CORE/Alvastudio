# Frontend handoff: 13 Nov, identity on file, and a run pays the bank

Received 13 Nov 2026. Wired the same day. Checked against the OpenAPI
document exported from origin/main `aa0d182`, since the live API no longer
serves `/openapi.json`.

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| # | Our handling |
| --- | --- |
| 1 Bank payout per leg | A run in the Payment runs tab opens a panel listing every leg: the contributor, the amount, the fee once Bachs says it, bank attempts past the first, when it arrived, and two pills (our transfer, then the bank payout). `bank_failure_reason` (or `failure_reason`) and `bank_reference` show on the leg, for the operator. Each run row now reads "N/M at the bank", so a completed run no longer reads as everyone paid at their bank, and it carries an "N to retry" pill when any leg can be retried. |
| 2 Retry | On legs where `status` is `transferred` and `bank_status` is `failed`, `unknown` or null: "Retry", or "Send to bank" when none was asked for. The answer replaces the leg in place. A 409 is shown as it is. |
| 3 Link bank | Once identity is on file and `next_action` is `add_payout_destination`, the wallet is blurred behind "Add your bank account", with "In your own name. We can't pay you until it's linked." and one button, Link bank. A document that answers `passed` opens the bank form straight after the API's sentence. The form says "It must be in your own name." before anything is typed. A withdrawal's new 409 is shown as it is. `submitted` is still shown as a wait. |
| 4 Withdrawal bank step | The withdrawal toast reads from the leg's `bank_status`: "On its way to your bank.", "Paid to your bank.", or "We are sorting out a delay. Your money is safe." for `failed` and `unknown`. The "Paid out" card already says "sent". |
| 5 Pay one person | Not built: optional, and the weekly run doesn't need it. |

Copy that was no longer true went with it: "A person reads this" on the identity document step, and "Submit for review" (now "Submit").

## Found while wiring

| Where | What |
| --- | --- |
| `EarningDetailPanel` | A "Queue for payment / Mark as paid" button and its confirm, behind a handler the page always passed as `undefined`. Removed. |
| `POST /wallet/identity/documents` description | Still says the document goes "for Bachs review", while the route answers `passed` at once. |
| Not in the handoff | `RecordingOut.earlier_takes`, `RecordingSummary.awaiting_by_reviewer` and `DeskCount` are new in the contract. Nothing here uses them yet. |

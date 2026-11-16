# Frontend handoff: 15 Nov (b), asks #15 to #18

Received 15 Nov 2026; wired 16 Nov. Checked against the `openapi` artifact
exported by CI for origin/main `f0155ce`.

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| # | Our handling |
| --- | --- |
| 15 Email interns and annotators | The composer's To row offers four groups, each with its count: Everyone (contributors, interns and annotators), Contributors (still the default), Interns and Annotators. Interns and annotators are counted approved only, as the API counts them. The people search now lists active interns and annotators beside contributors, waiting ones included. People picked by name, and states, always go as `selected_people`, whatever the mix; we no longer send `selected_contributors`. A state is still worked out here and reaches contributors only. 422 and 409 are shown as they are. |
| 16 Delete ticked rows | Prompts, Stimuli and Focus group topics: any ticked row, active or retired, can be deleted. Delete previews with `{"ids": [...]}`, the confirm says the split ("12 deleted, 8 retired because they were used", plus "already retired" and "already gone" when there are any), and Delete there applies with `apply=true&expected=<matched>`. A 409 is shown as it is and previewed again. Retire on one item, in its panel, is unchanged. |
| 17 Payment reached the bank | The wallet's History sheet lists payments (`GET /wallet/payments`, the newest 50) above the earnings: `message` as it is, the amount, and when it left Alva (or when it started, while that is confirmed). The "Paid out" card's line is `latest_payment.message` once there is one, in place of "Everything sent to your bank". |
| 18 Hosted onboarding | `await_activation`, `contact_support` and any value we don't know: `next_action_detail` under the wallet, no button, and Withdraw is off with the same sentence as its hint. `complete_onboarding` keeps Finish and now shows its sentence too. The admin profile names the two new values and lists `requirements_due` when it has any. `POST /payouts/capability-refresh` has no button here. |

## Found while wiring

| Where | What |
| --- | --- |
| `WithdrawalItemOut` | Has no `message`, so the withdrawal toast keeps its own copy of the 13 Nov wording. |
| `AlvaDataTable` | `selection.canSelect` had one caller, the Prompts page's "active rows only". Removed with it. |

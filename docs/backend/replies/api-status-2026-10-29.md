# Frontend handoff — the new pay terms, and two readers per prompt

Received 29 Oct 2026. Wired the same day.

## What we did with it

| Item | Our handling |
| --- | --- |
| `GET /payments/terms` | Read once per session and shared, rather than typed into components. Every number in it has already changed once, and a rate hardcoded in a component is a sentence that stays true on screen after it stops being true in the ledger. |
| The 2-minute narration cap | **The recorder stops itself.** A take over the cap is refused rather than truncated, so enforcing this is the difference between losing a take somebody has already spoken and not. It stops at `min(max_recording_seconds, remaining_seconds)`, polled rather than timed, because a take can be paused and a timer armed at the start would fire while paused. |
| Two allowances | Each task's limit closes on its own, so the studio reads whichever one the current mode is counted in. One shared `remaining` would have shut the studio because somebody had used their sentences while a quarter of an hour of narration sat open. |
| `weekly_*` | Not read anywhere. They are always null now and nothing was left pointing at them. |
| The pay-day gate | The withdraw button is disabled off-Sunday and under the minimum, with the reason in its hint. Your `409`s are still the boundary; a refusal just arrives *after* a tap on a button that looked ready. |
| `pay` replacing `milestone` | The dashboard gauge runs from `unpaid_kobo` to `payout_minimum_kobo`. The question changed, not just the field: a milestone reset every 500 clips, a balance carries over until it is paid, so the bar stays full once cleared. |
| `kind: "top_up"` | Labelled "Back-pay at the new rates" in the ledger. Like a milestone it has no `recording_id` or `unit_type`, which is what used to throw. |
| `unmeasured_narrations` | Its own line in the back-pay dialog. An admin signing off a credit should see how much is priced on recorded length rather than speaking time. |
| Prompt assignment | Nothing to change: the studio pages `GET /prompts`, which answers a contributor with their held prompts. The `409` for a prompt with two readers drops the take and moves on. We deliberately do not show `reserved_until` or the reader count — it would turn a quiet mechanism into a deadline. |
| `POST /payouts/duplicate-flags/{id}/resolve` | **Now has a screen**: Admin → Users → Duplicates. Dismiss is offered first and is the safe direction; upholding is red, requires a written reason, and spells out all three consequences before the button. See the open ask — we want the figures *before* rather than after. |
| `POST /payouts/ledger/{id}/void` | An action per entry in the earning panel's Earnings tab, offered only on `pending`. Paid and in-flight money has left, and voiding it would make the ledger disagree with the bank. The reason is required: the question asked later is never "how much" but "why". |
| `GET /payments/earnings/{contributor_id}` | Wired, and it is what makes a void possible: the payments table is aggregated per contributor and a void needs one entry's id. |
| `GET/PUT /onboarding/intern-profile` | **Was never called.** The intern sign-up asked for a primary state, a coverage area and an alert preference, and all three stopped at `localStorage` — they lived in one browser and showed as "Not set" to the person who typed them. Saved at sign-up now and read on the profile page. |
| `POST /wallet/sync` | Still not called, from anywhere. Confirming again because your identity-recheck list depends on it: the gap you flagged is empty for us. |

---

(Backend's handoff follows unchanged.)

"How you get paid on Alva Studio" (Lolu, 27 Oct) is now how the API pays. It
replaces milestone pay (₦5,000 per 500 clips), the 1,000-clip weekly limit, the
24-hour hold, the ₦1,000 minimum and any-day withdrawals. New screens can read
the numbers from `GET /payments/terms` instead of hard-coding them.

Rates: Prompt Reader ₦10 per approved sentence; Stimuli Narration ₦5,000 per 60
approved minutes of speaking time, accrued per second. Only approvals earn.
Each approval adds an earning with `kind: "recording"`; the ledger's `kind`
gains `recording` and `top_up`, and `clip`/`milestone` stay as history.

Speaking time trims leading and trailing silence and any pause over 1 second.
Every recording carries `speech_seconds`, null for pre-29 Oct recordings that
have not been measured.

Daily limits: 200 sentences and 15 minutes of narration, each closing on its
own until 00:00 WAT, no weekly limit. A narration take is capped at 2 minutes
of recorded length and a longer one is refused with `422`, not truncated.
`GET /recordings/quota` gains `prompt_read` and `narration` objects; cap each
take at `min(max_recording_seconds, remaining_seconds)`. The old flat fields
describe Prompt Reader and the `weekly_*` fields are always null.

Payments happen on Sundays (WAT) for work approved before that Sunday's 00:00.
The minimum payout is ₦5,000 and a smaller balance carries over.
`POST /payouts/runs` and `POST /wallet/withdrawals` answer `409` on any other
day. `payable` is in the coming Sunday's run; `held` now means "approved after
the cutoff" and the 24-hour hold is gone.

`GET /dashboard/contributor` gains a `pay` block in integer kobo
(`unpaid_kobo`, `payout_minimum_kobo`, `next_run_kobo`, `to_minimum_kobo`,
`next_pay_day` and the rates). `milestone` is always null and deprecated.
Points follow the money: a point per naira of approved work, less voids.
Interns viewing someone's dashboard get `pay: null`.

New and changed routes: `GET /payments/terms` (any signed-in user),
`POST /payments/back-pay` (admin, preview by default, `?apply=true` to
credit), `POST /payments/milestones/sync` as a deprecated alias returning the
back-pay shape, and `GET /payments/earnings/summary` rows gaining
`approved_sentences` and `approved_narration_seconds`.

Upholding a duplicate flag closes every account the flag names, blocks its
wallet and voids every unsent earning. The resolve answer adds
`closed_user_ids`, `voided_amount_kobo` and `in_flight_entries`, all null in
the flag list.

Each prompt now has two places. `GET /prompts/assigned` returns the prompts
handed to a contributor, topping up to 20 and never more than they can still
read today, each held for 24 hours via `reserved_until`. `GET /prompts` called
by a contributor returns those same held prompts. A prompt whose two places
are taken answers `409`. A rejected reading frees its place. Narration stimuli
are not capped.

Intern scoping is unchanged since 28 Oct. If a screen still shows another
intern's work, it isn't coming from these routes — tell us which screen.

# Frontend handoff — the new pay terms, and two readers per prompt

Received 29 Oct 2026. Wired the same day; what we did with each part is in
[`endpoints-needed.md`](../endpoints-needed.md) under "On our side". One gap
is listed as an open ask: resolving a duplicate flag has no screen.

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

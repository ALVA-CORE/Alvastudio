# Frontend handoff: 17 Nov, narration is ₦75 a minute (ask #21)

Received 17 Nov 2026; wired 18 Nov. No shape changed: the fields were checked
against the `openapi` artifact for origin/main `9d64df3`, the one used for
[`api-status-2026-11-16.md`](api-status-2026-11-16.md).

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| # | Our handling |
| --- | --- |
| ₦75 a minute | Nothing to change. The Studio's Stimuli mode and the dashboard's Next payout slide already read `narration_rate_per_minute_kobo`, and the slide reads `earlier_narration_rate_per_hour_kobo` and `narration_rate_changed_at`. No screen has ₦50 typed in. The test data now uses ₦75. |
| Top-ups | Nothing new to render. A `top_up` earning already shows in the wallet as a bonus, "Back-pay at the new rates", or the earning's `notes` when it has some. |

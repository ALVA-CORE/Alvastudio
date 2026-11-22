# What we need from the backend

Checked against the OpenAPI document exported from backend origin/main
`dbc50cb`, 10 Nov 2026. The live API no longer serves `/openapi.json`.

**Every ask and every open question lives here, and nowhere else.**

- [`replies/`](replies/) — each handoff as sent, with what we did with it.
- [`our-handling.md`](our-handling.md) — decisions we made against what the
  API already does. Not asks.

If a reply or a handling note raises a question, it belongs in this file and
the other document points here.

## Open

| # | Where | What we need | Why |
|---|---|---|---|
| 26 | `POST /reviews` with `flag` | Accept the four rubric questions left out when `flag` is set. A reviewer flags junk the moment they hear it, often before answering anything, and an answer they didn't give would be made up. Today a flag with any question left out is a 422. The review page already leaves out the ones not answered. | Interns flag a clip as soon as it's clearly junk: silence, gibberish, the wrong thing read. Making them answer four quality questions about it first is busywork, and filling in "No" for them records answers nobody gave. |
| 27 | `GET /recordings`, `GET /recordings/summary`, `GET /dashboard/admin` | **A way to list junk-flagged clips:** `GET /recordings?flagged=true` for clips with a standing junk flag, and `flag` (or `flagged: true`) on list rows too, not only on `GET /recordings/{id}`. **A junk count beside the statuses:** `junk_flagged` in `RecordingSummary.by_status`'s neighbours and in the admin dashboard's `recording_status`, so charts can split junk from quality rejections. | Admins have nowhere to review flags. A flagged clip becomes "Rejected" and mixes into every rejection. A flag made after approval has no rejection reason on the list, so the Reviews table can't even mark it, and "Clear flag" can only be found by opening clips one at a time. The admin dashboard's charts count junk as quality rejections; only the Reviews page can split them, from `rejection_reasons`. |
| 28 | `GET /dashboard/annotator`, `GET /dashboard/intern` | Last window's figures, so the cards can show a trend: the annotator's clips, hours, tags and sessions for the window before; and for the intern, 730 days of `daily_activity` (or last year's totals). | The annotator's cards show no trend at all: the endpoint sends totals only. The intern's cards now compare 7, 30 and 90 days against the window before, from `daily_activity`, but 365 days of it can't hold the year before, so 12 months shows a dash. |

Numbers are kept when an ask closes, so code comments that cite one stay
true. Closed on 3 Nov: #1 hours by language, #2 "how did you hear about us",
#3 bulk profiles (see [`replies/api-status-2026-11-03.md`](replies/api-status-2026-11-03.md)).
Closed on 5 Nov: #4 `/stimuli` totals, #5 readable `Retry-After`, #6 Markdown
bodies, #7 hero images (see [`replies/api-status-2026-11-05.md`](replies/api-status-2026-11-05.md)).
Closed on 6 Nov: #8 search, #9 dark-mode emails (see
[`replies/api-status-2026-11-06.md`](replies/api-status-2026-11-06.md)). #9 still
needs checking in real mail apps; that is ours to do, and the reply says how.
Closed on 10 Nov: #10 the email button in Gmail's dark mode, #11 paging the
annotations and focus-group lists, #12 clips dealt to an intern (see
[`replies/api-status-2026-11-10.md`](replies/api-status-2026-11-10.md)).
Closed again on 10 Nov, in the third handoff: #10 the button's label, #13
streaming audio, #14 measured lengths on rows (see
[`replies/api-status-2026-11-10c.md`](replies/api-status-2026-11-10c.md)). #10
still needs checking in Gmail on iPhone and Android; that is ours to do.
Closed on 15 Nov: #15 emailing interns and annotators, #16 deleting chosen
prompts, stimuli and topics, #17 whether a weekly-run payment reached the bank,
#18 Bachs's hosted onboarding (see
[`replies/api-status-2026-11-15b.md`](replies/api-status-2026-11-15b.md)).
Closed on 16 Nov: #19 push notifications (see
[`replies/api-status-2026-11-16b.md`](replies/api-status-2026-11-16b.md)).
Closed on 17 Nov: #21 narration at ₦75 a minute (see
[`replies/api-status-2026-11-17.md`](replies/api-status-2026-11-17.md)).
Closed on 18 Nov: #20 the narration pool's total length, #22 an email when a
payout account is linked (see
[`replies/api-status-2026-11-18.md`](replies/api-status-2026-11-18.md)).
Closed on 21 Nov: #23 deleting an account, #24 the email block list (see
[`replies/api-status-2026-11-21.md`](replies/api-status-2026-11-21.md)), and #25
flagging recordings, built as junk flags and reports instead (see
[`replies/api-status-2026-11-21b.md`](replies/api-status-2026-11-21b.md)).

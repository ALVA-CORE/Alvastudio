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
| 29 | `NonSpeechEventType` and segments | **More inline markers.** The lead's list for annotators, typed in brackets between words. The API takes 7 of them today: breath, laugh, cough, throat-clear, lip-smack, noise (`background_noise`), music. Please add the rest as `NonSpeechEventType` values (the marker, with `_` for `-`). Speaker sounds: `kiss_teeth`, `hiss`, `sigh`, `tsk`, `sniff`, `yawn`, `swallow`, `gasp`, `groan`, `chuckle`, `whistle`, `hum`, `cry`. Silence: `pause_short`, `pause_med`, `pause_long`. Environment: `bg_speech`, `phone`, `generator`, `traffic`, `clap`, `door`, `horn`, `rain`, `wind`, `child`, `tv`. Recording faults: `clip`, `plosive`, `mic_bump`, `dropout`, `bleed`, `chair_creak`. **Manner markers** cover a stretch of speech, not a point: `whisper`, `shout`, `laughing`, `sung`, `imitating`. They need a range, like `language_spans`: `manner_spans` on a segment, with `start_token`, `end_token` and `manner`. | Annotators can tag laughter and the like between words now, but only 7 of the 45 markers the lead wants can be saved. The rest stay as plain text in the transcript, and the workspace says so. Manner has nowhere to go at all. |
| 30 | `POST /auth/login` (and `/auth/token`), the 403 for an inactive account | **Say why the account was turned off**, as a `code` on the 403: `account_closed_duplicate` when a duplicate flag was upheld (`POST /payouts/duplicate-flags/{id}/resolve`), `account_closed_report` when a report was upheld (`POST /reports/{id}/uphold`). No `code` when an admin turned it off by hand. Please keep the "Inactive account" sentence; we read it to know the account is turned off. | Today every turned-off account sees the same "This account is turned off" sheet. Someone closed as a duplicate needs to know that all their accounts are closed and nothing is paid. Someone closed after a report needs to know it was about their recordings. The sign-in sheet already has the words for both and shows them once the `code` arrives. |

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

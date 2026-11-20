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
| 23 | `DELETE /users/{id}` | It answers 500 Internal Server Error for an account with data. Seen 18 Nov on user `40186acf-61a6-4446-9090-0eeb12a2161d`: `GET /users/{id}/deletion-preview` answered 200 twice, then the delete failed. We need the delete to work, or a 409 with a sentence saying what is in the way. | An admin removing someone for breaking the rules can't, and the screen can't say why. Deactivating the account works in the meantime. |
| 24 | `DELETE /users/{id}?block_email=true` and every sign-up route | With `block_email=true`, keep the deleted account's email on a block list. Without it, nothing changes. The delete dialog already sends it: ticked by default, unticked for someone who asked for their own data to be removed. A hash is enough, so the address isn't kept in plain text. A sign-up with a blocked email is refused with a sentence we can show, such as "This email can't be used to sign up." Admins also need a way to see the list and remove an email from it, in case of a mistake. | Someone removed for breaking the rules can sign up again straight away with the same email. |
| 25 | New: `POST /recordings/{id}/flags`, `GET /recording-flags`, `POST /recording-flags/{id}/dismiss` | Interns and admins can flag a recording for cheating, not for quality (quality stays a rejection). **A reason is required:** `not_their_voice`, `recycled_audio`, `machine_voice`, `deliberately_empty`, `offensive`, `other`, plus `note`, which `other` requires. One flag per recording; a second answers 409. **Flagging takes the clip off the reviewer's desk, as a verdict does.** The answer is `{flag, next_recording}`, with `next_recording` as on `POST /reviews`. **A flagged recording is never paid:** no earning is made, and an earning not yet paid out is voided. **The third open flag on one contributor reports them:** admins get an email and a bell item of kind `queue` whose `key` starts `recording-flags:`. Nothing is suspended automatically; the admin decides. **The contributor gets a notification** naming the clip and the reason in words, so they know why it earned nothing. **`GET /recording-flags?status=open&envelope=true&limit=`** lists flags. Each one has `id`, `recording_id`, `contributor_id`, `contributor_name`, `prompt_text`, `reason`, `note`, `flagged_by_name`, `status` (`open` or `dismissed`), `created_at` and `contributor_open_flags` (this contributor's open flags, this one included). **`POST /recording-flags/{id}/dismiss`** (admins only, no body) answers the flag. It undoes the flag: pay comes back if the clip was approved, and the count drops. The screens are built against exactly this: the review page's Flag button, Flag in the admin's recording panel, and Users → Flagged. | Today a reviewer can only reject a clip for quality. Someone cheating, for example with another person's voice, recycled audio or a machine voice, is paid for each clip until an admin notices, and nothing collects the pattern. |

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

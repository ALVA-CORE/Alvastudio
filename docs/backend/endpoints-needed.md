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

| # | Ask | Blocks | Priority |
| --- | --- | --- | --- |
| 15 | Email interns and annotators, not only contributors | The composer's To row can reach contributors only | High |
| 16 | Delete chosen prompts and stimuli by id | Ticked rows on the Prompts page can only be retired, not deleted | Medium |
| 17 | Whether a weekly-run payment reached the contributor's bank | The wallet can only say "sent" for those | Medium |

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

---

## 15. Emailing interns and annotators

**Now:** a communication reaches contributors only. `audience` is
`all_contributors` or `selected_contributors`, and every id in
`recipient_ids` must be an active contributor, or the save is a 422. So
"Everyone" in our To row means every active contributor, and the people
search lists contributors only.

**What we need:** admins write to one group, or to everyone:

- Everyone: every active contributor, intern and annotator.
- All contributors, all interns, or all annotators.
- Chosen people, of any of those roles, in one email.

How you shape it is up to you. Whatever the shape, we need what we have now
for contributors: the group on the list and detail rows, `recipient_count`
for it while drafting, and the same `unavailable_recipient_count` for chosen
people who have since left that role or been deactivated.

**Questions:**

1. Do admins count in "everyone"?
2. A state in our To row is worked out here: the contributors whose state of
   origin or residence it is. Interns have a primary state and annotators
   have none. Should a state reach interns too, or stay contributors only?

---

## 16. Deleting chosen prompts and stimuli

**Now:** the Prompts page has a box on each row. What it can do with the
ticked rows is retire them, one `DELETE /prompts/{id}` (or `/stimuli/{id}`,
`/focus-group-topics/{id}`) each, because those routes deactivate rather than
delete. `POST /prompts/bulk-delete` does delete, but it picks prompts by
filter (upload time, author, category, variety), not by the rows an admin
ticked. Stimuli have no bulk delete at all.

**What we need:** the same rule as `bulk-delete`, for a list of ids: those
nobody has recorded are deleted, those with a recording are retired, and
hand-outs are taken back. For prompts and stimuli. Taking `ids` (up to 100,
our largest page) on `POST /prompts/bulk-delete` and on a matching
`POST /stimuli/bulk-delete` would do, keeping preview first and
`apply=true&expected=` to apply.

We'd show the preview's split in the confirm ("12 deleted, 8 retired:
recorded") and the button would say Delete.

**Question:** should focus-group topics get the same, or stay retire only?

---

## 17. Whether a weekly-run payment reached the bank

**Now:** a withdrawal answers its leg's `bank_status`, so the wallet can say
"On its way to your bank" or "Paid to your bank" (13 Nov). A contributor paid
by the weekly run has nothing like it: their earnings read `paid` the moment
the money leaves Alva, and the leg is admin only. Your handoff names this gap,
and until it closes the wallet says "sent".

**What we need:** the same `bank_status` for the contributor's own payments,
whichever route sent them. For example, on `GET /wallet`, the latest payment's
amount, `bank_status` and when it arrived.

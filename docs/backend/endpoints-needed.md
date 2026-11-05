# What we need from the backend

Checked against the live OpenAPI document, 5 Nov 2026.

**Every ask and every open question lives here, and nowhere else.**

- [`replies/`](replies/) — each handoff as sent, with what we did with it.
- [`our-handling.md`](our-handling.md) — decisions we made against what the
  API already does. Not asks.

If a reply or a handling note raises a question, it belongs in this file and
the other document points here.

## Open

| # | Ask | Blocks | Priority |
| --- | --- | --- | --- |
| 8 | A text search parameter on the bank and recordings lists | The prompt bank has no search; the reviews page loads every recording to search them | Medium |

Numbers are kept when an ask closes, so code comments that cite one stay
true. Closed on 3 Nov: #1 hours by language, #2 "how did you hear about us",
#3 bulk profiles (see [`replies/api-status-2026-11-03.md`](replies/api-status-2026-11-03.md)).
Closed on 5 Nov: #4 `/stimuli` totals, #5 readable `Retry-After`, #6 Markdown
bodies, #7 hero images (see [`replies/api-status-2026-11-05.md`](replies/api-status-2026-11-05.md)).

---

## 8. Search on the bank and recordings lists

**Prompts and stimuli.** `GET /prompts` and `GET /stimuli` page on the
server, and the prompt bank is about 10,000 deep. There is no search
parameter, so the admin table cannot offer one: searching the 25 rows on
screen would read as if it covered the bank.

**Recordings.** `GET /recordings` has no search either. The reviews page
needs one, so it loads every recording (about 6,000 today, six pages at a
time) and searches in the browser. That stops scaling as the corpus grows.

**What would fix it:** an optional `q` on each, matched case-insensitively
and combined with the filters already there (`is_active`, `recorded`,
`language_variety` and `category` on the banks; `status` and `session_type`
on recordings). `total` should follow it, so paging works on the results.

| Route | `q` matches |
| --- | --- |
| `GET /prompts`, `GET /stimuli` | `text`, `category` |
| `GET /recordings` | the recording's id, the prompt or stimulus text, the contributor's name, the reviewer's name |

A substring match is enough; ranking is not needed. Once it exists the prompt
bank gets its search box back, and the reviews page can page on the server
instead of loading everything.


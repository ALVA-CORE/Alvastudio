# What we need from the backend

Checked against the live OpenAPI document, 4 Nov 2026.

**Every ask and every open question lives here, and nowhere else.**

- [`replies/`](replies/) — each handoff as sent, with what we did with it.
- [`our-handling.md`](our-handling.md) — decisions we made against what the
  API already does. Not asks.

If a reply or a handling note raises a question, it belongs in this file and
the other document points here.

## Open

| # | Ask | Blocks | Priority |
| --- | --- | --- | --- |
| 4 | `bank_total` and `recorded_total` on `/stimuli` too | The stimuli "Recorded" cards read as a dash | Low |
| 5 | `Retry-After` in `Access-Control-Expose-Headers` | The studio cannot read how long a `too_fast` wait is | Medium |

Numbers are kept when an ask closes, so code comments that cite one stay
true. Closed on 3 Nov: #1 hours by language, #2 "how did you hear about us",
#3 bulk profiles (see [`replies/api-status-2026-11-03.md`](replies/api-status-2026-11-03.md)).

---

## 4. Totals on `/stimuli`

The 2 Nov handoff added `bank_total`, `recorded_total` and `recorded=` to
`GET /prompts`. The stimuli tab uses the same cards and the same table, so it
reads them from `/stimuli` too. Until they are there, "In this bank" and
"Active" fall back to `total`, and "Recorded" and "Active, never recorded"
show a dash.

**What would fix it:** the same three on `GET /stimuli`. No frontend change
needed once they are there. Still open on 4 Nov: `/stimuli` takes no
`recorded` filter and returns no totals.

---

## 5. Let the browser read `Retry-After`

A `too_fast` 429 carries `Retry-After`, and the studio should wait that long
before the next upload. But the studio is on another origin, and a browser
hides every response header the API does not list in
`Access-Control-Expose-Headers`. On 4 Nov that list was `X-Total-Count` alone,
so the header arrives and JavaScript cannot see it.

Until then the studio waits a minute and lets the contributor try again; a
second early try is just refused again.

**What would fix it:** either of these.

- `Retry-After` added to `expose_headers` in the CORS middleware, beside
  `X-Total-Count`.
- `retry_after_seconds` in the error body, beside `code` and `detail`.


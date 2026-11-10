# What we need from the backend

Checked against the live OpenAPI document, 10 Nov 2026.

**Every ask and every open question lives here, and nowhere else.**

- [`replies/`](replies/) — each handoff as sent, with what we did with it.
- [`our-handling.md`](our-handling.md) — decisions we made against what the
  API already does. Not asks.

If a reply or a handling note raises a question, it belongs in this file and
the other document points here.

## Open

| # | Ask | Blocks | Priority |
| --- | --- | --- | --- |
| 10 | Keep the email button's label dark in Gmail's dark mode (reopened) | The label turns white on the green in Gmail on iPhone | Medium |
| 13 | A way to stream session audio | A session's player waits for the whole file to download | High |
| 14 | A session's measured length on each row | A session shows the length sent with the upload, which can be far off | Medium |

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
[`replies/api-status-2026-11-10.md`](replies/api-status-2026-11-10.md)). #10
was reopened the same day for the label; see below.

---

## 10. The email button's label in Gmail's dark mode (reopened 10 Nov)

**What we saw**, after the 10 Nov tile, on a real send:

- **Gmail on iPhone, dark mode:** the green now holds. Sampled from the
  screenshot, the button is `#24EF7D` against our `#25F07D`. **The label
  does not:** it comes out `#F7F7F7`, near white, where it should be `#090909`.
  Light text on the bright green also makes the button look paler than it is.
- **Gmail on the web, dark theme:** right. Green button, dark label.
- **Light mode:** right everywhere we looked.
- **Gmail on Android:** not checked yet.

**What we need:** the label `#090909` on the green in Gmail's dark mode, as it
is in light mode. You said you'd rather talk before working round it, so we
have not guessed at a fix. Two things we know about this setup:

- **Images are left alone:** the tile and the hero both come through as sent.
- **`light()` already works** for light text. The label needs the same kind of
  measure, for dark text on a bright background.

When the template changes, we copy it and regenerate the parity fixtures.

---

## 13. A way to stream session audio

**What happens:** opening a focus-group session in the admin panel shows a
loading player until the whole recording has downloaded. Nothing plays until
the last byte arrives, and the longer the session the longer the wait.

**Why:** `GET /focus-groups/{session_id}/audio` takes a bearer token, and an
`<audio src>` cannot send one. So the studio fetches the whole file with the
header and plays it from memory (`apiFetchBlobUrl`). The route itself serves
ranges; the browser just never gets to ask for them.

**What would fix it:** a URL the browser can load directly, for example a
short-lived signed link to the same file:

- **Route:** `GET /focus-groups/{session_id}/audio-url` returns
  `{ url, expires_at }`, with the same access rule as the audio route.
- **The link:** carries its own short-lived token, and the file it serves
  honours `Range`, so the player starts at once and can seek.

The same would help `GET /recordings/{id}/audio` and
`GET /annotations/{id}/audio`, which work the same way. Clips are short, so
those matter less.

---

## 14. A session's measured length on each row

**What happens:** session `f705732b` ("Scribe test: a memorable market day")
shows **6h** in the table and the panel. Its audio plays for **1:25**. The 6h
is `duration_seconds`, the length sent with the upload: exactly 21,600, the
most the API accepts. Nothing measured from the file reaches us per session.

**Why it matters:** the Length column, the panel, the annotations table and
the waiting list all show that figure, so one wrong upload reads as six hours
of work.

**What we know you have:** `GET /focus-groups/summary` already counts
`hours_measured` from the file, and recordings carry
`measured_duration_seconds`.

**What would fix it:** `measured_duration_seconds` (null where never
measured) on:

- `FocusGroupSessionSummary` and the session detail;
- `AnnotationSummary`;
- `AnnotationQueueRow`.

We would show the measured length wherever there is one, and the reported one
otherwise, as the reviews page does for clips. Sorting by `duration` would
ideally follow the same rule.


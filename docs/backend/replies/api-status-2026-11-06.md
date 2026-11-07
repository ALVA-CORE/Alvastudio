# Frontend handoff: search, dark-mode emails, server paging on reviews, the review bank

Received 6 Nov 2026. Wired 7 Nov. Every route and field checked against the
live `/openapi.json` first; all were there. The template files are from
backend `origin/main` 11b5e9b.

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here. This
closes #8 and #9.

## What we did with it

| Item | Our handling |
| --- | --- |
| A. `/admin/reviews` | Pages on the server: `GET /recordings?envelope=true` with `limit`, `offset`, `status`, `q`, `sort`, `order` and `expand=verdicts`. The `GET /users` and `GET /reviews` downloads are gone. |
| Bug 1, oldest verdict kept | Each row reads `verdicts[0]`, the newest: its rubric, notes and `rejection_reason`. |
| Bugs 2 and 3, short and capped loads | Nothing is downloaded whole any more; the count is the envelope's `total`. |
| Bug 4, unstable clip code | The clip is shown as the first 8 characters of its id, which `q` matches. |
| Bug 5, page kept across statuses | Status, search and sort each reset to page 1 in the same update. |
| Bug 6, one failed page fails all | One request per page now, so there is nothing left downloading behind the page; an answer that arrives after the page is left is ignored. |
| Cards and charts | From `GET /recordings/summary`: Recordings, Approved, Rejected, the approval rate and the ring from `total` and `by_status`; "Awaiting a verdict" is `awaiting_in_bank + awaiting_on_desks`; the rejection donut from `rejection_reasons`; "Who is clearing the queue" from `by_reviewer`. Read with the first page, and again after a reassign or reopen. |
| Search box | Sent as `q` 300 ms after typing stops. |
| Sorting | Header presses send `sort`/`order`: Contributor, Prompt (`text`), Type, Length, Reviewer, Status, Submitted (`created_at`). The clip column does not sort. |
| C. Search on the banks | The prompt and stimulus tabs send `q`, debounced the same way. The headline cards still come from their own unfiltered calls. Focus group topics keep their search in the browser. |
| D. Desks refill after a verdict | The intern's review page reads the desk again after each accepted verdict, so the refilled clip is in its next and previous. Going back to the queue already refetched. |
| B. Dark-mode emails | `email_templates.py` and `email_markdown.py` copied into the composer's preview, checked byte for byte against your own output by the parity tests. `light()` lives in our Markdown copy, since our template imports that file. |

## Checking #9 in real mail apps

Not done yet. To do it:

1. Send one email from the composer to a test inbox you can open on each app.
   Use a real address; throwaway domains often never receive.
2. Open it in Gmail on iOS, Gmail on Android, Apple Mail on iPhone and Mac,
   and Outlook, each with the app in light mode and in dark mode.
3. It should be dark every time, with light text you can read. Look closely
   at the green button's label in Gmail dark mode; you asked about that one.
4. Send the backend what each app showed, especially any that came out light
   or with dark text.

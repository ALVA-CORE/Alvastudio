# Frontend handoff: why the review pages are slow

Received 9 Nov 2026. Wired the same day. `judged_by` and the queue's envelope
checked against the live `/openapi.json` first.

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| Item | Our handling |
| --- | --- |
| A. Admin reviews page | Already on server paging since 7 Nov (see [`api-status-2026-11-06.md`](api-status-2026-11-06.md)): one page of `GET /recordings` with `expand=verdicts`, the cards and charts from `GET /recordings/summary`, search and sort sent to the server, page 1 on any change, the short id as the clip. Section 3 described the code from before that. What was left is now done: each request is aborted when a newer page, search or sort replaces it, or the page is left, and the Clip column sorts by `created_at`. |
| B. Intern review page | Three small requests. The desk is `GET /reviews/queue?mine=true`. The count is `GET /reviews/queue?envelope=true&limit=1`, read as "N clips waiting for a desk" beside Review next; a failed count hides the number and keeps the desk. History is `GET /recordings?judged_by=<their id>&envelope=true`, a page at a time, fetched only once the Completed tab is opened, with search and sort sent to the server. |
| Removed | `fetchAllRows(listRecordings)`, `listContributors`, the load of their own verdicts, and the `visible()` filter and merge. `listRecordings` and `listContributors` had no other caller and are gone from the API module. |
| Refetch after a verdict | Done on 7 Nov: the review page reads the desk again after each accepted verdict. |
| Review next | Kept. It still takes the oldest clip from the bank. |
| C. Compression, preflight cache | Nothing to change. |
| D. Other admin pages | Not now. They also stop asking for further pages when the screen is left (since 7 Nov). We will say which filters and sorts a table needs when one gets slow. |

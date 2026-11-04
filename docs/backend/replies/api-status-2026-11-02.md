# Frontend handoff: prompt bank totals and the `recorded` filter

Received 2 Nov 2026. Wired 2 Nov. Checked against the live `/openapi.json`
the same day: it did **not** yet list `recorded`, `bank_total` or
`recorded_total` on `GET /prompts`, so everything below is built to the
handoff and degrades if the fields are missing.

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| Item | Our handling |
| --- | --- |
| Header numbers | Read from the server. "In this bank" is `bank_total`, "Recorded" is `recorded_total`. A second one-row request with `is_active=true` gives "Active" (its `bank_total`) and "Active, never recorded" (its `bank_total - recorded_total`). The cards no longer move with the table's filters or page. |
| "Recordings made" | Removed. It was the sum of `used_by_count` across the rows on screen, and there is no server total for it. |
| `envelope=true` | Already sent on every list call. |
| `recorded=true` / `false` | A "Recordings" filter on the table (All, Recorded, Never recorded), sent to the API. |
| Paging | The prompts and stimuli tables now page on the server, 25 at a time, `offset = (page - 1) * 25`, with the page count from `total`, not `bank_total`. Changing tab or filter goes back to page one. |
| Search and sort | Hidden on the prompts and stimuli tables. There is no search parameter on the route, and searching or sorting one page would look like it covered the whole bank, which is the same mistake as the zero counts. |
| `bank_total` / `recorded_total` missing | `bank_total` falls back to `total`, which agrees when unfiltered. A missing `recorded_total` shows as a dash, not a zero. Covers stimuli, which the handoff does not mention. |
| Focus group topics | Unchanged: still loaded whole and counted on our side. A few dozen rows, and no counts on that route. |
| Oversized CSV `400` | `detail` is shown as it comes. We also split imports into batches of 5,000 so a large bank is not refused whole. If the limit is lowered, the first batch is refused and its `detail` is shown. |
| Contributors | Nothing changed for them. |

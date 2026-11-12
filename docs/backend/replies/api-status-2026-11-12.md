# Frontend handoff: 12 Nov, clips placed at upload, and the next clip in the verdict answer

Received 12 Nov 2026. Wired the same day. Checked against the OpenAPI
document exported from origin/main `c46a201`, since the live API no longer
serves `/openapi.json`. The only other change in it is
`POST /payouts/identity-refresh`, which we don't call.

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| Item | Our handling |
| --- | --- |
| A `next_recording` | `useReviewItem.submit` returns the verdict answer's outcome: the id of `next_recording`, or the reason it was refused. After a verdict the review page opens `/intern/review/{next_recording.id}`, or goes to the list when it is `null`. The verdict no longer steps through the desk list loaded when the page opened. The previous and next arrows still use that list, for moving around by hand. |
| A "Review next" | Removed, along with what only it used: `assignNext` in the API module and the queue hook, the bank count beside it (`reviewBankCount`, `waiting`), and its loading state. With clips placed at upload and the bank normally empty, the count had nothing to offer an intern. |
| B 7pm wording | Gone. An empty desk reads "No pending clips. New ones arrive as contributors record." The comments on the desk and the queue hook say clips are placed at upload. |

## Found while wiring

| Where | What |
| --- | --- |
| `toQueueItem` | Every desk row carried `/recordings/{id}/audio` as its audio, a route nothing has fetched since the playable links (10c). Rows now carry none; the review page fetches a link when the clip is opened, as it already did. |

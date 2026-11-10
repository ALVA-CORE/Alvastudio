# Frontend handoff: asks #10, #11 and #12

Received 10 Nov 2026. Wired the same day. Every route, parameter and field
checked against the live `/openapi.json` first.

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| Item | Our handling |
| --- | --- |
| #10 Email button | `src/lib/admin/emailTemplate.ts` follows `email_templates.py` at origin/main `e859e73`: the `ACCENT_TILE` constant and `tile()`, on the button's cell and link. Parity fixtures regenerated from that commit; the test passes byte for byte. `accent.png` answers 200. Still to do, by us: Gmail on iPhone and Android, dark mode, before and after, light mode unchanged, and what the label does. |
| #11a Annotations page | One page of `GET /annotations?envelope=true&expand=tags` with `q`, `status`, `sort` and `order`, through the table's server mode. Every column sorts on the server except Annotation (the id) and Tags. Cards and the throughput chart from `GET /annotations/summary`, grouped by `annotator_id`. "Waiting to be claimed" is `GET /annotations/queue`, oldest first, up to 200 rows; its card is `claimable_sessions`. Handing out a session, reassigning, approving or sending back reloads the page, the summary and the queue. "In progress" stays `draft` only, as it has always counted in practice. |
| #11b Focus-groups page | One page of `GET /focus-groups?envelope=true` with `q`, `state`, `has_audio=false` (the Missing audio tab), `sort` and `order`. Cards and the tab badge from `GET /focus-groups/summary`. Hours stay `hours_reported`, the same figure as before. `expand=participants` dropped. |
| #11 Removed | The whole-list loads in `useAdminAnnotations` and `useAdminSessions`, both user lists, the "annotated" set rule, `listAllAnnotations`, and the `in_progress` annotation status (with its label, colour and pill). `redactions` is no longer typed on list rows. The session panel reads it from `GET /focus-groups/{id}`, which it was already fetching. |
| #12 Assigned bar | Drawn from `assigned_reviewed`, `on_desk` and `taken_back` out of `clips_assigned`. The verdict counts stay in the chart above it. The sample figures and the "Sample" mark are gone. No note about 23 Oct on screen. |
| 9 Nov, section 4b | Picked up from your copy of the 9 Nov handoff: `useInternReviewCount` is now one `GET /reviews?reviewer_id=…&created_after=…&limit=1&envelope=true`, read as `total`. |

## Found while wiring

| Where | What |
| --- | --- |
| Focus-groups page, Assign | Showed "assigned" and called nothing. It now calls `PATCH /focus-groups/{id}/assignee`. |
| Session panel, "Chase" | Showed "Reminder sent" and sent nothing. Removed. |

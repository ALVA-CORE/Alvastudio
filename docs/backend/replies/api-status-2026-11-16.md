# Frontend handoff: 16 Nov, narration pay and narrations for annotators

Received 16 Nov 2026; wired 17 Nov. Checked against the `openapi` artifact
exported by CI for origin/main `9d64df3`.

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| # | Our handling |
| --- | --- |
| 1 Narration at ₦50 a minute | The Studio's Stimuli mode shows "₦50 per minute of speech" from `GET /payments/terms` `narration_rate_per_minute_kobo`, where it said "Next up". The dashboard's Next payout slide shows the same rate from `pay`, and says once that narrations recorded before `narration_rate_changed_at` are paid `earlier_narration_rate_per_hour_kobo` an hour. No screen works money out from a rate and `approved_narration_seconds`. The contributor release note no longer names a narration rate. |
| 2 Narrations tab | A Narrations tab on the Sessions page: the annotator's own narrations (`GET /annotations?kind=narration`) with their status, how many wait in the pool (the `total` of `GET /annotations/narrations/queue`), and "n of 10 open" from `open_narration_claims` and `narration_claim_limit`. The pool isn't listed: only the next one can be taken. Take next calls `POST /annotations/narrations/claim-next` and opens the workspace on the answer; a 404 or 409 is shown as it is. The workspace opens a narration by its annotation id (`/annotator/narrations/{annotation_id}`), reads `topic` from `/source` and shows it as "Stimulus", and hides the speaker picker, the voice-naming step, adding speakers and the speaker figures. Its segments always send `participant_id: null`. The Sessions list now asks for `kind=session`. The dashboard shows `narrations_annotated` and `narrations_waiting` as a chart beside the activity chart. |
| 2 Bell | A `queue` item whose key starts `narrations:` opens the Narrations tab. Other `queue` items with a `recording_id` still open the intern review desk. |
| 3 Send and take back | Admin Reviews table: tick rows, then Send to annotators previews with `{"ids": [...]}`, the confirm says how many go and how many are skipped, and Send applies with `apply=true&expected=<sent>`. A 409 is shown as it is and previewed again. Take back calls `POST /annotations/narrations/withdraw` and says how many were taken back and skipped. Filters plus `count` have no form here. |
| 3 Admin figures | Admin Annotations shows `claimable_narrations` and `narrations_in_progress` as a chart, has a Type filter (`kind`) and a Type column, and its detail panel labels a narration's topic "Stimulus". |
| 4 `session_id` null | Typed as nullable on the document, list rows and source. Nothing opens `/focus-groups/{session_id}` for a narration: the workspace reads it by annotation id. |

## Found while wiring

| Where | What |
| --- | --- |
| `AnnotationDocument.transcript` on a narration | The draft-transcript strip ("being made", "failed", "not applied") is hidden on a narration, with the voice naming, because its copy is about sessions. A narration whose draft is still on its way opens with no word about it. |

# Frontend handoff: 21 Nov (b), junk flags, reports, narrations read as a prompt

Received 21 Nov 2026; wired 21 Nov. Checked against the `openapi` artifact
for origin/main `9a7a007`. This replaces our ask #25, and the screens built for
#25's routes were rebuilt on these.

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| Section | Our handling |
| --- | --- |
| 1 Read as a prompt | On a Stimuli clip the rubric asks "Was the topic read out like a prompt instead of narrated?" (Yes / No), and Submit waits for it. Sent as `q_read_as_prompt`; never sent on a sentence. |
| 1 Junk flag | Flag on the review page opens a dialog: the seven reasons as tick boxes, and a note that `other` requires. It sends `POST /reviews` with `verdict: reject` and `flag`, then opens `next_recording`. Questions not answered are left out, which is a 422 until ask #26. |
| 1 Second opinion | The verdict and status `flag` read "Second opinion" everywhere: the rubric's outcome, the admin status pill, the corpus chart and a person's activity counts. `rejection_reason: flagged` reads "Flagged as junk". |
| 1 Report | "Report contributor" on the review page, any clip the intern can see: the same dialog, sent to `POST /reports`. |
| 2 Workspace | On a narration: Flag (`POST /recordings/{id}/flag`, then back to the list) and Report contributor. |
| 3 Paused | The Studio reads `uploads_paused` from the quota and shows "Your uploads are paused" in place of the cards and the record button. An upload refused with `uploads_paused` re-reads the quota and shows `detail`. |
| 3 Admin | Users → Reports: open reports, with contributor, how it opened, active flags, reports and when. A row opens the detail: clip counts, who reported and why, every flag (cleared ones struck through). "Dismiss, resume uploads" and "Uphold, deactivate". The bell's `report` item opens this tab. Notes on decisions aren't asked for. |
| 3 Clip panel | Admin Reviews panel reads `GET /recordings/{id}` for `flag`: shows the reasons and "Clear flag". An approved clip with no flag offers "Flag". "Report contributor" on any clip. The toast after a flag says what `money` came back as. |
| 4 Contributor | Nothing new: the notifications and the `paused` bell item show as the API words them. |

## Not done

| What | Why |
| --- | --- |
| Previewing the `contributor_reported_admin` email | The test-email screen sends a saved communication, not a `kind`. |

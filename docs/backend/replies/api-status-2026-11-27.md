# Frontend handoff: 27 Nov, asks #26 to #30

Received and wired 27 Nov 2026. Checked against the `openapi` artifact for
origin/main `4dff7f9`.

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| Ask | Our handling |
| --- | --- |
| #26 | Sending was already done: a flag leaves out the questions not answered. Reading back, a `null` answer shows as "Not answered" on the admin clip panel, and as unpicked when an intern reopens the clip. |
| #27 | Admin Reviews has "Flagged as junk" in its status filter (`flagged=true`). A row with a `flag` reads "Flagged as junk", including a flag made after approval. The clip panel reads the flag from the row, so its extra `GET /recordings/{id}` is gone. The Rejected card and the rings use `junk_flagged`. |
| #28 | The annotator's three cards now follow the time filter, from `daily_work`, with a trend against the span before, and against `previous_year` for 12 months. The intern's 12-month trend reads `previous_year`. |
| #29 | All 44 `NonSpeechEventType` values are in the `[` list and the Sounds tab. Manner is a new tag family ("Manner"), applied by highlighting words like the others, saved as `manner_spans`, counted on the admin panel, and drawn from `by_manner` in the Tag mix chart. |
| #30 | The sign-in sheet already read these two codes, so a closed account now sees why. |

## Not done

| What | Why |
| --- | --- |
| Typing manner in brackets, like the lead's `[/whisper]` | The lead's list doesn't say how the start of a stretch is written. Highlighting words works. |
| A junk split on the admin dashboard | It reads the status counts only for the approval rate, where junk counts as a rejection, which is right. |

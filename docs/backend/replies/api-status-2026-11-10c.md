# Frontend handoff: 10 Nov (3), asks #10, #13 and #14, and a test email

Received 10 Nov 2026. Wired the same day. Every route, parameter and field
was checked against the OpenAPI document exported from origin/main `dbc50cb`,
since the live API no longer serves `/openapi.json`.

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| Item | Our handling |
| --- | --- |
| #13 Streaming audio | Every player now plays the link: a clip (the admin reviews panel and the intern's review page), a session (the admin focus-groups panel and the intern's remove-a-speaker sheet), and an annotation's session (the annotator's workspace). `apiFetchBlobUrl` and every blob revoke are gone. Nothing downloads audio, so the old routes are no longer called. The link is never stored. On an error, the admin player and the annotator's timeline fetch a fresh link once and pick up where they were. The intern's waveform player doesn't; its clips are short and its link lasts an hour past their length. |
| #14 Measured length | `measured_duration_seconds`, else `duration_seconds`, on the admin focus-groups and annotations tables, the waiting list, the annotator's session list and their workspace. An annotator's claimed sessions now take their topic and length from the annotation row, which carries them, instead of "Focus group session" and no length. |
| #10 Button label | `src/lib/admin/emailTemplate.ts` follows `email_templates.py` at `dbc50cb`: the `gmail-label` span and its rule. Both parity fixtures are regenerated from that commit, and only those two things changed. Still ours to do: Gmail on iPhone and Android, dark and light. |
| Test email | A "Send me a test" button in the composer, beside Send. It saves the draft as the first press of Send does, then sends `communication_id`. Its toast names the address it went to. `kind`, for the platform's own emails, isn't used: we have no email settings page. |
| `/users/interns/activity` withdrawn | Nothing called it. |

## Found while wiring

| Where | What |
| --- | --- |
| `POST /reviews/assign-next` description | It still says "each verdict is refilled from the bank at once". Under the 7pm deal that's no longer true. |
| `public/audio` | 4.1 MB of demo clips shipped with the app, used by nothing but two test fixtures. Removed, along with `AdminRecording.audioUrl`, which nothing read. |

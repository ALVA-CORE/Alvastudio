# Frontend handoff: contributor communications

Received 4 Nov 2026. Wired 4 Nov. Checked against the live `/openapi.json` the
same day: every route and field below was there, and matches
`origin/main` f46bea4.

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here. This
opens #6 and #7.

## What we did with it

| Item | Our handling |
| --- | --- |
| Screen | No page. A textured button bottom right of every admin screen grows into a panel with three tabs: Compose, Preview, Sent. Hidden from admins without the "Emails" permission. What is being written survives closing the panel and moving between pages. |
| Live preview | The Preview tab draws the branded template in the browser: a copy of `email_templates.render`, checked byte for byte against the backend's own output by a test (`emailTemplate.fixture.json`). Sandboxed iframe. |
| `GET /communications/{id}/preview` | Read on the first press of Send, for `recipient_count`, `unavailable_recipient_count` and `email_available`. The button then reads "Send to N"; the second press sends against that preview's revision. |
| Subject | The "Header" field: it is the subject and the heading. |
| Body | Plain text; a blank line starts a paragraph. |
| `action_label` / `action_url` | "Button" and "Link". Both or neither; neither is "Open Alva Studio". The link is checked against your HTTPS rule before the 422 would be. |
| Hero image | Drag and drop, or press to choose. Preview only until ask #7. |
| Footer | Not editable. |
| `all_contributors` | No `recipient_ids` on create; an empty list when a draft switches to it. The send dialog says the count is an estimate. |
| `selected_contributors` | "Choose": a list from `GET /users/profiles?role=contributor`, inactive accounts dropped. Search, and a state filter matching state of origin or residence (free text matched to the 36 states and the FCT). Tick one, or tick everyone shown. Capped at 1,000. |
| Revisions | Every PATCH carries the draft's revision. A 409 loads the latest version and says so, rather than overwriting it. |
| Send | First press saves (created once, patched after) and previews; second press sends. Off while it runs, and off when `email_available` is false, `unavailable_recipient_count` is above zero, or nobody is chosen. Any edit between the presses goes back to the first. |
| Uncertain send | Anything but a clean 200, 409 or 503 reloads the detail and shows what the server has. Never a new draft. |
| 503 | "Email is unavailable on the server. The draft is saved and nothing was sent." |
| Sent tab | Rings (bklit) of accepted, waiting, refused and skipped across everything sent, then one row per email. A row opens to its own rings and the people it went to, 50 at a time. Refreshed every 5 seconds while anything is `queued` or `sending` and the tab is visible. `sent` reads "Accepted", never "delivered". |
| Drafts | Not listed. A draft is created on the first press of Send and lives only as long as that email is being written. |

# Frontend handoff: 15 Nov, in-app announcements and work notifications

Received 15 Nov 2026. Wired 16 Nov. Checked against the `openapi` artifact
exported for origin/main `f0155ce`, which includes the announcements merge
(`767c36d`).

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| Item | Our handling |
| --- | --- |
| Admin screen | No page. The message button bottom right of every admin screen springs out Email and Announcement; Announcement grows into a panel like email's, with Compose and Sent tabs. Same `communications` permission as email. |
| Writing | Roles and approval (anyone, approved, waiting) side by side where email has To, then title, a plain-text message that keeps its line breaks, button and link. A field with nothing chosen is left out, never `[]`. Identity, emails, `user_ids` and expiry aren't offered. |
| Send | As email: the first press saves the draft (`POST`, then `PATCH` with the whole announcement on later presses) and shows "Send to N" from its `recipient_count`, with your wording: "People who join later won't get it, and it can't be changed once sent." The second press sends. `audience-preview` isn't used. |
| Sent, withdraw | Sent lists `status=sent` with "Read by X of Y". A sent or expired row withdraws through the shared confirm. |
| Errors | 404: "That announcement no longer exists." Anything else: `detail` as it is. |
| Bell, kind `announcement` | Added to our kinds with `action_label` and `action_url`. Mapped explicitly for every role. The body is shown as plain text with its line breaks. The button shows when both fields are set and the link starts with one `/` (opens in the studio) or `https://` (opens in a new tab). In the staff bell it sits under the row; for contributors it's in the notification's sheet. |
| Kind `queue`, interns | An item with `recording_id` opens `/intern/review`. Annotator items are unchanged. |
| Kind `queue`, contributors | A new "new work" category. `prompts:` opens the studio on Prompt reader, `stimuli:` on Stimuli. |

## Found while wiring

| Where | What |
| --- | --- |
| `AnnouncementIn.action_url` description | It gives `/wallet` as the example path. The studio has no `/wallet`; a contributor's wallet is on `/contributor/dashboard`. |
| Admin surface | Admins have no bell, so an announcement sent to admins (or to everybody) reaches them only on the intern or annotator dashboards. |

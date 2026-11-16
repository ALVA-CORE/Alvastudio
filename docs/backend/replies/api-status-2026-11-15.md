# Frontend handoff: 15 Nov, in-app announcements and work notifications

Received 15 Nov 2026. Wired 16 Nov. Checked against the `openapi` artifact
exported for origin/main `f0155ce`, which includes the announcements merge
(`767c36d`).

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| Item | Our handling |
| --- | --- |
| Admin screen | No page. The message button bottom right of every admin screen springs out Email and Announcement; Announcement grows into a panel like email's, with Compose, Drafts and Sent tabs. Same `communications` permission as email. |
| Writing | Where email has To: Roles and Approved side by side, then Identity (the wallet's `IdentityStatus` values) and Emails, as chips. Then title, a plain-text message that keeps its line breaks, button and link (both or neither), and an end time. A field with nothing chosen is left out, never `[]`. `user_ids` aren't picked here; a draft that has them shows them as one chip and keeps them unless removed. |
| Live count | `POST /announcements/audience-preview` 400 ms after the audience stops changing: "This reaches 42 people." An address in `unmatched_emails` turns red. |
| Drafts | Save draft creates it (`POST`), or sends only the changed fields (`PATCH`). Drafts lists `status=draft`; picking one edits it, the bin deletes it after asking. |
| Send | As email: the first press saves and shows "Send to 42 people" with your wording, "People who join later will not get it, and it cannot be edited once sent."; the second press sends. |
| Sent, withdraw | Sent lists `status=sent` with "Read by X of Y". A sent or expired row withdraws through the shared confirm. |
| Errors | 404: "That announcement no longer exists." Anything else, 409 and 422 included: the API's own words. Drafts and Sent read again after every write. |
| Bell, kind `announcement` | Added to our kinds with `action_label` and `action_url`. Mapped explicitly for every role. The body is shown as plain text with its line breaks. The button shows when both fields are set and the link starts with one `/` (opens in the studio) or `https://` (opens in a new tab). In the staff bell it sits under the row; for contributors it's in the notification's sheet. |
| Kind `queue`, interns | An item with `recording_id` opens `/intern/review`. Annotator items are unchanged. |
| Kind `queue`, contributors | A new "new work" category. `prompts:` opens the studio on Prompt reader, `stimuli:` on Stimuli. |

## Found while wiring

| Where | What |
| --- | --- |
| `AnnouncementIn.action_url` description | It gives `/wallet` as the example path. The studio has no `/wallet`; a contributor's wallet is on `/contributor/dashboard`. |
| Admin surface | Admins have no bell, so an announcement sent to admins (or to everybody) reaches them only on the intern or annotator dashboards. |

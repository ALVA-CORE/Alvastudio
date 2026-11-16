# Frontend handoff: 15 Nov, in-app announcements and work notifications

Received 15 Nov 2026. Wired 16 Nov. Checked against the `openapi` artifact
exported for origin/main `f0155ce`, which includes the announcements merge
(`767c36d`).

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| Item | Our handling |
| --- | --- |
| Admin screen | New page, Announcements, in the admin rail at `/admin/announcements`. It opens for admins who may send emails (the `communications` area), since both write to people. Two tabs, Drafts and Sent, each one page of `GET /announcements?status=` with paging. Drafts show who they reach (`recipient_count`) and when they were edited; Sent shows the status, "Read by X of Y" and when it was sent. |
| Writing | A dialog with title, message, audience, button and expiry. The message is a plain text box and keeps its line breaks. Save creates a draft (`POST`) or sends only the changed fields (`PATCH`); the button pair is set or cleared together. Send saves first, then asks. |
| Audience | Roles, approval (anyone, approved, waiting) and identity check (the wallet's `IdentityStatus` values), plus a box for emails. A field with nothing chosen is left out, never sent as `[]`; nothing chosen at all leaves `audience` out. `user_ids` isn't offered; a draft that has them keeps them on save. |
| Live count | `POST /announcements/audience-preview` 400 ms after the audience stops changing: "This reaches 42 people." `unmatched_emails` are listed under it as "No account: …". |
| Send, withdraw, delete | Through the shared confirm. Send uses your wording: "Send to 42 people now? People who join later will not get it, and it cannot be edited once sent." Withdraw is offered on sent and expired rows and in a sent row's panel. Edit and delete are offered on drafts only. |
| Errors | 404: "That announcement no longer exists." 409: `detail` as it is. Both reload the list, as every write does. 422: field errors under their fields, the rest (and a string `detail`, such as a past `expires_at`) above the buttons. |
| Bell, kind `announcement` | Added to our kinds with `action_label` and `action_url`. Mapped explicitly for every role. The body is shown as plain text with its line breaks. The button shows when both fields are set and the link starts with one `/` (opens in the studio) or `https://` (opens in a new tab). In the staff bell it sits under the row; for contributors it's in the notification's sheet. |
| Kind `queue`, interns | An item with `recording_id` opens `/intern/review`. Annotator items are unchanged. |
| Kind `queue`, contributors | A new "new work" category. `prompts:` opens the studio on Prompt reader, `stimuli:` on Stimuli. |

## Found while wiring

| Where | What |
| --- | --- |
| `AnnouncementIn.action_url` description | It gives `/wallet` as the example path. The studio has no `/wallet`; a contributor's wallet is on `/contributor/dashboard`. |
| Admin surface | Admins have no bell, so an announcement sent to admins (or to everybody) reaches them only on the intern or annotator dashboards. |

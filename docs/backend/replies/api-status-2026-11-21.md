# Frontend handoff: 21 Nov, deleting accounts and the email block list (asks #23, #24)

Received 21 Nov 2026; wired 21 Nov. Checked against the `openapi` artifact
for origin/main `9a7a007`.

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| # | Our handling |
| --- | --- |
| 23 Delete errors | Nothing to change. A failed delete already shows the API's `detail` in a toast, a 500 included, and the dialog already offers "Deactivate instead". |
| 24 `block_email` | The delete dialog's tick sends it, ticked by default. The "removed" toast adds "email blocked" when `email_blocked` is true. |
| 24 Sign-up refused | Nothing to change. A 403 that isn't pending approval or an inactive account shows `detail` as it is, on every sign-up form and on Create account. |
| 24 Block list | Users → Blocked emails: `hint`, role (or "Added by hand"), who and when, each with Remove. One box takes a full address: Find sends it as `email`, Block posts it. "Show all" clears a search. |

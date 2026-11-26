# Frontend handoff: 25 Nov, admin sign-in codes, recovery codes, three admins

Received 25 Nov 2026; wired 26 Nov. Checked against the `openapi` artifact
for origin/main `d6e9a30`.

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| Section | Our handling |
| --- | --- |
| 1 Sign-in | `POST /auth/login` answering `code_required` opens a code screen in place of the form: "We sent a 6-digit code to {email_hint}", one box, Sign in. `code_invalid` stays and adds "N tries left"; `challenge_expired` and a resend 409 go back to the form with `detail`; a 429 says how long to wait when `Retry-After` is there. "Send the code again" shows while `resends_left` is above 0. The challenge lives in component state only. |
| 2 Recovery codes | The code screen has "Use a recovery code instead", and shows only that box when `email_sent` is false. Admin settings has a Recovery codes row with "N left" (amber at 3 or fewer) and "Make new codes"; another admin's user panel has "Recovery codes" to make a set to hand over. Both show the codes once, with Copy and Download, saying they won't be shown again. |
| 3 Three admins | Nothing to change: a 409 `admin_limit` shows its `detail` when creating or editing an account. The Admin role isn't greyed out in the pickers. |
| 4 History | Nothing to change: the tab shows the API's sentences. |

## Not done

| What | Why |
| --- | --- |
| The three new `TestEmailKind` values | The test-email screen sends a saved communication, not a `kind`. |

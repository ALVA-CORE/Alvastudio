# Frontend handoff: everything from 4 to 5 Nov

Received 5 Nov 2026, as one document covering the whole of 4 and 5 Nov.
Wired the same day. Every route and field checked against the live
`/openapi.json` first; all were there.

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here. This
closes #4, #5, #6 and #7.

## What we did with it

| Item | Our handling |
| --- | --- |
| A. Waiting-listed sign-up reached the dashboard | Fixed as you describe: the onboarding form calls `logout()` before showing the sheet, after the profile and consent are saved. "Got it" then goes to the sign-in page. |
| E. "We've emailed you" | Now "we'll email you the moment a place opens", true whether or not Resend is accepting. |
| B. Stimuli handed out | The studio reads `GET /stimuli/assigned`, and `GET /prompts/assigned` for sentences, in place of the plain lists. |
| `already_read` and the two-narrator 409 on stimuli | Handled as for sentences: the take is dropped, the API's sentence shown, and the stimulus leaves the stack. A sent stimulus also leaves the stack, since it is narrated once. |
| F. `/stimuli` totals and `recorded` | No change needed: the stimuli tab already read `bank_total`, `recorded_total` and sent `recorded`, and its cards now fill in. |
| C. `Retry-After` | Already read when visible; it now is. The one-minute fallback stays only for a response without it. The daily-limit 429 still reloads the quota, which is what the studio shows. |
| D. `body_format: "markdown"` | Every communication is sent as Markdown. The editor's document is written as your subset: `**bold**`, `*italic*`, `- ` and `1. ` lists, `[words](https://...)`. The subset has no escape, so a typed `*` becomes `∗`, a line of text starting `- ` or `1. ` gets a zero-width space in front, italic inside a word is dropped, and italic at the edge of bold is kept from forming `***` with a zero-width space. |
| The live preview | Draws the body with a TypeScript copy of `email_markdown.render`, checked byte for byte against your own output by a test. That test found that `**a *b***` renders with a literal asterisk, which is why the composer never writes it. |
| D. `POST /communications/images` | Uploaded on drop, after checking type (PNG, JPEG, WebP) and size (5 MB) first. The preview shows the file at once, then your re-encoded copy at the returned `url`. Send waits for an upload still going; a later drop or a removal makes an earlier upload count for nothing. Refusals show `detail`. |
| `hero_image_id` | Sent on create when an image is set; on every PATCH, with `null` when it was removed. |

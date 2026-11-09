# What we need from the backend

Checked against the live OpenAPI document, 7 Nov 2026.

**Every ask and every open question lives here, and nowhere else.**

- [`replies/`](replies/) — each handoff as sent, with what we did with it.
- [`our-handling.md`](our-handling.md) — decisions we made against what the
  API already does. Not asks.

If a reply or a handling note raises a question, it belongs in this file and
the other document points here.

## Open

| # | Ask | Blocks | Priority |
| --- | --- | --- | --- |
| 10 | Keep the email button our green in Gmail's dark mode | The button shows a darker, wrong green in the Gmail apps | Medium |

Numbers are kept when an ask closes, so code comments that cite one stay
true. Closed on 3 Nov: #1 hours by language, #2 "how did you hear about us",
#3 bulk profiles (see [`replies/api-status-2026-11-03.md`](replies/api-status-2026-11-03.md)).
Closed on 5 Nov: #4 `/stimuli` totals, #5 readable `Retry-After`, #6 Markdown
bodies, #7 hero images (see [`replies/api-status-2026-11-05.md`](replies/api-status-2026-11-05.md)).
Closed on 6 Nov: #8 search, #9 dark-mode emails (see
[`replies/api-status-2026-11-06.md`](replies/api-status-2026-11-06.md)). #9 still
needs checking in real mail apps; that is ours to do, and the reply says how.

---

## 10. The email button turns a different green in Gmail's dark mode

**What happens.** The 6 Nov dark-mode change works: emails stay dark. One
thing is left. In **Gmail on iPhone and Gmail on Android, in dark mode only**,
the button is a darker, duller green that is not `#25F07D`. In light mode it
is right. We have not seen it in other apps, but have not checked them all.

**Why we think so.** Gmail's dark mode recolours bright colours and leaves
dark ones mostly alone, which is why the dark surfaces come through and the
bright button does not. The button's cell and link already carry
`background-image:linear-gradient(#25F07D,#25F07D)`, so in the Gmail apps the
gradient is not protecting it. What Gmail does not recolour is an image.

**What would fix it.**

1. Host a small solid tile of the accent beside the other email assets, for
   example `/static/email/accent.png`: 8 × 8 pixels, every pixel `#25F07D`.
2. On the button's `<td>` and its `<a>`, give that tile as the background,
   repeated, over the colour that is there now:
   ```
   background-color:#25F07D;
   background-image:url(https://api.alvacoreai.com/static/email/accent.png);
   background-repeat:repeat;
   ```
   Keep `bgcolor` on the cell for clients that show neither.
3. Check the label in the same place. It is dark text on the green, and Gmail
   may lighten it now the green holds. If it does, tell us before working
   round it; it is the same trick as `light()` the other way, and worth
   seeing first.

**To check:** Gmail on iPhone and Android, dark mode, before and after, and
that light mode is unchanged.

The composer's preview copy follows the template; when it changes, we update
ours and its parity test.


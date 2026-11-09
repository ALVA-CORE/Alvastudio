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
| 11 | Page the annotations and focus-group lists on the server | Both admin pages download every row (and every user) on each visit | Medium |
| 12 | How many clips were dealt to an intern | The intern's "Assigned and reviewed" bar runs on sample figures | Medium |

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

---

## 11. Page the annotations and focus-group lists on the server

You asked (9 Nov, section 5) to be told when another table needs what
recordings got. These two do: each downloads its whole list on every visit,
plus a user list only to put names on the rows, and both lists only grow.

**`/admin/annotations`** today reads every annotation (`GET /annotations`),
every session (`GET /focus-groups`) and every user (`GET /users`).

- **A name on each row:** `annotator_name` on `AnnotationSummary`, as
  `FocusGroupSessionSummary` already has. Rows carry only `annotator_id`, so
  the page reads every user to name them.
- **Search and sort on `GET /annotations`:** `q` over the id, the topic and
  the annotator's name; `sort` and `order` over `topic`, `annotator`,
  `segment_count`, `tag_count`, `duration`, `status` and `created_at`.
  `status` is there already.
- **The cards and the chart, counted over everything:** total annotations;
  `approved`; in progress (`draft` + `in_progress`); and, for "Annotator
  throughput", each annotator's count by status.
- **"Waiting to be claimed":** sessions with audio and no annotation. Today
  the page works it out from every session against every annotation. A
  filter for it on `GET /focus-groups`, with `total`, would replace both
  downloads.

**`/admin/focus-groups`** today reads every session and every intern.

- **A name on each row:** `intern_name` on `FocusGroupSessionSummary`. Rows
  carry only `intern_id`.
- **Filters on `GET /focus-groups`:** `state`, and `has_audio` (the "Missing
  audio" tab), with `total`.
- **Search and sort:** `q` over the id, the topic, the intern's name and the
  state; `sort` and `order` over `topic`, `intern`, `state`,
  `participant_count`, `duration`, `has_audio` and `created_at`.
- **The cards, counted over everything:** sessions, hours recorded, speakers
  captured, and sessions missing audio.

With those, both pages move to one page at a time the way reviews did: the
table from the list, the cards from a summary.

---

## 12. How many clips were dealt to an intern

The user panel's Activity tab for an intern now has an "Assigned and reviewed"
bar under the contribution graph: of the clips dealt to them, how many they
have judged. It tells an admin whether an intern is keeping up with their
desk. `UserActivity.intern` has `clips_reviewed` but nothing for what was
dealt, so the bar runs on sample figures, marked "Sample" on screen.

**What would fix it:** on `UserActivity.intern`, over the same window as the
rest:

- `clips_assigned`: clips dealt to them, from the bank or by an admin's
  reassignment;
- `on_desk`: clips on their desk now, still waiting for their verdict;
- `taken_back`: clips that left their desk without a verdict (reopened,
  reassigned, or handed back when they stopped reviewing).

We would show `clips_reviewed` against `clips_assigned`, with the other two
as the rest of the bar, so the parts add up to what was dealt.


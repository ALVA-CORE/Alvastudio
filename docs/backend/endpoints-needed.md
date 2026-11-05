# What we need from the backend

Checked against the live OpenAPI document, 5 Nov 2026.

**Every ask and every open question lives here, and nowhere else.**

- [`replies/`](replies/) — each handoff as sent, with what we did with it.
- [`our-handling.md`](our-handling.md) — decisions we made against what the
  API already does. Not asks.

If a reply or a handling note raises a question, it belongs in this file and
the other document points here.

## Open

| # | Ask | Blocks | Priority |
| --- | --- | --- | --- |
| 8 | A text search parameter on the bank and recordings lists | The prompt bank has no search; the reviews page loads every recording to search them | Medium |
| 9 | Keep emails dark in dark-mode mail apps | Every email turns light for anyone whose mail app is in dark mode | High |

Numbers are kept when an ask closes, so code comments that cite one stay
true. Closed on 3 Nov: #1 hours by language, #2 "how did you hear about us",
#3 bulk profiles (see [`replies/api-status-2026-11-03.md`](replies/api-status-2026-11-03.md)).
Closed on 5 Nov: #4 `/stimuli` totals, #5 readable `Retry-After`, #6 Markdown
bodies, #7 hero images (see [`replies/api-status-2026-11-05.md`](replies/api-status-2026-11-05.md)).

---

## 8. Search on the bank and recordings lists

**Prompts and stimuli.** `GET /prompts` and `GET /stimuli` page on the
server, and the prompt bank is about 10,000 deep. There is no search
parameter, so the admin table cannot offer one: searching the 25 rows on
screen would read as if it covered the bank.

**Recordings.** `GET /recordings` has no search either. The reviews page
needs one, so it loads every recording (about 6,000 today, six pages at a
time) and searches in the browser. That stops scaling as the corpus grows.

**What would fix it:** an optional `q` on each, matched case-insensitively
and combined with the filters already there (`is_active`, `recorded`,
`language_variety` and `category` on the banks; `status` and `session_type`
on recordings). `total` should follow it, so paging works on the results.

| Route | `q` matches |
| --- | --- |
| `GET /prompts`, `GET /stimuli` | `text`, `category` |
| `GET /recordings` | the recording's id, the prompt or stimulus text, the contributor's name, the reviewer's name |

A substring match is enough; ranking is not needed. Once it exists the prompt
bank gets its search box back, and the reviews page can page on the server
instead of loading everything.

---

## 9. Emails turn light in dark-mode mail apps

**What happens.** Every email is designed dark. Opened in Gmail or Apple Mail
with the app in **light** mode, it shows dark, as designed. With the app in
**dark** mode, it shows **light**: the app recolours it.

**Why.** The only signal in `email_templates.render` is
`<meta name="color-scheme" content="dark">`. Mail apps in dark mode recolour
any email that does not tell them, in the ways each one listens for, that it
already handles dark mode itself:

- **Apple Mail (iOS and macOS) and Outlook** look for both colour schemes
  declared, and a `prefers-color-scheme: dark` block. Without them they treat
  the email as light and adjust it.
- **The Gmail apps (iOS and Android)** ignore all of that and invert every
  colour in dark mode. A dark background becomes light, and light text becomes
  dark. This is the one that turns the email white.

**What would fix it.** All in `email_templates.render`, so every email gets
it (communications, welcome, resets):

1. **Declare dark mode support properly**, in `<head>`:
   ```html
   <meta name="color-scheme" content="light dark">
   <meta name="supported-color-schemes" content="light dark">
   <style>
     :root { color-scheme: light dark; supported-color-schemes: light dark; }
     @media (prefers-color-scheme: dark) {
       /* The same colours again, !important, so a client that applies its
          own dark styles applies ours. */
       .bg   { background:#090909 !important; }
       .card { background:#202020 !important; }
       .text { color:#F5F5F4 !important; }
       .muted{ color:#A1A1AA !important; }
     }
     [data-ogsc] .text  { color:#F5F5F4 !important; }  /* Outlook app */
     [data-ogsb] .card  { background:#202020 !important; }
   </style>
   ```
   with those classes on the body, card and text cells beside their inline
   styles.

2. **Backgrounds Gmail cannot invert.** Gmail leaves `background-image`
   alone, so give each dark surface a one-colour gradient as well as its
   colour:
   `background:#202020; background-image:linear-gradient(#202020,#202020);`
   on the body, the outer table, the card and the footer.

3. **Text Gmail cannot invert.** Once the backgrounds stay dark, Gmail still
   darkens light text, which then disappears. The usual counter is a blend
   that Gmail alone applies (it puts a `<u>` before the body, which nothing
   else does): give `<body>` the class `body`, wrap each block of light text
   in two spans, and add
   ```css
   u + .body .gmail-screen     { background:#000; mix-blend-mode:screen; }
   u + .body .gmail-difference { background:#000; mix-blend-mode:difference; }
   ```
   ```html
   <span class="gmail-screen"><span class="gmail-difference">Hi Ada,</span></span>
   ```
   Inverted text blended this way comes back as it was written.

**Please check it in** Gmail on iOS and Android, Apple Mail on iOS and macOS,
and Outlook, each in light and dark mode, before and after: a send to a test
inbox, or Litmus / Email on Acid. Steps 2 and 3 are well-known workarounds,
not documented behaviour, so they need seeing on real clients.

The composer draws its preview from a copy of this template, checked against
yours by a test. When it changes, send us the new file and we update the copy.


# What we need from the backend

Checked against the OpenAPI document exported from backend origin/main
`dbc50cb`, 10 Nov 2026. The live API no longer serves `/openapi.json`.

**Every ask and every open question lives here, and nowhere else.**

- [`replies/`](replies/) — each handoff as sent, with what we did with it.
- [`our-handling.md`](our-handling.md) — decisions we made against what the
  API already does. Not asks.

If a reply or a handling note raises a question, it belongs in this file and
the other document points here.

## Open

| # | Ask | Blocks | Priority |
| --- | --- | --- | --- |
| 19 | Push notifications to the installed app | Contributors only see a notification when they open the app | High |

Numbers are kept when an ask closes, so code comments that cite one stay
true. Closed on 3 Nov: #1 hours by language, #2 "how did you hear about us",
#3 bulk profiles (see [`replies/api-status-2026-11-03.md`](replies/api-status-2026-11-03.md)).
Closed on 5 Nov: #4 `/stimuli` totals, #5 readable `Retry-After`, #6 Markdown
bodies, #7 hero images (see [`replies/api-status-2026-11-05.md`](replies/api-status-2026-11-05.md)).
Closed on 6 Nov: #8 search, #9 dark-mode emails (see
[`replies/api-status-2026-11-06.md`](replies/api-status-2026-11-06.md)). #9 still
needs checking in real mail apps; that is ours to do, and the reply says how.
Closed on 10 Nov: #10 the email button in Gmail's dark mode, #11 paging the
annotations and focus-group lists, #12 clips dealt to an intern (see
[`replies/api-status-2026-11-10.md`](replies/api-status-2026-11-10.md)).
Closed again on 10 Nov, in the third handoff: #10 the button's label, #13
streaming audio, #14 measured lengths on rows (see
[`replies/api-status-2026-11-10c.md`](replies/api-status-2026-11-10c.md)). #10
still needs checking in Gmail on iPhone and Android; that is ours to do.
Closed on 15 Nov: #15 emailing interns and annotators, #16 deleting chosen
prompts, stimuli and topics, #17 whether a weekly-run payment reached the bank,
#18 Bachs's hosted onboarding (see
[`replies/api-status-2026-11-15b.md`](replies/api-status-2026-11-15b.md)).

---

## 19. Push notifications to the installed app

**Now:** the studio installs as an app on phones (manifest and service
worker are live). Notifications reach people only through `GET
/notifications`, so a contributor learns of one only by opening the app.

**What we need:** Web Push, so each new notification also arrives on the
phone's lock screen.

- **A VAPID key pair** on the server, and the public key for us:
  `GET /push/public-key` answering `{ "public_key": "<base64url>" }`.
- **Saving a phone:** `POST /push/subscriptions` with the browser's
  subscription as it gives it, `{ endpoint, keys: { p256dh, auth } }`, for
  the signed-in user. Safe to repeat for the same `endpoint`. One person can
  have several (phone and laptop).
- **Forgetting one:** `DELETE /push/subscriptions` with `{ endpoint }`, for
  when someone turns it off or signs out.
- **Sending:** whenever a notification is created for someone, a push to each
  of their subscriptions with a small JSON payload:
  `{ title, body, url, key }`, where `url` is a studio path (for example
  `/contributor/notifications`) and `key` is the notification's `key`. A
  `404` or `410` from the push service means the subscription is gone:
  delete it.

**Questions:**

1. Which kinds should push? All of them, or not `queue` (it comes back each
   time new work arrives)?
2. Should a person be able to turn off some kinds, or is on/off enough?
3. Who should get them: contributors only, or interns and annotators too?

**On our side, once it lands:** a "Turn on notifications" row on the profile
(the permission has to be asked from a tap), the service worker showing each
push and opening `url` in the app when tapped, and saving or forgetting the
subscription. iPhones get pushes only when the app is installed to the home
screen, on iOS 16.4 or later.

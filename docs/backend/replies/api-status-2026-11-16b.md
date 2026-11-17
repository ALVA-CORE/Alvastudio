# Frontend handoff: 16 Nov (b), push notifications (ask #19)

Received 16 Nov 2026; wired 17 Nov. Checked against the `openapi` artifact
exported by CI for origin/main `9d64df3`.

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| # | Our handling |
| --- | --- |
| 1 Turn on | A "Push notifications" row on every role's profile (contributor, intern, annotator, admin settings), showing On or Off. Turn on asks permission from the tap, reads `GET /push/public-key`, subscribes with `userVisibleOnly: true` and that key, and sends `subscription.toJSON()` as it is to `POST /push/subscriptions`. If the save fails, the browser subscription is dropped again. A 503 reads "Push notifications are not available right now". A blocked permission shows "Notifications are blocked" and no button. On each sign-in or start, an existing subscription is sent again, quietly; nothing is ever subscribed without a tap. |
| 2 `sw.js` | `push` shows `title` and `body` with `tag: key`, `data: {url, key}` and the app icon. A push that can't be read still shows "Alvastudio". `notificationclick` focuses an open studio window and navigates it to `url`, or opens `url`. A `url` off our origin opens `/`. |
| 3 Forget | Turn off sends `DELETE /push/subscriptions` with the endpoint, then unsubscribes the browser. Sign-out does the same before the token is dropped, without waiting; it never blocks signing out. |
| 4 Send a test | On the same sheet while it is on. `sent: 0` says it did not reach this device; a 429 shows the API's message. |

## Found while wiring

| Where | What |
| --- | --- |
| iPhone | The row is hidden where `PushManager` is missing, which is every Safari tab on iPhone. The "Install the app" row is already there for them. |
| Development | The service worker is registered in production builds only, so the row is hidden in `npm run dev`. Test with `vite build` and `vite preview`, or on the deployed site. |
| `badge` | Not set: we have no single-colour icon, and Android draws a full-colour one as a white square. |

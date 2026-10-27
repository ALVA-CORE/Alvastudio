# Frontend handoff — contributor waiting list

This answers the one open ask of 27 Oct: holding the platform at a set number
of contributors. It is enforced on the server now, so the admin switch reaches
everybody and not just the browser it was pressed in. Your confirm dialog can
drop the "this browser only" caveat once this is deployed.

| Method | Path | Who can call it | Result |
| --- | --- | --- | --- |
| `GET` | `/platform/capacity` | Anyone, no token | The switch and how full the platform is. |
| `PATCH` | `/platform/capacity` | Admin | Changes `open` and/or `limit`; answers the same shape. |

## The switch

```json
{ "open": true, "accounts": 412, "limit": 500, "accepting": true }
```

- **`open`** is the switch an admin flips.
- **`limit`** is the number of contributors at which sign-ups close by
  themselves. `null` means no cap.
- **`accounts`** counts contributors who are **in**: approved and not
  deactivated. It does **not** count the waiting list, deactivated accounts, or
  any other role, so deactivating somebody frees a place. It can go **above**
  `limit`, because an admin may let somebody in off the waiting list when the
  platform is full (see Approval).
- **`accepting`** is one field more than you asked for. It is `open` and
  `accounts` below `limit`, so you don't have to work it out: `open: true` with
  `accounts` at `limit` is closed. Use it on the sign-up page.
- It starts **open with no limit**, so nothing changes on deploy until an admin
  acts.

`PATCH` changes only the fields you send:
- `{"open": false}` closes now.
- `{"limit": 500}` sets the cap, and `{"limit": null}` removes it.
- `{}` changes nothing.
- `"open": null`, a negative `limit`, or a `limit` over 2,147,483,647 is `422`.

Each real change is in the audit log (`GET /audit`, whole-platform view, with
`subject_type: "platform"`). It reads, for example, "Contributor sign-ups closed
by Ada Obi." Re-saving the same values records nothing.

`admin.users_by_role` on the admin dashboard still counts **every** contributor
account, the waiting list included. It is a count of accounts, which is a
different number from `accounts` here.

## Signing up while full

`POST /auth/register` with `role: contributor` while `accepting` is false:

```json
201 { "...": "...", "approved": false, "waitlisted": true }
```

- **The account is created**, never refused.
- **`waitlisted`** is new on every user object (`/auth/me`, `GET /users`, and
  the register response). It is true only for a contributor on the waiting
  list. A pending intern or annotator reads `approved: false,
  waitlisted: false`, so the two can have different words on screen.
- **Emails:** they get the waiting-for-approval email straight away, worded for
  the waiting list ("your account is on the waiting list … we will email you as
  soon as a place opens"). Every admin gets "An account is waiting for
  approval". No new templates.
- **Interns and annotators are unaffected**, open or closed.

**After that, while they wait:**
- **Sign-in works**: `POST /auth/login` returns a token, as it does for a
  pending intern. The 403 comes from the role's routes, not from login.
- **Their details still go in.** `PUT /onboarding/profile` and
  `POST /onboarding/consent` work while waitlisted, so everything they fill in
  is kept.
- **Contributor routes answer 403** (uploads, `GET /recordings/quota`, every
  `/wallet` route) with exactly:

  ```json
  { "detail": "Contributor account is on the waiting list" }
  ```

  This string is a contract now, like the intern and annotator ones.

## Approval

- **The waiting list** is `GET /users?approved=false&role=contributor`. Without
  `role`, the same query also returns pending interns and annotators.
- **Approving** is the existing `POST /users/{id}/approve` (and its deprecated
  alias). It sends the existing "Your account is approved" email.
- **It works at the limit.** The cap decides who waits at sign-up; letting
  somebody in is the admin's call, so `accounts` can end above `limit`.
- **Nothing is let in automatically** when a place opens. An admin approves
  each person.
- **The bell:** each waitlisted contributor is a `kind: "approval"` item for
  admins, with `user_id`. Its title is "Contributor on the waiting list" and its
  body "Ada Obi (ada@…) signed up while contributor sign-ups were closed." It
  goes away when they are approved or deactivated, as the intern ones do.
- **Approving a contributor who is already in** is still `409` ("A contributor
  account does not need approval.").
- **`GET /users/contributors`** (the reviewer's name list) leaves out the
  waiting list. They cannot upload, so there is nothing of theirs to review.

## Stable codes

A duplicate email on `POST /auth/register` (and on admin `POST /users`):

```json
409 { "detail": "Email already registered", "code": "email_taken" }
```

Branch on `code`. `detail` may be reworded.

**There is no `at_capacity` code**, because nothing refuses for capacity: the
`201` with `waitlisted: true` is the signal. You can drop the
`at capacity` / `registration is closed` string match. Errors other than these
are unchanged: `{"detail": ...}` with no `code`.

## Also changed

- **The admin "An account is waiting" email** said "applied to join Alva
  Studio as an contributor" for any role but intern and annotator. It now picks
  the right article.
- **The sender you were waiting on is live.** Jesse configured the verified
  domain on 27 Oct, and production now sends from
  `Alva Studio <contact@alvacoreai.com>`, not Resend's testing address. The
  recovery `503` was the guard against that testing address, so it no longer
  fires for this reason. Whether a given email was accepted is still
  `GET /users/{id}/emails`. If a row there reads `failed`, tell us.

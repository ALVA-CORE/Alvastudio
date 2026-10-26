# Re: Endpoints we need (24 Oct)

Thanks for the five asks. All five are answered here:

| Your ask | Answer | Where |
| --- | --- | --- |
| 1. Which emails do you send? | The full list below | §1 |
| 2. An approved recovery sent no email | Found the cause. It is configuration, not code, and is being fixed. Until then the API says so instead of pretending | §2 |
| 3. Sign-ins in the audit log | Shipped | §3 |
| 4. Per-person activity | Shipped: `GET /users/{id}/activity` | §4 |
| 5. `GET /banks` when the provider is down | Shipped: a cache | §5 |

---

## 1. Which emails we send

**First, read §2: none of these is reaching people yet.** This is the list once
the sending domain is verified.

**Your table, answered:**

| Event | Email? |
| --- | --- |
| Signing up | **Yes.** A contributor gets "Welcome to Alva Studio". An intern or annotator gets "Your application is waiting for approval", and **every admin** gets "An account is waiting for approval". |
| An account approved | **Yes**, "Your account is approved". |
| An account declined | **No.** The API has no "decline" for an applicant, so there is no email for it. |
| A clip approved, rejected or flagged | **No.** Bell only. |
| A milestone reached, ₦5,000 credited | **No.** Bell only. |
| A withdrawal paid or failed | **No.** |
| An account flagged as a duplicate | **No.** |
| Identity check passed or failed | **No.** |

**The other emails:**

| Email | Who gets it | When |
| --- | --- | --- |
| "Set your Alva password" | the person | an admin creates their account without a password (an invitation) |
| "We received your password reset request" | the person | they ask to recover their account |
| "Review a password reset request" | every admin | someone asks to recover their account |
| "Your password reset is approved" (the link) | the person | an admin approves a recovery, or issues a manual reset |
| "An update on your password reset request" | the person | an admin declines a recovery |
| "Your password was updated" | the person | after a password change or a reset |
| "You have work waiting" | an intern or annotator | work is assigned to them, at most one email an hour |

Every subject reads "*title* · Alva Studio".

**The bell and the inbox.** Only one event fires in both: "An account is waiting
for approval", for admins. Everything else is one or the other:
- **Bell only:** verdicts, annotation outcomes and earnings.
- **Email only:** everything in the table above.
- **Worth knowing:** password reset requests reach admins **only** by email; the
  bell does not list them. Your admin reset page should keep fetching
  `GET /users/password-reset-requests` itself, rather than wait to be told.

## 2. The recovery email that never arrived

**The cause.** Production has been sending from Resend's testing address. The
setting for the real sender was never filled in when emails shipped on 22 Oct.
- Resend delivers that address's mail only to the one person who owns the
  Resend account, and refuses it for everyone else.
- The API recorded each refusal quietly while answering 200. So every reset
  link, approval and invitation since 22 Oct was refused.
- It is not spam, and it is not your screen.

**The real fix** is outside the code: verifying our domain with Resend. It is
under way. Once it is done, mail flows with no change needed from you.

**What changed in the API meanwhile, so it stops saying something false:**
- **While the sender cannot reach anyone, nothing is queued.** The recovery
  routes answer **503**, as they always did when email was switched off:
  - `POST /auth/password-reset/request`: "Password recovery emails are
    temporarily unavailable. Contact support."
  - `POST /users/password-reset-requests/{id}/approve`: "Password recovery
    emails are temporarily unavailable."

  Please show these as-is, not as a success.
- **The manual reset still works.** `POST /users/{id}/password-reset` returns the
  link for the admin to hand over. It is the way back in until mail is
  verified.
- **New: `GET /users/{id}/emails`** (admin), each email the API tried to send
  that person, newest first:
  ```json
  [{"id": "…", "kind": "reset_link", "queued_at": "…", "sent_at": null,
    "status": "failed", "attempts": 1, "error": "HTTP_403"}]
  ```
  - `status` is one of:
    - `sent`: the mail service accepted it. That is not proof it reached the
      inbox.
    - `pending`: waiting, or retrying after a temporary failure.
    - `failed`: refused, and will not be retried.
    - `skipped`: no longer needed by the time it was due.
  - It supports `?envelope=true`.

  After approving a recovery, this is how a screen can tell "sent" from
  "failed" instead of assuming.
- **Emails that already failed are not re-sent.** Once mail works, anyone still
  locked out should ask again (the form allows it 15 minutes after a decision),
  or an admin can use the manual reset.

## 3. Sign-ins in the audit log

**New actions on the user's history:**

| `action` | `detail` |
| --- | --- |
| `auth.signed_in` | "Signed in on Chrome on Android." · "Signed in on Safari on iOS, a new device." |
| `auth.signed_out` | "Signed out on Chrome on Android." |
| `auth.sign_in_failed` | "A sign-in with the wrong password was refused (Chrome on Android)." · "A sign-in was refused because the account is deactivated (Chrome on Android)." |
| `user.sessions_ended` | "Signed out everywhere: their password was changed." Other endings: "…their password was reset with a link", "…their role was changed", "…the account was deactivated", "…they chose to sign out everywhere". |

**Device and location:**
- **A device label only, no IP address.** It is read from the browser, shows the
  browser and system, and never a version or model.
- "A new device" means this person has not signed in with that label in the
  last 90 days. Everyone's first sign-in after this release counts as new.

**Volume:**
- `GET /audit` takes `sign_ins=exclude|include|only`, and **the default is
  `exclude`**. Your History tabs are therefore unchanged, and a "Sign-ins" view
  asks for `only`. `X-Total-Count` and the envelope's `total` follow the filter.
- `user.sessions_ended` is not a sign-in event. It appears in the default
  history, right above the password change or role change that caused it.

**Retention.** Sign-in events are kept **90 days**, then deleted. Nothing else in
the audit log expires.

**Refused sign-ins:**
- These are recorded only for an account that exists. A mistyped email leaves
  no trace, and the typed address is never stored.
- At most 20 per account per hour are recorded.
- The `401` and `403` answers are unchanged.

**Signing out: new `POST /auth/logout`** (needs the token, returns 204):
- It records the sign-out. Please call it from your sign-out button.
- **It does not invalidate that token.** Tokens are signed and stateless, and
  there is no revocation list, so a copied token works until it expires. Your
  client discards it as now.
- `{"everywhere": true}` **does** revoke. It ends every session that person has,
  this one included, and records "Signed out everywhere".

## 4. Per-person activity: `GET /users/{id}/activity?window_days=365`

Admin only. `window_days` runs from 1 to 365; the default is 365.

```json
{
  "user_id": "…", "role": "contributor", "window_days": 365,
  "start_date": "2025-10-25", "end_date": "2026-10-24",
  "unit": "clips uploaded",
  "daily": [{"date": "2025-10-25", "count": 0}, …],
  "total": 412, "active_days": 37, "best_streak": 6,
  "contributor": {"submitted": 412, "approved": 380, "rejected": 20, "flagged": 2, "pending": 10},
  "intern": null, "annotator": null
}
```

- `daily` has every day in the window, quiet ones as `0`, in UTC days like
  every dashboard. `total` is its sum, and `best_streak` is the longest run of
  consecutive days with any activity.
- **What one count means depends on the role**, and `unit` says it. The figures
  are the same ones that person's own dashboard counts:

| Role | One count is | Outcome block (same window) |
| --- | --- | --- |
| contributor | a clip uploaded | `contributor`: submitted, approved, rejected, flagged, pending (status now) |
| intern | a verdict given **or** a session run | `intern`: clips reviewed, approved, rejected, flagged, sessions run, participants |
| annotator | a segment created | `annotator`: annotations started, submitted, approved, sent back, rejected, segments created |
| admin | an action they took (from the audit log) | none |

Only the block for the person's role is filled; the others are `null`.

## 5. The bank list when the provider is down

`GET /banks` is now cached:
- **Fresh for 6 hours.** When a refresh fails, the last good list is served for
  up to **7 days**, so a provider blip no longer takes the picker down.
- **The 503 now only happens** if the provider has been unreachable since before
  anything was cached, or for more than a week.
- **An empty list from the provider is now a 503 too.** It used to be a `200 []`,
  which was the empty picker you saw.
- Still served from the provider, never a hardcoded list, so every code in it
  passes name enquiry.

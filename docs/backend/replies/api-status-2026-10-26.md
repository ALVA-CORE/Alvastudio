# Frontend handoff — feedback API and sign-in retention

This answers both open asks: the feedback routes, and sign-ins kept past 90
days (the last section).

The in-app feedback form and admin worklist are available under `/api/v1`.
All three routes require a bearer token. Submission is available to every
signed-in role; listing and triage are admin-only. Feedback does not send email.

| Method | Path | Who can call it | Result |
| --- | --- | --- | --- |
| `POST` | `/feedback` | Any signed-in role | Creates feedback; `201` and one feedback row. |
| `GET` | `/feedback` | Admin | Lists feedback, newest first. |
| `PATCH` | `/feedback/{id}` | Admin | Changes the workflow status. |

## Form submission

Send `{kind, rating, message, page}` to `POST /feedback`. A successful request
returns `201` with the created row:

```json
{
  "kind": "bug",
  "rating": 2,
  "message": "The upload button froze.",
  "page": "/contributor/record"
}
```

- `kind` is one of `bug`, `idea`, `confusing`, `praise`, or `other`.
- `rating` is required and must be an integer from 1 through 5.
- `message` must be 10–4,000 characters after leading/trailing whitespace is
  ignored for the minimum check.
- `page` is 1–255 characters and starts with `/`.
- The author’s name, email, and role come from the bearer token. Any versions
  sent in the body are ignored.

Invalid or missing required input receives `422`. There is a rolling limit of
five submissions per account per hour; the next one receives `429` with
`Retry-After` in whole seconds, rounded up to the oldest submission's expiry.

One UI mismatch remains: the written API ask makes stars required, while the
form’s “On our side” table describes them as optional. The API follows the ask,
so the stars need to be required before submission.

## Admin worklist and bell

`GET /feedback` accepts optional `status`, `kind`, `limit`, `offset`, and
`envelope=true`. It returns a bare array by default, adds `X-Total-Count`, and
returns `{items, total, limit, offset}` with the envelope option. Each row
contains `id`, `user_id`, `full_name`, `email`, `role`, `kind`, `rating`,
`message`, `page`, `status`, `status_changed_at`, and `created_at`.
`full_name` and `email` are filled from the current account at read time.

The status set is `new`, `reading`, `done`, and `wont_fix` (display labels:
New, In progress, Done, Dismissed). Send the required `{status}` body to
`PATCH /feedback/{id}`; success returns the updated row. An unknown id is
`404`; a missing, null, or unsupported status is `422`. Repeating the current
status does not change its recorded triage time or actor.

Each `new` row creates an admin-only notification with `kind: "feedback"`, key
`feedback:{id}`, and `feedback_id` set to the row id. The title is
`New feedback: Bug` (capitalized kind); the body includes the author (or
`a deleted account`), their role, page, and the first 120 characters of the
message. It disappears when an admin moves the row out of `new`; normal
notification read marking works.

If an author’s account is deleted, the feedback text and role snapshot remain,
while `user_id`, `full_name`, and `email` become `null`.

## Sign-in retention: a year

Sign-in events (`auth.signed_in`, `auth.signed_out`, `auth.sign_in_failed`)
are now kept **365 days**, then deleted, as you suggested. Nothing has been
lost: recording began on 24 Oct, so every event since then is kept the full
year. No request or response shape changes.

- **"A new device"** now means this person has not signed in with that device
  label in the last year. The check reads at most their last 500 sign-ins, so
  for someone who signs in more often than that, it means "not among their
  last 500".
- **The annotation activity log stays at 90 days.** It is a different record:
  annotators acknowledge it before anything is logged, and 90 days is part of
  what they agreed to.
- The `sign_ins` parameter on `GET /audit` now says "kept a year" in the
  OpenAPI document.

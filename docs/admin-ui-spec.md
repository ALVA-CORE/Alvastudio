# Admin dashboard — feature spec

What the admin surface needs to do, and which API each part uses.

Written against the live API at `https://api.alvacoreai.com` on 25 Sep 2026.
Nothing here is built yet. No UI decisions are made in this document — it lists
features, not screens.

Every feature is marked:

- **Ready** — the endpoint exists today, can be built now
- **Blocked** — needs a backend change first

---

## Why this matters now

Two things are stuck without an admin surface:

1. **The prompt and stimulus banks are empty.** Contributors log in and have
   nothing to record. Only an admin can add prompts, and admins cannot
   self-register.
2. **Nobody can see the corpus.** There is no way to answer "how many hours do we
   have", "which annotators are working", or "what is being rejected and why".

---

## 1. Prompt and stimulus banks — **Ready**

The highest priority. This unblocks contributors today.

**Features**

- List prompts, filter by language variety, category and active/inactive
- Create a prompt: text, language variety, category
- Edit a prompt
- Deactivate a prompt (soft delete — existing recordings keep working)
- Same four for stimuli
- Bulk import from a pasted list or CSV, so a linguist can load 200 at once
- See `used_by_count` per prompt, to spot ones nobody is recording

**API**

| Action | Endpoint |
| --- | --- |
| List | `GET /prompts`, `GET /stimuli` |
| Create | `POST /prompts`, `POST /stimuli` |
| Edit | `PATCH /prompts/{id}` |
| Deactivate | `DELETE /prompts/{id}` |

**Blocked:** stimuli have no `PATCH` or `DELETE`. Prompts have both. Ask the
backend to add them so the two banks behave the same.

**Blocked:** no bulk create. Either add one, or the UI loops one request per row
— acceptable for 200, not for 5,000.

---

## 2. User management — **Blocked**

**Features**

- List all users, filter by role and active/inactive
- Create a user with any role, including admin and annotator
- Deactivate a user
- Reset a password, or send a reset link
- See each user's own stats without leaving the page

**API** — none of this exists.

**What the backend needs to add:**

- `GET /users` with role and status filters
- `POST /users` (admin-only create, any role)
- `PATCH /users/{id}` to deactivate or change role
- A password reset route

Today the only way to make a user is self-registration, and admin is correctly
blocked from that. So **admins can only be created through the
`ALVA_BOOTSTRAP_ADMIN_*` env vars**. That does not scale past the first one.

---

## 3. Corpus overview — **Blocked**

The number the whole project is judged on: how much usable audio exists.

**Features**

- Total hours collected, split by language variety
- Hours by status: submitted, in review, approved, rejected
- Hours by collection type: prompt read, stimuli narration, focus group
- Speaker demographics across the whole corpus — age, gender, region
- Growth over time

**API** — there is no corpus-level endpoint. `/dashboard/contributor` and
`/dashboard/intern` are per-person.

**What the backend needs to add:** `GET /dashboard/admin` returning the totals
above, plus a daily or weekly series for the growth chart.

---

## 4. Review oversight — **Partly ready**

**Features**

- Every recording across all contributors, filterable by status and type
- Open any recording, play it, see its review history
- Rejection reasons, grouped — tells you whether the problem is guidance or
  equipment
- Per-reviewer throughput and approval rate
- Reassign or reopen a review

**API**

| Action | Endpoint | Status |
| --- | --- | --- |
| All recordings | `GET /recordings` (admins see all) | Ready |
| Play audio | `GET /recordings/{id}/audio` | Ready |
| Review history | `GET /reviews/recording/{id}` | Ready |
| Anyone's dashboard | `GET /dashboard/contributor/{id}` | Ready |

**Blocked:** no per-reviewer stats, no way to reassign or reopen a review, and
no aggregate of rejection reasons.

---

## 5. Annotation oversight — **Partly ready**

**Features**

- Every annotation across all annotators, filter by status
- Open one read-only and see the transcript, segments and tags
- Approve or send back for rework
- Per-annotator throughput
- Which sessions are unclaimed and for how long

**API**

| Action | Endpoint | Status |
| --- | --- | --- |
| All annotations | `GET /annotations` (admins see all) | Ready |
| Open one | `GET /annotations/{id}` | Ready |
| Approve / send back | `POST /annotations/{id}/review` | Ready |
| Unclaimed queue | `GET /annotations/queue` | Ready |

**Blocked:** no per-annotator stats.

---

## 6. Focus group oversight — **Ready**

**Features**

- Every session across all interns
- Open one: participants, speaker turns, audio
- Which sessions have no audio yet — these never reach annotators, so they are
  invisible work
- Per-intern session counts

**API**

`GET /focus-groups` (admins see all), `GET /focus-groups/{id}`,
`GET /focus-groups/{id}/audio`, `GET /dashboard/intern/{id}`.

A session with `has_audio: false` is the thing to surface. It does not appear in
the annotation queue at all.

---

## 7. Payments and rates — **Partly ready**

**Features**

- Current rate per unit type
- Change a rate
- Any contributor's earnings
- Everyone's earnings in one table, for a payment run
- Export to CSV

**API**

| Action | Endpoint | Status |
| --- | --- | --- |
| List rates | `GET /payments/rates` | Ready |
| Change a rate | `PUT /payments/rates/{unit_type}` | Ready |
| One contributor's earnings | `GET /payments/earnings/{id}` | Ready |

**Blocked:** no endpoint for everyone's earnings at once, and no export. Both are
needed to actually run a payment.

---

## 8. Audio QC tools — **Ready**

The ML endpoints exist and are admin-usable today.

**Features**

- Upload a clip and see its quality score, SNR, silence ratio and transcript
- Check a transcript's relevance to its prompt
- Useful for tuning thresholds before applying them to the whole corpus

**API** — `POST /audio/analyze`, `POST /audio/transcribe`,
`POST /audio/quality-score`, `POST /relevance/score`.

**Note:** all four return 503 when the optional ML stack is not installed. The UI
must treat that as a normal state, not an error.

---

## Build order

1. **Prompt and stimulus banks** — ready now, and unblocks every contributor
2. **Focus group oversight** — ready now
3. **Review and annotation oversight** — mostly ready
4. **Corpus overview** — after `GET /dashboard/admin` exists
5. **User management** — after the user endpoints exist
6. **Payments** — after bulk earnings and export exist

---

## What to ask the backend for

In priority order:

1. `GET /users`, `POST /users`, `PATCH /users/{id}` — admin user management
2. `GET /dashboard/admin` — corpus totals and a growth series
3. `PATCH` and `DELETE` for stimuli, matching prompts
4. Per-reviewer and per-annotator throughput stats
5. Bulk create for prompts and stimuli
6. All-contributor earnings, and a CSV export
7. Reassign or reopen a review

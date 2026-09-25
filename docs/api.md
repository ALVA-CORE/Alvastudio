# Alva Studio Backend API

Reference for `Alva Studio Backend 0.1.0` — the Nigerian English / Nigerian Pidgin
speech-data platform.

**Milestone scope:** Task 1 (Identity + Prompt Reader), Task 2 (Stimuli), Task 4
(Focus groups), Task 7 (Review / QA). See [§14](#14-integration-readiness) for what
the frontend needs that this milestone does not yet expose.

---

## 1. Conventions

| | |
| --- | --- |
| Base path | `/api/v1` (except `/health`) |
| Auth | Bearer JWT, `Authorization: Bearer <token>` |
| Content type | `application/json` unless stated (uploads are `multipart/form-data`) |
| IDs | Opaque strings — treat as UUIDs, never parse |
| Timestamps | ISO 8601 UTC, e.g. `2019-08-24T14:15:22Z` |

### Status codes

| Code | Meaning |
| --- | --- |
| `200` | Success |
| `201` | Created |
| `422` | Validation error (FastAPI shape) |
| `415` | Unsupported audio type (audio routes) |
| `503` | Optional ML stack not installed (audio + relevance routes) |

### Testing protected endpoints in Swagger

1. Register via `POST /auth/register` (role `contributor` or `intern`).
2. Click **Authorize**, enter your **email in the username field** plus your password.
3. The token is attached to every subsequent request automatically.

Admin-only routes need an admin account, seeded via `ALVA_BOOTSTRAP_ADMIN_*` env vars.

---

## 2. Shared enums

Transcribe these into the client verbatim — a value the API rejects is a request
that fails at the boundary rather than in the UI.

```ts
type UserRole        = "contributor" | "intern" | "admin";
type LanguageVariety = "nigerian_english" | "nigerian_pidgin";
type AgeBracket      = "under_18" | "18_24" | "25_34" | /* … */;
type Gender          = "male" | "female" | /* … */;
type PidginFluency   = "conversational" | /* … */;
type ConsentType     = "ndpa_data_use";
type SessionType     = "prompt_read" | "stimuli_narration";
type RecordingStatus = "submitted" | "in_review" | "approved" | "rejected" | "flagged";
type QualityAnswer   = "yes" | "partial" | "no";
type Verdict         = "approve" | "reject" | "flag";
```

> `AgeBracket`, `Gender` and `PidginFluency` are referenced by the spec but their
> full member lists are not enumerated in the published document. Confirm against
> `/openapi.json` before hardcoding.

---

## 3. `auth`

Register, log in, obtain a bearer token.

### `POST /api/v1/auth/register` → `201`

```jsonc
// request
{
  "email": "ada@example.com",          // required
  "password": "passw0rd123",           // required, 8–128 chars
  "full_name": "Ada Okafor",           // required, 1–255 chars
  "phone": "+2348012345678",           // optional, nullable
  "role": "contributor"                // default "contributor"
}
```

```jsonc
// 201 — UserOut
{
  "id": "string",
  "email": "user@example.com",
  "full_name": "string",
  "phone": "string",
  "role": "contributor",
  "is_active": true,
  "created_at": "2019-08-24T14:15:22Z"
}
```

### `POST /api/v1/auth/login` → `200`

JSON login for application clients. **This is the one the frontend uses.**

```jsonc
// request
{ "email": "ada@example.com", "password": "passw0rd123" }

// 200
{ "access_token": "string", "token_type": "bearer" }
```

### `POST /api/v1/auth/token` → `200`

OAuth2 password-flow endpoint powering Swagger's Authorize button.
`application/x-www-form-urlencoded`, with the **email in the `username` field**.

| Field | Required |
| --- | --- |
| `username` | ✅ (the email) |
| `password` | ✅ |
| `grant_type`, `scope`, `client_id`, `client_secret` | optional |

Same `{ access_token, token_type }` response. Prefer `/auth/login` outside Swagger.

### `GET /api/v1/auth/me` → `200` 🔒

Returns `UserOut` for the bearer token's user.

---

## 4. `onboarding`

Participant metadata (profile) and NDPA consent capture.

### `GET /api/v1/onboarding/profile` → `200` 🔒
### `PUT /api/v1/onboarding/profile` → `200` 🔒

**Merge-update.** Only fields present in the body are applied, so the profile can
be completed incrementally across several calls — which is exactly how the
multi-step onboarding form should submit.

```jsonc
{
  "age_bracket": "25_34",
  "gender": "female",
  "state_of_origin": "Anambra",
  "state_of_residence": "Lagos",
  "primary_residence_region": "Lagos, South-West",
  "accent_influence_region": "South-East (Igbo)",
  "native_languages": ["Igbo", "English"],
  "pidgin_fluency": "conversational",
  "preferred_language_variety": "nigerian_english",
  "device_mic": "Boya BY-M1 lavalier"
}
```

Every field is nullable/optional. Response echoes the merged `ProfileOut`.

### `GET /api/v1/onboarding/consent` → `200` 🔒

Array of consent records.

### `POST /api/v1/onboarding/consent` → `201` 🔒

Appends an **immutable** acknowledgment. There is no update or delete — a change
of mind is a new record.

```jsonc
// request
{
  "accepted": true,                    // required
  "consent_type": "ndpa_data_use",     // default
  "policy_version": "1.0",             // default, ≤32 chars
  "notes": null
}

// 201 — ConsentOut
{
  "id": "string",
  "user_id": "string",
  "consent_type": "ndpa_data_use",
  "accepted": true,
  "policy_version": "string",
  "notes": "string",
  "accepted_at": "2019-08-24T14:15:22Z"
}
```

---

## 5. `prompts`

Prompt bank CRUD (admin) and per-contributor assignment.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/v1/prompts/next` 🔒 | Next prompt assigned to the caller |
| `POST` | `/api/v1/prompts` 🔒 | Create — admin |
| `GET` | `/api/v1/prompts` 🔒 | List, filterable |
| `GET` | `/api/v1/prompts/{prompt_id}` 🔒 | Fetch one |
| `PATCH` | `/api/v1/prompts/{prompt_id}` 🔒 | Partial update — admin |
| `DELETE` | `/api/v1/prompts/{prompt_id}` 🔒 | **Soft delete** — admin |

`DELETE` deactivates rather than removes, so existing recordings keep their
foreign key while the prompt is withdrawn from assignment.

**List query params:** `language_variety`, `category`, `is_active`,
`limit` (1–200, default 50), `offset` (≥0, default 0).

```jsonc
// PromptOut
{
  "id": "string",
  "text": "string",
  "language_variety": "nigerian_english",
  "category": "string",
  "used_by_count": 0,
  "is_active": true,
  "created_by": "string",
  "created_at": "2019-08-24T14:15:22Z"
}
```

```jsonc
// create — text and language_variety required
{
  "text": "Abeg, wetin dey happen for here?",
  "language_variety": "nigerian_pidgin",
  "category": "everyday-conversation",
  "is_active": true
}
```

---

## 6. `stimuli`

Open-ended narration cards (Task 2). **Identical shape to `prompts`** — same
`PromptOut` body, same filters, same create/patch fields.

| Method | Path |
| --- | --- |
| `GET` | `/api/v1/stimuli/next` 🔒 |
| `POST` | `/api/v1/stimuli` 🔒 |
| `GET` | `/api/v1/stimuli` 🔒 |
| `GET` | `/api/v1/stimuli/{stimulus_id}` 🔒 |

> No `PATCH`/`DELETE` on stimuli in this milestone, unlike prompts.

---

## 7. `recordings`

Prompt-read and stimuli-narration audio submission and retrieval.

### `POST /api/v1/recordings/prompt-read` → `201` 🔒

`multipart/form-data`

| Field | Required |
| --- | --- |
| `prompt_id` | ✅ |
| `file` | ✅ (binary) |
| `duration_seconds` | optional |
| `device_mic` | optional |

### `POST /api/v1/recordings/stimuli` → `201` 🔒

Same, but takes `stimulus_id`. Modelled separately because it is tagged
`stimuli_narration` and references a stimulus rather than a prompt.

### `GET /api/v1/recordings` → `200` 🔒

**Contributors see their own; reviewers and admins see all.** Filter with
`status`, `session_type`, `limit` (1–200, default 50), `offset`.

### `GET /api/v1/recordings/{recording_id}` → `200` 🔒
### `GET /api/v1/recordings/{recording_id}/audio` → `200` 🔒

The audio route returns the file itself — use it as the `src` for playback rather
than expecting a URL in the JSON body.

```jsonc
// RecordingOut
{
  "id": "string",
  "contributor_id": "string",
  "session_type": "prompt_read",
  "prompt_id": "string",
  "stimulus_id": "string",
  "audio_content_type": "string",
  "audio_size_bytes": 0,
  "original_filename": "string",
  "duration_seconds": 0,
  "device_mic": "string",
  "status": "submitted",
  "assigned_reviewer_id": "string",
  "reviewed_at": "2019-08-24T14:15:22Z",
  "created_at": "2019-08-24T14:15:22Z"
}
```

---

## 8. `audio`

On-demand QC and speech-to-text. **All three require the optional ML stack and
return `503` without it** — treat that as an expected state, not an outage.

### `POST /api/v1/audio/analyze` → `200` 🔒

`multipart/form-data` with `file`. Duration + silence gate.

```jsonc
{
  "accepted": false,
  "duration_seconds": 3.14,
  "trimmed_duration_seconds": 1.02,
  "reasons": ["Only 1.02s of speech remains after trimming silence; minimum is 2.00s."]
}
```

### `POST /api/v1/audio/transcribe` → `200` 🔒

`file`, plus `trim` (default `true`). Trimming improves accuracy and makes
`speech_detected: false` meaningful for silent clips.

```jsonc
{
  "transcript": "I went to Abuja last December to see my cousin.",
  "duration_seconds": 6.2,
  "trimmed_duration_seconds": 4.85,
  "sample_rate": 16000,
  "speech_detected": true
}
```

### `POST /api/v1/audio/quality-score` → `200` 🔒

`file` + `prompt` (required, non-empty). The full composite pipeline:

> duration → trim silence → silence ratio → WADA SNR → transcribe → relevance
> (embedding + optional LLM fallback) → weighted geometric mean of
> (SNR, silence, relevance)

Any gate rejection short-circuits with `accepted: false` and populated `reasons`.

```jsonc
{
  "accepted": true,
  "quality_score": 0.72,
  "snr_db": 12.5,
  "silence_ratio": 0.14,
  "embedding_score": 0.71,
  "duration_seconds": 6.2,
  "trimmed_duration_seconds": 4.85,
  "transcript": "I went to Abuja last December to see my cousin.",
  "reasons": []
}
```

> **`quality_score` is not a plain measurement.** Per `alva_schema_v2.json`, `0.0`
> is a *sentinel* meaning a hard floor was tripped, not "very low quality" — and
> the composite is not comparable across prompted vs unprompted clips. Do not
> render it as a bare percentage without that context.

`422` for a missing prompt or an undecodable clip.

---

## 9. `relevance`

### `POST /api/v1/relevance/score` → `200` 🔒

```jsonc
// request
{
  "prompt": "Tell us about the time you visited Abuja.",     // 1–2000 chars
  "transcript": "I went to Abuja last December…",            // 1–4000 chars
  "use_llm_fallback": true                                    // default true
}

// 200
{ "relevant": true, "embedding_score": 0.71, "method": "embedding", "threshold": 0.6 }
```

Fast path is a bge embedding cosine similarity. The LLM tier is consulted **only**
when the score lands in the ambiguous band (0.55–0.60) *and* `use_llm_fallback` is
true — so `method` tells you which produced the answer. Needs the ML stack (`503`).

---

## 10. `reviews`

QA review queue, verdicts, and status propagation (interns / admins).

### `GET /api/v1/reviews/queue` → `200` 🔒

Unassigned recordings awaiting review, **FIFO, excluding the reviewer's own
submissions.** `limit` 1–200, default 50.

### `POST /api/v1/reviews/assign-next` → `200` 🔒

Claims the next queued recording: `submitted → in_review`, locked to this
reviewer. Returns the `RecordingOut`.

### `POST /api/v1/reviews` → `201` 🔒

Records a verdict against the 5-question questionnaire and propagates it to the
recording's status **and** the contributor's approved/not-approved counts.

```jsonc
// request — all four questions and the verdict are required
{
  "recording_id": "…",
  "q_noise_free": "yes",
  "q_clear_audible": "yes",
  "q_matches_prompt": "yes",
  "q_natural_intelligible": "partial",
  "verdict": "approve",
  "notes": "Slight room echo but intelligible."
}
```

```jsonc
// 201 — three objects in one response
{
  "review":   { "id": "…", "recording_id": "…", "reviewer_id": "…", /* answers */ },
  "recording": { /* RecordingOut, with updated status */ },
  "contributor_counts": {
    "contributor_id": "string",
    "approved": 0, "rejected": 0, "flagged": 0,
    "in_review": 0, "submitted": 0, "total": 0
  }
}
```

The response carries the updated recording *and* the contributor's counts, so a
successful review needs **no follow-up refetch** — write all three into the cache.

### `GET /api/v1/reviews/recording/{recording_id}` → `200` 🔒

All reviews for one recording.

---

## 11. `focus-groups`

Intern-run multi-speaker sessions: nested participants and speaker-turn tagging
(Task 4). **Interns see their own sessions; admins see all.**

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/v1/focus-groups` 🔒 | Create, with optional up-front participants |
| `GET` | `/api/v1/focus-groups` 🔒 | List (summary shape) |
| `GET` | `/api/v1/focus-groups/{session_id}` 🔒 | Detail (nested participants + turns) |
| `POST` | `/api/v1/focus-groups/{session_id}/participants` 🔒 | Add a speaker later |
| `POST` | `/api/v1/focus-groups/{session_id}/audio` 🔒 | Attach the recording |
| `POST` | `/api/v1/focus-groups/{session_id}/turns` 🔒 | Tag a speaker turn |
| `GET` | `/api/v1/focus-groups/{session_id}/turns` 🔒 | Turns, ordered by `start_time` |

### Create

```jsonc
{
  "topic": "Tell us about a memorable market day.",   // required
  "language_variety": "nigerian_pidgin",
  "duration_seconds": 1830,
  "participants": [ /* ParticipantIn[] — more can be added later */ ]
}
```

### Session shapes

```jsonc
// list item — counts only
{ "id": "…", "intern_id": "…", "topic": "…", "language_variety": "…",
  "duration_seconds": 0, "has_audio": true,
  "participant_count": 0, "turn_count": 0, "created_at": "…" }

// detail — nested arrays plus audio metadata
{ /* …as above… */ "original_filename": "…", "audio_content_type": "…",
  "audio_size_bytes": 0, "participants": [], "turns": [] }
```

### Participant

```jsonc
{ "label": "string",              // required, 1–255 — name or ID for the speaker
  "age_bracket": "under_18", "gender": "male",
  "role": "string",               // role in the group
  "language_variety": "nigerian_english" }
```

### Turn

```jsonc
{ "participant_id": "…",   // required — must belong to THIS session
  "start_time": 0,         // required, ≥ 0, seconds
  "end_time": 4.5 }        // required, > 0, seconds
```

`GET .../turns` takes an optional `participant_id` to filter to one speaker.

### Audio upload

`multipart/form-data`: `file` (required) and optional `duration_seconds`, which
**overrides** the reported duration used for the intern's hours-recorded stat.

---

## 12. `dashboard`

| Method | Path | Who |
| --- | --- | --- |
| `GET` | `/api/v1/dashboard/contributor` 🔒 | Caller's own |
| `GET` | `/api/v1/dashboard/contributor/{contributor_id}` 🔒 | Own only, unless reviewer/admin |
| `GET` | `/api/v1/dashboard/intern` 🔒 | Caller's own |
| `GET` | `/api/v1/dashboard/intern/{intern_id}` 🔒 | Own only, unless admin |

```jsonc
// contributor
{
  "contributor_id": "0b0c3e2a-…",
  "total_recordings": 12,
  "prompts_read": 12,
  "hours_contributed": 0.34,
  "payment": { "status": "pending", "detail": "…" },
  "status_breakdown": {
    "submitted": 1, "in_review": 1, "approved": 8,
    "not_approved": 2, "rejected": 1, "flagged": 1, "total": 12
  }
}
```

```jsonc
// intern
{
  "intern_id": "b91f…",
  "sessions_run": 4,
  "participants_captured": 17,
  "hours_recorded": 2.1,
  "demographics": { "by_age_bracket": {}, "by_gender": {} }
}
```

> `status_breakdown` carries both `not_approved` and `rejected`. They are not the
> same field — confirm the distinction before summing anything.

---

## 13. `health`

### `GET /health` → `200`

Liveness probe. **Not** under `/api/v1`, and unauthenticated.

```jsonc
{}
```

---

## 14. Integration readiness

How the shipped frontend maps onto this milestone.

### Covered

| Frontend surface | Endpoints |
| --- | --- |
| Login / signup | `auth/*` |
| Contributor onboarding | `onboarding/profile`, `onboarding/consent` |
| Contributor studio (prompt + stimuli) | `prompts/next`, `stimuli/next`, `recordings/*` |
| Contributor dashboard | `dashboard/contributor` |
| Intern review queue + detail | `reviews/*`, `recordings/{id}/audio` |
| Intern participants + sessions | `focus-groups/*` |
| Intern dashboard | `dashboard/intern` |

The intern review rubric maps 1:1 — the frontend's `noiseFree`, `audible`,
`matchesPrompt`, `natural` are `q_noise_free`, `q_clear_audible`,
`q_matches_prompt`, `q_natural_intelligible`, and both use
`yes | partial | no` with an `approve | reject | flag` verdict.

### Two gaps that block the annotator surface

**1. There is no `annotator` role.** The API's `UserRole` is
`contributor | intern | admin`; the frontend ships `annotator` as a fourth role
with its own dashboard, session queue and workspace. Until the backend adds it,
annotator accounts cannot be represented — an annotator would have to log in as an
intern, which also grants the review queue.

**2. There are no annotation endpoints.** The workspace persists a
`TranscriptDoc` — segments, speakers, token-indexed tag spans, non-speech marks,
difficulty flags — and none of that has a route here. Focus groups model
`participants` + `turns` (a speaker and a time range), which is roughly our
*segments* minus the text and the tags.

What the workspace needs, in the vocabulary of
[`alva_schema_v2.json`](../alva_schema_v2.json):

- read/write a transcript for a session (`asrPayload`: `transcript_verbatim`,
  `tokenization`, `language_spans`, `disfluencies`, `untranscribable_spans`,
  `non_speech_events`, `difficulty_flags`, `speech_present`)
- an annotation lifecycle (`annotation.status`, `is_gold`, `revision`)
- submit-for-review, which the "Mark as done" button currently fakes

Until then the annotator surface runs entirely on the mock layer in
`src/data/annotators/` — see [`annotation-workspace.md`](annotation-workspace.md).

### Worth confirming before wiring

- Full member lists for `AgeBracket`, `Gender`, `PidginFluency` (§2)
- `not_approved` vs `rejected` in `status_breakdown` (§12)
- Whether `/recordings/{id}/audio` streams bytes or redirects — it changes whether
  the `src` can be used directly or needs an object URL with the auth header
- Pagination is `limit`/`offset` with **no total count** in any list response, so
  "load more" is the only honest pattern; a page-numbered control cannot know
  where it ends

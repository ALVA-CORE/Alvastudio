# Integration status

What runs on live data, what runs on mock data, and the endpoints we need to
close the gap. Current as of 8 Oct 2026.

Base: `/api/v1`. All endpoints are bearer-authenticated unless noted.

---

## 1. Live

| Surface | Endpoints |
| --- | --- |
| Login, refresh, session | `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` |
| Contributor signup, consent, profile | `POST /auth/register`, `POST /onboarding/consent`, `POST /onboarding/profile` |
| Contributor studio | `GET /prompts/next`, `GET /stimuli/next`, `POST /recordings/prompt-read`, `POST /recordings/stimuli` |
| Contributor dashboard counts | `GET /dashboard/contributor` |
| Intern dashboard counts | `GET /dashboard/intern` |
| Intern focus groups | `GET/POST /focus-groups`, `DELETE /focus-groups/{id}`, `?expand=participants` |
| Intern review queue | `GET /reviews/queue`, `POST /reviews/assign-next`, `POST /reviews/{id}` |
| Annotator dashboard | `GET /dashboard/annotator` |
| Annotator session queue | `GET /annotations/queue`, `POST /annotations/claim-next` |

---

## 2. Not integrated

### 2.1 Admin

Every admin page runs on mock data in `src/data/admin/`.

| Page | Needs | Status |
| --- | --- | --- |
| Overview | `GET /dashboard/admin` | **Missing** |
| Users, list | `GET /users` | Exists, not wired |
| Users, create | `POST /users` | **Missing** |
| Users, edit | `PATCH /users/{id}` | **Missing** |
| Users, deactivate | `PATCH /users/{id}` with `is_active` | **Missing** |
| Users, delete | `DELETE /users/{id}` | **Missing** |
| Users, approve intern | `POST /users/{id}/approve` | **Missing** |
| Users, reset password | `POST /users/{id}/password-reset` | **Missing** |
| Users, activity heatmap | daily counts per user | **Missing** |
| Prompts, list and create | `GET/POST /prompts`, `GET/POST /stimuli` | Exist, not wired |
| Prompts, edit and retire | `PATCH/DELETE /prompts/{id}`, `PATCH/DELETE /stimuli/{id}` | **Missing** for stimuli |
| Prompts, CSV import | bulk create | **Missing** |
| Corpus | `GET /corpus/summary` | **Missing** |
| Corpus, coverage by state | `GET /corpus/coverage` | **Missing** |
| Reviews | `GET /reviews` (all, not just my queue) | **Missing** |
| Reviews, reassign | `PATCH /reviews/{id}/assignee` | **Missing** |
| Annotations | `GET /annotations` (all) | **Missing** |
| Annotations, assign | `PATCH /annotations/{id}/assignee` | **Missing** |
| Focus groups, all interns | `GET /focus-groups?all=true` | **Missing** |
| Payments, earnings | `GET /payments/earnings` | Exists, not wired |
| Payments, rates | `GET /payments/rates` | Exists, not wired |
| Payments, edit rates | `PATCH /payments/rates` | **Missing** |
| Payments, run a payout | `POST /payments/run` | **Missing** |
| Audio QC | `POST /audio/analyze`, `/audio/transcribe`, `/audio/quality-score` | Exist, return 503 without the ML stack |

### 2.2 Contributor

| Feature | Needs | Status |
| --- | --- | --- |
| Points balance | `GET /points` or a `points` field on `/dashboard/contributor` | **Missing** |
| Leaderboard | `GET /points/leaderboard` | **Missing** |
| Wallet balance | `GET /wallet` returning kobo | **Missing** |
| Wallet ledger | `GET /wallet/entries` | **Missing** |
| Link a bank | `GET /banks`, `POST /wallet/account`, name enquiry | **Missing** |
| Withdraw | `POST /wallet/withdrawals` | **Missing** |
| Dashboard charts | daily buckets on `/dashboard/contributor` | **Missing** |
| Quality breakdown figures | acceptance rate, median review time | **Missing** |
| Notifications | `GET /notifications`, `PATCH /notifications/{id}/read` | **Missing** |

### 2.3 Intern

| Feature | Needs | Status |
| --- | --- | --- |
| Dashboard charts | daily buckets on `/dashboard/intern` | **Missing** |
| Demographic hours | hours split by age, gender | **Missing** |
| Quality radar | per-metric scores | **Missing** |
| Notifications | `GET /notifications` | **Missing** |

### 2.4 Annotator

| Feature | Needs | Status |
| --- | --- | --- |
| Transcripts | `GET /annotations/{id}` with segments, `PATCH` to save | **Missing** |
| Waveform | peaks array per session, 0–1 | **Missing** |
| Mark complete | `POST /annotations/{id}/submit` | Exists, not wired |
| Dashboard charts | `daily_activity` on `/dashboard/annotator` | Delivered, charts not wired |

---

## 3. Endpoints we need, by priority

### Blocking

| Endpoint | Returns | Unblocks |
| --- | --- | --- |
| `GET /dashboard/admin` | totals, status breakdown, stuck-work counts | Admin overview |
| `POST /users` | the created user | Admin creates staff accounts |
| `PATCH /users/{id}` | the updated user | Edit, deactivate, change role |
| `DELETE /users/{id}` | 204 | Remove an account |
| `POST /users/{id}/approve` | the updated user | Intern signup approval |
| `GET /reviews` | all recordings and verdicts, paginated | Admin reviews |
| `GET /annotations` | all annotations, paginated | Admin annotations |
| `GET /corpus/summary` | hours, clips, speakers, splits by variety and type | Admin corpus |

### High

| Endpoint | Returns | Unblocks |
| --- | --- | --- |
| `GET /wallet` | `{balance_kobo, pending_kobo, lifetime_kobo, payout_account}` | Contributor wallet |
| `GET /wallet/entries` | ledger, kobo, signed, with timestamps | Wallet history |
| `GET /banks` | `{code, name}` | Bank picker |
| `POST /wallet/account` | resolved account name | Link a bank |
| `POST /wallet/withdrawals` | the withdrawal | Withdraw |
| `GET /notifications` | list, with read state | Contributor and intern notifications |
| Points on `/dashboard/contributor` | `points`, `rank` | Points card, leaderboard |

### Medium

| Endpoint | Returns | Unblocks |
| --- | --- | --- |
| `?from=&to=&bucket=day` on all three dashboards | daily series | Every time-series chart |
| `PATCH/DELETE /stimuli/{id}` | the updated stimulus | Edit and retire stimuli |
| `PATCH /payments/rates` | the updated rates | Admin edits pay rates |
| `POST /payments/run` | the payment run | Admin pays contributors |
| `GET /corpus/coverage` | hours per state | Nigeria coverage map |
| `peaks` on annotation sessions | array of 0–1 | Annotator waveform |
| `total` on every list response | count | Pagination past "load more" |

---

## 4. Other blockers

| Issue | Impact |
| --- | --- |
| Prompt and stimulus banks are empty | No contributor can record anything. Blocks all end-to-end testing. |
| A focus group only reaches `/annotations/queue` after audio is uploaded | Undocumented. Worth stating in the API docs. |
| Audio format support unconfirmed | Need confirmation that webm/Opus and mp4/AAC both decode server side. |
| Test data from our accounts is still in the database | Should be cleared before launch. |

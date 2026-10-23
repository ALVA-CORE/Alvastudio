# Re: Endpoints we need (22 Oct), and milestone pay

Thanks for the 22 Oct `endpoints-needed.md`. This one document covers
everything that changed today:

- **All six of your asks** are answered and deployed, including the whole
  audit log (§3).
- **Contributors are now paid per milestone**, not per clip (§1). This changes
  some fields you read.
- **Two other changes you may notice** are listed in §4.

Nothing you have built should break. The only changes to existing behaviour
are in §1 (earnings entries) and §4.

| Topic | Status | Where |
| --- | --- | --- |
| Milestone pay | Live | §1 |
| 1. Audit log as events | Live | §3 |
| 2. Fix a participant's consent | Live | §2.1 |
| 3. `POST /auth/password` | Live | §2.2 |
| 4. Admin view of identity status | Live | §2.3 |
| 5. `home_languages` on the profile | Live | §2.4 |
| 6. `target_participants` per session | Live, admin only | §2.5 |
| `selfie_base64` in the schema | Answered | §4 |

---

## 1. Milestone pay

Contributors are now paid **₦5,000 for every 500 approved clips**. This
replaces the per-clip rate.

**What counts**
- Only approved clips count.
- Prompt readings and narrations count together.
- Nothing is paid for a part block.
- Clips approved before today count toward the 500.
- What those older clips already earned under the old rate is subtracted from
  the milestone award, so no clip is paid twice.
  - Example: someone with 600 clips paid at ₦50 each has been credited
    ₦30,000.
  - They receive nothing new until the milestones reach that amount
    (3,000 clips).
  - From then on they receive only the difference.

**`GET /dashboard/contributor`**
- New field `milestone`, for the progress bar:
  `{approved_clips, clips_per_milestone, milestones_reached, clips_to_next,
  amount_per_milestone, amount_per_milestone_kobo, currency}`.
- `clips_to_next` is never 0. Right after an award it is a full 500.
- `milestone` is `null` wherever `payment` is, for example when an intern
  views a contributor.

**`points`**
- `points` is now **10 per approved clip** (₦5,000 ÷ 500).
  - It is lowered by any earnings an admin voided, at a point per naira, and
    never goes below zero.
  - It grows with every approval, and equals the money paid at each milestone.
- It is not money: money arrives in ₦5,000 steps.
- The podium (`/points/leaderboard`) and `rank` use the same figure.
- **Contributors' points will change**, because they are now computed from
  approved clips rather than from the old per-clip rates.
- A deactivated account does not appear on the podium.

**Earnings entries** (`GET /payments/earnings` and `/payments/earnings/{id}`)
- Each entry has a new `kind`:
  - `milestone` is an award for a block.
    - It has a `milestone_number`: 1 = 500 clips, 2 = 1,000, and so on.
    - Its `recording_id` and `unit_type` are `null`.
  - `clip` is old per-clip pay. These rows are unchanged and still pay out.
- **`recording_id` and `unit_type` are now nullable.** Please check any code
  that assumes they are always present.
- One award can cover several milestones at once (a back-payment). Its
  `milestone_number` is then the highest one reached.

**Notifications**
- An award reads "NGN 5000.00 for reaching 500 approved clips."
- Approving a single clip no longer produces an earning notification. The
  "Recording approved" review notification is unchanged.

**Admin**
- `POST /payments/milestones/sync` pays the milestones contributors reached
  before this shipped.
  - By default it is a **preview**: who would be credited what, and the total.
  - `?apply=true` credits it.
  - It is safe to run again; a second run finds nothing due.
  - The usual 24-hour hold applies before anything can be paid out.
- `PUT /payments/rates/{unit_type}` still works but is **deprecated**: the rate
  no longer prices anything. Please retire the rate editor, or label it as
  history.

Withdrawals are unchanged. An award can be withdrawn 24 hours after it lands,
and one milestone is well above the ₦1,000 minimum.

---

## 2. Your asks 2–6

### 2.1 Fixing a participant's consent

**`PATCH /focus-groups/{id}/participants/{pid}`**
- Body: `{consent_given: bool, consent_version?: string}`. The version defaults
  to `"1.0"`, up to 32 characters.
- Allowed for the intern who owns the session, or an admin.
- Returns the participant (`ParticipantOut`). Its `consent_given`, `consent_at`
  and `consent_version` show the decision just recorded.
- It adds a new consent record and leaves the old one in place, so the history
  is kept. We store who recorded each decision.
- It works after the audio is uploaded too, because a participant can withdraw
  at any time.
  - If anyone in a session has not agreed, the session leaves the annotation
    queue and the corpus until they do.
  - New audio for that session is refused (409).

**`DELETE /focus-groups/{id}/participants/{pid}`** → **204**
- For a participant logged by mistake, such as a duplicate. Their consent
  records and speaker turns are deleted with them.
- **Refused with 409 once the session has audio:** "This session's audio has
  been uploaded, so the participant cannot be removed. Record their consent
  decision instead. Nothing was removed."
  - Their voice is in the recording by then, and deleting them would also
    delete the record of whether they agreed.
  - For these sessions, please offer "record a decision" (the `PATCH`) instead
    of delete. `has_audio` on the session tells you which ones they are.

Both routes return 403 if the session isn't yours and you are not an admin, and
404 if the participant isn't in that session.

### 2.2 `POST /auth/password`

- It is the same endpoint as `POST /auth/password/change`, at the path you
  built against. Both paths stay.
- Body: `{current_password, new_password}`.
- Errors:
  - 400 if the current password is wrong, or the new one is the same as it;
  - 422 if the new password fails the length rules;
  - 401 without a token.
- **On success, every session for that account ends, including the tab that
  made the change.**
  - The response is a 200 with a `message`. The next request with the old
    token returns 401.
  - Please send the person to sign in with the new password straight after the
    200, rather than waiting for a 401.
- The person also gets a "your password was updated" email, and any password
  reset still pending for them is cancelled.

### 2.3 Identity status for admins

`GET /users/{id}/profiles` has a new field, `identity`:

```json
{
  "identity_status": "failed",
  "identity_verified": false,
  "identity_failure_reason": "Face did not match ID photo.",
  "wallet_status": "onboarding",
  "next_action": "verify_identity",
  "next_action_detail": "Face did not match ID photo."
}
```

- `identity` is **`null` when the contributor has no wallet yet**. That means
  they have not started, not that something failed.
- `identity_verified` is the condition for being paid: a NIN that passed, and
  that no other account holds. Use it for a "can be paid" badge, rather than
  checking `identity_status == "passed"`.
- `next_action` and `next_action_detail` are exactly what the contributor sees
  on their own `GET /wallet`, so an admin helping someone sees the same next
  step. `next_action` is one of:
  - `await_review`
  - `create_account`
  - `await_verification`
  - `verify_identity`
  - `add_payout_destination`
  - `complete_onboarding`
  - `none`
- It shows no part of the NIN, not even the last digits.
- It reads our own records and does not call the payment partner. A check the
  partner is still deciding shows as `await_verification` until the
  contributor next opens their wallet page, which fetches the decision.

### 2.4 `home_languages`

`PUT /onboarding/profile` and the profile read now take `home_languages`: a
`string[]` of up to 20 entries, each 1 to 64 characters.

- `native_languages` is what someone grew up speaking.
- `home_languages` is what is spoken at home now.

It is `null` for everyone until they answer.

### 2.5 A session's participant target

`PATCH /focus-groups/{id}` accepts `target_participants`, a whole number from 1
to 50. **Only an admin can set it.**

- From an intern, the request is refused with 403: "Only an admin can change a
  session's participant target."
  - Interns are scored on attendance against this number, so lowering it would
    raise their own score.
  - A refused request changes nothing, including any `state` sent with it.
  - Interns can still send `state` on its own.
- `null` is refused with 422, because every session is scored against a
  target.
- A session whose target is never set keeps the one it was created with: its
  topic's target, or the default of 8.

---

## 3. The audit log (ask 1): `GET /audit`

It records every kind of event on your list:

- assignment and reassignment;
- verdicts;
- approval, deactivation and role changes;
- password resets and changes;
- payouts, withdrawals, voids and duplicate-account flags;
- profile edits and consent;
- session changes;
- prompt, stimulus and topic changes.

### The route

```
GET /audit?subject_type=user|recording|annotation|focus_group
                       |prompt|stimulus|focus_group_topic
          &subject_id=...&limit=50&offset=0&envelope=true
```

- **Admin only.** Every other role gets 403.
- Send `subject_type` and `subject_id` together. Sending one without the other
  is a 422.
  - With neither, you get the newest events across the whole platform, which
    could feed a "recent activity" view.
- Results are newest first, matching your `AuditTimeline`. Several events from
  one action stay in the order they happened.
- Paging works like every other list: `limit` (up to 200) and `offset`.
  `?envelope=true` returns `{items, total, limit, offset}`.
- **A session's history (`focus_group`) includes its annotations' events.**
  Who an annotation was assigned to is recorded on the annotation, so it shows
  on the annotation panel and on the session panel. Each row's `subject_type`
  says which one it is about.

### Each row

```json
{
  "id": "1042",
  "at": "2026-10-23T14:05:11.204Z",
  "actor_id": "…",
  "actor_name": "Alva Admin",
  "actor_role": "admin",
  "automatic": false,
  "action": "recording.reassigned",
  "subject_type": "recording",
  "subject_id": "…",
  "detail": "Reassigned from Ada Obi to Bola Ade by Alva Admin."
}
```

- **`detail` is the sentence to show.** It already names the people involved,
  using their current names.
- **`byAdmin` is `actor_role === "admin"`.**
  - The role is recorded as it was at the time. An intern who is later made an
    admin does not have their old reviews start reading "by an admin".
- **`automatic: true`** means the system made the decision, not a person. Two
  cases:
  - A clip assigned at upload. These have no actor.
  - Work handed on because its holder was deactivated or deleted. These still
    name the admin whose change triggered it as the actor, so "by an admin" is
    accurate for them.
- **When an account is deleted:**
  - Events *about* that person are deleted with them.
  - Events *they did* are kept, with `actor_id` and `actor_name` set to `null`.
    `actor_role` is kept, and `detail` reads "a deleted intern" or "a deleted
    admin". Their name does not appear anywhere.
  - Anyone else an event mentions who has since been deleted reads as "a
    deleted account".
- `id` is a string, like every other id. Treat it as opaque.
- The three banks (`prompt`, `stimulus`, `focus_group_topic`) have no History
  tab today, but their history is there if you add one.

### Actions and their sentences

The names in these examples are placeholders.

| `action` | `detail` |
| --- | --- |
| `recording.assigned` | "Assigned to Ada Obi on upload." (automatic) · "Assigned to Ada Obi by Alva Admin." |
| `recording.reassigned` | "Reassigned from Ada Obi to Bola Ade by Alva Admin." · "Moved to Bola Ade because the previous holder was deactivated." (automatic) |
| `recording.unassigned` | "Unassigned from Bola Ade by Alva Admin; back in the pool." · "Returned to the pool because the previous holder was deactivated." (automatic) |
| `recording.claimed` | "Taken from the pool by Ada Obi." |
| `recording.reviewed` | "Approved by Ada Obi." · "Rejected by Ada Obi." · "Flagged for a second opinion by Ada Obi." · "Approved by Alva Admin, taking it over from Ada Obi." |
| `annotation.assigned` | "Assigned to Ngozi Eze by Alva Admin." |
| `annotation.reassigned` | "Reassigned from Ngozi Eze to Tunde Bello by Alva Admin." |
| `annotation.unassigned` | "Unassigned from Tunde Bello by Alva Admin; back in the queue." · "Returned to the queue because the previous holder was deactivated." (automatic) |
| `annotation.claimed` | "Claimed by Ngozi Eze." |
| `annotation.submitted` | "Submitted by Ngozi Eze." · "Resubmitted by Ngozi Eze after rework." |
| `annotation.reviewed` | "Approved by Ifeoma Nwosu." (plus " Marked as a gold example.") · "Sent back for rework by Ifeoma Nwosu." · "Rejected by Ifeoma Nwosu." |
| `user.created` | "Signed up as an annotator." · "Account created as an annotator by Alva Admin." · "Account created." (older accounts) |
| `user.approved` | "Approved as an annotator by Alva Admin." |
| `user.role_changed` | "Role changed from annotator to intern by Alva Admin." |
| `user.deactivated` / `user.reactivated` | "Deactivated by Alva Admin." / "Reactivated by Alva Admin." |
| `user.details_changed` | "Name and phone number changed by Alva Admin." (never the old or new values) |
| `user.password_reset_issued` | "Password reset link issued by Alva Admin." · "Invitation to set a password issued by Alva Admin." · "Recovery request approved by Alva Admin; a reset link was issued." |
| `user.password_reset_used` | "Set a new password with a reset link." |
| `user.password_changed` | "Changed their password." |
| `user.recovery_requested` / `user.recovery_declined` | "Asked for help getting back into their account." / "Recovery request declined by Alva Admin." |
| `user.profile_updated` | "Updated their profile: occupation and state of origin." (also "intern profile" and "annotator profile"; field names only, never values) |
| `user.consent_recorded` | "Accepted the data-use terms (version 1.0)." · "Declined the activity-log terms (version 1.0)." |
| `user.withdrawal_requested` | "Asked to withdraw ₦12,000.00." |
| `user.payout_sent` / `user.payout_failed` | "Withdrawal of ₦12,000.00 paid." · "Payout of ₦5,000.00 paid." · "Payout of ₦5,000.00 failed; the earnings can be paid again." (automatic) |
| `user.earning_voided` | "₦5,000.00 of earnings voided by Alva Admin: Duplicate clips." |
| `user.duplicate_flagged` / `user.duplicate_resolved` | "Flagged as a possible duplicate of Ada Obi (the same NIN); payouts on hold." (automatic) · "Duplicate flag dismissed by Alva Admin; payouts can resume." · "Duplicate flag upheld by Alva Admin." |
| `focus_group.created` | "Session created by Ifeoma Nwosu with 2 participants." |
| `focus_group.updated` | "Participant target changed from 8 to 4 by Alva Admin." · "Location changed by Ifeoma Nwosu." |
| `focus_group.audio_uploaded` | "Audio uploaded by Ifeoma Nwosu." · "Audio replaced by Ifeoma Nwosu." |
| `focus_group.participant_added` / `focus_group.participant_removed` | "Speaker C added by Ifeoma Nwosu." / "A participant was removed by Ifeoma Nwosu." |
| `focus_group.consent_recorded` | "Consent recorded for Speaker C by Ifeoma Nwosu: agreed (version 1.0)." |
| `bank.created` | "Created by Alva Admin." · "Imported from a CSV file by Alva Admin." |
| `bank.updated` | "Text and category edited by Alva Admin." (field names only) |
| `bank.retired` / `bank.reactivated` | "Retired by Alva Admin." / "Reactivated by Alva Admin." |

**Notes on the table**
- The automatic sentences can give other reasons: "the previous holder's role
  changed" or "the previous holder's account was deleted".
- Sometimes a session changes hands with no annotation to record it on. For
  example, an admin unassigns somebody whose draft was deleted when the audio
  was replaced. That event is recorded on the session instead, with the same
  `annotation.*` action.
- A participant who is later removed reads as "a removed participant" in the
  session's older events. Their label may be a real name, so it is not kept.
- Please treat an `action` you don't recognise as plain text: we may add more,
  and `detail` is always there to show.

### History from before today

Earlier events are filled in only where a record of them existed:

- **Clip verdicts: complete.** One event for every review ever given.
- **Annotations:**
  - The latest verdict and the latest submission only. Both are overwritten in
    place on the annotation, so earlier ones were never kept.
  - An annotation that was sent back and then resubmitted still shows "Sent
    back for rework" correctly.
- **Accounts:** "Account created." on the date each account was made. We have
  no record of whether the person signed up or an admin created them.
- **Passwords: complete.** Every reset link (told apart as an invitation, a
  recovery or a direct reset), each one used, and every recovery request and
  decline.
- **Money:**
  - every payout paid or failed, and every withdrawal requested;
  - every duplicate flag and its resolution;
  - not voids, which recorded neither when nor by whom.
- **Consent:**
  - every consent a person gave themselves;
  - every participant consent recorded after the participant was logged.
- **Sessions:** creation, and participants added later. Earlier audio uploads
  and session edits were not recorded.
- **Banks:** each prompt, stimulus and topic's creation. Earlier edits were not
  recorded.
- **Profile edits before today: none.** Only a "last updated" time was kept.
- **Assignments before today: none.** They were never recorded anywhere. For
  older items, the line your tabs show saying the list is partial is still
  true.

---

## 4. Other changes, and one answer

**`PATCH /annotations/{id}/assignee` can now return 409.** It does this when
somebody holds the session but the annotation you send is not the one they are
working on:

> "Somebody else holds this session, on a different annotation. Reassign the
> session (PATCH /focus-groups/{id}/assignee) instead."

Before this, calling it on an old, abandoned draft took the session from its
holder, even when their work was already submitted. If nobody holds the
session, an old draft can still be handed to someone as before.

**`recording_id` and `unit_type` on earnings entries are now nullable.** This is
from §1, repeated here because it is the one type change in today's release.

**`selfie_base64` in the schema.** Your reading is correct: in production it is
required.
- It stays out of `required` on purpose. Whether a selfie is needed depends on
  a server setting (selfie matching), so the field is optional where that
  setting is off.
- The field's description now says it is required while selfie matching is on,
  and that it is on in production. The rest of your handling is exactly what we
  expect: bare base64, no `data:` prefix, a downscaled JPEG, and at most 4 MB of
  base64.

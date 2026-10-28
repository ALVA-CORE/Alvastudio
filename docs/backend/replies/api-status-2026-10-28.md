# Frontend handoff — 28 Oct asks

Received 28 Oct 2026. All three wired the same day; what we did with each is
in [`endpoints-needed.md`](../endpoints-needed.md) under "On our side".

---

This answers all three open asks from 28 Oct:

1. Telling contributors their identity check was reset.
2. Scoping recordings and reviews for interns.
3. Retrying a document submission safely.

## 1. Contributors whose identity check was reset

There was no existing identity email to resend: the backend had no identity
email at all. This adds one, plus a bell item.

**The email.** An admin sends it once, from
`POST /payouts/identity-recheck`:
- **By default it is a preview.** It returns `{applied: false, count, queued: 0,
  contributors: [{user_id, full_name, email, notified}]}` and sends nothing.
- **`?apply=true` queues one email per person.** It is safe to repeat: nobody is
  emailed twice, and `notified` says who already has been.
- **It answers `503` if email is not configured,** rather than reporting success.
- **What it says:** the title is "Your identity check needs redoing". The body
  says we have changed how identity is verified, that their earlier check no
  longer counts, and that this is a change on our side and not a problem with
  their account. It asks them to submit their NIN document in the wallet before
  their next withdrawal, and says their earnings are safe. The button is "Open
  my wallet" and links to `/contributor/dashboard`. If the wallet should have a
  deeper link, tell us the path.
- **It is checked again at send time,** so someone who submits a document
  before it goes out does not receive it.

**Who is on the list:** active contributors whose wallet still holds the identity
claim from before the change and who have not submitted a document since. A
blocked wallet (waiting on a duplicate review) is left out.

There is one gap. A contributor whose wallet called `POST /wallet/sync` after
the change had that old claim cleared, and we cannot find them. If your app
never calls `/wallet/sync`, that is nobody.

**The bell.** These contributors also get a notification of **new kind
`identity`**:
- `key` is `identity_recheck:{user_id}` and `title` is "Your identity check
  needs redoing".
- `body`: "We now verify identity from a photo of your NIN document. Submit it
  in your wallet before your next withdrawal."
- `created_at` is when the change went live (27 Oct, 13:23 UTC).
- There is no id field to link. Please give it an icon, and point it at the
  wallet.
- It disappears once they submit a document. Marking it read works as usual.

`identity` is a new value in `Notification.kind`. If your client switches on
that value, give it a case.

## 2. Interns see their own review work, not their colleagues'

For an **intern**, these routes now follow one rule. They see:
- clips **allocated to them**;
- clips **nobody is allocated to** (the pool);
- clips **they have written a verdict on**. That keeps their history after a
  clip moves on, for example when an admin hands a flagged clip to someone else.

They do **not** see a colleague's clips, including a colleague's flagged clip.

| Route | For an intern |
| --- | --- |
| `GET /recordings` | Only those clips. `total` and `X-Total-Count` count the same set. |
| `GET /recordings/{id}`, `/audio` | `403` for any other clip, so an id is no way round the list. |
| `GET /reviews/recording/{id}` | `403` for any other clip. |
| `GET /reviews` | Their own verdicts only. `reviewer_id` set to anyone else is `403` "Interns can list only their own verdicts." Your `useInternReviewCount` sends their own id, so it is unaffected. |

**Unchanged:**
- Admins see everything.
- Contributors see their own clips.
- `/reviews/queue` (pool and `?mine=true`) works as before.

Your client-side filter is now redundant. It is harmless to keep.

A flagged clip can still take another intern's verdict if they have its id.
Under this rule they won't find one, so a second opinion on a colleague's flag
now goes through an admin, who can reassign it.

## 3. Retrying a document submission

A retry was never a duplicate. The duplicate-identity check only fires when the
NIN belongs to a **different** account, and the same person retrying on their
own account never reaches it.

What has changed is what a retry answers. While a document is under review,
`POST /wallet/identity/documents` now first asks Bachs where the previous
attempt got to:

| Previous attempt | A retry now answers |
| --- | --- |
| Arrived and is being reviewed, including after a 502 that lost the reply | **200** `{"status": "submitted", "detail": "We have your identity document and it is being reviewed."}`. Nothing is uploaded again. |
| Never arrived (cut off mid-upload) | Submits this one, and answers 200 as a normal submission would. |
| Review failed | Submits this one as a fresh attempt. |
| Bachs still unreachable | **502**, the same message as before. |

So after a 502 you can offer **Try again** instead of stopping. The `409` "Your
identity check is still being reviewed" no longer occurs. There is no
`Idempotency-Key`: every retry is now safe without one. A stored result would
also not help here, because after a 502 the stored first result is "unknown"
anyway.

The other `409`s are unchanged: a NIN held by another account, a verified
identity being swapped for a different NIN, and a lost race.

## Also

The email sender is now `Alva Studio <notifications@contact.alvacoreai.com>`,
with replies to `contact@alvacoreai.com`. Jesse moved it to the verified
subdomain on 27 Oct, after our last reply named `contact@alvacoreai.com`. Nothing
changes for you.

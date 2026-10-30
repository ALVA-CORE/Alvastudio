# Frontend handoff: Bachs document verification

Received 27 Oct 2026. Wired the same day. The backend's handoff is reproduced
below unchanged; what we did with it is in
[`our-handling.md`](../our-handling.md).

---

Backend API base: `https://api.alvacoreai.com/api/v1`.
All wallet requests require `Authorization: Bearer <access_token>` and a signed-in
contributor. The backend owns Bachs credentials and all provider calls.

## Replace the selfie flow

Remove the NIN/selfie form and calls to `POST /wallet/identity/nin` (now **410**).
`GET /wallet/identity/methods` now reports `document_available: true`,
`nin_available: false`, and `hosted_available: false`.

Collect the person's NIN, legal first/last names, date of birth, explicit consent
to identity-document review, and a clear NIN document. Offer an optional back
image for two-sided cards. This is document review, not a selfie/face match.

Submit **JSON**, not multipart, to `POST /wallet/identity/documents`:

```json
{
  "nin": "12345678901",
  "consent": true,
  "first_name": "Ada",
  "last_name": "Obi",
  "dob": "1990-04-12",
  "document_content_type": "image/jpeg",
  "document_base64": "<base64 of the front image>",
  "document_back_base64": "<base64 of the back image, or omit this field>"
}
```

- NIN: 11 digits; spaces/hyphens are normalized by the backend.
- Names: nonblank, at most 128 characters each. Use legal names from the ID.
- Birth date: `YYYY-MM-DD`; the person must be 18 or older (maximum 120).
- Formats: JPEG, PNG, or PDF. File bytes must match `document_content_type`.
  Both sides must use the declared type; convert/reselect if they differ.
- Each base64 string is limited to **4,194,304 characters**, about 3 MiB decoded.
  Validate the encoded length before submission. Data URLs are accepted, but
  stripping the `data:...;base64,` prefix is preferred.
- Require consent and the front document before enabling submit. Prevent double
  submission while a request is active. No API retries should automatically
  re-upload an identity document.
- Keep documents and NINs in transient form state. Never write them to browser
  storage, analytics, error reporting, URLs, or console logs. Clear them after
  submission and on leaving the form.

## Review state

A normal response is:

```json
{
  "status": "submitted",
  "detail": "Your identity document has been submitted for review.",
  "verification_url": null
}
```

A successful submission is **not approval**. Show the returned `detail`, then
refresh `GET /wallet`. Re-read on page focus and offer a manual refresh; modest
polling while the wallet page is visible is sufficient. Stop polling when the
review is no longer pending or the user leaves the page.

Use `wallet.identity_status`, `next_action`, and `next_action_detail` from
`GET /wallet`. Follow the backend's action rather than inferring payout access
from `wallet.status: active` alone:

| `next_action` | Frontend behavior |
| --- | --- |
| `create_account` | Call `POST /wallet/account`, then refresh the wallet. |
| `verify_identity` | Show the document form; display any review failure reason. |
| `await_verification` | Show “Under review”; disable another submission. |
| `await_review` | Show the block/review message; do not offer submission retries. |
| `add_payout_destination` | Show the bank-account form. Bank list remains `GET /banks`. |
| `complete_onboarding` | Request `POST /wallet/onboarding-link` only when the user clicks, then redirect immediately. |
| `none` | Continue the existing wallet flow. |

`passed` clears the identity gate only; payout capability, bank destination,
account blocks, balance, and earnings hold rules still apply. Do not unlock
withdrawals solely because a redirect completed or identity status passed.

## Errors and recovery

- **401/403:** use the existing authentication/role handling.
- **409:** show `detail` and refresh the wallet. This can mean a pending review,
  an immutable verified NIN, or a duplicate identity requiring admin review.
- **410** from the retired endpoint: use the document flow; do not retry it.
- **422:** `detail` may be a string or a list of `{loc, msg, type}` validation
  errors. Render errors safely, alongside the relevant fields where possible.
- **502:** show the returned message and refresh the wallet before allowing a
  manual retry. The provider may have received a document even when its
  response was lost. If `next_action` is `await_verification`, keep submit disabled.
- **503:** show the unavailable message; do not claim submission succeeded.

Existing identity states are reset for document review by the migration, while
NIN fingerprints are retained. Returning contributors may therefore need to
submit a document even if an earlier screen showed their identity as verified.

## Email

The backend sender is configured as `Alva Studio <contact@alvacoreai.com>` for
deployment. Approval confirmations, password messages, and assignment emails
remain backend-driven; the frontend must not send through Resend directly or
embed its API key. No new frontend email API is needed.

## Acceptance checks

Verify pending and failed reviews, passing review followed by the next wallet
step, duplicate NIN refusal, invalid/oversized documents, and an interrupted
submission followed by wallet refresh. Confirm the document/NIN never appears
in frontend telemetry or persisted storage.

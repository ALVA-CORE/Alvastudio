# What we need from the backend

Checked against the live OpenAPI document, 29 Oct 2026.

## Open

| # | Ask | Blocks | Priority |
| --- | --- | --- | --- |
| 1 | Let us see what upholding a duplicate flag would destroy, before it does | An admin deciding blind on an irreversible action | **High** |
| 2 | Generate the handoff's field names from the spec | The next person wiring from prose | Low |

Everything else is wired. `POST /payouts/duplicate-flags/{id}/resolve` now
has a screen — Admin → Users → **Duplicates** — so nothing is unbuilt on our
side waiting on you.

---

## 1. Let an admin see the damage before upholding, not after

`closed_user_ids`, `voided_amount_kobo` and `in_flight_entries` are on
`DuplicateFlagOut`, and they are null until the flag is resolved. So the only
way to learn what upholding costs is to uphold it.

**We have shipped it anyway**, because leaving flagged contributors unpaid
while we waited was the worse of the two. The confirm names both accounts and
spells out all three consequences in words:

> Both accounts are turned off and their sign-ins stop working.
> Both wallets are blocked and every unpaid earning is voided.
> Any payment already on its way cannot be called back.

Then it reports the real figures from your answer, afterwards.

That ordering is the problem. An admin should be able to read

> this closes 2 accounts and voids ₦41,200, of which ₦8,000 is already on
> its way

**and then decide.** Reading it afterwards is a receipt, not a choice — and
this is the one action in the product that cannot be undone and that takes
somebody's unpaid work with it.

**What would fix it:** `?preview=true` on the resolve, returning the same
three fields without doing anything. Or those fields computed on a single
`GET /payouts/duplicate-flags/{id}`. Either one and the confirm shows real
numbers the same day.

## 2. Generate the handoff's field names from the spec

Minor, and we caught it by checking the OpenAPI document rather than trusting
the prose — but it cost half an hour and would have shipped a silent bug.

The 29 Oct handoff describes `GET /payments/terms` as carrying:

| The handoff said | `PayTermsOut` actually has |
| --- | --- |
| `daily_sentence_limit` | `prompt_read_daily_limit` |
| `daily_narration_seconds` | `narration_daily_seconds` |
| `max_recording_seconds` | `narration_max_seconds` |
| `next_cutoff` | `next_run_cutoff` |

And on back-pay, `BackPayOut.contributors` is an **integer count** with the
rows in a separate `awards` array. The handoff's "Each row:" wording reads as
though `contributors` is the list — we wired it that way first, and
`.length` on a number is `undefined`, which renders as nothing rather than as
an error. A row's id is `contributor_id`, not `user_id`.

No API change wanted: the spec is the contract and we have wired to it. Just
generate the field names in the handoff from the spec, or say plainly that
the prose is a summary and the spec wins.

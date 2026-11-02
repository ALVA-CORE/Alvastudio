# What we need from the backend

Checked against the live OpenAPI document, 2 Nov 2026.

**Every ask and every open question lives here, and nowhere else.**

- [`replies/`](replies/) — each handoff as sent, with what we did with it.
- [`our-handling.md`](our-handling.md) — decisions we made against what the
  API already does. Not asks.

If a reply or a handling note raises a question, it belongs in this file and
the other document points here.

## Open

| # | Ask | Blocks | Priority |
| --- | --- | --- | --- |
| 1 | Hours split by language variety | A corpus chart that can only show counts | Low |
| 2 | Store "how did you hear about us", and count it on the corpus summary | The corpus page's "How contributors found us" card | Medium |

Everything else is wired, including the 1 Nov Scribe handoff. The three asks
of 30 Oct are closed: the ElevenLabs key is yours alone, Scribe's shape is in
the spec, and audio isolation over the corpus is ruled out in writing.

---

## 1. `by_language_variety` has no hours

`CorpusSummary` gives hours three ways — `total_hours`, `daily_hours` and
`by_type_status` — and none of them splits by language.

`by_language_variety` is a **count**, and it counts clips *and* focus-group
sessions, so it cannot be converted: one session is not one clip's worth of
audio.

The corpus page therefore shows "Clips and sessions in each language" where
every chart beside it is in hours. It is honest but it is the odd one out,
and language is the split that matters most for this corpus — "how many
hours of Pidgin do we have" is the question the page exists to answer.

**What would fix it:** hours on that breakdown, or a `language_variety`
dimension on `by_type_status` so we can sum it ourselves. Either is fine.

**Not urgent.** The chart is correct as it stands; it just answers a smaller
question than it should.

---

## 2. "How did you hear about us?"

Contributor sign-up now asks this on the consent step, and the answer goes
out on `PUT /onboarding/profile` with the rest of the profile:

```json
{ "referral_source": "instagram", "referral_source_detail": null }
```

Pydantic drops fields it does not know, so today the answer is sent and
lost. Nothing errors.

**What we need:**

1. Two nullable columns on the contributor profile, accepted by
   `PUT /onboarding/profile`:
   - `referral_source`, one of `instagram`, `x`, `facebook`, `tiktok`,
     `linkedin`, `whatsapp`, `youtube`, `telegram`, `friend_colleague`,
     `alva_team`, `school_university`, `google`, `event`, `news_blog`,
     `other`. A 422 on anything else is fine.
   - `referral_source_detail`, free text up to 120 characters, sent only when
     the source is `other`.
2. A count on `GET /corpus/summary`:
   ```json
   "referral_sources": { "instagram": 41, "friend_colleague": 18, "unknown": 230 }
   ```
   Contributors per source, with `unknown` for everyone with no answer
   (everyone who signed up before the question existed). Zero-count sources
   can be left out.

The corpus page already reads `referral_sources` and shows "Not reported yet"
until it is there, so there is nothing to coordinate on release.

**Nice to have, not blocking:** the `other` free-text answers with counts,
like `unmatched_states` on coverage, so we can see whether a new channel
deserves its own option.


# Leaderboard-Gated Payouts: NDPA/NDPC Compliance Note

**Status:** draft for internal review
**Owner:** product + legal
**Applies to:** contributor payout model, quality rubric, leaderboard

> **Not legal advice.** This note is written to make the legal conversation faster and cheaper, not to replace it. Every conclusion marked ⚠️ needs sign-off from Nigerian counsel and, once we cross the registration threshold, a licensed Data Protection Compliance Organisation (DPCO).

---

## 1. The short answer

The proposed model — *pay only the top 10 contributors who clear an 80% quality threshold, keep and use everything else for free* — is **not compliant as stated**, but the problem is narrower than it looks.

The blocker is not the leaderboard. It is not the 80% threshold. It is not even the fact that most contributors go unpaid. The blocker is the combination of **retaining and commercially exploiting audio from contributors we do not pay, while their permission to do so was obtained through the prospect of payment.** That is what makes consent look coerced under NDPA s.26 and unfair under s.24, and it is what would read badly to a regulator, a journalist, or an enterprise customer running vendor diligence.

Change one thing and most of the exposure disappears:

> **Pay for what we keep. Delete what we do not pay for.**

Once that principle holds, a leaderboard bonus on top of it is ordinary commercial incentive design, and incentives are explicitly permitted. The recommended structure is in [§5](#5-recommended-model-floor-plus-bonus-pool).

---

## 2. The idea as proposed

From the 16 July discussion, paraphrased:

- Pay contributors who pass an **80% quality threshold** on audio submissions.
- Restrict payment to the **top 10 on the leaderboard** who hold that percentage, to control cost.
- Keep contributors competing for leaderboard position, which sustains submission volume.
- Data scoring **60–70% is still usable**, so we keep it — but do not pay for it.
- The prize should be **large enough to keep a student reading prompts instead of scrolling TikTok.**

Two instincts here are sound and worth preserving. Concentrating spend on proven-quality contributors is legitimate. Competition genuinely does raise effort and quality. The recommendation below keeps both.

One instinct is the problem: *keep the 60–70% data, pay nothing for it.*

---

## 3. Where the legal risk actually sits

Five separate regimes touch this. Only the first two are serious.

### 3.1 Freely given consent — NDPA s.26 ⚠️ *primary risk*

The Act puts the burden squarely on us:

> **s.26(1)** — "A data controller shall bear the burden of proof for establishing a data subject's consent."

> **s.26(2)** — "In determining whether consent was freely and intentionally given, account shall be taken of whether, the performance of a contract, including the provision of a service, is conditional on consent to the processing of personal data that is not necessary for the performance of that contract."

The NDPC's implementing directive is more direct. **GAID 2025, Article 17(7)** lists what makes a controller accountable for how it obtained consent:

> "(a) Provide appropriate information to the data subject such that the data subject, on the basis of the information, may make an informed decision;
> (b) Make the process of withdrawal of consent as easy as giving consent; and
> **(c) Ensure that refusal of consent is not detrimental to the rights and interests of the data subject.**"

The question a regulator asks is: *did this person have a genuine choice?* A contributor who records 40 clips believing payment is achievable, lands at 72%, receives nothing, and finds their audio already in a dataset sold to a third party did not get a genuine choice. They got a lottery ticket described as a job.

**The nuance that saves the model.** Financial incentives are not banned. The EDPB — the most developed source of interpretation on identical statutory language, and persuasive though not binding in Nigeria — says so in terms:

> "If a controller is able to show that a service includes the possibility to withdraw consent without any negative consequences [...] this may serve to show that the consent was given freely. **The GDPR does not preclude all incentives but the onus would be on the controller to demonstrate that consent was still freely given in all the circumstances.**"
> — *EDPB Guidelines 05/2020 on consent, para. 48*

So: incentives are fine. Incentives that make refusal or withdrawal costly are not. And we carry the burden of proof either way, which in practice means the reasoning has to be written down before launch, not reconstructed afterwards.

### 3.2 Fairness, purpose limitation and retention — NDPA s.24 ⚠️ *primary risk*

> **s.24(1)** — "A data controller or data processor shall ensure that personal data is —
> (a) processed in a fair, lawful and transparent manner;
> (b) collected for specified, explicit, and legitimate purposes [...]
> (c) adequate, relevant, and limited to the minimum necessary for the purposes for which the personal data was collected or further processed;
> (d) retained for not longer than is necessary to achieve the lawful bases for which the personal data was collected or further processed [...]"

> **s.24(3)** — "Notwithstanding anything to the contrary in this Act or any other law, a data controller or data processor **owes a duty of care**, in respect of data processing, and shall demonstrate accountability, in respect of the principles contained in this Act."

"Fair" is the operative word, and it is doing real work here. Holding an indefinite commercial licence over unpaid contributors' voices, while the payout odds were never disclosed, is the textbook shape of an unfair processing finding. Note also that s.24(1)(d) means we cannot keep sub-threshold audio indefinitely "just in case" — retention has to be tied to a stated purpose with an end date.

### 3.3 Automated decision-making — NDPA s.37 and GAID Art. 18(1)(f)

Our quality rubric produces a score; the score determines leaderboard rank; rank determines payment. If that chain runs without a human in it, s.37 engages:

> **s.37(1)** — "A data subject shall have the right not to be subject to a decision based solely on automated processing of personal data, including profiling, which produces legal or similar significant effects concerning the data subject."

> **s.37(3)** — "The data controller shall implement suitable measures to safeguard the data subject's fundamental rights, freedoms and interests, including the rights to — (a) obtain human intervention on the part of the data controller; (b) express the data subject's point of view; and (c) contest the decision."

GAID goes further and requires consent as the basis for such decisions:

> **GAID Art. 18(1)** — "consent is required: [...] (f) Before the data controller makes a decision based solely on automated processing which produces legal effects concerning or significantly affecting the data subject."

Whether money is a "similar significant effect" is arguable, but it is not a fight worth picking. Two things settle it cheaply, and we are most of the way to both:

1. **Intern review is already in the loop.** Our rubric is scored by a human reviewer, not a model. Document this — it likely takes us outside s.37(1) altogether.
2. **Ship an appeal path.** A contributor must be able to see why a clip was rejected and contest it, with a second human deciding. Our rejection-reason surface in notifications is the natural home for this.

Separately, **s.27(1)(g)** requires that we disclose at collection time "the existence of automated decision-making, including profiling, the significance and envisaged consequences of such processing for the data subject, and the right to object to and challenge such processing." That belongs in the onboarding consent screen.

### 3.4 Is voice "sensitive personal data"? — Probably not, and this matters

A common misreading would force us into the much stricter s.30 regime. The definition in **s.65** is narrower than it first appears:

> "'sensitive personal data' means personal data relating to an individual's — (a) **genetic and biometric data, for the purpose of uniquely identifying a natural person** [...]"

> "'biometric data' means personal data resulting from specific technical processing relating to the physical, physiological, or behavioural characteristics of an individual, **which allow or confirm the unique identification** of that individual [...]"

The trigger is *purpose*. We collect speech to train language and speech models, not to identify speakers. On that basis the recordings are ordinary personal data, not sensitive personal data. ⚠️ Confirm with counsel, and treat it as a live constraint on the roadmap: the moment we add speaker verification, voice-print deduplication, or fraud detection that matches voices against each other, this flips and s.30 plus GAID Art. 18(1)(b) apply. That is a decision to make deliberately, not to stumble into.

### 3.5 Does a top-10 prize need a lottery permit? — Genuinely unclear ⚠️

This one is easy to miss. The **National Lottery Act 2005** defines "lottery" unusually broadly:

> "'lottery' or 'lotteries' includes any game, scheme, arrangement, system, plan, **promotional competition** or device for the distribution of prizes by lot or chance, **or as a result of the exercise of skill and chance** [...]"

And the regulator's own guidance:

> "Any Company/Corporate entity whose core business operations are not a lottery; but organises a promotional scheme that has an element of chance or lot in the distribution of prize(s) must apply for approval and obtain a promotional lottery permit **prior to the launch** of such a promotion."
> — *FCT Lottery Regulation Office, Promotional Lottery/CSP guidance*

The "skill **and** chance" wording is the risk. A pure-skill contest is normally argued to fall outside, but a monthly leaderboard where outcome depends partly on which prompts you happened to draw, how strict your assigned reviewer was, and who else happened to be competing that month has arguable chance elements. Permits are also priced on total prize value, and modalities cannot be changed after approval without written consent — which would make our payout rules slow to iterate.

**This is the strongest practical argument for the floor-plus-bonus structure in §5.** Framing payouts as *piece-rate compensation for accepted work*, with a performance bonus, looks like a contractor payment scheme rather than a prize draw. Framing them as *a monthly prize for the top 10* invites the question. Get a one-page opinion from counsel before launch either way.

### 3.6 Consumer protection — FCCPA 2018

The Federal Competition and Consumer Protection Act prohibits unfair, misleading and deceptive representations, and the FCCPC has been active on promotional terms. If our onboarding implies that recording leads to payment while the realistic probability is roughly *ten paid slots per active cohort*, that gap is the exposure. Fixed by disclosure: state the odds, or remove the ambiguity by paying a floor.

---

## 4. The organising principle

Everything above collapses into one rule:

> **Pay for what we keep. Delete what we do not pay for.**

If a clip is good enough to sit in a dataset we license to a customer, it is good enough to pay for. If it is not worth paying for, it should not be in the dataset. Stated that way:

- **s.26 consent** becomes clean — the exchange is honest, so refusal carries no hidden cost.
- **s.24 fairness** becomes clean — no unpaid commercial exploitation.
- **s.24(1)(d) retention** becomes clean — rejected audio has a defined deletion window.
- **Unjust enrichment** arguments disappear.
- **The pitch to enterprise customers gets stronger**, not weaker. "Every clip in this corpus was paid for, consented to, and is traceable to a contributor who can withdraw" is a selling point in AI data procurement, where provenance diligence is now standard.

The cost instinct behind the original idea still gets served, because the floor rate is ours to set. A small floor plus a concentrated bonus pool can land on the same total spend as a top-10-only model while removing the legal and reputational tail risk.

---

## 5. Recommended model: floor plus bonus pool

A three-tier structure. Illustrative rates — finance owns the actual numbers.

| Tier | Quality score | What happens to the audio | What the contributor gets |
|---|---|---|---|
| **Accepted** | ≥ 80% | Retained, licensed, used in datasets | Full piece rate per accepted clip |
| **Partial** | 60–79% | Retained **only if** we pay for it | Reduced piece rate (e.g. 50–60% of full) |
| **Rejected** | < 60% | **Deleted within a defined window** | No payment, reason shown, appeal available |

On top of that, the competitive layer:

- **Monthly leaderboard bonus pool** split among the top 10 contributors, eligibility gated on a ≥ 80% rolling average and a minimum accepted-clip count.
- The bonus is the "keep a student off TikTok" prize. It can be large, because it is funded by the savings from paying a modest floor rather than a generous flat rate.
- Rank is computed from **accepted clips and quality average**, both of which the contributor can see and contest.

Why this works commercially as well as legally:

- Total spend stays controllable — floor rate and pool size are independent levers.
- The competitive dynamic is preserved, which was the point of the leaderboard.
- Nobody works for nothing on data we monetise, which is the part that would have caused trouble.
- Sub-60% audio stops being a liability we store and becomes a deletion job.

**Decision needed:** if we would rather not pay for 60–79% audio, then delete it. That is a legitimate choice — it costs us usable data but is fully defensible. What is *not* available is keeping it for free.

---

## 6. What comparable platforms do

Worth knowing where the industry norm sits, because enterprise customers benchmark against it.

**Prolific** — the closest published rule, and directly on point. Failing a researcher's internal quality bar is an explicitly **invalid** reason to withhold payment:

> "**Failed an internal measure** — For example, the participant's accuracy on a certain measure was not above an arbitrary threshold. You're of course more than welcome to exclude these participants from your subsequent analysis; **however, you'll still need to pay for their responses even if you can't use their data.**"
> — *Prolific, "Who should I reject?"*

Prolific permits non-payment only for attention-check failures, demonstrable low effort, statistical-outlier speed (3 SD below mean), and failed authenticity checks — i.e. **bad faith, not low ability**. It also enforces a minimum hourly rate and caps how many rejections a researcher may issue. That distinction between *bad faith* and *low ability* is the one to copy: a contributor in a noisy room with a cheap mic is not a fraudster.

**Karya (India)** — the reputational high-water mark. Pays roughly $5/hour for speech recording against a local minimum wage many times lower, rising to ~$10/hour for harder tasks, and gives workers a share of revenue each time a dataset is resold. Positions itself as "the world's first ethical data company" and has been covered on that basis by *TIME* and *Forbes India*. Directly relevant to us: it proves that paying properly for African- and Asian-language speech data is a viable business, and it sets the standard we would be compared against in press coverage of a Nigerian voice corpus.

**Mozilla Common Voice** — the other end of the spectrum. Entirely volunteer, no payment, but the dataset is released publicly under CC0. The trade is explicit: nobody gets paid, and nobody privately monetises it. Unpaid contribution is defensible when the output is a public good. It is not defensible when we license the corpus commercially.

**Appen / Toloka / Clickworker** — per-task piece rates with quality scores that gate *access to higher-paying work*, not payment for work already delivered. Fail quality and you stop receiving premium tasks; you are still paid for completed tasks. This is the mainstream model and it maps almost exactly onto our tier table.

**Gig-economy bonus quests (Bolt, Uber, Glovo)** — base fare for every trip, plus bonuses for hitting targets or ranking in a period. Precisely the floor-plus-bonus shape recommended in §5, and evidence that the incentive structure works at scale in Nigeria specifically.

The pattern across all of them: **competitive incentives sit on top of a floor, and quality scores gate future opportunity rather than retroactively cancelling payment for work already used.**

---

## 7. Implementation checklist

### Product

- [ ] **Onboarding consent screen** states, in plain language: the quality tiers, the piece rate for each, that sub-60% audio is deleted, how leaderboard rank is calculated, and that the bonus pool is limited to 10 contributors.
- [ ] **Separate the consent from the incentive.** One control for "Alva may use my recordings to train speech models" (the s.25(1)(b)(i) contract basis). A distinct, optional control for anything not necessary to that contract — marketing, sharing with named third parties, retention beyond the stated period. Bundling these is what s.26(2) targets.
- [ ] **Rubric transparency** — the contributor sees the same criteria the intern scored against, per clip. Already partly built in the notification detail sheet.
- [ ] **Appeal flow** — "Request a second review" on any rejected or partial clip, routed to a different reviewer. This is the s.37(3) safeguard and the cheapest insurance in this document.
- [ ] **Points/payout ledger** — per-clip audit trail of score, tier, amount, and payment status. This is our s.26(1) burden-of-proof evidence and doubles as finance reconciliation.
- [ ] **Withdrawal and erasure** — self-service, no worse than the effort of signing up (s.35(2)). Needs an explicit decision on the status of clips already licensed to a customer before withdrawal; s.26(5) protects processing already lawfully done, but the retention position must be written down.
- [ ] **Deletion job** — automated purge of sub-threshold audio after the stated window, with logs.

### Legal and governance

- [ ] **DPIA before launch.** s.28(1) requires one where processing "may likely result in high risk to the rights and freedoms of a data subject by virtue of its nature, scope, context, and purposes." Large-scale voice collection from students, with automated-ish scoring and money attached, is squarely in scope. Under GAID it must be vetted by an accredited DPO and forms part of the audit report; s.28(2) requires consulting the NDPC if high risk remains after mitigation.
- [ ] **Counsel opinion on the lottery-permit question** (§3.5) before any prize-framed campaign goes live.
- [ ] **Confirm the sensitive-data position** (§3.4) and add a roadmap gate: any speaker-identification feature triggers a fresh assessment.
- [ ] **NDPC registration** if we qualify as a Data Controller of Major Importance, plus **DPO appointment**, compliance audit within 15 months of commencing business and annually after, and Compliance Audit Returns by 31 March. Ultra-high and extra-high tiers must file through a DPCO.
- [ ] **Contributor agreement** — piece-rate terms, bonus-pool rules, IP licence scope, deletion commitments. Payment terms should read as contractor compensation, not as prize terms.
- [ ] **Processor agreements** updated for any vendor touching audio (storage, transcription, hosting), per GAID third-party contract requirements.
- [ ] **Breach procedure** — 72-hour NDPC notification, immediate notice to affected contributors on high risk.
- [ ] **Staff training** within six months of commencing operations, annually thereafter.

### Anti-gaming (the reason the threshold exists)

The 80% bar is really about filtering bad-faith submissions. Handle that directly rather than through non-payment:

- [ ] Duplicate-audio detection (hashing, near-duplicate matching) — note this may implicate §3.4 if it becomes voice-print matching.
- [ ] Silence, clipping and noise-floor checks at capture time, so contributors are told *before* submitting.
- [ ] Rate limits and per-account submission caps.
- [ ] Progressive consequences for repeated bad faith — suspension, not silent non-payment.
- [ ] Reviewer calibration, so the same clip scores consistently across interns. Inconsistent scoring is both a fairness problem and the strongest ammunition for a s.24 complaint.

---

## 8. Open questions for counsel

1. Does a monthly top-10 bonus pool require an NLRC promotional lottery permit, given the "skill and chance" wording in the National Lottery Act 2005? Does a floor-plus-bonus contractor framing avoid it?
2. Is **contract performance** (s.25(1)(b)(i)) a cleaner lawful basis than consent for the core training use, given that a contributor agreement exists? If so, consent narrows to the genuinely optional purposes — which materially reduces the s.26(2) conditionality problem.
3. Does human intern review take us outside s.37(1) entirely, or do we still owe the s.37(3) safeguards because the rubric is standardised?
4. Retention position on clips already licensed to a customer at the point a contributor withdraws consent or requests erasure.
5. Are contributors contractors for tax and labour purposes, and does the bonus pool change that analysis?
6. Do we cross the Data Controller of Major Importance threshold at current or projected volumes, and which GAID tier applies?

---

## 9. Sources

**Primary — Nigeria**
- Nigeria Data Protection Act 2023 (Act No. 37 of 2023) — [full text (NCC)](https://ncc.gov.ng/sites/default/files/2024-11/Nigeria_Data_Protection_Act_2023.pdf) · [KPMG copy](https://assets.kpmg.com/content/dam/kpmg/ng/pdf/nigeria-data-protection-act2023.pdf). Sections cited: 24, 25, 26, 27, 28, 30, 34, 35, 36, 37, 46, 65.
- NDPC, *NDP Act General Application and Implementation Directive (GAID) 2025* — [official PDF](https://ndpc.gov.ng/wp-content/uploads/2025/03/NDP-ACT-GAID-2025-MARCH-20TH.pdf). Issued 20 March 2025, effective **19 September 2025**, supersedes NDPR 2019 and its 2020 Implementation Framework. Articles cited: 7, 15, 16, 17, 18.
- National Lottery Act 2005 — [full text](https://nairametrics.com/wp-content/uploads/2013/03/national_lottery_act_2005.pdf), definition of "lottery".
- Federal Competition and Consumer Protection Act 2018 — unfair and misleading representations.
- FCT Lottery Regulation Office — [promotional lottery / CSP requirements](https://lro.abj.gov.ng/promotional-lottery-csps/).

**Interpretation — persuasive, not binding in Nigeria**
- EDPB, *Guidelines 05/2020 on consent under Regulation 2016/679* — [PDF](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_202005_consent_en.pdf). Paras 13 (real choice), 46–48 (detriment and incentives).
- EDPB, *Opinion 08/2024 on Valid Consent in the Context of "Consent or Pay" Models* — the four freely-given criteria: conditionality, detriment, imbalance of power, granularity.

**Commentary on GAID**
- Banwo & Ighodalo, [synoptic analysis of GAID 2025](https://www.banwo-ighodalo.com/grey-matter/synoptic-analysis-of-the-nigeria-data-protection-act-general-application-and-implementation-directive-gaid-2025/) — DPIA vetting and filing requirements.
- Andersen Nigeria, [GAID 2025 takes effect](https://ng.andersen.com/gaid-2025-takes-effect-a-new-data-privacy-compliance-era-for-nigeria-businesses/) — registration, DPO, audit obligations.

**Industry practice**
- Prolific, [Who should I reject?](https://researcher-help.prolific.com/en/articles/445218-who-should-i-reject) and [Prolific's payment model](https://researcher-help.prolific.com/en/articles/445230-prolific-s-payment-model).
- *TIME*, [The Indian Startup Making AI Fairer](https://time.com/6297403/the-workers-behind-ai-rarely-see-its-rewards-this-indian-startup-wants-to-fix-that/) and *Forbes India* on Karya's wage and royalty model.
- Mozilla Common Voice — volunteer contribution, CC0 release.

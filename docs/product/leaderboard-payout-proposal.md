# Contributor Payout Model: Reviewing My Proposal

**By:** Cybersmith
**Date:** August 2026
**For:** product, finance, legal

---

## Background

I proposed that we pay only the top 10 contributors on the leaderboard who hold an 80% quality score, and keep the 60-70% audio without paying for it. The logic was cost control. Concentrate spend on contributors who have proven their data quality, keep everyone competing for a place, and still collect the volume we need.

The pushback was that this would not be NDPC compliant. So I went through the Nigeria Data Protection Act 2023, the NDPC's implementing directive (GAID 2025), and how other data platforms handle the same problem.

The objection was right, but only about one narrow part of the idea. Most of what I proposed survives.

I am not a lawyer. The questions I need counsel to answer are at the end.

---

## What actually fails

Not the leaderboard. Not the 80% threshold. Not the fact that most contributors go unpaid.

The single problem is this: **keeping and commercially licensing audio from contributors we do not pay, when their permission to use it came from the prospect of being paid.**

Two provisions do the work. On consent:

> "In determining whether consent was freely and intentionally given, account shall be taken of whether, the performance of a contract, including the provision of a service, is conditional on consent to the processing of personal data that is not necessary for the performance of that contract."
> NDPA 2023, s.26(2)

GAID 2025 is blunter, requiring that we "ensure that refusal of consent is not detrimental to the rights and interests of the data subject" (Article 17(7)(c)). And s.26(1) puts the burden of proving valid consent on us, not on the contributor.

On fairness, s.24(1)(a) requires that personal data is "processed in a fair, lawful and transparent manner." Fair is doing real work in that sentence. The scenario I would not want to defend: a student records 40 clips believing payment is achievable, scores 72%, receives nothing, and later finds their voice in a dataset we sold. They technically consented, but they had no genuine choice, and we would be holding an indefinite commercial licence over unpaid work.

**The part that saves the idea:** incentives themselves are fine. European guidance on identical statutory wording, persuasive here rather than binding, says so directly:

> "The GDPR does not preclude all incentives but the onus would be on the controller to demonstrate that consent was still freely given in all the circumstances."
> EDPB Guidelines 05/2020, para. 48

So we can run a competition, and we can pay some contributors far more than others. We just cannot take value from people we pay nothing.

---

## The fix

> **Pay for what we keep. Delete what we do not pay for.**

If a clip is good enough to go into a dataset we license to a customer, it is good enough to pay for. If it is not worth paying for, it should not be in the dataset.

That one change makes the consent honest, removes the fairness problem, gives retention a defined end, and kills any unjust enrichment argument. It also strengthens our commercial position. "Every clip was paid for, consented to, and traceable to a contributor who can withdraw it" is a real selling point now that enterprise buyers run provenance checks on training data.

My cost concern still gets handled, because we set the floor rate. A small floor plus a concentrated bonus pool can land on the same total spend as a top 10 only model, without the exposure.

---

## Revised model

Rates are illustrative. Finance owns the real numbers.

| Tier | Quality score | The audio | The contributor gets |
| --- | --- | --- | --- |
| Accepted | 80% and above | Retained and licensed | Full piece rate per clip |
| Partial | 60 to 79% | Retained only if we pay for it | Roughly 50 to 60% of full rate |
| Rejected | Below 60% | Deleted within a set window | Nothing, with reason shown and an appeal option |

On top of that, a **monthly leaderboard bonus pool** split among the top 10, gated on an 80%+ rolling average and a minimum number of accepted clips. This is the prize that keeps a student reading prompts instead of scrolling TikTok, and it can be substantial, because it is funded by the savings from paying a modest floor rather than a flat generous rate.

**On whether we can just give the top 10 extra:** yes, and it does not need to be reduced to gifts. The top 10 can receive a significant cash bonus. The constraint was never on the reward at the top, only on the floor underneath it. I would frame it as a performance bonus inside the contributor agreement rather than a prize or a gift, for the lottery reason below.

If we would rather pay nothing for 60 to 79% audio, that is a legitimate call. We delete it and lose some usable data. What is not available to us is keeping it for free.

---

## Precedent

**Prolific** has the closest published rule, and it goes directly against my original version. Failing a researcher's internal quality bar is an explicitly invalid reason to withhold payment:

> "Failed an internal measure. For example, the participant's accuracy on a certain measure was not above an arbitrary threshold. You're of course more than welcome to exclude these participants from your subsequent analysis; however, you'll still need to pay for their responses even if you can't use their data."

They only allow non payment for failed attention checks, demonstrable low effort, outlier speed, and failed authenticity checks. In other words, bad faith rather than low ability. I think we should adopt that same line. A contributor in a noisy room with a cheap phone is not a fraudster.

Briefly, the rest of the market:

- **Karya** (India) pays around $5 per hour for speech recording against a far lower local minimum wage, plus a cut when datasets are resold. It is the benchmark we would be compared against in any coverage of a Nigerian voice corpus.
- **Mozilla Common Voice** pays nobody, but releases everything publicly under CC0. Unpaid contribution works when the output is a public good, not when we license it commercially.
- **Appen, Toloka, Clickworker** use quality scores to gate access to higher paying work, never to cancel pay for work already delivered.
- **Bolt, Uber, Glovo** pay a base fare on every trip plus bonuses for hitting targets, which is the same floor plus bonus shape, already proven at scale in Nigeria.

---

## Other legal flags

**The top 10 prize may need a lottery permit.** This one surprised me. The National Lottery Act 2005 defines lottery to include any promotional competition distributing prizes "by lot or chance, or as a result of the exercise of skill and chance," and a permit is required before launch. Our leaderboard arguably has chance elements: which prompts a contributor drew, which reviewer scored them, who else competed that month. Permit fees scale with prize value and approved terms cannot be changed without written approval, which would make our rules slow to iterate. This is the main reason to frame the top 10 reward as contractor performance pay rather than a prize.

**Quality scoring may count as automated decision making.** Under s.37 a contributor has the right not to be subject to a decision based solely on automated processing with significant effects, and is owed human intervention and the ability to contest it. Our rubric is scored by a human intern, which probably takes us outside this, but we should document that and ship an appeal route anyway. It is the cheapest insurance here.

**Voice recordings are probably not sensitive personal data, which is good news.** The definition is purpose bound. Biometric data only counts when processed "for the purpose of uniquely identifying a natural person," and we collect speech to train speech models, not to identify speakers. This flips the moment we add speaker verification or voice print deduplication, so that should be a deliberate decision rather than something we drift into.

**A DPIA is required before launch.** s.28(1) mandates one where processing is likely to be high risk given its nature and scope. Large scale voice collection from students with money attached to scoring is squarely in scope.

---

## What we need to build

- Onboarding screen stating the tiers, the rate for each, that sub 60% audio is deleted, how rank is calculated, and that the bonus pool is limited to 10 people.
- Separate the core consent from optional extras. One control for using recordings to train speech models, a separate optional one for marketing, third party sharing, or extended retention. Bundling these is exactly what s.26(2) targets.
- Per clip rubric transparency, so contributors see what the reviewer scored against. Partly built already in the notifications view.
- An appeal route on rejected and partial clips, routed to a second reviewer.
- A per clip payout ledger recording score, tier, amount and payment status. This is our evidence under s.26(1) and it doubles as finance reconciliation.
- Self service withdrawal and erasure, no harder than signing up.
- An automated deletion job for sub threshold audio, with logs.

**Anti gaming**, which is the real job the 80% bar was doing:

- Duplicate and near duplicate audio detection.
- Silence, clipping and noise floor checks at capture time, so contributors are warned before they submit.
- Rate limits and per account submission caps.
- Suspension for repeated bad faith, rather than silent non payment.
- Reviewer calibration, so the same clip scores consistently across interns. Inconsistent scoring is unfair and would be the strongest ammunition in a complaint against us.

---

## Questions for counsel

1. Does a monthly top 10 bonus pool need an NLRC promotional lottery permit, given the "skill and chance" wording in the National Lottery Act 2005? Does framing it as contractor performance pay avoid that?
2. Is contract performance a cleaner lawful basis than consent for the core training use, given that a contributor agreement exists? That would narrow consent to genuinely optional purposes and largely remove the s.26(2) problem.
3. Does human intern review take us outside s.37(1), or do we still owe the s.37(3) safeguards because the rubric is standardised?
4. What is our position on clips already licensed to a customer when a contributor withdraws consent or requests erasure?
5. Are contributors contractors for tax and labour purposes, and does a bonus pool change that?
6. Do we cross the Data Controller of Major Importance threshold at projected volumes, and which GAID tier applies?

---

## Sources

- Nigeria Data Protection Act 2023, sections 24, 25, 26, 27, 28, 30, 35, 37, 65. https://ncc.gov.ng/sites/default/files/2024-11/Nigeria_Data_Protection_Act_2023.pdf
- NDPC General Application and Implementation Directive (GAID) 2025, articles 15 to 18. Issued 20 March 2025, effective 19 September 2025, replaced the NDPR 2019. https://ndpc.gov.ng/wp-content/uploads/2025/03/NDP-ACT-GAID-2025-MARCH-20TH.pdf
- National Lottery Act 2005, definition of lottery. FCT Lottery Regulation Office permit guidance: https://lro.abj.gov.ng/promotional-lottery-csps/
- Federal Competition and Consumer Protection Act 2018.
- EDPB Guidelines 05/2020 on consent, paras 13 and 46 to 48. EDPB Opinion 08/2024 on consent or pay models.
- Prolific, "Who should I reject?" https://researcher-help.prolific.com/en/articles/445218-who-should-i-reject
- TIME on Karya's wage and royalty model. https://time.com/6297403/the-workers-behind-ai-rarely-see-its-rewards-this-indian-startup-wants-to-fix-that/

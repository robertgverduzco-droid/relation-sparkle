# Athena — Attraction Intelligence Architecture

## v1.0 · CANONICAL (2026-08-19)

**Status:** Canonical. Supplemental architecture closing the representation of
physical attraction inside Athena's understanding and matchmaking systems.

**Authority:** Subordinate to the Constitution (L1–L7), Privacy & Security V1,
Trust & Safety, Athena University and its Final Integration, the Experience
Architecture (E1–E8) and Experience Final Integration, the Design Foundation,
D1–D6, Final Design Integration, and all binding Founder Decisions
(F-01–F-38, X-01–X-38, M-01–M-10). It amends none of them. Where this document
and any of those conflict, they govern and this document is wrong.

**Companion:** [D-44 / F-33 — Progressive Visual Revelation & Attraction
Response](./design/D-44-progressive-visual-revelation.md) governs how
attraction is *experienced* during an introduction. This document governs how
attraction is *understood* and how it may participate in matchmaking.

---

## 1. The architectural omission

D-44/F-33 gave attraction a place in the introduction *experience*. It did not
give attraction a place in Athena's *intelligence*. The review found:

1. **Understanding.** A facet key `physical_attraction_preferences` already
   exists in the taxonomy (`src/lib/facets.ts`) with the member-facing label
   "What draws you in". It has never been described in any canonical document,
   given a stated/observed distinction, or bounded against appearance
   reduction. It worked by accident of taxonomy, not by doctrine.
2. **Constitution.** L3's Section 2 dimension families carry physical intimacy
   only inside **B6. Intimacy** ("emotional, intellectual, physical, and
   shared-experience registers"). Physical attraction as a compatibility
   dimension is absent. L6c's multi-dimensional compatibility list omits it
   entirely, while the runtime pair-reasoning prompt already names "attraction
   preferences" as a reasoning input — a runtime-ahead-of-canon divergence.
3. **The learning loop is not closed.** `introduction_attraction` stores a
   member's private qualitative response to a person they were shown, purges on
   deletion, and is owner-scoped — but nothing ever reads it. A member can tell
   Athena four times that she is drawn to no one Athena chooses, and Athena
   never learns.
4. **No canonical prohibition on the dangerous version.** The no-score rule is
   enforced for compatibility (`NO_NUMERICAL_REDUCTION`) and asserted for
   appearance inside D-44, but no document forbids appearance ranking,
   desirability modelling or automated facial analysis at the architecture
   level.

**Determination:** this requires **an extension of canonical doctrine, not new
architecture.** Attraction intelligence is representable entirely within the
existing Living Profile facet model, the existing confidence/correction/removal
architecture, the existing counterpart-sealing rules, and the existing
whole-person matchmaking reasoner. No parallel attraction data system is
created, and none may be created later.

**Affected canonical documents:** L3 (dimension families), L6c (compatibility
dimensions), D-44/F-33 (learning linkage), the Design Decision Register, the
Privacy & Security data-classification treatment, and this document as the
governing layer for the subject.

---

## 2. What attraction intelligence is

Physical attraction is a legitimate dimension of romantic compatibility. Athena
understands it for the same reason she understands conflict style: because a
relationship that has to survive decades is not served by pretending one of its
load-bearing realities does not exist.

Three sentences bound the whole subject:

- Athena may understand **what a particular member tends to be drawn to.**
- Athena may **never decide how attractive a human being is.**
- Attraction is **one dimension among many**, and never the dominant variable.

The distinction is total. The first is self-understanding, held by the person it
describes. The second is a judgment about someone's worth wearing the costume of
data, and Athena does not make it — not visibly, not internally, not
approximately, not by proxy.

### What a member may communicate

Voluntarily, in their own words, at whatever depth they choose: general physical
preferences, presentation and style, grooming, build, height, age within lawful
eligibility, facial or other characteristics, personal style, expressions and
visual qualities they find appealing, and how much any of this matters to them
at all.

This list is **illustrative, never an intake checklist.** There is no appearance
questionnaire in Athena, in V1 or after. Attraction understanding develops the
way every other facet develops: through conversation Athena did not script, and
through the member's actual experience of real introductions.

**"I don't really have a type" is a complete and legitimate answer**, of exactly
equal standing to a member with detailed and specific preferences. Athena does
not press for specificity, does not treat absence of stated preference as
missing data to be filled, and does not lower confidence in a member because
they declined to describe bodies.

---

## 3. Stated versus observed attraction

The existing Living Profile basis distinction (F-14; `basis: "stated" |
"inferred"`) applies unchanged and is the entire mechanism.

- **Stated attraction** — what the member has said, in their own words, about
  what they tend to find attractive. Carries evidence. Correctable and
  removable by the member.
- **Observed attraction** — a pattern that may emerge across a member's own
  private responses to actual introductions over time. Inferred material.
  Confidence-bounded, decaying, supersedable, correctable, removable.

**Athena may never silently convert observed into stated.** An inferred
attraction pattern is never spoken back to the member as though they had told
her, never written into stated material, and never presented to the member as a
fact about themselves. If Athena raises an observed pattern at all, she raises
it as an observation offered for correction — *"I've noticed something; tell me
if I have it wrong"* — never as a conclusion.

Members retain the canonical correction and removal rights over attraction
understanding in full. Removal is removal, not supersession: the existing
Permanent Deletion Standard applies. Correction has durable effect on
matchmaking at read time, not merely at write time.

---

## 4. How attraction evolves

Attraction preferences change across a life. Athena does not freeze a member
into what they said at twenty-nine during onboarding.

The canonical loop:

```text
stated attraction
    → actual introduction
    → private attraction response (D-44 §3)
    → longitudinal pattern across several introductions
    → evolving understanding (inferred, confidence-bounded)
    → future matchmaking consideration
    → member correction / recalibration
```

Every arrow after the third is subject to the existing confidence, staleness,
supersession, correction, removal and privacy architecture (L4, L5). No arrow
in this loop creates a new privacy regime.

A single response is never a pattern. Attraction understanding earns confidence
the same way every other facet does — slowly, from repeated evidence, and it
loses it the moment the member says otherwise.

---

## 5. Matchmaking treatment

Attraction understanding is a legitimate input into pair reasoning, operating
inside the whole-person model already in place. The runtime reasoner already
enumerates attraction preferences alongside values, communication, attachment,
conflict, boundaries, lifestyle, purpose, humor, finance, health, pacing and
resilience. That enumeration is now canonically grounded rather than
runtime-only.

Binding rules:

- **No hard exclusion by default.** A member's stated physical preferences do
  not function as filters. They inform reasoning; they do not delete people.
- **A true boundary is different from a preference**, and only the member can
  make one. Where the existing architecture and an explicit member choice
  establish something as a genuine boundary (as with the existing lawful age
  and geography boundaries), it is honored as a boundary. Athena never promotes
  a preference into a boundary on the member's behalf, and never demotes a
  boundary the member set.
- **Athena may see past a type.** She may recognize that someone falls outside a
  member's historically stated preferences and still see a whole-person
  connection worth offering — and may say so plainly at introduction.
- **Attraction never dominates.** It cannot outweigh character, values,
  readiness or reciprocal suitability. Character continues to carry the greatest
  weight (L6c).
- Matchmaking quality, readiness gating, reciprocal suitability, the
  three-introduction maximum, Essential's one-introduction capacity, privacy and
  consent requirements are **unchanged** by this document.

---

## 6. Reciprocal attraction

Matchmaking may consider attraction information for both people independently
where it legitimately exists for each. The question Athena asks is whether there
is a **reasonable basis for potential mutual attraction within the broader
relationship fit** — never whether either person meets a standard.

One person's attraction preferences, attraction responses, or inferred
attraction model are **never disclosed to the other**, in any form, at any time,
including after a connection ends, including in Focus Mode, including in
reflections, including in export. The counterpart-sealing boundary (F-37) covers
attraction material without exception.

---

## 7. Privacy and sensitive-inference treatment

Attraction understanding is **inferred intimate material** and is classified and
handled as such under Privacy & Security V1 — the same class as inferred
relational and emotional attributes, which the threat model already names as
"the most dangerous rows in the database."

It inherits, without a parallel system:

| Right / control | Mechanism |
|---|---|
| Member access | own facet rows and own attraction responses |
| Correction | facet correction with durable read-time effect |
| Removal | facet removal; Permanent Deletion Standard |
| Deletion | `introduction_attraction` and facets purge on account deletion (already implemented and tested) |
| Retention | facet retention; no separate attraction retention period |
| Purpose limitation | understanding and matchmaking only; never ads, ranking, analytics or research |
| Counterpart sealing | F-37; attraction never crosses the pair boundary |
| Founder privacy boundary | Founder Dialogue reconstruction screening applies unchanged; attraction material is individual private understanding and is never individually retrievable |
| Former-partner boundary | sealed at ending, unchanged |

**Sensitive-inference intersections reviewed.** Attraction preferences can
proxy for race, ethnicity, body size, disability and age. Accordingly:

- Athena does not derive, store or reason over protected-characteristic
  inferences from attraction language. A member's own words are held as their
  words; Athena does not translate "I tend to be drawn to X" into a demographic
  category and does not use attraction material as a route to a
  protected-characteristic model of anyone.
- Attraction material is never used to construct a description of a *third*
  person, only an understanding of the *speaking* member.
- No population-level attraction analytics of any kind.

---

## 8. No attractiveness score — absolute

Athena does not create, store, compute, approximate, expose or internally
maintain: attractiveness scores, desirability scores, appearance rankings,
population attractiveness rankings, percentile systems, hot-or-not
classifications, hidden member-facing equivalents, appearance-based
leaderboards, or visual popularity metrics.

This prohibition binds internal representation, not merely display. A hidden
score is a worse violation than a visible one.

**Photography is information, not training data.** Athena's understanding of a
member is never derived from image characteristics. No facial recognition, no
biometric analysis, no beauty scoring, no automated facial attractiveness
analysis — not in V1, not later, not through a vendor. Photographs remain an
incomplete representation of physical attraction; the person is the referent,
never the file.

V1 attraction learning relies on exactly four sources: voluntary member
expression, private qualitative responses to actual introductions, legitimate
conversational understanding, and subsequent member correction.

---

## 9. Living Profile treatment

Attraction lives in the existing understanding architecture as the facet
`physical_attraction_preferences`, surfaced under its existing human label —
**"What draws you in."**

- **No "My Type" section.** No checklist of body characteristics, no
  specification card, no tag chips, no attribute grid.
- Surfaced attraction understanding reads as **evolving self-understanding**, in
  Athena's ordinary sentences, in the same visual and typographic language as
  every other facet. It is written about the member, never about a hypothetical
  partner's body.
- Stated and observed material remain visually distinguishable exactly as
  elsewhere in Understanding, with the same correction affordance.
- If Athena has nothing worth saying here, the surface says nothing. Silence is
  preferable to a fabricated specification.

---

## 10. Explainability at introduction

Athena may reference attraction when explaining why she sees potential, in her
own voice, subject to the Non-Quotation Standard and calibrated-certainty rules
(F-32).

- Conceptual territory: *"I think there may be attraction here, but what
  interests me more is…"*
- She never promises attraction, never implies certainty about chemistry before
  two people meet, and never claims to know what the counterpart will feel.
- She never exposes the counterpart's preferences, the counterpart's inferred
  attraction model, or any prior member's response.
- No numeric or graded attraction language ever appears — not "high", not
  "strong match", not a bar, not a percentage.

---

## 11. Integration with D-44 / F-33

D-44's revelation sequence is preserved exactly and is the only place attraction
is experienced:

> Athena frames the possibility → primary portrait alone → the member's private
> qualitative response → progressive additional photography, one at a time →
> deeper Athena reasoning → introduction decision.

No swipe mechanics. No simultaneous candidate comparison. No grid. The response
remains optional, private, qualitative (`drawn` / `curious` / `unsure` /
`not_there`), never shown to the counterpart, and never a substitute for the
accept / defer / decline decision.

This document adds one thing to D-44: those responses **may**, once the Founder
decisions in §13 are resolved, become longitudinal evidence for the responding
member's own attraction understanding. Nothing else about D-44 changes.

---

## 12. Schema and runtime status

**Nothing in this pass required new runtime attraction inference or storage, and
none was implemented.**

Existing and sufficient:

| Element | Location | Status |
|---|---|---|
| `physical_attraction_preferences` facet | `src/lib/facets.ts` | exists; now canonically grounded |
| Stated/inferred basis, confidence, correction, removal | `src/lib/understanding.server.ts` | exists; applies unchanged |
| `introduction_attraction` (owner-scoped, purged on deletion) | migration + `src/lib/account.server.ts` | exists; write-only today |
| Counterpart photography sealing, alt-text, 5-photo maximum | `src/lib/attraction.server.ts` | exists |
| Attraction as a pair-reasoning dimension | `src/lib/introductions.server.ts` | exists; now canonically grounded |
| No-score enforcement | `NO_NUMERICAL_REDUCTION`, `src/lib/no-score.test.ts` | exists |

Required for the loop in §4 to close, **not built**:

1. A read path from `introduction_attraction` into longitudinal reasoning for
   the responding member only.
2. A pattern threshold — the minimum number of responses before an observed
   attraction pattern may be formed at all.
3. Whether observed attraction is surfaced to the member in Understanding, or
   held internally and only ever raised conversationally for confirmation.

These are blocked on §13.

---

## 13. Founder decisions required

| ID | Decision | Why it cannot be invented |
|---|---|---|
| **AT-01** | May private attraction responses become longitudinal evidence for the responding member's own understanding at all? | This is the difference between a private note to Athena and a behavioral model of a member's desires. Members gave the response under D-44's framing; extending its purpose is a purpose-limitation decision, not an engineering one. |
| **AT-02** | Minimum evidence before an observed attraction pattern may form (proposed: no fewer than four responses across distinct introductions). | Too low and Athena stereotypes a member from two reactions; too high and she never learns. A judgment about dignity, not a tuning constant. |
| **AT-03** | Is observed attraction surfaced in Understanding, or held internally and only raised conversationally for confirmation? | §3 forbids silent conversion; both remaining options are legitimate and lead to different member experiences. |
| **AT-04** | Consent framing: is a distinct member-facing statement required before attraction responses inform understanding, or does the existing understanding consent cover it? | Sensitive-inference territory; the answer determines whether a versioned consent record is required. |
| **AT-05** | May a member elect to make a stated physical preference a true boundary (§5), and if so which preferences are eligible? | Boundaries delete people from consideration. Eligibility must be founder-set, not inferred from the taxonomy. |

Until AT-01 through AT-04 are resolved, `introduction_attraction` remains
write-only and observed attraction does not exist at runtime. Until AT-05 is
resolved, no attraction preference functions as a filter.

---

## 14. Regression baseline preserved

No scores or rankings · single-person attention · progressive revelation ·
three-introduction maximum · Essential one-introduction capacity · readiness
gating · reciprocal suitability · decline non-disclosure · counterpart privacy ·
former-partner sealing · Founder privacy boundary · correction and removal ·
accessibility · Trust & Safety · existing sensitive-inference protections.

No membership pricing changed. Billing not activated. No native packaging begun.

---

## Revision history

| Version | Date | Description |
|---|---|---|
| 1.0 | 2026-08-19 | Attraction Intelligence Architecture canonized. Omission identified; attraction grounded in the existing facet, confidence, correction/removal, counterpart-sealing and whole-person matchmaking architecture rather than a parallel system. Absolute prohibition on attractiveness scoring and automated appearance analysis recorded. L3 and L6c amended for consistency. No runtime attraction inference or storage implemented; Founder decisions AT-01–AT-05 recorded as blocking. |

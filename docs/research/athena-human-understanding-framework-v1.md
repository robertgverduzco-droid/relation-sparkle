# Athena Human Understanding Framework — v1 (Research & Architecture)

Status: Draft for review. **Do not implement.** Supersedes nothing yet.
Companion to: `docs/research/athena-human-understanding-frameworks-v1.md` (source synthesis).

---

## 1. Purpose

Athena's job is not to categorize people. It is to *understand* them — gradually, contextually, and honestly — so that when she introduces two people, the introduction rests on a genuine reading of who they are and how they are likely to build a life together.

This framework defines:
1. The dimensions Athena tries to understand about each individual.
2. How she gathers evidence, holds uncertainty, and revises understanding.
3. How individual understanding becomes pair-level compatibility reasoning.
4. How this integrates with the existing Living Profile, Understanding Facets, conversation engine, pair reasoning, and post-meeting learning systems.

Athena never assigns personality types, labels, user-facing scores, or diagnoses. All internal representations are natural-language understandings backed by evidence and a confidence level.

---

## 2. Guiding Principles (from the source synthesis)

- **Understanding precedes matching.** No compatibility work runs until foundational understanding exists.
- **Distress patterns predict more than calm preferences.** How someone behaves under stress, conflict, and disappointment is more predictive of relationship outcomes than how they behave when things are easy.
- **Traits are dimensional and contextual.** Two people who look similar on the surface can be very different in the situations that matter.
- **Contradictions are data, not errors.** When new evidence contradicts prior understanding, Athena preserves both and seeks the context that reconciles them.
- **Autonomy-supportive listening produces honesty.** Reflection before questioning; curiosity before conclusion.
- **Compatibility is an interaction, not a sum.** No trait is universally good or bad. Meaning emerges only in the pairing.

---

## 3. The Dimensions of Human Understanding

Each dimension below is defined with a common structure:

- **What Athena is trying to understand**
- **Conversation that reveals it**
- **Behavioral evidence that strengthens understanding**
- **Follow-up questions that deepen understanding**
- **How Athena represents uncertainty**
- **How Athena preserves contradictions and context**
- **How understanding may evolve over time**
- **Why it matters for long-term relationship success**

Dimensions are grouped into four families. Grouping is internal-only and never shown to users.

### Family A — Foundation of Self
### Family B — Emotional & Relational Interior
### Family C — Relational Behavior in Practice
### Family D — Life Structure & Direction

> **Uncertainty representation (applies to every dimension):** each dimension has a natural-language *current understanding*, a *confidence* in [0.0, 0.95] (never 1.0), a list of *supporting evidence* items (each with a conversation reference and short excerpt), a *reasoning summary*, a *last refined at* timestamp, an optional *needs_clarification* flag with the specific tension, and a *history* of prior understandings with what changed and why.

> **Contradiction handling (applies to every dimension):** when new evidence conflicts with the current understanding, Athena does **not** overwrite. She records both, flags `needs_clarification`, generates a gentle contextualizing question for a future conversation, and only revises after the tension is understood. Contradictions often reveal context-dependence (e.g., "reserved with strangers, expressive with close friends"), which itself becomes part of the understanding.

---

### Family A — Foundation of Self

#### A1. Core Values
- **Understand:** the principles a person will not trade away — what they consider a life well lived, what they refuse to compromise on, and what they wish they honored more.
- **Conversation reveals it:** stories of pride, regret, admiration for others, moments they'd relive, moments they'd change.
- **Behavioral evidence:** how they spend discretionary time and money; what they defend when it's costly; what they choose when tired.
- **Deepening questions:** "When have you paid a real price for something you believed in?" "Whose life do you quietly admire, and what part of it?"
- **Evolution:** values clarify with age and life events; ordering shifts more than content.
- **Why it matters:** value alignment is the strongest predictor of long-term partnership stability.

#### A2. Life Direction
- **Understand:** the trajectory a person is on and how consciously they are on it — ambition, meaning, and the shape of the next several years.
- **Reveals it:** how they talk about the next 1, 3, 10 years; what they'd do with an unexpected free year.
- **Behavioral evidence:** consistency between stated direction and current choices.
- **Deepening:** "What would 'on track' feel like a year from now?" "What have you outgrown recently?"
- **Evolution:** direction sharpens or resets around life transitions.
- **Why it matters:** compatible life directions make shared building possible; incompatible ones create quiet drift.

#### A3. Personal Growth Orientation
- **Understand:** their relationship to change — do they seek it, resist it, fear it, or metabolize it?
- **Reveals it:** how they describe past mistakes; how they talk about therapy, feedback, and difficult truths.
- **Behavioral evidence:** patterns of returning to hard subjects; willingness to revise a prior statement in conversation.
- **Deepening:** "What's something you've genuinely changed your mind about?" "What are you working on in yourself right now?"
- **Evolution:** growth orientation is relatively stable but deepens with safety.
- **Why it matters:** partners who can grow together outlast partners who were merely well-matched at one moment.

#### A4. Decision-Making
- **Understand:** how they arrive at important choices — gut, analysis, consultation, delay, avoidance.
- **Reveals it:** stories of hard decisions, especially reversals.
- **Behavioral evidence:** how they describe deciding vs. how they actually decide during the conversation.
- **Deepening:** "Walk me through a decision you're still not sure was right." "Who do you call before deciding?"
- **Evolution:** decision style is durable; confidence in it grows or wanes with outcomes.
- **Why it matters:** partnered life is a stream of joint decisions; mismatched styles cause chronic friction even when the outcomes are fine.

---

### Family B — Emotional & Relational Interior

#### B1. Emotional Regulation
- **Understand:** how they notice, name, contain, and move through strong feeling — theirs and others'.
- **Reveals it:** stories of anger, grief, disappointment, and joy; the vocabulary they use for internal states.
- **Behavioral evidence:** pacing and word choice when a hard topic arises in conversation; ability to sit with a pause.
- **Deepening:** "When you're overwhelmed, what actually helps?" "What does your worst 20 minutes look like?"
- **Evolution:** regulation improves with practice, therapy, and secure relationships.
- **Why it matters:** the single largest determinant of daily relational quality.

#### B2. Stress Responses
- **Understand:** what happens to this person when the pressure is real — do they lean in, withdraw, harden, spiral, or organize?
- **Reveals it:** work crises, family emergencies, health scares, financial stress.
- **Behavioral evidence:** micro-signals when Athena raises something demanding; recovery time after difficult subjects.
- **Deepening:** "What's the last time you were genuinely stressed, and what did it look like from the outside?"
- **Evolution:** patterns stable; the surrounding *skills* grow.
- **Why it matters:** stress is when a relationship is tested; a partner who becomes unrecognizable under stress is a different partner.

#### B3. Attachment & Closeness
- **Understand:** how safe closeness feels; whether closeness is craved, feared, both, or context-dependent; what earns and breaks trust in bonds.
- **Reveals it:** stories of past relationships, friendships, family closeness; how they describe missing someone.
- **Behavioral evidence:** how they describe distance and reunion; whether closeness in the conversation itself feels welcomed or managed.
- **Deepening:** "When have you felt closest to someone? What made it possible?" "What tends to make you pull back?"
- **Evolution:** attachment patterns shift meaningfully with secure relationships and self-awareness.
- **Why it matters:** the ground under everyday intimacy.

#### B4. Vulnerability
- **Understand:** the conditions under which they let themselves be seen honestly — and what they protect.
- **Reveals it:** what they choose to share unprompted vs. only when asked; how they describe being misunderstood.
- **Behavioral evidence:** ratio of surface to depth over multiple conversations; whether depth persists or retracts.
- **Deepening:** "What do people usually miss about you?" "What's something true you rarely say out loud?"
- **Evolution:** capacity grows with safety; specific guarded areas often persist.
- **Why it matters:** without vulnerability, partnership stays cordial rather than intimate.

#### B5. Trust
- **Understand:** how trust is extended, earned, tested, and repaired for this person.
- **Reveals it:** stories of betrayal, forgiveness, second chances, and closed doors.
- **Behavioral evidence:** how quickly and provisionally they extend trust to Athena; whether they revisit earlier openness.
- **Deepening:** "What earns your trust that most people underestimate?" "What loses it that most people underestimate?"
- **Evolution:** the *thresholds* are durable; the *policies* around specific people evolve.
- **Why it matters:** trust architecture governs whether intimacy can compound over years.

#### B6. Intimacy
- **Understand:** what intimacy means to them across emotional, intellectual, physical, and shared-experience registers.
- **Reveals it:** descriptions of favorite closeness, best conversations, most connected moments.
- **Behavioral evidence:** which intimacy registers they return to voluntarily.
- **Deepening:** "What kind of closeness feeds you most?" "What kind do you find easy to give and hard to receive?"
- **Evolution:** priorities shift with life stage; the underlying language of closeness stays recognizable.
- **Why it matters:** intimacy mismatches quietly starve otherwise-good relationships.

---

### Family C — Relational Behavior in Practice

#### C1. Communication Patterns
- **Understand:** how they express and receive — directness, tempo, need for context, tolerance for ambiguity, humor as a channel.
- **Reveals it:** meta-conversation about being understood; description of a partner or friend who "gets" them.
- **Behavioral evidence:** length, structure, and precision of their own answers; how they respond to Athena's reflections.
- **Deepening:** "When you feel most heard, what is the other person actually doing?"
- **Evolution:** style is durable; skill improves.
- **Why it matters:** communication mismatch is the most common surface cause of chronic conflict.

#### C2. Conflict Behavior
- **Understand:** what they do when they and someone they love disagree — pursue, withdraw, negotiate, capitulate, escalate.
- **Reveals it:** stories of specific arguments, especially unresolved ones.
- **Behavioral evidence:** how they handle a gentle disagreement inside the conversation with Athena.
- **Deepening:** "Describe a fight you look back on with regret." "What does 'a good argument' look like to you?"
- **Evolution:** patterns are durable; specific behaviors can change substantially.
- **Why it matters:** conflict style compatibility is more predictive than agreement about the underlying issues.

#### C3. Repair After Disagreement
- **Understand:** capacity and habits for coming back — apology, acknowledgment, humor, physical closeness, time.
- **Reveals it:** what happened *after* the argument stories; what unresolved feels like to them.
- **Behavioral evidence:** whether they revisit an earlier tension in the conversation to soften or clarify it.
- **Deepening:** "How do you know something is really resolved?" "What kind of apology actually lands for you?"
- **Evolution:** repair capacity grows meaningfully with practice.
- **Why it matters:** Gottman's central finding — the presence of repair predicts longevity more than the absence of conflict.

#### C4. Affection & Emotional Expression
- **Understand:** how affection is naturally given and preferred to be received; the register of everyday warmth.
- **Reveals it:** how they describe being cared for well; what they do to show care.
- **Behavioral evidence:** warmth toward third parties they mention; care in describing people they've lost.
- **Deepening:** "When you feel loved, what is usually happening?" "How do you show it that others might miss?"
- **Evolution:** expression styles stabilize; range expands with a receptive partner.
- **Why it matters:** the daily temperature of a relationship.

#### C5. Reliability & Consistency
- **Understand:** the gap between what they say and what they do, and how they treat that gap.
- **Reveals it:** how they describe follow-through; how they talk about people who let them down and people they've let down.
- **Behavioral evidence:** whether they return to prior threads in later conversations; specificity vs. generality in commitments.
- **Deepening:** "What can people count on you for without asking?" "Where do you sometimes fall short of your own standards?"
- **Evolution:** durable, but context-dependent (e.g., reliable at work, less so at home).
- **Why it matters:** trust compounds on small consistencies.

#### C6. Independence & Autonomy
- **Understand:** how much separateness they need to stay themselves, and what they need to be able to share without losing it.
- **Reveals it:** descriptions of solitude, hobbies, friendships outside partnership, and past experiences of feeling engulfed or abandoned.
- **Behavioral evidence:** how they describe their most and least autonomous chapters.
- **Deepening:** "What parts of your life do you want to keep entirely yours?" "When have you felt most yourself inside a relationship?"
- **Evolution:** needs shift across life stages more than most people expect.
- **Why it matters:** long-term partnership requires a stable answer to *together and separate*.

#### C7. Social Energy
- **Understand:** how they draw and spend energy in social contexts — not introvert/extrovert labels, but the *shape* of their social battery.
- **Reveals it:** descriptions of ideal weekends, gatherings that recharge vs. drain, and how they recover.
- **Behavioral evidence:** stated vs. described patterns; energy in the conversation itself.
- **Deepening:** "What's your ideal social week look like?" "What kind of gathering leaves you better than it found you?"
- **Evolution:** shifts with life stage and health.
- **Why it matters:** mismatched social rhythms create chronic negotiation costs.

---

### Family D — Life Structure & Direction

#### D1. Daily Lifestyle
- **Understand:** the actual texture of an ordinary week — sleep, movement, work rhythm, food, screens, quiet, chaos.
- **Reveals it:** "walk me through a real Tuesday" more than "what do you like to do."
- **Behavioral evidence:** specificity in describing routines.
- **Deepening:** "What does a *good* ordinary week look like?" "What's non-negotiable in your day?"
- **Evolution:** shifts around jobs, cities, children, health.
- **Why it matters:** relationships live inside daily life, not inside stated preferences.

#### D2. Family & Future Goals
- **Understand:** what they want with respect to marriage, children, geography, extended family, and the shape of a shared future.
- **Reveals it:** descriptions of family of origin; imagined future scenes; questions they've already thought about vs. haven't.
- **Behavioral evidence:** specificity, ambivalence, and confidence markers.
- **Deepening:** "What do you want that you don't say out loud very often?" "What have you decided you don't want?"
- **Evolution:** clarifies with age; some elements are stable from early adulthood.
- **Why it matters:** the highest-cost incompatibilities live here.

#### D3. Relationship Expectations
- **Understand:** the implicit contract they bring — what a partner is *for*, what partnership should feel like, what would count as failure.
- **Reveals it:** descriptions of the best relationships they've observed; what they thought a relationship would be like before they had one.
- **Behavioral evidence:** how they describe what they're looking for, especially between the stated lines.
- **Deepening:** "What is a partner for, in your view?" "What kind of relationship would you regret settling for?"
- **Evolution:** deepens with experience; core expectations often stable.
- **Why it matters:** unspoken expectations cause more damage than incompatible ones spoken aloud.

#### D4. Readiness for Partnership
- **Understand:** whether their current life, emotional bandwidth, healing, and priorities can hold a serious relationship *now*.
- **Reveals it:** how they describe the recent past; what they're carrying; what changed that made them open again.
- **Behavioral evidence:** stability signals — sleep, work, support system, self-report of energy.
- **Deepening:** "What would make now the right time?" "What might make it not the right time?"
- **Evolution:** highly time-varying; must be re-checked, not assumed.
- **Why it matters:** the right person at the wrong time is still the wrong introduction.

---

## 4. Evidence and Confidence Methodology

**Evidence types (weighted):**
1. *Direct statement* — the person says it plainly. Moderate weight.
2. *Story with specifics* — concrete narrative with named people, times, outcomes. Strong weight.
3. *Behavioral signal in conversation* — how they respond to reflection, pause, disagreement. Strong weight.
4. *Consistency across conversations* — same pattern seen in different contexts. Strong weight; compounding.
5. *Contradiction across conversations* — treated as context-dependence signal, not error.
6. *Real-life feedback (post-meeting reflections, connection outcomes)* — highest weight; grounds the whole model.

**Confidence rules:**
- Confidence lives in [0.0, 0.95]. Never 1.0.
- A single conversation rarely takes a dimension above 0.5.
- Confidence rises with (a) multiple evidence types, (b) evidence across separate conversations, and (c) real-world feedback consistent with the understanding.
- Confidence *decreases* when new evidence contradicts prior understanding, until reconciled.
- Each dimension exposes internally: `current_understanding` (prose), `confidence` (float), `evidence[]`, `reasoning_summary`, `needs_clarification` (nullable string), `last_refined_at`, `history[]`.

**Introduction gating (unchanged in spirit):**
- Foundational conversation completed.
- Minimum coverage across Family A (values, direction) and Family B (regulation, attachment).
- Aggregate confidence and evidence thresholds retained as safeguards.

---

## 5. Contradictions, Context, and Change

- **Preserve both.** New evidence never silently overwrites prior understanding.
- **Ask context, not correction.** When two observations conflict, Athena forms a hypothesis that they are context-dependent and generates one gentle question to test it in a future conversation.
- **Time-stamp everything.** Understanding is dated. Old understandings remain visible in history, with what changed and why.
- **Life events reset relevant dimensions.** Loss, career change, therapy, health, becoming a parent — Athena flags affected dimensions for re-exploration rather than trusting stale confidence.

---

## 6. Pair-Level Compatibility Reasoning

Compatibility is the *interaction* of two complete people. No individual quality is universally positive, negative, compatible, or incompatible. For every candidate pair, Athena constructs a **Pair Reasoning** with the following components:

1. **Areas of strong natural alignment** — dimensions where both people's understandings resonate with minimal friction (values, life direction, intimacy language, social rhythm, etc.).
2. **Differences that may strengthen the relationship** — complementary asymmetries where one person's strength meets the other's growth edge, *if* the dynamics support it.
3. **Differences requiring awareness or adaptation** — real gaps that are workable with mutual skill (communication tempo, social energy, decision style).
4. **Likely interaction patterns** — the concrete shape of how these two will actually spend time and talk to each other.
5. **Potential conflict cycles** — the specific loops most likely to appear (e.g., pursuer/withdrawer, over-functioner/under-functioner) given both interiors.
6. **Capacity for repair** — the pair-level answer, not the individual answer: given both repair styles, can this couple come back after rupture?
7. **Shared direction and life-building potential** — do their Family D dimensions build a coherent future?
8. **Emotional and practical sustainability** — daily-life fit and long-arc fit.
9. **Unknowns requiring further understanding** — explicit list of dimensions where confidence is insufficient to conclude, and why.
10. **Overall relationship potential and reasoning** — a natural-language synthesis; internal confidence; internal recommendation. No numeric score is ever shown to users.

**Compatibility principles:**
- **Foundation Alignment** (values, life direction, readiness, family goals) is weighted most heavily. Misalignment here is not offset by chemistry.
- **Relational Dynamics** (regulation, conflict, repair, communication, attachment) are weighted next. Two well-aligned foundations with corrosive dynamics do not succeed.
- **Complementary Differences** are considered last and only where dynamics can hold them.
- **Fewest costly incompatibilities** beats **most surface similarities**.
- **Unknowns are named**, not smoothed over. If a pairing depends on information Athena doesn't yet have, she says so internally and either defers or seeks it.
- **Explainability required.** Every proposed introduction must produce reasoning a thoughtful human could follow.

---

## 7. From Individual Understanding to Introductions

An introduction is only proposed when:
1. Both users have completed foundational understanding.
2. Both have sufficient coverage and confidence across Family A and Family B.
3. Pair Reasoning shows strong Foundation Alignment, workable Dynamics, and no disqualifying unknowns.
4. Neither user has a current readiness concern.
5. Athena can articulate — in plain language — *why this pair, why now*.

Post-introduction outcomes (accepted, met, reflected on, continued, ended) flow back into both individuals' understandings and into the pair reasoning history, updating confidence and reshaping future candidate selection.

---

## 8. Integration with Existing Architecture

This framework is designed to slot into the current system without rearchitecting it.

| Existing system | How this framework maps |
|---|---|
| **Living Profile** | Becomes the user-facing narrative surface of Family A–D understandings; no scores or labels shown. |
| **`understanding_facets` table** | Each dimension above becomes one facet key. Existing fields (`current_understanding`, `confidence`, `evidence`, `reasoning_summary`, `needs_clarification`, `last_refined_at`) already match the methodology in §4. |
| **`facet_history` table** | Already supports the "preserve, don't overwrite" rule in §5. |
| **Topic Map (`topic_map`)** | The 21 life topics feed evidence into dimensions; dimensions are the *interpretation layer* above topics. |
| **Conversation engine (`askAthena`)** | System prompt gains a Dimensions Awareness Block: which dimensions have low confidence, which have unresolved contradictions, which have gone stale. No change to conversational voice. |
| **Reflection (`reflectAthena`)** | Extended to update dimension-level understanding, not only facet fragments; enforces the confidence and contradiction rules. |
| **`pair_reasoning` / `pair_reasoning_history`** | The 10-part Pair Reasoning in §6 becomes the canonical shape; existing tables already support versioned reasoning. |
| **Introductions engine** | Gating rules in §7 replace ad-hoc thresholds with dimension-coverage checks. |
| **Post-meeting reflections** | Feed real-world evidence back into both individual dimensions and pair reasoning, per §4 weighting. |

---

## 9. Duplication and Conflicts with Existing Architecture

Flagged for the user's decision before any implementation:

1. **Dimension set vs. current facet keys.** The existing `understanding_facets` uses a smaller/looser key set. This framework proposes ~21 canonical dimensions. *Conflict:* naming and granularity. *Options:* (a) migrate facet keys to the canonical set (with legacy keys marked deprecated, per your "do not remove" rule), or (b) add the canonical set alongside and let old keys fall dormant.
2. **Topic Map vs. Dimensions.** Topics and dimensions overlap (e.g., "Family" topic vs. "Family & Future Goals" dimension). *Recommendation:* keep topics as *conversational surface area* and dimensions as *interpretation layer*; document the distinction so they do not drift.
3. **Foundation vs. Readiness.** The current eligibility gate checks foundational completion + facet count + confidence. This framework adds Family-A/B coverage and a *readiness* dimension that can block introductions even for fully understood users. *Conflict:* stricter gate. *Decision needed:* accept the stricter gate.
4. **Confidence ceiling.** Existing code allows confidence up to 1.0 in places. This framework caps at 0.95. *Decision needed:* enforce cap globally.
5. **Compatibility layering.** Prior guidance emphasized "fewest incompatibilities." This framework refines it into a three-layer weighting (Foundation > Dynamics > Complementary Differences). *Not a conflict, a specification.* Worth explicit approval.
6. **User-facing scores.** Prior discussions occasionally referenced numeric compatibility. This framework prohibits any user-facing numeric score. *Decision needed:* confirm.

---

## 10. Recommended Next Artifacts (not to be built yet)

1. **Dimension Schema Proposal** — exact facet keys, prompts, and migration plan against `understanding_facets`.
2. **Conversation Engine Dimensions Block** — the internal-only prompt fragment injected into `askAthena`.
3. **Reflection Update Spec** — how `reflectAthena` writes dimension-level updates with the confidence and contradiction rules.
4. **Pair Reasoning Template v2** — the 10-part structure as a stored JSON shape in `pair_reasoning`.
5. **Introduction Gating Spec v2** — the Family-A/B coverage and readiness checks.
6. **Post-Meeting Learning Spec** — how outcomes feed back into individual dimensions and pair history.

---

## 11. What This Document Is Not

- Not a change to production code.
- Not a change to Athena's current conversational behavior.
- Not a set of user-visible categories, types, or scores.
- Not final. Awaiting the user's review and explicit approval before any of §10 begins.
